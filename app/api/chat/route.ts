import { GoogleGenerativeAI } from "@google/generative-ai"
import { GoogleGenerativeAIStream, StreamingTextResponse } from "ai"
import { createDirectClient } from "@/lib/supabase/direct-client"
import { getAgentPersona } from "@/lib/ai/agents"
import { generateForecasts } from "@/lib/forecasting/simple-forecast"
import { generateSavingsSuggestions } from "@/lib/savings/suggestions"
import { detectScenario } from "@/lib/agent/scenario-detector"
import { analyzeLoanPreApproval } from "@/lib/calculations/loan-preapproval"
import { analyzeSpendingOptimization } from "@/lib/calculations/spending-optimizer"

// Set the runtime to nodejs for better compatibility
export const runtime = "nodejs"

// Helper to provide page-specific context
function getPageSpecificContext(page: string): string {
  const contexts: Record<string, string> = {
    "/home": "User can see their account balances, recent transactions, and financial overview.",
    "/accounts": "User can see all their accounts with balances and transaction history.",
    "/cards": "User can see all their credit/debit cards, spending limits, and card benefits.",
    "/loans": "User can see their active loans, payment schedules, and loan marketplace.",
    "/investments": "User can see their portfolio holdings, performance, and asset allocation.",
    "/savings-goals": "User can see their savings goals, progress, and contribution schedules.",
    "/rewards": "User can see their reward points, tier status, and redemption options.",
    "/marketplace": "User can see connected apps and available integrations.",
    "/support": "User is looking for help with their account or has a support question.",
    "/risk-compliance": "Staff view - risk alerts, compliance checks, and investigations.",
    "/rm-workspace": "Relationship manager view - client portfolio and next best actions.",
    "/admin": "Admin console - system configuration and management.",
  }
  return contexts[page] || "User is navigating the banking portal."
}

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
    const { messages, userId: requestedUserId, agentId, currentPage } = await req.json()
    const persona = getAgentPersona(agentId)

    console.log("Checking API Keys:", { 
      hasGemini: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY, 
      envKeys: Object.keys(process.env).filter(k => k.includes('API')) 
    })

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response("Missing GOOGLE_GENERATIVE_AI_API_KEY", { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    
    // Model fallback: gemma-3-27b-it -> gemma-3-12b-it
    let model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" })

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

    // Calculate spending - ONLY debits (exclude credits/income)
    const spendingTxLast30Days = txLast30Days.filter((tx: any) => tx.type === 'debit')
    
    const monthlySpending = spendingTxLast30Days.reduce(
      (sum: number, tx: any) => sum + Math.abs(toNumber(tx.amount)),
      0,
    )

    // Category totals - ONLY for spending (debits)
    const categoryTotals = spendingTxLast30Days.reduce((acc: Record<string, number>, tx: any) => {
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
        id: tx.id || `tx-${Date.now()}-${Math.random()}`,
        date: tx.date,
        description: tx.description,
        amount: toNumber(tx.amount),
        reason: tx.unusual_reason,
        category: tx.category,
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

    // Calculate income for context
    const monthlyIncome = txLast30Days
      .filter((tx: any) => tx.type === 'credit')
      .reduce((sum: number, tx: any) => sum + Math.abs(toNumber(tx.amount)), 0)

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
      monthlyIncomeLast30Days: monthlyIncome,
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

    // Detect Special Scenarios
    const lastUserMessage = messages.length > 0 ? messages[messages.length - 1].content : ""
    const conversationHistory = messages.slice(-5).map((m: any) => m.content)
    const scenario = detectScenario(lastUserMessage, conversationHistory)
    
    let scenarioEnhancement = ""
    
    // Handle loan with travel scenario - "The Strategist"
    if (scenario.type === 'loan_with_travel') {
      const optimization = analyzeSpendingOptimization(typedTransactions)
      scenarioEnhancement = `

SPECIAL SCENARIO DETECTED: User wants a loan for travel purposes.

However, I've analyzed their spending and found significant savings opportunities!

OPTIMIZATION RESULTS:
- Total Monthly Savings: AED ${optimization.totalMonthlySavings.toFixed(2)}
- Total Annual Savings: AED ${optimization.totalAnnualSavings.toFixed(2)}
- Number of Opportunities: ${optimization.opportunities.length}

INSTRUCTION: Act as "The Strategist" - Present these savings as a smart alternative to taking a loan. 
Show enthusiasm about helping them fund their trip without debt. 
Include this optimization card at the end of your response:

\`\`\`optimization
${JSON.stringify(optimization)}
\`\`\`

Message tone: Excited, helpful, empowering. "Great news! You don't need a loan - I found the money!"`
    }
    
    // Handle loan request scenario - Pre-Approval
    if (scenario.type === 'loan_request') {
      const requestedAmount = scenario.context?.loanAmount || 50000
      const requestedTerm = 24 // Default 24 months
      
      const preApproval = analyzeLoanPreApproval({
        requestedAmount,
        requestedTerm,
        accounts,
        existingLoans: loans,
        transactions: typedTransactions,
        creditScore: 720 // Default credit score
      })
      
      scenarioEnhancement = `

SPECIAL SCENARIO DETECTED: User is requesting a loan pre-approval assessment.

LOAN PRE-APPROVAL ANALYSIS:
- Requested Amount: AED ${requestedAmount.toLocaleString()}
- Approval Status: ${preApproval.approved ? 'PRE-APPROVED' : 'CONDITIONAL'}
- Monthly Payment: AED ${preApproval.monthlyPayment.toFixed(2)}
- Interest Rate: ${preApproval.interestRate}%
- DTI Ratio: ${preApproval.dtiPercentage}%

INSTRUCTION: Explain the pre-approval decision clearly and professionally.
Highlight the strengths, address any concerns, and outline the next steps.
Include this loan approval card at the end of your response:

\`\`\`loan-approval
${JSON.stringify(preApproval)}
\`\`\`

Message tone: Professional, transparent, supportive.`
    }
    
    // Handle payment schedule scenario
    if (scenario.type === 'payment_schedule') {
      const loanAmount = scenario.context?.loanAmount || 50000
      const loanTerm = scenario.context?.loanTerm || 24
      const interestRate = scenario.context?.interestRate || 5.99
      
      // Calculate payment schedule
      const monthlyRate = interestRate / 100 / 12
      const monthlyPayment = loanAmount * 
        (monthlyRate * Math.pow(1 + monthlyRate, loanTerm)) /
        (Math.pow(1 + monthlyRate, loanTerm) - 1)
      
      const schedule = []
      let remainingBalance = loanAmount
      
      for (let month = 1; month <= loanTerm; month++) {
        const interestPayment = remainingBalance * monthlyRate
        const principalPayment = monthlyPayment - interestPayment
        remainingBalance -= principalPayment
        
        schedule.push({
          month,
          payment: Math.round(monthlyPayment * 100) / 100,
          principal: Math.round(principalPayment * 100) / 100,
          interest: Math.round(interestPayment * 100) / 100,
          balance: Math.max(0, Math.round(remainingBalance * 100) / 100)
        })
      }
      
      scenarioEnhancement = `

SPECIAL SCENARIO DETECTED: User wants a payment schedule simulation.

LOAN DETAILS:
- Loan Amount: AED ${loanAmount.toLocaleString()}
- Interest Rate: ${interestRate}% APR
- Term: ${loanTerm} months
- Monthly Payment: AED ${Math.round(monthlyPayment * 100) / 100}

INSTRUCTION: Display the payment schedule as a table showing:
- Month number
- Total payment
- Principal portion
- Interest portion
- Remaining balance

Format it as a markdown table using the \`\`\`table code block:

\`\`\`table
| Month | Payment (AED) | Principal (AED) | Interest (AED) | Remaining Balance (AED) |
|-------|---------------|-----------------|----------------|-------------------------|
${schedule.map(p => `| ${p.month} | ${p.payment.toLocaleString()} | ${p.principal.toLocaleString()} | ${p.interest.toLocaleString()} | ${p.balance.toLocaleString()} |`).join('\n')}
\`\`\`

Message tone: Clear, informative, helpful.`
    }
    
    // Handle spending analysis scenario
    if (scenario.type === 'spending_analysis') {
      const optimization = analyzeSpendingOptimization(typedTransactions)
      scenarioEnhancement = `

SPECIAL SCENARIO DETECTED: User wants spending analysis and savings opportunities.

OPTIMIZATION RESULTS:
- Total Monthly Savings: AED ${optimization.totalMonthlySavings.toFixed(2)}
- Total Annual Savings: AED ${optimization.totalAnnualSavings.toFixed(2)}
- Opportunities Found: ${optimization.opportunities.length}

INSTRUCTION: Present the savings opportunities with actionable advice.
Include this optimization card:

\`\`\`optimization
${JSON.stringify(optimization)}
\`\`\`

Message tone: Analytical, helpful, action-oriented.`
    }
    
    // Handle review suspicious transactions scenario
    if (scenario.type === 'review_suspicious_transactions') {
      const suspiciousTransactions = unusualActivity.map((tx: any) => ({
        id: (tx as any).id || `tx-${Date.now()}-${Math.random()}`,
        description: tx.description || 'Unknown Transaction',
        amount: tx.amount || 0,
        date: tx.date || new Date().toISOString(),
        reason: tx.reason || 'Unusual activity detected',
        category: tx.category || undefined
      }))
      
      if (suspiciousTransactions.length === 0) {
        scenarioEnhancement = `

SPECIAL SCENARIO DETECTED: User wants to review suspicious transactions.

NO SUSPICIOUS TRANSACTIONS FOUND: All transactions appear normal.

INSTRUCTION: Inform the user that no suspicious transactions were detected and their account activity looks normal. Be reassuring and positive.`
      } else {
        scenarioEnhancement = `

SPECIAL SCENARIO DETECTED: User wants to review suspicious transactions.

SUSPICIOUS TRANSACTIONS FOUND: ${suspiciousTransactions.length} transaction(s) flagged.

CRITICAL INSTRUCTIONS:
Your response must ONLY contain the code block below. DO NOT add any text before or after it. The code block will automatically render as a red card.

Your ENTIRE response should be ONLY this:

\`\`\`suspicious-transactions
${JSON.stringify({ transactions: suspiciousTransactions })}
\`\`\`

DO NOT write any explanation text. DO NOT write any introductory text. DO NOT write any follow-up text. ONLY output the code block above.`
      }
    }
    
    // Handle dispute transaction scenario
    if (scenario.type === 'dispute_transaction') {
      // Find the disputed transaction from recent suspicious transactions
      const disputedTx = unusualActivity.find((tx: any) => {
        const desc = tx.description?.toLowerCase() || ''
        const userMsg = lastUserMessage.toLowerCase()
        return desc.includes('starbucks') && userMsg.includes('starbucks') ||
               desc.includes('coffee') && userMsg.includes('coffee') ||
               (scenario.context?.transactionDescription && desc.includes(scenario.context.transactionDescription.toLowerCase()))
      }) || unusualActivity[0] // Fallback to first suspicious transaction
      
      if (disputedTx) {
        const disputeData = {
          disputes: [{
            id: (disputedTx as any).id || `tx-${Date.now()}`,
            description: disputedTx.description || 'Unknown Transaction',
            amount: disputedTx.amount || 0,
            date: disputedTx.date || new Date().toISOString(),
            reason: disputedTx.reason || 'Unauthorized transaction',
            status: 'submitted' as const
          }],
          caseNumber: `DIS-${Date.now().toString().slice(-8)}`,
          estimatedResolutionDays: 7
        }
        
        scenarioEnhancement = `

SPECIAL SCENARIO DETECTED: User is disputing an unauthorized transaction.

DISPUTE DETAILS:
- Transaction: ${disputedTx.description}
- Amount: AED ${disputedTx.amount}
- Date: ${disputedTx.date}
- Reason: Unauthorized transaction

INSTRUCTION: Confirm the dispute has been initiated and show the dispute confirmation card:

\`\`\`dispute-confirmation
${JSON.stringify(disputeData)}
\`\`\`

Message tone: Supportive, reassuring, professional. Confirm that the card has been blocked, dispute initiated, and new card will be issued.`
      }
    }
    
    // Handle travel context scenario - "The Concierge"
    if (scenario.type === 'travel_context') {
      const destination = scenario.context?.travelDestination || 'your destination'
      scenarioEnhancement = `

SPECIAL SCENARIO DETECTED: User is traveling to ${destination}.

INSTRUCTION: Act as "The Concierge" - provide travel-specific financial advice:
- Recommend best cards for foreign transactions (lowest fees)
- Suggest enabling travel notifications
- Advise on currency exchange tips
- Remind about expense tracking while abroad

Message tone: Friendly, knowledgeable, proactive.`
    }

    // Add page context awareness
    let pageContext = ""
    if (currentPage) {
      pageContext = `

CURRENT PAGE CONTEXT:
User is currently viewing: ${currentPage}
Tailor your response to be relevant to what they can see on this page.
${getPageSpecificContext(currentPage)}
`
    }

    // Prepare System Prompt
    const systemPrompt = `
${persona.personaPrompt}${scenarioEnhancement}${pageContext}

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
${JSON.stringify(accounts.map(a => ({ id: a.id, name: a.name, type: a.type, balance: a.balance, available_balance: a.available_balance, currency: a.currency })))}

2. CARDS:
${JSON.stringify(cards.map(c => ({ id: c.id, type: c.type, last4: c.last4, expiry: c.expiry, status: c.status, limit: c.limit })))}

3. LOANS:
${JSON.stringify(loans.map(l => ({ id: l.id, type: l.type, amount: l.amount, remaining: l.remaining, interest_rate: l.interest_rate, monthly_payment: l.monthly_payment, status: l.status })))}

4. RECENT TRANSACTIONS (Last 30 shown of ${transactions.length}):
${JSON.stringify(transactions.slice(0, 30).map(tx => ({ date: tx.date, description: tx.description, amount: tx.amount, type: tx.type, category: tx.category, is_unusual: tx.is_unusual, unusual_reason: tx.unusual_reason })))}

5. INVESTMENT PORTFOLIO:
${JSON.stringify(holdings.map(h => ({ symbol: h.symbol, name: h.name, quantity: h.quantity, current_price: h.current_price, total_value: h.total_value })))}

6. SAVINGS GOALS:
${JSON.stringify(goals.map(g => ({ id: g.id, name: g.name, target: g.target, current: g.current, deadline: g.deadline, status: g.status })))}

7. REWARDS:
- Profile: ${JSON.stringify(rewardProfile ? { tier: rewardProfile.tier, points: rewardProfile.points, next_tier: rewardProfile.next_tier } : null)}
- Recent Activity: ${JSON.stringify(rewardActivities.slice(0, 5).map(a => ({ date: a.date, description: a.description, points: a.points })))}

REAL-TIME SNAPSHOT:
${JSON.stringify(realTimeSnapshot)}

GUIDELINES:
- Answer based ONLY on the provided data.
- IMPORTANT: "RECENT TRANSACTIONS" only shows the last 30 items. Refer to "REAL-TIME SNAPSHOT" -> "dataSummary" for the full date range availability.
- If asked about history older than the provided detailed transactions, state that you only have details for the recent period but can see summary stats.
- If the user asks about "this month" or "this year", filter the transactions in the data provided.
- Current Date: ${new Date().toISOString().split('T')[0]}
- Be professional but friendly.
- Format currency as AED (e.g., AED 1,250.00).
- Do not make up data. If something is missing, say so.
- CRITICAL: Transaction types are either "credit" (income/deposits) or "debit" (spending/withdrawals).
  * SPENDING = transactions with type "debit" (e.g., groceries, restaurants, shopping)
  * INCOME = transactions with type "credit" (e.g., salary, investment returns)
  * When discussing "spending" or "expenses", ONLY reference debit transactions
  * Categories like "salary" are INCOME, not spending - never call them spending categories

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
    { "name": "Shopping", "value": 500 },
    { "name": "Transport", "value": 300 }
  ]
}
\`\`\`

If asked about spending breakdowns or comparisons, ALWAYS include a chart.

RESPONSE STYLE:
- Only mention balance/spending summary if directly relevant to the user's question.
- Do NOT start every response with balance information unless specifically asked.
- Highlight any unusual activity from recentTransactions when relevant.
- Offer proactive suggestions when spending spikes or balances drop.
- If the user asks something outside your scope (e.g., general knowledge, non-financial topics), politely respond: "I'm sorry, I can only assist you with banking and financial matters related to your accounts, transactions, cards, loans, investments, and savings goals. How can I help you with your finances today?"
`

    // Log for debugging
    console.log(`[AI Chat] System prompt prepared. Data counts: Accounts=${accounts.length}, Tx=${transactions.length}, Holdings=${holdings.length}`)

    // Convert messages to Gemini format
    // Add system prompt as first user message since Gemini doesn't have a separate system instruction in startChat
    const geminiMessages = [
      {
        role: 'user',
        parts: [{text: `${systemPrompt}\n\nPlease acknowledge you understand this context and are ready to assist.`}]
      },
      {
        role: 'model',
        parts: [{text: 'I understand. I have access to all the financial data and am ready to assist with any questions about accounts, transactions, investments, loans, cards, savings goals, and rewards. How can I help you today?'}]
      },
      ...messages.slice(-10).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))
    ]

    // Start chat with history
    let chat = model.startChat({
      history: geminiMessages.slice(0, -1), // All but last message
    })

    // Get response for last message
    const lastMessage = messages[messages.length - 1]?.content || ""
    
    // Try primary model first, fallback to secondary on rate limit
    try {
      const result = await chat.sendMessageStream(lastMessage)
      const stream = GoogleGenerativeAIStream(result)
      return new StreamingTextResponse(stream)
    } catch (error: any) {
      const errorMessage = String(error?.message || '').toLowerCase()
      const errorStatus = error?.status || error?.statusCode || 0
      const errorCode = String(error?.code || '').toLowerCase()
      
      const isRateLimit = errorStatus === 429 || 
                         errorStatus === 500 ||
                         errorMessage.includes('rate limit') ||
                         errorMessage.includes('quota') ||
                         errorMessage.includes('resource exhausted') ||
                         errorMessage.includes('per minute') ||
                         errorMessage.includes('too many requests') ||
                         errorCode.includes('rate_limit') ||
                         errorCode.includes('resource_exhausted')
      
      // If it's a rate limit, try the fallback model
      if (isRateLimit) {
        console.log(`[AI Chat] Rate limit on gemma-3-27b-it, trying fallback: gemma-3-12b-it`)
        model = genAI.getGenerativeModel({ model: "gemma-3-12b-it" })
        chat = model.startChat({
          history: geminiMessages.slice(0, -1),
        })
        const result = await chat.sendMessageStream(lastMessage)
        const stream = GoogleGenerativeAIStream(result)
        return new StreamingTextResponse(stream)
      }
      
      // If not a rate limit, throw the error
      throw error
    }

  } catch (error: any) {
    console.error("Error in chat route:", error)
    return new Response(error.message || "Internal Server Error", { status: 500 })
  }
}
