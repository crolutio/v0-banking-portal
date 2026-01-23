import { NextResponse } from "next/server"
import { runLangGraphAgent } from "@/lib/agent/langgraph-agent"
import { createDirectClient } from "@/lib/supabase/direct-client"

export const runtime = "nodejs"

// Simple, fast voice-only handler for Vapi.
// Does NOT use LangGraph – it just pulls key numbers for the user.
async function buildSimpleVoiceAnswer(userId: string): Promise<string> {
  try {
    const supabase = createDirectClient()

    const { data: accounts, error } = await supabase
      .from("accounts")
      .select("id, name, balance, available_balance, currency")
      .eq("customer_id", userId)

    if (error) {
      console.error("[agent/voice] Error fetching accounts:", error.message)
      return "I'm sorry, I couldn't access your account information right now. Please try again."
    }

    if (!accounts || accounts.length === 0) {
      return "I couldn't find your account information."
    }

    const toNumber = (value: any) => {
      const num = Number(value)
      return Number.isFinite(num) ? num : 0
    }

    // Convert all balances to AED (USD rate = 3.67)
    const totalBalance = accounts.reduce((sum: number, a: any) => {
      const balance = toNumber(a.balance)
      const rate = a.currency === "USD" ? 3.67 : 1
      return sum + (balance * rate)
    }, 0)
    const availableCash = accounts.reduce((sum: number, a: any) => {
      const balance = toNumber(a.available_balance ?? a.balance)
      const rate = a.currency === "USD" ? 3.67 : 1
      return sum + (balance * rate)
    }, 0)

    const accountCount = accounts.length
    const accountLabel = accountCount === 1 ? "account" : "accounts"

    // Short, voice-friendly summary – Vapi will just speak this string.
    return `You have ${accountCount} ${accountLabel}. Your total balance is AED ${totalBalance.toFixed(
      2,
    )}, and your available cash is AED ${availableCash.toFixed(2)}.`
  } catch (error: any) {
    console.error("[agent/voice] Unexpected error in buildSimpleVoiceAnswer:", error)
    return "I'm sorry, I had trouble looking up your information. Please try again."
  }
}

export async function POST(req: Request) {
  let body: any = {}
  try {
    body = await req.json()
    
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
      requestedUserId = "4e140685-8f38-49ff-aae0-d6109c46873d" // Sarah Chen
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

    // Detect if this is a Vapi request (voice-only path).
    // Vapi API Request / tools send: { question, userId, ... } or { message: { toolCalls: [...] } }
    const isVapiRequest = !!(
      body.message?.toolCalls ||
      toolCall ||
      body.toolCallId ||
      body.function?.name || // Custom tool format
      (body.question && !body.agentId) // Has question but no agentId (likely Vapi)
    )

    // -----------------------------------------------------------------------
    // VOICE-ONLY PATH (Vapi) – NO LANGGRAPH
    // -----------------------------------------------------------------------
    if (isVapiRequest) {
      console.log("[agent] Handling Vapi voice request WITHOUT LangGraph", {
        userId,
        agentId,
        currentPage,
      })

      let answer = await buildSimpleVoiceAnswer(userId)

      // Basic cleanup – keep it voice friendly.
      answer = answer
        .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII
        .replace(/\s+/g, " ")
        .trim()

      if (!/[.!?]$/.test(answer)) {
        answer = answer + "."
      }

      console.log("[agent] Simple voice answer:", answer)

      // Vapi tool call formats
      if (toolCall?.id) {
        return NextResponse.json(
          {
            results: [
              {
                toolCallId: toolCall.id,
                result: answer,
              },
            ],
          },
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
          },
        )
      } else if (body.toolCallId) {
        return NextResponse.json(
          {
            results: [
              {
                toolCallId: body.toolCallId,
                result: answer,
              },
            ],
          },
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
          },
        )
      }

      // Fallback Vapi format without explicit toolCallId
      return NextResponse.json(
        {
          result: answer,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        },
      )
    }

    // -----------------------------------------------------------------------
    // TEXT / HYBRID PATH – LANGGRAPH
    // -----------------------------------------------------------------------
    console.log(`[agent] Running LangGraph agent for user: ${userId} (voice: false)`)
    
    let answer: string
    try {
      // Text path – more generous timeout
      const timeoutMs = 30000 // 30s for text
      
      const agentResult = await Promise.race([
        runLangGraphAgent({
          question,
          userId,
          apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
          agentId,
          currentPage,
        }),
        new Promise<{ answer: string; shortAnswer?: string }>((_, reject) => 
          setTimeout(() => reject(new Error("Agent timeout")), timeoutMs)
        )
      ])
      
      answer = agentResult.answer
      
      // Validate answer is a non-empty string
      if (!answer || typeof answer !== "string" || answer.trim().length === 0) {
        console.warn("[agent] Empty or invalid answer received, using fallback")
        answer = "I'm sorry, I couldn't generate a response. Please try again."
      }
      
      console.log(`[agent] Agent completed successfully, answer length: ${answer?.length || 0}`)
      if (answer && answer.length > 0) {
        console.log(`[agent] Answer preview: ${answer.substring(0, 100)}...`)
      }
    } catch (error: any) {
      console.error("[agent] LangGraph agent error:", error)
      console.error("[agent] Error message:", error?.message)
      console.error("[agent] Error stack:", error?.stack)
      
      // Return a user-friendly error message that won't break Vapi
      if (error?.message?.includes("timeout")) {
        answer = "I'm taking a bit longer than usual. Please try asking again."
      } else if (error?.message?.includes("StateGraph") || error?.message?.includes("Annotation")) {
        // LangGraph initialization error - use a simple fallback
        console.error("[agent] LangGraph initialization error, using simple response")
        answer = "Hello! I'm here to help with your banking questions. What would you like to know?"
      } else {
        answer = "I'm sorry, I encountered an error processing your request. Please try again."
      }
    }
    
    // Final validation - ensure answer is always a valid string
    if (!answer || typeof answer !== "string" || answer.trim().length === 0) {
      console.error("[agent] Answer validation failed, using emergency fallback")
      answer = "I'm sorry, I'm having trouble right now. Could you please try again?"
    }

    // Standard API response format (for Next.js chat interface)
    return NextResponse.json({ answer })
  } catch (error: any) {
    console.error("[agent] Top-level error:", error)
    console.error("[agent] Error message:", error?.message)
    
    // For Vapi requests, always return a valid response format even on error
    // This prevents Vapi from cutting the call
    const isVapiRequest = !!(body?.message?.toolCalls || body?.toolCallId || body?.question)
    
    if (isVapiRequest) {
      const toolCall = body?.message?.toolCalls?.[0]
      const errorMessage = "I'm sorry, I encountered an error. Please try again."
      
      if (toolCall?.id) {
        return NextResponse.json({
          results: [
            {
              toolCallId: toolCall.id,
              result: errorMessage
            }
          ]
        })
      } else if (body?.toolCallId) {
        return NextResponse.json({
          results: [
            {
              toolCallId: body.toolCallId,
              result: errorMessage
            }
          ]
        })
      } else {
        return NextResponse.json({
          result: errorMessage
        })
      }
    }
    
    // For non-Vapi requests, return error status
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 },
    )
  }
}


