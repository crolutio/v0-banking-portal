"use client"

import React, { useEffect, useState } from "react"
import VapiBase from "@vapi-ai/web"

type VapiClient = InstanceType<typeof VapiBase>

interface VapiWidgetProps {
  apiKey: string
  assistantId: string
  config?: Record<string, unknown>
}

const VapiWidget: React.FC<VapiWidgetProps> = ({ apiKey, assistantId, config }) => {
  const [vapi, setVapi] = useState<VapiClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([])

  useEffect(() => {
    if (!apiKey) return

    const vapiInstance = new VapiBase(apiKey)
    setVapi(vapiInstance)

    console.log("[Vapi] Initializing client", {
      apiKeyPrefix: apiKey.slice(0, 6),
    })

    vapiInstance.on("call-start", () => {
      setIsConnected(true)
    })

    vapiInstance.on("call-end", () => {
      setIsConnected(false)
      setIsSpeaking(false)
    })

    vapiInstance.on("speech-start", () => {
      setIsSpeaking(true)
    })

    vapiInstance.on("speech-end", () => {
      setIsSpeaking(false)
    })

    vapiInstance.on("message", (message: any) => {
      if (message.type === "transcript") {
        setTranscript((prev) => [
          ...prev,
          {
            role: message.role,
            text: message.transcript,
          },
        ])
      }
    })

    vapiInstance.on("error", (error: any) => {
      console.error("Vapi error (raw):", error)
      try {
        console.error("Vapi error (json):", JSON.stringify(error, null, 2))
      } catch {
        // ignore
      }
    })

    return () => {
      vapiInstance.stop()
    }
  }, [apiKey])

  const startCall = () => {
    if (vapi && assistantId) {
      console.log("[Vapi] Starting call", { assistantId })
      vapi.start(assistantId)
    }
  }

  const endCall = () => {
    if (vapi) {
      vapi.stop()
    }
  }

  if (!apiKey || !assistantId) {
    return null
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 1000,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {!isConnected ? (
        <button
          onClick={startCall}
          style={{
            background: "#12A594",
            color: "#fff",
            border: "none",
            borderRadius: "999px",
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(18, 165, 148, 0.3)",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)"
            e.currentTarget.style.boxShadow = "0 6px 18px rgba(18, 165, 148, 0.4)"
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)"
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(18, 165, 148, 0.3)"
          }}
        >
          <span>🎤</span>
          <span>Talk to Assistant</span>
        </button>
      ) : (
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "16px",
            width: "320px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
            border: "1px solid #e1e5e9",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: isSpeaking ? "#ff4444" : "#12A594",
                  animation: isSpeaking ? "vapi-pulse 1s infinite" : "none",
                }}
              />
              <span style={{ fontWeight: 600, color: "#111827", fontSize: "14px" }}>
                {isSpeaking ? "Assistant Speaking..." : "Listening..."}
              </span>
            </div>
            <button
              onClick={endCall}
              style={{
                background: "#ff4444",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 10px",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              End
            </button>
          </div>

          <div
            style={{
              maxHeight: "200px",
              overflowY: "auto",
              marginBottom: "8px",
              padding: "8px",
              background: "#f9fafb",
              borderRadius: "8px",
            }}
          >
            {transcript.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>Conversation will appear here…</p>
            ) : (
              transcript.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: "6px",
                    textAlign: msg.role === "user" ? "right" : "left",
                  }}
                >
                  <span
                    style={{
                      background: msg.role === "user" ? "#12A594" : "#111827",
                      color: "#fff",
                      padding: "6px 10px",
                      borderRadius: "12px",
                      display: "inline-block",
                      fontSize: "13px",
                      maxWidth: "80%",
                    }}
                  >
                    {msg.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes vapi-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default VapiWidget


