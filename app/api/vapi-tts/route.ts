import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Vapi TTS API endpoint
 * Called by Vapi to get text to speak
 * Returns the text that Vapi should speak
 */
export async function POST(req: Request) {
  try {
    // Vapi will call this endpoint with the text to speak
    // The request body format depends on how Vapi is configured
    const body = await req.json()
    
    // Extract text from various possible formats
    const text = body.text || 
                 body.textToSpeak || 
                 body.message || 
                 body.content ||
                 body.query ||
                 body.input
    
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { 
          error: "Missing or invalid 'text' parameter",
          received: Object.keys(body)
        },
        { status: 400 }
      )
    }
    
    // Clean the text for TTS
    let cleanText = text
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
    
    // Ensure it ends with proper punctuation
    if (!/[.!?]$/.test(cleanText)) {
      cleanText = cleanText + "."
    }
    
    // Return the text for Vapi to speak
    // Vapi expects either a string or an object with a text/result field
    return NextResponse.json(
      {
        result: cleanText,
        text: cleanText, // Alternative field name
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      }
    )
  } catch (error: any) {
    console.error("[Vapi TTS] Error:", error)
    return NextResponse.json(
      { 
        error: error?.message || "Internal Server Error",
        result: "I'm sorry, I encountered an error processing that request."
      },
      { status: 500 }
    )
  }
}

