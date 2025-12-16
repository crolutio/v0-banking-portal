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

    // -----------------------------------------------------------------------
    // 1) PLANNING STEP: decide which tools to call and with what arguments
    // -----------------------------------------------------------------------

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
    // 3) ANSWERING STEP: synthesize final spoken answer from tool results
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

    const answerPrompt = `
You are the "Bank of the Future" AI banking assistant.

User ID: ${userId}
Agent persona: ${agentId}
Current page: ${currentPage}

The user asked:
"${question}"

You have the following structured tool results (JSON):

${JSON.stringify(results, null, 2)}

TASK:
- Provide a clear, concise answer that can be spoken aloud to the user.
- Use the numbers and facts from the tool results; do not invent data.
- If the tool results show empty arrays or zero values, it means no data was found for this user ID (${userId}).
- If no data is found, politely explain that you couldn't find account information and suggest they may need to check their user ID or ensure their account is set up.
- If data exists, explain any important balances, spending patterns, or loan decisions that are relevant to the question.
- Keep the tone professional but friendly.
- DO NOT include markdown, bullet points, or code blocks. Plain text sentences only.
`

    const answerResult = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: answerPrompt }],
        },
      ],
    })

    const answer = answerResult.response.text()

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


