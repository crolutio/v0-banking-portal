import { OpenAI } from "openai"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { createDirectClient } from "@/lib/supabase/direct-client"
import { getAgentPersona } from "@/lib/ai/agents"
import { generateForecasts } from "@/lib/forecasting/simple-forecast"
import { generateSavingsSuggestions } from "@/lib/savings/suggestions"

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
    const { messages, userId: requestedUserId, agentId } = await req.json()
    const persona = getAgentPersona(agentId)

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

    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const toNumber = (value: any) => {
      const num = Number(value)
      return Number.isFinite(num) ? num : 0
    }

    const totalBalance = accounts.reduce((sum: number, account: any) => sum + toNumber(account.balance), 0)
    const availableCash = accounts.reduce(
      (sum: number, account: any) => sum + toNumber(account.available_balance ?? account.balance),
      0,
    )

    const txLast30Days = transactions.filter((tx: any) => {
      const txDate = new Date(tx.date)
      return !Number.isNaN(txDate.getTime()) && txDate >= thirtyDaysAgo
    })

    const monthlySpending = txLast30Days.reduce(
      (sum: number, tx: any) => sum + Math.abs(toNumber(tx.amount)),
      0,
    )

    const categoryTotals = txLast30Days.reduce((acc: Record<string, number>, tx: any) => {
      const category = tx.category || "uncategorized"
      acc[category] = (acc[category] || 0) + Math.abs(toNumber(tx.amount))
      return acc
    }, {})

    const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
    const recentTransactions = transactions.slice(0, 5).map((tx: any) => ({
      date: tx.date,
      description: tx.description,
      amount: toNumber(tx.amount),
      category: tx.category,
      type: tx.type,
      isUnusual: tx.is_unusual,
      unusualReason: tx.unusual_reason,
    }))

    // Calculate Forecasts
    const typedTransactions = transactions.map((t: any) => ({
      ...t,
      amount: toNumber(t.amount),
    }))
    const forecasts = generateForecasts(typedTransactions).slice(0, 5) // Top 5 categories
    const totalPredictedSpend = forecasts.reduce((sum, f) => sum + f.predictedAmount, 0)
    
    // Generate Savings Suggestions
    const savingsOpportunities = generateSavingsSuggestions(typedTransactions)

    const unusualActivity = transactions
      .filter((tx: any) => tx.is_unusual)
      .slice(0, 5)
      .map((tx: any) => ({
        date: tx.date,
        description: tx.description,
        amount: toNumber(tx.amount),
        reason: tx.unusual_reason,
      }))

    // Calculate Budget Status (Calendar Month)
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const thisMonthSpendingByCategory = transactions.reduce((acc: Record<string, number>, tx: any) => {
      const d = new Date(tx.date)
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.type === 'debit') {
         const cat = (tx.category || "uncategorized").toLowerCase()
         acc[cat] = (acc[cat] || 0) + Math.abs(toNumber(tx.amount))
      }
      return acc
    }, {})

    const oldestTx = transactions.length > 0 ? transactions[transactions.length - 1].date : null
    const newestTx = transactions.length > 0 ? transactions[0].date : null

    const realTimeSnapshot = {
      generatedAt: now.toISOString(),
      dataSummary: {
        totalTransactionsAvailable: transactions.length,
        dateRange: {
            start: oldestTx,
            end: newestTx
        }
      },
      totalBalance,
      availableCash,
      monthlySpendingLast30Days: monthlySpending,
      daysCaptured: 30,
      topSpendingCategory: topCategoryEntry
        ? { category: topCategoryEntry[0], amount: topCategoryEntry[1] }
        : null,
      recentTransactions,
      unusualActivity,
      forecasts: {
        nextMonthTotal: totalPredictedSpend,
        breakdown: forecasts
      },
      savingsOpportunities
    }

    // Prepare System Prompt
    const systemPrompt = `
${persona.personaPrompt}

You work for "Bank of the Future" and have access to the user's complete financial data.
Your goal is to provide accurate, helpful, and concise advice that matches your specialization.

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

REAL-TIME SNAPSHOT:
${JSON.stringify(realTimeSnapshot, null, 2)}

GUIDELINES:
- Answer based ONLY on the provided data.
- IMPORTANT: "RECENT TRANSACTIONS" only shows the last 50 items. Refer to "REAL-TIME SNAPSHOT" -> "dataSummary" for the full date range availability.
- If asked about history older than the provided detailed transactions, state that you only have details for the recent period but can see summary stats.
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

RESPONSE STYLE:
- Start with a one-line health summary referencing the real-time snapshot (balances/spending).
- Highlight any unusual activity from recentTransactions immediately.
- Offer proactive suggestions when spending spikes or balances drop.
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
