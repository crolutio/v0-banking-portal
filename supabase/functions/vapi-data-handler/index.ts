// Supabase Edge Function for Vapi - Banking Agent with Planning
// This handles Vapi tool calls and returns banking data using AI planning

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.info('Vapi-Supabase Banking Function Started');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function toNumber(value: any): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function stripJson(text: string): string {
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

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY")
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response."
}

// ============================================================================
// DATABASE QUERY FUNCTIONS
// ============================================================================

async function fetchTableByUser(
  supabase: any,
  table: string,
  userId: string,
  column: string = "customer_id",
): Promise<any[]> {
  console.log(`[vapi-data-handler] Fetching ${table} for userId: ${userId}`)
  const { data, error } = await supabase.from(table).select("*").eq(column, userId)
  
  if (error) {
    console.error(`[vapi-data-handler] Error fetching ${table}:`, error.message)
    return []
  }
  
  console.log(`[vapi-data-handler] Fetched ${data?.length ?? 0} rows from ${table}`)
  return data ?? []
}

async function fetchUserTransactionsForAccounts(
  supabase: any,
  accountIds: string[],
  days?: number,
): Promise<any[]> {
  if (accountIds.length === 0) return []

  let query = supabase.from("transactions").select("*").in("account_id", accountIds)

  if (days !== undefined && days > 0 && days < 730) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    query = query.gte("date", since.toISOString())
  }

  const { data, error } = await query.order("date", { ascending: false })

  if (error) {
    console.error("[vapi-data-handler] Error fetching transactions:", error.message)
    return []
  }

  return (data ?? []).map((t: any) => ({
    ...t,
    amount: toNumber(t.amount),
  }))
}

// ============================================================================
// BANKING TOOLS
// ============================================================================

async function getAccountsOverview(supabase: any, userId: string) {
  const accounts = await fetchTableByUser(supabase, "accounts", userId)
  const cards = await fetchTableByUser(supabase, "cards", userId)

  const totalBalance = accounts.reduce((sum: number, a: any) => sum + toNumber(a.balance), 0)
  const availableCash = accounts.reduce(
    (sum: number, a: any) => sum + toNumber(a.availableBalance ?? a.available_balance ?? a.balance),
    0,
  )

  return {
    accounts: accounts.map((a: any) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: a.balance,
      availableBalance: a.availableBalance ?? a.available_balance ?? a.balance ?? 0,
      currency: a.currency,
      status: a.status,
    })),
    cards: cards.map((c: any) => ({
      id: c.id,
      type: c.type,
      brand: c.brand,
      lastFour: c.lastFour ?? c.last4,
      expiryDate: c.expiryDate ?? c.expiry_date,
      status: c.status,
    })),
    totalBalance,
    availableCash,
  }
}

async function getRecentTransactions(supabase: any, userId: string, days?: number) {
  const accounts = await fetchTableByUser(supabase, "accounts", userId)
  const accountIds = accounts.map((a: any) => a.id)

  if (accountIds.length === 0) {
    return { transactions: [], recent: [], monthlySpending: 0, monthlyIncome: 0 }
  }

  const transactions = await fetchUserTransactionsForAccounts(supabase, accountIds, days)

  const spendingTx = transactions.filter((tx: any) => tx.type === "debit")
  const incomeTx = transactions.filter((tx: any) => tx.type === "credit")

  const monthlySpending = spendingTx.reduce((sum: number, tx: any) => sum + Math.abs(toNumber(tx.amount)), 0)
  const monthlyIncome = incomeTx.reduce((sum: number, tx: any) => sum + Math.abs(toNumber(tx.amount)), 0)

  return {
    transactions,
    recent: transactions.slice(0, 10),
    monthlySpending,
    monthlyIncome,
  }
}

