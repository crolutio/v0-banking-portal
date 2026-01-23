import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createDirectClient } from "@/lib/supabase/direct-client"
import { getAgentPersona } from "@/lib/ai/agents"

export const runtime = "nodejs"

async function fetchData(table: string, userId: string, column = "customer_id") {
  const supabase = createDirectClient()
  try {
    const { data, error } = await supabase.from(table).select("*").eq(column, userId)
    if (error) {
      console.error(`[vapi-chat] Error fetching ${table}:`, error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.error(`[vapi-chat] Exception fetching ${table}:`, err)
    return []
  }
}

function toNumber(value: any) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
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

    const persona = getAgentPersona(agentId)
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" })

    // Default demo user if none provided
    const userId = requestedUserId || "4e140685-8f38-49ff-aae0-d6109c46873d" // Sarah Chen

    // --- Fetch core financial data (simplified subset of /api/chat) ---
    const accounts = await fetchData("accounts", userId)
    const accountIds = accounts.map((a: any) => a.id)

    const [cards, loans, holdings, goals] = await Promise.all([
      fetchData("cards", userId),
      fetchData("loans", userId),
      fetchData("portfolio_holdings", userId),
      fetchData("savings_goals", userId),
    ])

    // Transactions for last 60 days
    let transactions: any[] = []
    if (accountIds.length > 0) {
      const supabase = createDirectClient()
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .in("account_id", accountIds)
        .gte("date", sixtyDaysAgo.toISOString())
        .order("date", { ascending: false })

      if (!txError && txData) {
        transactions = txData
      } else if (txError) {
        console.error("[vapi-chat] Error fetching transactions:", txError.message)
      }
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const txLast30Days = transactions.filter((tx: any) => {
      const txDate = new Date(tx.date)
      return !Number.isNaN(txDate.getTime()) && txDate >= thirtyDaysAgo
    })

    const spendingTxLast30Days = txLast30Days.filter((tx: any) => tx.type === "debit")
    const monthlySpending = spendingTxLast30Days.reduce(
      (sum: number, tx: any) => sum + Math.abs(toNumber(tx.amount)),
      0,
    )

    const incomeTxLast30Days = txLast30Days.filter((tx: any) => tx.type === "credit")
    const monthlyIncome = incomeTxLast30Days.reduce(
      (sum: number, tx: any) => sum + Math.abs(toNumber(tx.amount)),
      0,
    )

    // Convert all balances to AED (USD rate = 3.67)
    const totalBalance = accounts.reduce((sum: number, account: any) => {
      const balance = toNumber(account.balance)
      const rate = account.currency === "USD" ? 3.67 : 1
      return sum + (balance * rate)
    }, 0)
    const availableCash = accounts.reduce((sum: number, account: any) => {
      const balance = toNumber(account.available_balance ?? account.balance)
      const rate = account.currency === "USD" ? 3.67 : 1
      return sum + (balance * rate)
    }, 0)

    const recentTransactions = transactions.slice(0, 10).map((tx: any) => ({
      date: tx.date,
      description: tx.description,
      amount: toNumber(tx.amount),
      type: tx.type,
      category: tx.category,
      isUnusual: tx.is_unusual,
      unusualReason: tx.unusual_reason,
    }))

    const systemPrompt = `
${persona.personaPrompt}

You are answering for "Bank of the Future" inside a voice experience (Vapi).
Your goal is to give **clear, concise spoken answers** using the user's real financial data.

USER CONTEXT:
- ID: ${userId}
- Current page: ${currentPage}

FINANCIAL SNAPSHOT (last 30 days):
- Total balance across accounts: AED ${totalBalance.toFixed(2)}
- Available cash: AED ${availableCash.toFixed(2)}
- Spending (debits) last 30 days: AED ${monthlySpending.toFixed(2)}
- Income (credits) last 30 days: AED ${monthlyIncome.toFixed(2)}

ACCOUNTS:
${JSON.stringify(
  accounts.map((a: any) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: a.balance,
    currency: a.currency,
  })),
)}

CARDS:
${JSON.stringify(
  cards.map((c: any) => ({
    id: c.id,
    type: c.type,
    last4: c.last4,
    status: c.status,
    limit: c.limit,
  })),
)}

LOANS:
${JSON.stringify(
  loans.map((l: any) => ({
    id: l.id,
    type: l.type,
    amount: l.amount,
    remaining: l.remaining,
    interest_rate: l.interest_rate,
    monthly_payment: l.monthly_payment,
    status: l.status,
  })),
)}

RECENT TRANSACTIONS (up to 10):
${JSON.stringify(recentTransactions)}

SAVINGS GOALS:
${JSON.stringify(
  goals.map((g: any) => ({
    id: g.id,
    name: g.name,
    target: g.target,
    current: g.current,
    status: g.status,
  })),
)}

GUIDELINES:
- Use ONLY the data above for financial facts; don't make up numbers.
- Explain things clearly for voice: short sentences, no markdown.
- If the user asks about history or details you don't see here, say what period you can see.
- Format currency as "AED 1,234.56" when you mention amounts.
- Keep answers relatively short unless the question clearly needs detail.
`

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}

User question: ${question}

Answer in a way that can be read aloud directly to the user. Do NOT include markdown or code blocks.`,
            },
          ],
        },
      ],
    })

    const answer = result.response.text()

    return NextResponse.json({ answer })
  } catch (error: any) {
    console.error("[vapi-chat] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 },
    )
  }
}


