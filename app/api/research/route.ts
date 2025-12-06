import { NextResponse } from "next/server"
import { getAgentPersona } from "@/lib/ai/agents"

const PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/chat/completions"

export async function POST(req: Request) {
  try {
    const { messages = [], agentId = "researcher" } = await req.json()
    const apiKey = process.env.PERPLEXITY_API_KEY

    if (!apiKey) {
      return new NextResponse("Missing Perplexity API key", { status: 500 })
    }

    const persona = getAgentPersona(agentId)
    const systemPrompt = `${persona.personaPrompt}

Guidelines:
- Use real-time data and cite sources using markdown links where possible.
- Highlight actionable investment implications, risk factors, and catalysts.
- Keep responses concise (<= 250 words) unless the user requests more detail.`

    const payload = {
      model: "pplx-70b-online",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    }

    const pplxResponse = await fetch(PERPLEXITY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!pplxResponse.ok || !pplxResponse.body) {
      const errorText = await pplxResponse.text()
      return new NextResponse(errorText || "Perplexity request failed", { status: 500 })
    }

    return new NextResponse(pplxResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
      },
    })
  } catch (error: any) {
    console.error("Perplexity error:", error)
    return new NextResponse(error?.message || "Internal Server Error", { status: 500 })
  }
}