// Forecasting logic (simplified from lib/forecasting/simple-forecast.ts)
function generateForecasts(transactions: any[]): any[] {
  const history: Record<string, Record<string, number>> = {}
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

  transactions.forEach((tx) => {
    const d = new Date(tx.date)
    if (d < sixMonthsAgo) return
    if (tx.type === "credit") return

    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const cat = tx.category || "uncategorized"

    if (!history[cat]) history[cat] = {}
    history[cat][monthKey] = (history[cat][monthKey] || 0) + Math.abs(toNumber(tx.amount))
  })

  const forecasts: any[] = []
  const months: string[] = []
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  Object.entries(history).forEach(([category, monthlyData]) => {
    const values = months.map((m) => monthlyData[m] || 0)
    const prediction = values[0] * 0.5 + values[1] * 0.3 + values[2] * 0.2
    
    let trend: "up" | "down" | "stable" = "stable"
    if (values[0] > values[1] * 1.1) trend = "up"
    else if (values[0] < values[1] * 0.9) trend = "down"

    const dataPoints = values.filter((v) => v > 0).length
    const confidence = dataPoints === 3 ? 0.8 : dataPoints === 2 ? 0.6 : 0.3

    if (prediction > 0) {
      forecasts.push({
        category,
        predictedAmount: Math.round(prediction),
        confidence,
        trend,
      })
    }
  })

  return forecasts.sort((a, b) => b.predictedAmount - a.predictedAmount)
}

// Savings suggestions logic (simplified from lib/savings/suggestions.ts)
function generateSavingsSuggestions(transactions: any[]): any[] {
  const suggestions: any[] = []
  
  const subscriptions: Record<string, { count: number, amount: number, merchant: string }> = {}
  
  transactions.forEach(tx => {
    if (tx.category === 'subscriptions' || tx.category === 'entertainment' || (tx.description || '').toLowerCase().includes('subscription')) {
      const key = `${tx.merchant || tx.description}-${tx.amount}`
      if (!subscriptions[key]) subscriptions[key] = { count: 0, amount: tx.amount, merchant: tx.merchant || tx.description }
      subscriptions[key].count++
    }
  })

  Object.values(subscriptions).forEach(sub => {
    if (sub.count >= 2) {
      suggestions.push({
        id: `sub-${sub.merchant.replace(/\s+/g, '-')}`,
        title: `Review Subscription: ${sub.merchant}`,
        description: `You have a recurring payment of AED ${sub.amount}. Do you still use this?`,
        potentialSavings: sub.amount,
        type: "subscription",
        confidence: "high"
      })
    }
  })

  const fees = transactions.filter(tx => tx.category === 'fees')
  const totalFees = fees.reduce((sum, tx) => sum + toNumber(tx.amount), 0)
  
  if (totalFees > 50) {
    suggestions.push({
      id: "reduce-fees",
      title: "Reduce Bank Fees",
      description: `You spent AED ${totalFees.toFixed(0)} on fees recently. Check if you can switch accounts or avoid ATM charges.`,
      potentialSavings: totalFees,
      type: "fees",
      confidence: "medium"
    })
  }

  return suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings).slice(0, 3)
}

async function analyzeSpending(supabase: any, userId: string) {
  const { transactions } = await getRecentTransactions(supabase, userId)
  
  const forecasts = generateForecasts(transactions)
  const totalPredictedSpend = forecasts.reduce((sum, f) => sum + f.predictedAmount, 0)
  const savingsOpportunities = generateSavingsSuggestions(transactions)

  const spendingOnly = transactions.filter((tx: any) => tx.type === "debit")
  const categoryTotals = spendingOnly.reduce((acc: Record<string, number>, tx: any) => {
    const cat = tx.category || "uncategorized"
    acc[cat] = (acc[cat] || 0) + Math.abs(toNumber(tx.amount))
    return acc
  }, {})

  const topEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
  const topSpendingCategory = topEntry
    ? { category: topEntry[0], amount: topEntry[1] }
    : null

  return {
    forecasts,
    totalPredictedSpend,
    savingsOpportunities,
    topSpendingCategory,
  }
}

// Loan preapproval logic (simplified from lib/calculations/loan-preapproval.ts)
function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 100 / 12
  
  if (monthlyRate === 0) {
    return principal / termMonths
  }
  
  const payment = principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1)
  
  return Math.round(payment * 100) / 100
}

function determineInterestRate(creditScore: number): number {
  if (creditScore >= 750) return 4.99
  if (creditScore >= 700) return 5.99
  if (creditScore >= 650) return 7.49
  return 9.99
}

