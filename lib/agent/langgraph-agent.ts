import { StateGraph, END, START, Annotation } from "@langchain/langgraph"
import { GoogleGenerativeAI } from "@google/generative-ai"
import {
  getAccountsOverview,
  getRecentTransactions,
  analyzeSpending,
  analyzeLoanPreapprovalForUser,
} from "./tools"
import { createDirectClient } from "@/lib/supabase/direct-client"

// Helper to safely fetch data from any Supabase table
async function fetchData(table: string, userId: string, column = "user_id") {
  const supabase = createDirectClient()
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq(column, userId)
    
    if (error) {
      console.error(`[langgraph-agent] Error fetching ${table}:`, error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.error(`[langgraph-agent] Exception fetching ${table}:`, err)
    return []
  }
}

// Define the agent state
interface AgentState extends Record<string, any> {
  question: string
  userId: string
  agentId: string
  currentPage: string
  isVoice: boolean
  isHybrid?: boolean // New: hybrid mode (long chat + short voice)
  toolResults: Record<string, any>
  allData?: {
    accounts: any[]
    cards: any[]
    loans: any[]
    transactions: any[]
    holdings: any[]
    goals: any[]
    rewardProfile: any
    rewardActivities: any[]
    supportTickets: any[]
  }
  answer?: string
  shortAnswer?: string // New: short summary for voice
  iteration: number
}

// Tool definitions for Gemini
const toolDefinitions = [
  {
    name: "getAccountsOverview",
    description: "Get all of the user's accounts, balances, and total cash.",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "The user ID" },
      },
      required: ["userId"],
    },
  },
  {
    name: "getRecentTransactions",
    description: "Get recent transactions and spending/income totals. Omit days to get all transactions.",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "The user ID" },
        days: { type: "number", description: "Number of days to look back (optional, omit for all transactions)" },
      },
      required: ["userId"],
    },
  },
  {
    name: "analyzeSpending",
    description: "Analyze spending patterns, forecasts, and savings opportunities using all historical data.",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "The user ID" },
      },
      required: ["userId"],
    },
  },
  {
    name: "analyzeLoanPreapprovalForUser",
    description: "Analyze whether the user can afford a requested loan and compute monthly payment, DTI, and strengths/concerns.",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "The user ID" },
        requestedAmount: { type: "number", description: "The requested loan amount" },
        requestedTerm: { type: "number", description: "The loan term in months" },
      },
      required: ["userId", "requestedAmount", "requestedTerm"],
    },
  },
  {
    name: "fetchAllData",
    description: "Fetch all user data at once (accounts, cards, loans, transactions, investments, goals, rewards, support tickets). Use this when the question is general or you need comprehensive information.",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "The user ID" },
      },
      required: ["userId"],
    },
  },
]

// Tool execution function
async function executeTool(toolName: string, args: any, userId: string): Promise<any> {
  console.log(`[langgraph-agent] Executing tool: ${toolName}`, args)
  
  switch (toolName) {
    case "getAccountsOverview":
      return await getAccountsOverview(args.userId || userId)
    
    case "getRecentTransactions":
      return await getRecentTransactions(args.userId || userId, args.days)
    
    case "analyzeSpending":
      return await analyzeSpending(args.userId || userId)
    
    case "analyzeLoanPreapprovalForUser":
      return await analyzeLoanPreapprovalForUser(
        args.userId || userId,
        args.requestedAmount || 50000,
        args.requestedTerm || 24
      )
    
    case "fetchAllData":
      // Fetch all data from Supabase
      const accounts = await fetchData("accounts", args.userId || userId)
      const accountIds = accounts.map((a: any) => a.id)
      
      const [
        cards,
        loans,
        holdings,
        goals,
        rewardProfileResult,
        rewardActivities,
        supportTickets
      ] = await Promise.all([
        fetchData("cards", args.userId || userId),
        fetchData("loans", args.userId || userId),
        fetchData("portfolio_holdings", args.userId || userId),
        fetchData("savings_goals", args.userId || userId),
        fetchData("reward_profiles", args.userId || userId),
        fetchData("reward_activities", args.userId || userId),
        fetchData("support_tickets", args.userId || userId)
      ])
      
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
        }
      }
      
      const rewardProfile = rewardProfileResult.length > 0 ? rewardProfileResult[0] : null
      
      return {
        accounts,
        cards,
        loans,
        transactions,
        holdings,
        goals,
        rewardProfile,
        rewardActivities,
        supportTickets,
      }
    
    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

