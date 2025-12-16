import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import {
  getAccountsOverview,
  getRecentTransactions,
  analyzeSpending,
  analyzeLoanPreapprovalForUser,
} from "@/lib/agent/tools"

export const runtime = "nodejs"

type ToolCall = {
  name: string
  args?: Record<string, any>
}

function stripJson(text: string): string {
  // Remove possible code fences and surrounding text
  const jsonMatch = text.match(/```json([\s\S]*?)```/i)
  if (jsonMatch) return jsonMatch[1].trim()
  const braceIndex = text.indexOf("{")
  if (braceIndex >= 0) {
    const lastBrace = text.lastIndexOf("}")
    if (lastBrace > braceIndex) {
      return text.slice(braceIndex, lastBrace + 1)
    }
  }
  return text.trim()
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Log the full request for debugging
    console.log("[agent] Full request body:", JSON.stringify(body, null, 2))
    
    // Handle Vapi tool call format OR direct API call format
    // Vapi sends: { message: { content: "..." }, userId: "...", ... }
    // Direct API sends: { question: "...", userId: "...", ... }
    const question = body.message?.content || 
                     body.transcript || 
                     body.userMessage || 
                     body.question ||
                     body.query ||
                     body.input
    
    // Handle userId - Vapi might send "me" or other placeholders
    let requestedUserId = body.userId || 
                         body.user?.id || 
                         body.variables?.userId ||
                         body.requestedUserId
    
    // Map Vapi placeholders to actual user ID
    if (requestedUserId === "me" || requestedUserId === "user" || !requestedUserId) {
      requestedUserId = "11111111-1111-1111-1111-111111111111"
    }
    
    // Also check tool call args for userId
    if (body.message?.toolCalls?.[0]?.function?.arguments) {
      try {
        const args = typeof body.message.toolCalls[0].function.arguments === 'string' 
          ? JSON.parse(body.message.toolCalls[0].function.arguments)
          : body.message.toolCalls[0].function.arguments
        if (args.userId && args.userId !== "me" && args.userId !== "user") {
          requestedUserId = args.userId
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    const agentId = body.agentId || "banker"
    const currentPage = body.currentPage || "/home"
    const toolCall = body.message?.toolCalls?.[0] // Store for response formatting

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Missing 'question' string" }, { status: 400 })
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" },
        { status: 500 },
      )
    }

    const userId = requestedUserId || "11111111-1111-1111-1111-111111111111"
    
    console.log("[agent] Request received:", {
      question,
      requestedUserId,
      userId,
      agentId,
      currentPage,
    })

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" })

    // Fast keyword-based tool selection (skip Gemini planning for common queries)
    const lowerQ = question.toLowerCase()
    let toolCalls: ToolCall[] = []
    let skipPlanning = false

    // Quick keyword matching for common queries (much faster than Gemini planning)
    if (lowerQ.includes("balance") || lowerQ.includes("account") || lowerQ.includes("money") || lowerQ.includes("cash")) {
      toolCalls = [{ name: "getAccountsOverview", args: { userId } }]
      skipPlanning = true
    } else if (lowerQ.includes("loan") && (lowerQ.includes("afford") || lowerQ.includes("eligib") || lowerQ.includes("preapprov") || /\d+/.test(question))) {
      // Only use loan tool if it's clearly a financial loan question
      const amountMatch = question.match(/(\d+)[,\s]*(?:000|k|thousand)/i)
      const termMatch = question.match(/(\d+)\s*(?:month|year)/i)
      toolCalls = [{
        name: "analyzeLoanPreapprovalForUser",
        args: {
          userId,
          requestedAmount: amountMatch ? Number(amountMatch[1]) * 1000 : 50000,
          requestedTerm: termMatch ? Number(termMatch[1]) : 24,
        }
      }]
      skipPlanning = true
    } else if (lowerQ.includes("spend") || lowerQ.includes("saving") || lowerQ.includes("expense") || lowerQ.includes("transaction")) {
      toolCalls = [
        { name: "getRecentTransactions", args: { userId } },
        { name: "analyzeSpending", args: { userId } },
      ]
      skipPlanning = true
    }

    // -----------------------------------------------------------------------
    // 1) PLANNING STEP: Use Gemini only if keyword matching didn't work
    // -----------------------------------------------------------------------

    if (!skipPlanning) {
      const plannerPrompt = `
You are a planning agent for "Bank of the Future".

The user asked:
"${question}"

You have access to these tools:

1) getAccountsOverview
   - description: Get all of the user's accounts, balances, and total cash.
   - args: { "userId": string }

2) getRecentTransactions
   - description: Get recent transactions and spending/income totals for a time window.
   - args: { "userId": string, "days": number }  // days defaults to 30 if omitted

3) analyzeSpending
   - description: Analyze spending patterns, forecasts, and savings opportunities using the last ~90 days.
   - args: { "userId": string }

4) analyzeLoanPreapprovalForUser
   - description: Analyze whether the user can afford a requested loan and compute monthly payment, DTI, and strengths/concerns.
   - args: { "userId": string, "requestedAmount": number, "requestedTerm": number }

Your job:
- Choose the minimal set of tools needed to answer the question well.
- If the question is very general ("how is my spending?"), you might call getRecentTransactions and analyzeSpending.
- If the user is asking about loans, call analyzeLoanPreapprovalForUser with a reasonable requestedAmount and requestedTerm inferred from the question (e.g. 50000 AED, 24 months if not specified).
- If the question is purely general knowledge and not about the user's banking data, you may return an empty list of tool calls.

IMPORTANT:
- Always include "userId" in every tool call.
- Respond ONLY with valid JSON, no explanations, in this exact shape:

{
  "toolCalls": [
    { "name": "getAccountsOverview", "args": { "userId": "..." } },
    { "name": "getRecentTransactions", "args": { "userId": "...", "days": 30 } }
  ]
}
`

    const planResult = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: plannerPrompt }],
        },
      ],
    })

    const rawPlan = planResult.response.text()
    let toolCalls: ToolCall[] = []

    try {
      const jsonText = stripJson(rawPlan)
      const parsed = JSON.parse(jsonText)
      if (Array.isArray(parsed.toolCalls)) {
        toolCalls = parsed.toolCalls as ToolCall[]
      }
    } catch (err) {
      console.warn("[agent] Failed to parse planning JSON, falling back to default plan.", err)
      // Fallback: simple default plan based on keywords
      const lowerQ = question.toLowerCase()
      if (lowerQ.includes("loan")) {
        toolCalls = [
          {
            name: "analyzeLoanPreapprovalForUser",
            args: {
              userId,
              requestedAmount: 50000,
              requestedTerm: 24,
            },
          },
        ]
      } else if (
        lowerQ.includes("spend") ||
        lowerQ.includes("saving") ||
        lowerQ.includes("expense")
      ) {
        toolCalls = [
          { name: "getRecentTransactions", args: { userId, days: 30 } },
          { name: "analyzeSpending", args: { userId } },
        ]
      } else {
        toolCalls = [{ name: "getAccountsOverview", args: { userId } }]
      }
    }

    // Ensure userId is present
    toolCalls = toolCalls.map((call) => ({
      ...call,
      args: { ...(call.args || {}), userId: (call.args && call.args.userId) || userId },
    }))

    // -----------------------------------------------------------------------
    // 2) EXECUTION STEP: run the selected tools
    // -----------------------------------------------------------------------

    const results: Record<string, any> = {}

    for (const call of toolCalls) {
      const name = call.name
      const args = call.args || {}

      try {
        console.log(`[agent] Executing tool: ${name} with args:`, args)
        if (name === "getAccountsOverview") {
          results[name] = await getAccountsOverview(args.userId)
        } else if (name === "getRecentTransactions") {
          results[name] = await getRecentTransactions(args.userId, args.days ?? 30)
        } else if (name === "analyzeSpending") {
          results[name] = await analyzeSpending(args.userId)
        } else if (name === "analyzeLoanPreapprovalForUser") {
          const requestedAmount = Number(args.requestedAmount || 50000)
          const requestedTerm = Number(args.requestedTerm || 24)
          results[name] = await analyzeLoanPreapprovalForUser(
            args.userId,
            requestedAmount,
            requestedTerm,
          )
        }
        console.log(`[agent] Tool ${name} result:`, JSON.stringify(results[name], null, 2).slice(0, 500))
      } catch (toolError) {
        console.error(`[agent] Tool ${name} failed:`, toolError)
        results[name] = { error: String(toolError) }
      }
    }

    // -----------------------------------------------------------------------
    // 3) ANSWERING STEP: Fast formatting for simple queries, Gemini for complex ones
    // -----------------------------------------------------------------------

    // Check if we have any meaningful data
    const hasData = Object.values(results).some((r: any) => {
      if (!r || typeof r !== 'object') return false
      if (r.error) return false
      if (r.accounts && r.accounts.length > 0) return true
      if (r.transactions && r.transactions.length > 0) return true
      if (r.totalBalance !== undefined && r.totalBalance > 0) return true
      return false
    })

    console.log(`[agent] Has data: ${hasData}`, {
      resultKeys: Object.keys(results),
      hasAccounts: results.getAccountsOverview?.accounts?.length > 0,
      hasTransactions: results.getRecentTransactions?.transactions?.length > 0,
    })

    // Fast answer formatting for simple queries (saves ~1-2 seconds)
    let answer: string
    const lowerQ = question.toLowerCase()
    const isSimpleQuery = lowerQ.includes("balance") || lowerQ.includes("account") || lowerQ.includes("money") || lowerQ.includes("cash") || lowerQ.includes("how much")
    
    if (isSimpleQuery && results.getAccountsOverview) {
      // Fast formatting for balance queries (short for voice)
      const overview = results.getAccountsOverview
      if (!hasData || !overview.accounts || overview.accounts.length === 0) {
        answer = "I couldn't find your account information."
      } else {
        const total = overview.totalBalance || 0
        const accountCount = overview.accounts.length
        const currency = overview.accounts[0]?.currency || "AED"
        answer = `Your total balance is ${total.toLocaleString()} ${currency} across ${accountCount} account${accountCount > 1 ? 's' : ''}.`
      }
      console.log("[agent] Using fast answer formatting (skipped Gemini synthesis)")
    } else if (lowerQ.includes("loan") && results.analyzeLoanPreapprovalForUser) {
      // Fast formatting for loan queries (short for voice)
      const loan = results.analyzeLoanPreapprovalForUser
      if (loan.error || !loan.approved) {
        answer = loan.reasoning || "I couldn't process your loan request."
      } else {
        const monthly = loan.monthlyPayment || 0
        const amount = loan.requestedAmount || 0
        answer = `You're approved for ${amount.toLocaleString()} AED. Monthly payment: ${monthly.toLocaleString()} AED over ${loan.requestedTerm || 24} months.`
      }
      console.log("[agent] Using fast answer formatting (skipped Gemini synthesis)")
    } else {
      // Complex queries need Gemini for natural language generation
      console.log("[agent] Using Gemini for answer synthesis (complex query)")
      const answerPrompt = `
You are the "Bank of the Future" AI banking assistant speaking to a user via voice.

User ID: ${userId}
Agent persona: ${agentId}
Current page: ${currentPage}

The user asked:
"${question}"

You have the following structured tool results (JSON):

${JSON.stringify(results, null, 2)}

TASK:
- Provide a SHORT, concise answer that can be spoken aloud (1-3 sentences maximum).
- This is for voice interaction - keep it brief to avoid long pauses.
- Use the numbers and facts from the tool results; do not invent data.
- If the tool results show empty arrays or zero values, it means no data was found for this user ID (${userId}).
- If no data is found, briefly say you couldn't find account information.
- If data exists, mention only the most relevant numbers or facts that directly answer the question.
- Keep the tone professional but friendly.
- DO NOT include markdown, bullet points, code blocks, or long explanations. Just 1-3 short sentences.
- Example: "Your total balance is 15,000 AED across 2 accounts." NOT "You have multiple accounts with various balances totaling..."
`

      const answerResult = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: answerPrompt }],
          },
        ],
      })

      answer = answerResult.response.text()
    }

    // Detect if this is a Vapi request
    // Vapi API Request tool sends: { question, userId, ... } or { message: { toolCalls: [...] } }
    const isVapiRequest = !!(
      body.message?.toolCalls || 
      toolCall || 
      body.toolCallId ||
      body.function?.name || // Custom tool format
      (body.question && !body.agentId) // Has question but no agentId (likely Vapi)
    )
    
    console.log("[agent] Response format check:", {
      isVapiRequest,
      hasToolCall: !!toolCall,
      toolCallId: toolCall?.id || body.toolCallId,
      bodyKeys: Object.keys(body)
    })
    
    // Handle Vapi tool call response format (if request came from Vapi)
    if (isVapiRequest && toolCall?.id) {
      // Vapi expects this format for tool calls
      return NextResponse.json({
        results: [
          {
            toolCallId: toolCall.id,
            result: answer
          }
        ]
      })
    } else if (isVapiRequest && body.toolCallId) {
      // Alternative Vapi format
      return NextResponse.json({
        results: [
          {
            toolCallId: body.toolCallId,
            result: answer
          }
        ]
      })
    } else if (isVapiRequest) {
      // Vapi request but no toolCallId - return just the result
      // This handles API Request tool format
      return NextResponse.json({
        result: answer
      })
    }

    // Standard API response format (for Next.js chat interface)
    return NextResponse.json({ answer, toolCalls, toolResults: results })
  } catch (error: any) {
    console.error("[agent] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 },
    )
  }
}