function estimateMonthlyIncome(transactions: any[]): number {
  const salaryTransactions = transactions.filter(tx => 
    tx.type === 'credit' && 
    (tx.category === 'salary' || 
     (tx.description || '').toLowerCase().includes('salary') ||
     (tx.description || '').toLowerCase().includes('income'))
  )

  if (salaryTransactions.length === 0) {
    return 0
  }

  const recentSalaries = salaryTransactions
    .slice(0, 3)
    .map(tx => toNumber(tx.amount))

  const avgSalary = recentSalaries.reduce((sum, amt) => sum + amt, 0) / recentSalaries.length
  
  return Math.round(avgSalary)
}

async function analyzeLoanPreapprovalForUser(
  supabase: any,
  userId: string,
  requestedAmount: number,
  requestedTerm: number,
  creditScore: number = 700,
) {
  const accounts = await fetchTableByUser(supabase, "accounts", userId)
  const loans = await fetchTableByUser(supabase, "loans", userId)
  const accountIds = accounts.map((a: any) => a.id)
  const transactions = await fetchUserTransactionsForAccounts(supabase, accountIds)

  const monthlyIncome = estimateMonthlyIncome(transactions)
  const existingMonthlyDebt = loans.reduce((sum: number, loan: any) => sum + toNumber(loan.monthlyPayment || loan.monthly_payment || 0), 0)
  const interestRate = determineInterestRate(creditScore)
  const proposedMonthlyPayment = calculateMonthlyPayment(requestedAmount, interestRate, requestedTerm)
  const totalMonthlyDebt = existingMonthlyDebt + proposedMonthlyPayment
  const dtiRatio = monthlyIncome > 0 ? totalMonthlyDebt / monthlyIncome : 1.0
  const dtiPercentage = Math.round(dtiRatio * 100)

  const totalRepayment = proposedMonthlyPayment * requestedTerm
  const totalInterest = totalRepayment - requestedAmount

  const maxDTI = 0.50
  const approved = dtiRatio <= maxDTI && monthlyIncome > 0

  const strengths: string[] = []
  const concerns: string[] = []
  const conditions: string[] = []

  if (dtiRatio < 0.35) {
    strengths.push('Excellent debt-to-income ratio - well below 35%')
  } else if (dtiRatio < 0.42) {
    strengths.push('Good debt-to-income ratio - comfortably within guidelines')
  }

  if (creditScore >= 750) {
    strengths.push('Excellent credit score qualifies for best rates')
  } else if (creditScore >= 700) {
    strengths.push('Good credit score')
  }

  const totalBalance = accounts.reduce((sum: number, acc: any) => sum + toNumber(acc.balance), 0)
  if (totalBalance > requestedAmount * 0.1) {
    strengths.push(`Strong cash reserves (AED ${totalBalance.toFixed(0)})`)
  }

  if (dtiRatio > 0.45) {
    concerns.push(`High DTI ratio at ${dtiPercentage}% - near maximum threshold of 50%`)
  } else if (dtiRatio > 0.40) {
    concerns.push(`DTI ratio at ${dtiPercentage}% - approaching upper limit`)
  }

  if (creditScore < 650) {
    concerns.push('Credit score below optimal range - higher interest rate applied')
  }

  if (approved) {
    conditions.push('Subject to identity verification and document submission')
    conditions.push('Final approval subject to credit bureau report')
  }

  return {
    approved,
    monthlyPayment: proposedMonthlyPayment,
    interestRate,
    totalInterest,
    totalRepayment,
    dtiRatio,
    dtiPercentage,
    strengths,
    concerns,
    conditions,
    requestedAmount,
    requestedTerm,
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  try {
    // --- A. SETUP ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const geminiApiKey = Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY') ?? ''
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // --- B. PARSE VAPI REQUEST ---
    const body = await req.json()
    console.log("Incoming Vapi Payload:", JSON.stringify(body, null, 2))

    // Extract user message/question from Vapi payload
    const userMessage = body.message?.content || 
                       body.transcript || 
                       body.userMessage || 
                       body.question ||
                       "What is my account balance?"

    // Extract userId from Vapi payload or use default
    const userId = body.userId || 
                   body.user?.id || 
                   body.variables?.userId ||
                   "4e140685-8f38-49ff-aae0-d6109c46873d" // Sarah Chen

    console.log("[vapi-data-handler] Processing:", { userMessage, userId })

    // --- C. FETCH ALL DATA (like the Next.js chat agent does) ---
    console.log(`[vapi-data-handler] Fetching all data for user: ${userId}`)
    
    // Fetch Accounts first (needed for transactions)
    const accounts = await fetchTableByUser(supabase, "accounts", userId)
    const accountIds = accounts.map((a: any) => a.id)
    
    // Fetch other data in parallel
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
      fetchTableByUser(supabase, "cards", userId),
      fetchTableByUser(supabase, "loans", userId),
      fetchTableByUser(supabase, "portfolio_holdings", userId),
      fetchTableByUser(supabase, "watchlist", userId),
      fetchTableByUser(supabase, "savings_goals", userId),
      fetchTableByUser(supabase, "reward_profiles", userId),
      fetchTableByUser(supabase, "reward_activities", userId),
      fetchTableByUser(supabase, "support_tickets", userId)
    ])

    // Fetch Transactions (using account IDs)
    let transactions: any[] = []
    if (accountIds.length > 0) {
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .in("account_id", accountIds)
        .order("date", { ascending: false })
      
      if (!txError && txData) {
        transactions = txData
      } else if (txError) {
        console.error("[vapi-data-handler] Error fetching transactions:", txError.message)
      }
    }

    // Fetch Goal Transactions
    let goalTransactions: any[] = []
    const goalIds = goals.map((g: any) => g.id)
    if (goalIds.length > 0) {
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

    console.log(`[vapi-data-handler] Data fetched: Accounts=${accounts.length}, Tx=${transactions.length}, Cards=${cards.length}, Loans=${loans.length}, Holdings=${holdings.length}, Goals=${goals.length}`)

    // --- D. GENERATE ANSWER WITH GEMINI (using all the data, like chat agent) ---
    let resultMessage = ""
    
    if (geminiApiKey) {
      // Generate answer using Gemini with all the data (like chat agent does)
      const systemPrompt = `
You are the "Bank of the Future" AI banking assistant speaking to a user via voice.

User ID: ${userId}

You have access to the user's complete financial data. Answer their question using ONLY the data provided below.

FINANCIAL DATA:

1. ACCOUNTS:
${JSON.stringify(accounts.map((a: any) => ({ id: a.id, name: a.name, type: a.type, balance: a.balance, available_balance: a.available_balance, currency: a.currency })))}

2. CARDS:
${JSON.stringify(cards.map((c: any) => ({ id: c.id, type: c.type, last4: c.last4, expiry: c.expiry, status: c.status, limit: c.limit })))}

3. LOANS:
${JSON.stringify(loans.map((l: any) => ({ id: l.id, type: l.type, amount: l.amount, remaining: l.remaining, interest_rate: l.interest_rate, monthly_payment: l.monthly_payment, status: l.status })))}

4. RECENT TRANSACTIONS (Last 50 of ${transactions.length}):
${JSON.stringify(transactions.slice(0, 50).map((tx: any) => ({ date: tx.date, description: tx.description, amount: tx.amount, type: tx.type, category: tx.category, is_unusual: tx.is_unusual, unusual_reason: tx.unusual_reason })))}

5. INVESTMENT PORTFOLIO:
${JSON.stringify(holdings.map((h: any) => ({ symbol: h.symbol, name: h.name, quantity: h.quantity, current_price: h.current_price, total_value: h.total_value })))}

6. SAVINGS GOALS:
${JSON.stringify(goals.map((g: any) => ({ id: g.id, name: g.name, target: g.target, current: g.current, deadline: g.deadline, status: g.status })))}

7. REWARDS:
- Profile: ${JSON.stringify(rewardProfile ? { tier: rewardProfile.tier, points: rewardProfile.points, next_tier: rewardProfile.next_tier } : null)}
- Recent Activity: ${JSON.stringify(rewardActivities.slice(0, 5).map((a: any) => ({ date: a.date, description: a.description, points: a.points })))}

8. SUPPORT TICKETS:
${JSON.stringify(supportTickets.slice(0, 5).map((t: any) => ({ id: t.id, subject: t.subject, status: t.status, created_at: t.created_at })))}

GUIDELINES:
- Answer based ONLY on the provided data.
- Provide a SHORT, concise answer (1-3 sentences maximum) for voice interaction.
- Keep it brief to avoid long pauses.
- Format currency as "AED X,XXX" (no decimals for voice).
- If asked about something not in the data, say you don't have that information.
- Transaction types: "credit" = income/deposits, "debit" = spending/withdrawals.
- Current Date: ${new Date().toISOString().split('T')[0]}
- Be professional but friendly.
- DO NOT include markdown, bullet points, or code blocks. Plain text sentences only.
`

      try {
        resultMessage = await callGemini(`${systemPrompt}\n\nThe user asked: "${userMessage}"\n\nProvide a short answer (1-3 sentences):`, geminiApiKey)
      } catch (err) {
        console.error("[vapi-data-handler] Gemini call failed:", err)
        // Fallback: simple response
        if (accounts.length > 0) {
          // Convert all balances to AED (USD rate = 3.67)
          const total = accounts.reduce((sum: number, acc: any) => {
            const balance = toNumber(acc.balance)
            const rate = acc.currency === "USD" ? 3.67 : 1
            return sum + (balance * rate)
          }, 0)
          resultMessage = `Your total balance is ${total.toLocaleString()} AED across ${accounts.length} account${accounts.length > 1 ? 's' : ''}.`
        } else {
          resultMessage = "I couldn't find your account information."
        }
      }
    } else {
      // Fallback if no Gemini API key
      if (accounts.length > 0) {
        // Convert all balances to AED (USD rate = 3.67)
        const total = accounts.reduce((sum: number, acc: any) => {
          const balance = toNumber(acc.balance)
          const rate = acc.currency === "USD" ? 3.67 : 1
          return sum + (balance * rate)
        }, 0)
        resultMessage = `Your total balance is ${total.toLocaleString()} AED across ${accounts.length} account${accounts.length > 1 ? 's' : ''}.`
      } else {
        resultMessage = "I couldn't find your account information."
      }
    }

    // --- E. FORMAT RESPONSE FOR VAPI ---
    const toolCall = body.message?.toolCalls?.[0]
    
    if (toolCall) {
      // Vapi tool call format
      const responseData = {
        results: [
          {
            toolCallId: toolCall.id,
            result: resultMessage
          }
        ]
      }
      return new Response(JSON.stringify(responseData), {
        headers: { 'Content-Type': 'application/json' }
      })
    } else {
      // Direct API call format (for testing or direct HTTP calls)
      return new Response(JSON.stringify({
        answer: resultMessage,
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
  } catch (error: any) {
    console.error("[vapi-data-handler] Error:", error)
    return new Response(
      JSON.stringify({ error: error?.message || "Internal Server Error" }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

// Fallback formatter when Gemini is not available
function formatSimpleResponse(results: Record<string, any>, userId: string): string {
  const accounts = results.getAccountsOverview
  const transactions = results.getRecentTransactions
  const spending = results.analyzeSpending
  const loan = results.analyzeLoanPreapprovalForUser

  if (loan) {
    return `Loan analysis: ${loan.approved ? 'Approved' : 'Not approved'}. Monthly payment: AED ${loan.monthlyPayment.toFixed(2)}. DTI: ${loan.dtiPercentage}%.`
  }

  if (spending) {
    return `Spending analysis: Predicted next month spend: AED ${spending.totalPredictedSpend.toFixed(2)}. Top category: ${spending.topSpendingCategory?.category || 'N/A'}.`
  }

  if (accounts && accounts.accounts && accounts.accounts.length > 0) {
    const total = accounts.totalBalance.toFixed(2)
    return `I found ${accounts.accounts.length} account${accounts.accounts.length > 1 ? 's' : ''}. Your total balance is AED ${total}.`
  } else if (transactions && transactions.transactions && transactions.transactions.length > 0) {
    return `I found ${transactions.transactions.length} transaction${transactions.transactions.length > 1 ? 's' : ''}. Your monthly spending is AED ${transactions.monthlySpending.toFixed(2)}.`
  } else {
    return `I couldn't find any account information for user ID ${userId}. Please check that the user ID is correct and that accounts exist in the database.`
  }
}