// Pre-fetch node: Load all data into cache (runs first)
async function prefetchNode(state: AgentState): Promise<Partial<AgentState>> {
  try {
    console.log(`[langgraph-agent] Pre-fetching data for user: ${state.userId} (voice: ${state.isVoice})`)
    
    // For voice, use a timeout to fail fast if it takes too long
    const timeoutMs = state.isVoice ? 3000 : 10000
    
    type AllData = {
      accounts: any[]
      cards: any[]
      loans: any[]
      transactions: any[]
      holdings: any[]
      goals: any[]
      rewardProfile: any
      rewardActivities: any[]
      supportTickets: any[]
    }
    
    const allData: AllData = await Promise.race([
      (async (): Promise<AllData> => {
        const accounts = await fetchData("accounts", state.userId)
        const accountIds = accounts.map((a: any) => a.id)
        
        const [
          cards,
          loans,
          holdings,
          goals,
          rewardProfileResult,
          rewardActivities,
          supportTickets
        ] = await Promise.all([
          fetchData("cards", state.userId),
          fetchData("loans", state.userId),
          fetchData("portfolio_holdings", state.userId),
          fetchData("savings_goals", state.userId),
          fetchData("reward_profiles", state.userId),
          fetchData("reward_activities", state.userId),
          fetchData("support_tickets", state.userId)
        ])
        
        let transactions: any[] = []
        if (accountIds.length > 0) {
          const supabase = createDirectClient()
          const { data: txData, error: txError } = await supabase
            .from("transactions")
            .select("*")
            .in("account_id", accountIds)
            .order("date", { ascending: false })
            .limit(state.isVoice ? 100 : 1000) // Limit transactions for voice
        
          if (!txError && txData) {
            transactions = txData
          }
        }
        
        const rewardProfile = rewardProfileResult.length > 0 ? rewardProfileResult[0] : null
        
        return {
          accounts,
          cards,
          loans,
          transactions,
          holdings,
          goals,
          rewardProfile,
          rewardActivities,
          supportTickets,
        }
      })(),
      new Promise<AllData>((_, reject) => 
        setTimeout(() => reject(new Error("Prefetch timeout")), timeoutMs)
      )
    ])
    
    console.log(`[langgraph-agent] Pre-fetch completed: ${allData.accounts.length} accounts, ${allData.transactions.length} transactions`)
    
    return { allData }
  } catch (error: any) {
    console.error("[langgraph-agent] Pre-fetch error:", error)
    // Return empty state on error - agent can still try to work
    return { allData: undefined }
  }
}

