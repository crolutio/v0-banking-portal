import { useState, useEffect, useRef, useCallback } from "react"
import { RetellWebClient } from "retell-client-js-sdk"

export interface TranscriptMessage {
  role: "agent" | "user"
  content: string
  timestamp: number
}

export interface UseRetellVoiceOptions {
  /**
   * Optional custom agent ID (overrides env variable)
   */
  agentId?: string
  /**
   * Optional metadata to attach to the call
   */
  metadata?: Record<string, unknown>
  /**
   * Dynamic variables to inject into the agent prompt
   */
  dynamicVariables?: Record<string, string>
  /**
   * Callback when a message is received (user or agent) - fires on every incremental update
   */
  onMessage?: (message: TranscriptMessage) => void
  /**
   * Callback when a user finishes their turn (complete message, not incremental)
   */
  onUserTurnComplete?: (message: TranscriptMessage) => void
  /**
   * Callback when an agent finishes their turn (complete message, not incremental)
   */
  onAgentTurnComplete?: (message: TranscriptMessage) => void
  /**
   * Callback when the call starts
   */
  onCallStart?: (callId: string) => void
  /**
   * Callback when the call ends
   */
  onCallEnd?: (transcript: TranscriptMessage[]) => void
  /**
   * Callback on error
   */
  onError?: (error: Error) => void
}

export interface UseRetellVoiceReturn {
  /**
   * Whether a call is currently active
   */
  isConnected: boolean
  /**
   * Whether the call is being established
   */
  isConnecting: boolean
  /**
   * Whether the agent is currently speaking
   */
  isSpeaking: boolean
  /**
   * Full transcript of the current call
   */
  transcript: TranscriptMessage[]
  /**
   * Current error, if any
   */
  error: string | null
  /**
   * Current call ID
   */
  callId: string | null
  /**
   * Start a voice call
   */
  startCall: () => Promise<void>
  /**
   * End the current call
   */
  endCall: () => void
  /**
   * Toggle call state (start if not connected, end if connected)
   */
  toggleCall: () => void
}

/**
 * Hook to manage Retell AI voice calls with real-time transcription
 */
