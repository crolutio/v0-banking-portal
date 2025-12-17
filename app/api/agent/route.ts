import { NextResponse } from "next/server"
import { runLangGraphAgent } from "@/lib/agent/langgraph-agent"

export const runtime = "nodejs"

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

    // -----------------------------------------------------------------------
    // Use LangGraph Agent (for both voice and text)
    // -----------------------------------------------------------------------
    const isVoice = !!(body.message?.toolCalls || toolCall || body.toolCallId)
    
    console.log(`[agent] Running LangGraph agent for user: ${userId} (voice: ${isVoice})`)
    
    let answer: string
    try {
      // Add timeout for voice mode to prevent long waits
      const timeoutMs = isVoice ? 12000 : 30000 // 12s for voice, 30s for text
      
      const agentResult = await Promise.race([
        runLangGraphAgent({
          question,
          userId,
          apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
          isVoice,
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
    
    // Clean up answer for voice mode - remove markdown and ensure it's speakable
    if (isVoice) {
      // Remove markdown formatting that might break TTS
      answer = answer
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/`(.*?)`/g, '$1') // Remove code
        .replace(/#{1,6}\s+/g, '') // Remove headers
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links
        .replace(/\n{3,}/g, '. ') // Convert multiple newlines to periods
        .replace(/\n/g, '. ') // Convert single newlines to periods
        .replace(/\.{2,}/g, '.') // Normalize multiple periods
        .replace(/\s{2,}/g, ' ') // Normalize multiple spaces
        .trim()
      
      // Remove any remaining special characters that might break TTS
      answer = answer
        .replace(/[^\w\s.,!?;:()'-]/g, '') // Remove special chars except common punctuation
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim()
      
      // Ensure minimum length for voice
      if (answer.length < 10) {
        answer = "I understand. " + answer
      }
      
      // Ensure it ends with proper punctuation
      if (!/[.!?]$/.test(answer)) {
        answer = answer + "."
      }
      
      console.log(`[agent] Voice answer cleaned, final length: ${answer.length}`)
      console.log(`[agent] Voice answer preview: ${answer.substring(0, 200)}`)
    }

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