// Planning node: Decide which tools to call (AGENT REASONING)
// For voice mode, skip planning and go straight to answer with cached data
async function planNode(state: AgentState): Promise<Partial<AgentState>> {
  // For voice mode with data available, skip planning and use data directly
  if (state.isVoice && state.allData) {
    console.log(`[langgraph-agent] Voice mode: Skipping planning, using prefetched data directly`)
    return {
      toolResults: {},
      iteration: state.iteration + 1,
    }
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "")
  const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" })

  // Tell agent that data is already loaded (no need to fetch again!)
  const dataContext = state.allData 
    ? `\n\nIMPORTANT: All user data is already loaded in memory. You can use any tool and it will use the cached data (very fast, no database queries).`
    : `\n\nNote: Data will be fetched when tools are called.`

  // AGENT BEHAVIOR: The AI reasons about what it needs to do
  const planningPrompt = `
You are an autonomous AI agent for "Bank of the Future". You can THINK and DECIDE what actions to take.

The user asked: "${state.question}"
${dataContext}

Available tools (your capabilities):
${toolDefinitions.map(t => `- ${t.name}: ${t.description}`).join("\n")}

Your job: REASON about what information you need to answer this question, then DECIDE which tools to call.

Examples of reasoning:
- "What's my balance?" → Need: getAccountsOverview
- "How much did I spend on restaurants?" → Need: getRecentTransactions (then filter by category)
- "Can I afford a loan?" → Need: analyzeLoanPreapprovalForUser (requires requestedAmount and requestedTerm)
- "Tell me about my finances" → Need: fetchAllData (comprehensive view)

IMPORTANT: 
- All data is already loaded, so tools will execute instantly (no database queries)
- You can call MULTIPLE tools if needed
- Think step by step

Respond ONLY with valid JSON:
{
  "reasoning": "Brief explanation of why you're calling these tools",
  "toolCalls": [
    { "name": "toolName", "args": { "userId": "${state.userId}", ... } }
  ]
}
`

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: planningPrompt }] }],
    })
    const response = typeof result.response.text === 'function' 
      ? result.response.text() 
      : result.response.text || ""
    
    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      // Fallback: use cached data directly
      console.log(`[langgraph-agent] No plan found, using cached data directly`)
      return {
        toolResults: {},
        iteration: state.iteration + 1,
      }
    }

    const plan = JSON.parse(jsonMatch[0])
    const toolCalls = plan.toolCalls || []
    
    console.log(`[langgraph-agent] Agent reasoning: ${plan.reasoning || "No reasoning provided"}`)
    console.log(`[langgraph-agent] Agent decided to call: ${toolCalls.map((t: any) => t.name).join(", ")}`)

    // Execute tools
    const toolResults: Record<string, any> = {}
    let allData: any = state.allData || null

    for (const call of toolCalls) {
      try {
        const result = await executeTool(call.name, call.args || {}, state.userId)
        toolResults[call.name] = result
        
        // If fetchAllData was called, store it
        if (call.name === "fetchAllData") {
          allData = result
        }
      } catch (toolError) {
        console.error(`[langgraph-agent] Tool ${call.name} failed:`, toolError)
        toolResults[call.name] = { error: String(toolError) }
      }
    }

    return { toolResults, allData: allData || state.allData, iteration: state.iteration + 1 }
  } catch (error) {
    console.error("[langgraph-agent] Planning failed, using cached data directly:", error)
    // Fallback: use cached data
    return { toolResults: {}, allData: state.allData, iteration: state.iteration + 1 }
  }
}

// Decision node: Decide if we need more information or can answer
function shouldContinueNode(state: any): "continue" | "answer" {
  // For voice mode with data, always go to answer
  if (state.isVoice && state.allData) {
    return "answer"
  }
  
  // AGENT BEHAVIOR: Check if we have enough information
  const hasData = state.allData || Object.keys(state.toolResults).length > 0
  const hasErrors = Object.values(state.toolResults).some((r: any) => r?.error)
  
  // If we have errors or no data after first iteration, fetch all data
  if (state.iteration === 1 && (hasErrors || !hasData)) {
    console.log("[langgraph-agent] Agent decided: Need more data, fetching all")
    return "continue"
  }
  
  // Otherwise, we have enough to answer
  return "answer"
}

