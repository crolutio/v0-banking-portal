"use client"

import { useEffect, useState } from "react"
import VapiBase from "@vapi-ai/web"
import { Button } from "@/components/ui/button"
import { Mic, MicOff } from "lucide-react"

type VapiClient = InstanceType<typeof VapiBase>

interface VapiVoiceButtonProps {
  onFinalTranscript: (text: string) => void
  onUserTranscript?: (text: string) => void
  onAgentTranscript?: (text: string) => void
  onCallEnd?: () => void
}

export function VapiVoiceButton({ 
  onFinalTranscript, 
  onUserTranscript,
  onAgentTranscript,
  onCallEnd 
}: VapiVoiceButtonProps) {
  const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID

  const [vapi, setVapi] = useState<VapiClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [currentUtterance, setCurrentUtterance] = useState<string>("")

  // Initialise Vapi once on client
  useEffect(() => {
    console.log("[Vapi] Initializing with:", {
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey?.slice(0, 6),
      assistantId,
    })
    
    if (!apiKey || !assistantId) {
      console.warn("[Vapi] Missing API key or assistant ID", { apiKey: !!apiKey, assistantId: !!assistantId })
      return
    }

    const client = new VapiBase(apiKey)
    setVapi(client)

    client.on("call-start", () => {
      setIsConnected(true)
      setIsStarting(false)
      setCurrentUtterance("")
    })

    client.on("call-end", () => {
      setIsConnected(false)
      setIsStarting(false)
      setIsSpeaking(false)
      setCurrentUtterance("")
      onCallEnd?.()
    })

    client.on("speech-start", () => {
      setIsSpeaking(true)
      setCurrentUtterance("")
    })

    client.on("speech-end", () => {
      setIsSpeaking(false)
      // If there is any buffered text that never got a final flag, send it once
      if (currentUtterance.trim()) {
        onFinalTranscript(currentUtterance.trim())
        setCurrentUtterance("")
      }
    })

    client.on("message", (message: any) => {
      if (message?.type !== "transcript" || typeof message.transcript !== "string") return

      const text = message.transcript as string
      const role = (message as any).role || (message as any).speaker || "user" // user or assistant
      const isFinal =
        (message as any).final ??
        (message as any).isFinal ??
        (message as any).is_final ??
        false

      // Send live transcript updates
      if (role === "user" || role === "userMessage") {
        onUserTranscript?.(text)
      } else if (role === "assistant" || role === "assistantMessage" || role === "system") {
        onAgentTranscript?.(text)
      }

      // Accumulate partials in buffer for final user messages
      if (role === "user" || role === "userMessage") {
        setCurrentUtterance((prev) => {
          const next = text
          if (isFinal && next.trim()) {
            onFinalTranscript(next.trim())
            return ""
          }
          return next
        })
      }
    })

    client.on("error", (error: unknown) => {
      console.error("[Vapi] Voice error (raw):", error)
      try {
        const errorStr = JSON.stringify(error, null, 2)
        console.error("[Vapi] Voice error (json):", errorStr)
      } catch {
        console.error("[Vapi] Voice error (string):", String(error))
      }
      setIsStarting(false)
      setIsConnected(false)
    })

    return () => {
      client.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, assistantId, onFinalTranscript])

  const toggleCall = () => {
    if (!vapi || !assistantId) {
      console.error("[Vapi] Missing vapi client or assistantId", { vapi: !!vapi, assistantId })
      return
    }
    if (isConnected) {
      vapi.stop()
    } else {
      setIsStarting(true)
      console.log("[Vapi] Starting call with assistant:", assistantId)
      vapi.start(assistantId)
    }
  }

  // If Vapi env is not configured, hide the button to avoid confusion
  if (!apiKey || !assistantId) return null

  return (
    <Button
      type="button"
      variant={isConnected ? "default" : "outline"}
      size="icon"
      className="shrink-0"
      onClick={toggleCall}
      disabled={isStarting}
      title={
        isStarting
          ? "Starting voice assistant..."
          : isConnected
            ? "Stop voice assistant"
            : "Start voice assistant"
      }
    >
      {isStarting ? (
        <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      ) : isConnected || isSpeaking ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  )
}


