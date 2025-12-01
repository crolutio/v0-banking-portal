import { OpenAI } from "openai"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { createDirectClient } from "@/lib/supabase/direct-client"

// Set the runtime to nodejs for better compatibility
export const runtime = "nodejs"

// Helper to safely fetch data
async function fetchData(table: string, userId: string, column = "user_id") {
  const supabase = createDirectClient()
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq(column, userId)
    
    if (error) {
      console.error(`Error fetching ${table}:`, error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.error(`Exception fetching ${table}:`, err)
    return []
  }
}

export async function POST(req: Request) {
  try {
    const { messages, userId: requestedUserId } = await req.json()

    console.log("Checking API Keys:", { 
      hasOpenAI: !!process.env.OPENAI_API_KEY, 
      envKeys: Object.keys(process.env).filter(k => k.includes('API')) 
    })

    if (!process.env.OPENAI_API_KEY) {
      return new Response("Missing OPENAI_API_KEY", { status: 500 })
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Default to Sarah Chen for demo if no user provided
    const userId = requestedUserId || "11111111-1111-1111-1111-111111111111"
    
    console.log(`[AI Chat] Fetching data for user: ${userId}`)

    // 1. Fetch Accounts first (needed for transactions)
    const accounts = await fetchData("accounts", userId)
    const accountIds = accounts.map((a: any) => a.id)
    
    // 2. Fetch other data in parallel
    const [
      cards,
      loans,
      holdings,
      watchlist,
      goals,
      rewardProfileResult,
      rewardActivities,
      supportTickets
    ] = await Promise.all([
      fetchData("cards", userId),
      fetchData("loans", userId),
      fetchData("portfolio_holdings", userId),
      fetchData("watchlist", userId),
      fetchData("savings_goals", userId),
      fetchData("reward_profiles", userId), // This returns an array, we take first
      fetchData("reward_activities", userId),
      fetchData("support_tickets", userId)
    ])

    // 3. Fetch Transactions (using account IDs)
    let transactions: any[] = []
    if (accountIds.length > 0) {
      const supabase = createDirectClient()
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .in("account_id", accountIds)
        .order("date", { ascending: false })
      
      if (!txError && txData) {
        transactions = txData
      } else if (txError) {
        console.error("Error fetching transactions:", txError.message)
      }
    }

    // 4. Fetch Goal Transactions
    let goalTransactions: any[] = []
    const goalIds = goals.map((g: any) => g.id)
    if (goalIds.length > 0) {
      const supabase = createDirectClient()
      const { data: gTxData, error: gTxError } = await supabase
        .from("savings_goal_transactions")
        .select("*")
        .in("goal_id", goalIds)
        .order("date", { ascending: false })
        
      if (!gTxError && gTxData) {
        goalTransactions = gTxData
      }
    }

    const rewardProfile = rewardProfileResult.length > 0 ? rewardProfileResult[0] : null

    // Prepare System Prompt
    const systemPrompt = `
You are an AI Banker Assistant for "Bank of the Future". You have access to the user's complete financial data.
Your goal is to provide accurate, helpful, and concise financial advice.

USER CONTEXT:
- ID: ${userId}
- Name: Sarah Chen (Demo User)

FINANCIAL DATA OVERVIEW:
- Accounts: ${accounts.length}
- Cards: ${cards.length}
- Loans: ${loans.length}
- Transactions: ${transactions.length}
- Investments: ${holdings.length}
- Savings Goals: ${goals.length}

DETAILED DATA:

1. ACCOUNTS:
${JSON.stringify(accounts, null, 2)}

2. CARDS:
${JSON.stringify(cards, null, 2)}

3. LOANS:
${JSON.stringify(loans, null, 2)}

4. RECENT TRANSACTIONS (Last 50 shown of ${transactions.length}):
${JSON.stringify(transactions.slice(0, 50), null, 2)}

5. INVESTMENT PORTFOLIO:
${JSON.stringify(holdings, null, 2)}

6. SAVINGS GOALS:
${JSON.stringify(goals, null, 2)}

7. REWARDS:
- Profile: ${JSON.stringify(rewardProfile, null, 2)}
- Recent Activity: ${JSON.stringify(rewardActivities.slice(0, 10), null, 2)}

GUIDELINES:
- Answer based ONLY on the provided data.
- If the user asks about "this month" or "this year", filter the transactions in the data provided.
- Current Date: ${new Date().toISOString().split('T')[0]}
- Be professional but friendly.
- Format currency as AED (e.g., AED 1,250.00).
- Do not make up data. If something is missing, say so.

FORMATTING RULES:
- Use **bold** for emphasis and headings.
- Use lists for multiple items.
- You can generate CHARTS to visualize data.
- To create a chart, output a code block with the language "chart" containing a JSON object.
- Supported chart types: "bar", "pie".
- Data format: Array of objects with "name" (string) and "value" (number).

EXAMPLE CHART:
\`\`\`chart
{
  "type": "bar",
  "data": [
    { "name": "Food", "value": 500 },
    { "name": "Transport", "value": 300 }
  ]
}
\`\`\`

If asked about spending breakdowns or comparisons, ALWAYS include a chart.
`

    // Log for debugging
    console.log(`[AI Chat] System prompt prepared. Data counts: Accounts=${accounts.length}, Tx=${transactions.length}, Holdings=${holdings.length}`)

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    })

    const stream = OpenAIStream(response as any)
    return new StreamingTextResponse(stream)

  } catch (error: any) {
    console.error("Error in chat route:", error)
    return new Response(error.message || "Internal Server Error", { status: 500 })
  }
}
