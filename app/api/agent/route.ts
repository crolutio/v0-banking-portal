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
    const { question, userId: requestedUserId, agentId = "banker", currentPage = "/home" } =
      await req.json()

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
      } catch (toolError) {
        console.error(`[agent] Tool ${name} failed:`, toolError)
        results[name] = { error: String(toolError) }
      }
    }

    // -----------------------------------------------------------------------
    // 3) ANSWERING STEP: synthesize final spoken answer from tool results
    // -----------------------------------------------------------------------

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
- Explain any important balances, spending patterns, or loan decisions that are relevant to the question.
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

    return NextResponse.json({ answer, toolCalls, toolResults: results })
  } catch (error: any) {
    console.error("[agent] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 },
    )
  }
}


