import { NextResponse } from "next/server"
import { getAgentPersona } from "@/lib/ai/agents"

const PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/chat/completions"

// Using the latest supported online model
const MODEL_NAME = "llama-3.1-sonar-large-128k-online"

export async function POST(req: Request) {
  try {
    const { messages = [], agentId = "researcher" } = await req.json()
    const apiKey = process.env.PERPLEXITY_API_KEY

    if (!apiKey) {
      console.error("Missing Perplexity API key in environment variables")
      return new NextResponse(
        JSON.stringify({ error: "Missing Perplexity API key" }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const persona = getAgentPersona(agentId)
    const systemPrompt = `${persona.personaPrompt}

Guidelines:
- Use real-time data and cite sources using markdown links where possible.
- Highlight actionable investment implications, risk factors, and catalysts.
- Keep responses concise (<= 250 words) unless the user requests more detail.`

    const payload = {
      model: MODEL_NAME,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    }

    // console.log("Calling Perplexity API with model:", MODEL_NAME)

    const pplxResponse = await fetch(PERPLEXITY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!pplxResponse.ok) {
      const errorText = await pplxResponse.text()
      console.error(`Perplexity API Error (${pplxResponse.status}):`, errorText)
      return new NextResponse(
        JSON.stringify({ error: `Perplexity API Error: ${errorText}` }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    if (!pplxResponse.body) {
      return new NextResponse(
        JSON.stringify({ error: "No response body from Perplexity" }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    return new NextResponse(pplxResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
      },
    })
  } catch (error: any) {
    console.error("Perplexity route error:", error)
    return new NextResponse(
      JSON.stringify({ error: error?.message || "Internal Server Error" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