export function useRetellVoice(options: UseRetellVoiceOptions = {}): UseRetellVoiceReturn {
  const {
    agentId,
    metadata,
    dynamicVariables,
    onMessage,
    onUserTurnComplete,
    onAgentTurnComplete,
    onCallStart,
    onCallEnd,
    onError,
  } = options

  const onMessageRef = useRef(onMessage)
  const onUserTurnCompleteRef = useRef(onUserTurnComplete)
  const onAgentTurnCompleteRef = useRef(onAgentTurnComplete)
  const onCallStartRef = useRef(onCallStart)
  const onCallEndRef = useRef(onCallEnd)
  const onErrorRef = useRef(onError)

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [callId, setCallId] = useState<string | null>(null)

  const retellClientRef = useRef<RetellWebClient | null>(null)
  const lastProcessedIndexRef = useRef<number>(0)
  const transcriptRef = useRef<TranscriptMessage[]>([])
  const lastTranscriptRef = useRef<Array<{ role: string; content: string }>>([])

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    onUserTurnCompleteRef.current = onUserTurnComplete
  }, [onUserTurnComplete])

  useEffect(() => {
    onAgentTurnCompleteRef.current = onAgentTurnComplete
  }, [onAgentTurnComplete])

  useEffect(() => {
    onCallStartRef.current = onCallStart
  }, [onCallStart])

  useEffect(() => {
    onCallEndRef.current = onCallEnd
  }, [onCallEnd])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  // Initialize Retell client on mount
  useEffect(() => {
    retellClientRef.current = new RetellWebClient()
    const client = retellClientRef.current

    client.on("call_started", () => {
      console.log("[Retell Hook] Call started")
      setIsConnected(true)
      setIsConnecting(false)
      setError(null)
      setTranscript([])
      transcriptRef.current = []
      lastTranscriptRef.current = []
      lastProcessedIndexRef.current = 0
    })

    client.on("call_ended", () => {
      console.log("[Retell Hook] Call ended")
      const finalTranscript = [...transcriptRef.current]
      
      // Fire turn complete for the last message if there is one
      if (finalTranscript.length > 0) {
        const lastMessage = finalTranscript[finalTranscript.length - 1]
        if (lastMessage.role === "user") {
          onUserTurnCompleteRef.current?.(lastMessage)
        } else if (lastMessage.role === "agent") {
          onAgentTurnCompleteRef.current?.(lastMessage)
        }
      }
      
      setIsConnected(false)
      setIsConnecting(false)
      setIsSpeaking(false)
      onCallEndRef.current?.(finalTranscript)
    })

    client.on("agent_start_talking", () => {
      setIsSpeaking(true)
    })

    client.on("agent_stop_talking", () => {
      setIsSpeaking(false)
    })

    client.on("update", (update: { transcript?: Array<{ role: string; content: string }> }) => {
      if (update.transcript && update.transcript.length > 0) {
        const previous = lastTranscriptRef.current
        const previousLength = previous.length
        const newMessages: TranscriptMessage[] = update.transcript.map((msg, index) => {
          const role = msg.role as "agent" | "user"
          const previousMessage = transcriptRef.current[index]
          const sameContent =
            previousMessage?.content === msg.content && previousMessage?.role === role

          return {
            role,
            content: msg.content,
            timestamp: sameContent ? previousMessage.timestamp : Date.now(),
          }
        })

        setTranscript(newMessages)
        transcriptRef.current = newMessages

        // Detect turn completion: when a new message is added, the previous message is complete
        if (update.transcript.length > previousLength && previousLength > 0) {
          const completedMessage = transcriptRef.current[previousLength - 1]
          if (completedMessage) {
            if (completedMessage.role === "user") {
              onUserTurnCompleteRef.current?.(completedMessage)
            } else if (completedMessage.role === "agent") {
              onAgentTurnCompleteRef.current?.(completedMessage)
            }
          }
        }

        // Notify about new or updated messages (incremental)
        for (let i = 0; i < newMessages.length; i++) {
          const previousMessage = previous[i]
          const nextMessage = newMessages[i]
          if (!previousMessage || previousMessage.content !== nextMessage.content) {
            onMessageRef.current?.(nextMessage)
          }
        }

        lastProcessedIndexRef.current = newMessages.length
        lastTranscriptRef.current = update.transcript
      }
    })

    client.on("error", (err: Error) => {
      console.error("[Retell Hook] Error:", err)
      const errorMessage = err.message || "An error occurred"
      setError(errorMessage)
      setIsConnecting(false)
      setIsConnected(false)
      onErrorRef.current?.(err)
    })

    return () => {
      try {
        retellClientRef.current?.stopCall()
      } catch {
        // Ignore cleanup errors
      }
    }
  }, [])

  const startCall = useCallback(async () => {
    if (!retellClientRef.current || isConnecting || isConnected) return

    setIsConnecting(true)
    setError(null)

    try {
      const response = await fetch("/api/retell/create-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          metadata,
          dynamicVariables,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create call")
      }

      const { accessToken, callId: newCallId } = await response.json()
      
      console.log("[Retell Hook] Starting call:", newCallId)
      setCallId(newCallId)

      await retellClientRef.current.startCall({
        accessToken,
        sampleRate: 24000,
      })

      onCallStartRef.current?.(newCallId)
    } catch (err) {
      console.error("[Retell Hook] Failed to start:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to start call"
      setError(errorMessage)
      setIsConnecting(false)
      onErrorRef.current?.(err instanceof Error ? err : new Error(errorMessage))
    }
  }, [agentId, metadata, dynamicVariables, isConnecting, isConnected])

  const endCall = useCallback(() => {
    retellClientRef.current?.stopCall()
    setIsConnected(false)
    setIsConnecting(false)
    setIsSpeaking(false)
    setCallId(null)
  }, [])

  const toggleCall = useCallback(() => {
    if (isConnected) {
      endCall()
    } else {
      startCall()
    }
  }, [isConnected, startCall, endCall])

  return {
    isConnected,
    isConnecting,
    isSpeaking,
    transcript,
    error,
    callId,
    startCall,
    endCall,
    toggleCall,
  }
}
