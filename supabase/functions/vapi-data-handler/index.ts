// Supabase Edge Function for Vapi - Banking Agent
// This handles Vapi tool calls and returns banking data

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.info('Vapi-Supabase Banking Function Started');

// Helper functions
function toNumber(value: any): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

async function fetchTableByUser(
  supabase: any,
  table: string,
  userId: string,
  column: string = "user_id",
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

  let query = supabase.from("transactions").select("*").in("account_id", accountIds)

  // Only apply date filter if days is provided and reasonable (< 2 years)
  if (days !== undefined && days > 0 && days < 730) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    query = query.gte("date", since.toISOString())
  }

  const { data, error } = await query.order("date", { ascending: false })

  if (error) {
    console.error("[vapi-data-handler] Error fetching transactions:", error.message)
    return { transactions: [], recent: [], monthlySpending: 0, monthlyIncome: 0 }
  }

  const transactions = (data ?? []).map((t: any) => ({
    ...t,
    amount: toNumber(t.amount),
  }))

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
    // Vapi sends the user's question in different places depending on the event type
    const userMessage = body.message?.content || 
                       body.transcript || 
                       body.userMessage || 
                       body.question ||
                       "What is my account balance?"

    // Extract userId from Vapi payload or use default
    const userId = body.userId || 
                   body.user?.id || 
                   body.variables?.userId ||
                   "11111111-1111-1111-1111-111111111111"

    console.log("[vapi-data-handler] Processing:", { userMessage, userId })

    // --- C. DETERMINE WHICH TOOLS TO CALL ---
    const lowerQ = userMessage.toLowerCase()
    let toolCalls: Array<{ name: string; args: any }> = []

    if (lowerQ.includes("loan") || lowerQ.includes("borrow")) {
      // Extract loan amount and term from question if possible, otherwise use defaults
      const amountMatch = userMessage.match(/(\d+)[,\s]*(?:000|k|thousand)/i)
      const termMatch = userMessage.match(/(\d+)\s*(?:month|year)/i)
      
      toolCalls = [{
        name: "getAccountsOverview",
        args: { userId }
      }]
      // Note: Loan analysis would require more complex logic, simplified for now
    } else if (lowerQ.includes("spend") || lowerQ.includes("saving") || lowerQ.includes("expense") || lowerQ.includes("transaction")) {
      toolCalls = [
        { name: "getRecentTransactions", args: { userId } },
        { name: "getAccountsOverview", args: { userId } },
      ]
    } else {
      // Default: get account overview
      toolCalls = [{ name: "getAccountsOverview", args: { userId } }]
    }

    // --- D. EXECUTE TOOLS ---
    const results: Record<string, any> = {}
    
    for (const call of toolCalls) {
      try {
        console.log(`[vapi-data-handler] Executing tool: ${call.name}`)
        if (call.name === "getAccountsOverview") {
          results.getAccountsOverview = await getAccountsOverview(supabase, call.args.userId)
        } else if (call.name === "getRecentTransactions") {
          results.getRecentTransactions = await getRecentTransactions(supabase, call.args.userId, call.args.days)
        }
      } catch (err) {
        console.error(`[vapi-data-handler] Tool ${call.name} failed:`, err)
        results[call.name] = { error: String(err) }
      }
    }

    // --- E. GENERATE NATURAL LANGUAGE ANSWER ---
    let resultMessage = ""
    
    if (geminiApiKey) {
      // Use Gemini to synthesize a natural answer
      const answerPrompt = `
You are the "Bank of the Future" AI banking assistant.

User ID: ${userId}
The user asked: "${userMessage}"

Tool results:
${JSON.stringify(results, null, 2)}

TASK:
- Provide a clear, concise answer that can be spoken aloud.
- Use the numbers and facts from the tool results; do not invent data.
- If tool results show empty arrays or zero values, politely explain you couldn't find account information for user ID ${userId}.
- Format currency as "AED X,XXX.XX" when mentioning amounts.
- Keep the tone professional but friendly.
- DO NOT include markdown, bullet points, or code blocks. Plain text sentences only.
- Keep it brief - 2-3 sentences maximum for voice.
`
      try {
        resultMessage = await callGemini(answerPrompt, geminiApiKey)
      } catch (err) {
        console.error("[vapi-data-handler] Gemini call failed:", err)
        // Fallback to simple response
        resultMessage = formatSimpleResponse(results, userId)
      }
    } else {
      // Fallback: simple formatting without Gemini
      resultMessage = formatSimpleResponse(results, userId)
    }

    // --- F. FORMAT RESPONSE FOR VAPI ---
    // Vapi expects results in this format if called as a tool
    // If Vapi is calling this as a server function, we need to check the request structure
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
        toolCalls,
        toolResults: results,
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

  if (accounts && accounts.accounts && accounts.accounts.length > 0) {
    const total = accounts.totalBalance.toFixed(2)
    return `I found ${accounts.accounts.length} account${accounts.accounts.length > 1 ? 's' : ''}. Your total balance is AED ${total}.`
  } else if (transactions && transactions.transactions && transactions.transactions.length > 0) {
    return `I found ${transactions.transactions.length} transaction${transactions.transactions.length > 1 ? 's' : ''}. Your monthly spending is AED ${transactions.monthlySpending.toFixed(2)}.`
  } else {
    return `I couldn't find any account information for user ID ${userId}. Please check that the user ID is correct and that accounts exist in the database.`
  }
}