// Answer synthesis node: Generate final answer
async function answerNode(state: AgentState): Promise<Partial<AgentState>> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "")
  const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" })

  // Build data context
  let dataContext = ""
  
  if (state.allData && state.allData.accounts && state.allData.accounts.length > 0) {
    // Use allData if available
    dataContext = `
FINANCIAL DATA:

1. ACCOUNTS:
${JSON.stringify(state.allData.accounts.map((a: any) => ({ id: a.id, name: a.name, type: a.type, balance: a.balance, available_balance: a.available_balance, currency: a.currency })))}

2. CARDS:
${JSON.stringify(state.allData.cards.map((c: any) => ({ id: c.id, type: c.type, last4: c.last4, expiry: c.expiry, status: c.status, limit: c.limit })))}

3. LOANS:
${JSON.stringify(state.allData.loans.map((l: any) => ({ id: l.id, type: l.type, amount: l.amount, remaining: l.remaining, interest_rate: l.interest_rate, monthly_payment: l.monthly_payment, status: l.status })))}

4. RECENT TRANSACTIONS (Last 50 of ${state.allData.transactions.length}):
${JSON.stringify(state.allData.transactions.slice(0, 50).map((tx: any) => ({ date: tx.date, description: tx.description, amount: tx.amount, type: tx.type, category: tx.category, is_unusual: tx.is_unusual, unusual_reason: tx.unusual_reason })))}

5. INVESTMENT PORTFOLIO:
${JSON.stringify(state.allData.holdings.map((h: any) => ({ symbol: h.symbol, name: h.name, quantity: h.quantity, current_price: h.current_price, total_value: h.total_value })))}

6. SAVINGS GOALS:
${JSON.stringify(state.allData.goals.map((g: any) => ({ id: g.id, name: g.name, target: g.target, current: g.current, deadline: g.deadline, status: g.status })))}

7. REWARDS:
- Profile: ${JSON.stringify(state.allData.rewardProfile ? { tier: state.allData.rewardProfile.tier, points: state.allData.rewardProfile.points, next_tier: state.allData.rewardProfile.next_tier } : null)}
- Recent Activity: ${JSON.stringify(state.allData.rewardActivities.map((a: any) => ({ date: a.date, description: a.description, points: a.points })))}

8. SUPPORT TICKETS:
${JSON.stringify(state.allData.supportTickets.map((t: any) => ({ id: t.id, subject: t.subject, status: t.status, created_at: t.created_at })))}
`
  } else if (Object.keys(state.toolResults).length > 0) {
    // Use tool results
    dataContext = `TOOL RESULTS:\n${JSON.stringify(state.toolResults, null, 2)}`
  } else {
    // No data available - provide a helpful message
    dataContext = `No financial data is currently available. Please try again in a moment.`
  }

  // Hybrid mode: Generate both long (chat) and short (voice) answers
  if (state.isHybrid) {
    const longPrompt = `
You are the "Bank of the Future" AI banking assistant. Provide helpful, detailed answers about the user's banking data. Format currency as AED (e.g., AED 1,250.00).

User ID: ${state.userId}
Agent persona: ${state.agentId}
Current page: ${state.currentPage}

The user asked: "${state.question}"

${dataContext}

GUIDELINES:
- Answer based ONLY on the provided data.
- Provide helpful, detailed answers with context and explanations.
- Format currency as AED (e.g., AED 1,250.00).
- If asked about something not in the data, say you don't have that information.
- Transaction types: "credit" = income/deposits, "debit" = spending/withdrawals.
- Current Date: ${new Date().toISOString().split('T')[0]}
- Be professional but friendly.
- You can use markdown formatting, bullet points, and code blocks for better readability.
`

    const shortPrompt = `
You are the "Bank of the Future" AI banking assistant speaking to a user via voice. Provide a SHORT summary (1-2 sentences maximum) for voice interaction. Keep it brief and conversational. Format currency as "AED X,XXX" (no decimals).

User ID: ${state.userId}
Agent persona: ${state.agentId}
Current page: ${state.currentPage}

The user asked: "${state.question}"

${dataContext}

GUIDELINES:
- Provide a SHORT, concise summary (1-2 sentences maximum) for voice interaction.
- Format currency as "AED X,XXX" (no decimals).
- Be conversational and friendly.
- DO NOT include markdown, bullet points, or code blocks. Plain text sentences only.
`

    try {
      // Generate both answers in parallel
      const [longResult, shortResult] = await Promise.all([
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: longPrompt }] }],
        }),
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: shortPrompt }] }],
        }),
      ])
      
      const longAnswer = typeof longResult.response.text === 'function'
        ? longResult.response.text()
        : longResult.response.text || "I couldn't generate a response."
      
      const shortAnswer = typeof shortResult.response.text === 'function'
        ? shortResult.response.text()
        : shortResult.response.text || "I couldn't generate a response."
      
      return { answer: longAnswer, shortAnswer }
    } catch (error) {
      console.error("[LangGraph] Hybrid answer generation failed:", error)
      return { 
        answer: "I'm sorry, I couldn't generate a response at this time. Please try again.",
        shortAnswer: "I couldn't generate a response."
      }
    }
  }

  // Regular mode: Single answer
  const systemPrompt = state.isVoice
    ? `You are the "Bank of the Future" AI banking assistant speaking to a user via voice. Provide SHORT answers (1-3 sentences maximum) for voice interaction. Keep it brief to avoid long pauses. Format currency as "AED X,XXX" (no decimals).`
    : `You are the "Bank of the Future" AI banking assistant. Provide helpful, detailed answers about the user's banking data. Format currency as AED (e.g., AED 1,250.00).`

  const answerPrompt = `
${systemPrompt}

User ID: ${state.userId}
Agent persona: ${state.agentId}
Current page: ${state.currentPage}

The user asked: "${state.question}"

${dataContext}

GUIDELINES:
- Answer based ONLY on the provided data.
${state.isVoice ? "- Provide a SHORT, concise answer (1-3 sentences maximum) for voice interaction." : "- Provide helpful, detailed answers."}
- Format currency as ${state.isVoice ? '"AED X,XXX" (no decimals)' : 'AED (e.g., AED 1,250.00)'}.
- If asked about something not in the data, say you don't have that information.
- Transaction types: "credit" = income/deposits, "debit" = spending/withdrawals.
- Current Date: ${new Date().toISOString().split('T')[0]}
- Be professional but friendly.
- DO NOT include markdown, bullet points, or code blocks. Plain text sentences only.
`

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: answerPrompt }] }],
    })
    const answer = typeof result.response.text === 'function'
      ? result.response.text()
      : result.response.text || "I couldn't generate a response."
    return { answer }
  } catch (error) {
    console.error("[LangGraph] Answer generation failed:", error)
    return { answer: "I'm sorry, I couldn't generate a response at this time. Please try again." }
  }
}

// Create the LangGraph workflow with AGENT BEHAVIOR + DATA CACHING
function createAgentGraph() {
  // Define state schema using Annotation - LangGraph v1.0.5 syntax
  const StateAnnotation = Annotation.Root({
    question: Annotation(),
    userId: Annotation(),
    agentId: Annotation(),
    currentPage: Annotation(),
    isVoice: Annotation(),
    isHybrid: Annotation(),
    toolResults: Annotation(),
    allData: Annotation(),
    answer: Annotation(),
    shortAnswer: Annotation(),
    iteration: Annotation(),
  })
  
  const workflow = new StateGraph(StateAnnotation)
    .addNode("prefetch", prefetchNode) // Pre-fetch all data first
    .addNode("plan", planNode)
    .addNode("fetchAll", async (state: AgentState) => {
      // If agent decides it needs all data, fetch it
      const allData = await executeTool("fetchAllData", { userId: state.userId }, state.userId)
      return { allData, iteration: state.iteration + 1 }
    })
    .addNode("generateAnswer", answerNode) // Renamed from "answer" to avoid conflict with state attribute
    .addEdge(START, "prefetch") // Start with pre-fetch
    .addEdge("prefetch", "plan") // Then plan with data available
    // CONDITIONAL EDGE: Agent decides what to do next
    .addConditionalEdges("plan", shouldContinueNode, {
      continue: "fetchAll",
      answer: "generateAnswer",
    })
    .addEdge("fetchAll", "generateAnswer")
    .addEdge("generateAnswer", END)

  return workflow.compile()
}

// Main function to run the agent
export async function runLangGraphAgent({
  question,
  userId,
  apiKey,
  isVoice = false,
  isHybrid = false,
  agentId = "banker",
  currentPage = "/home",
}: {
  question: string
  userId: string
  apiKey: string
  isVoice?: boolean
  isHybrid?: boolean
  agentId?: string
  currentPage?: string
}): Promise<{ answer: string; shortAnswer?: string }> {
  if (!apiKey) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY")
  }

  // Set API key in env for tool execution
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey

  const graph = createAgentGraph()

      const initialState: AgentState = {
        question,
        userId,
        agentId,
        currentPage,
        isVoice,
        isHybrid,
        toolResults: {},
        iteration: 0,
      }

  try {
    console.log(`[langgraph-agent] Invoking graph with state:`, {
      question: initialState.question.substring(0, 50) + "...",
      userId: initialState.userId,
      isVoice: initialState.isVoice,
    })
    
        const result = await graph.invoke(initialState as any) as AgentState
        
        const answer = result?.answer || "I couldn't generate a response."
        const shortAnswer = result?.shortAnswer
        console.log(`[langgraph-agent] Graph completed, answer length: ${typeof answer === 'string' ? answer.length : 0}, shortAnswer: ${shortAnswer ? 'yes' : 'no'}`)
        
        return { answer, shortAnswer }
  } catch (error: any) {
    console.error("[langgraph-agent] Graph execution error:", error)
    console.error("[langgraph-agent] Error message:", error?.message)
    console.error("[langgraph-agent] Error stack:", error?.stack)
    
    // For voice mode, return a quick fallback answer instead of throwing
    if (isVoice) {
      console.log("[langgraph-agent] Voice mode: Returning fallback answer due to error")
      return { answer: "I'm sorry, I'm having trouble processing that right now. Could you please try again?" }
    }
    
    throw error // Re-throw to be caught by route handler
  }
}
