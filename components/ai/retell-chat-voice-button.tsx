"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Loader2, Phone } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRetellVoice, type TranscriptMessage } from "@/lib/hooks/useRetellVoice"

interface RetellChatVoiceButtonProps {
  /**
   * Callback for incremental user speech updates (fires on every word)
   */
  onUserMessage?: (text: string) => void
  /**
   * Callback for incremental agent speech updates (fires on every word)
   */
  onAgentMessage?: (text: string) => void
  /**
   * Callback when user finishes speaking (complete message, not incremental)
   * Use this for sending messages to a chat/database
   */
  onUserTurnComplete?: (text: string) => void
  /**
   * Callback when agent finishes speaking (complete message, not incremental)
   */
  onAgentTurnComplete?: (text: string) => void
  /**
   * Optional callback when call ends with full transcript
   */
  onCallEnd?: (transcript: TranscriptMessage[]) => void
  /**
   * Optional custom agent ID
   */
  agentId?: string
  /**
   * Metadata to pass to the Retell agent (e.g., customer context)
   */
  metadata?: Record<string, unknown>
  /**
   * Dynamic variables for the agent prompt
   */
  dynamicVariables?: Record<string, string>
  /**
   * Visual variant
   */
  variant?: "default" | "outline" | "ghost" | "secondary"
  /**
   * Button size
   */
  size?: "default" | "sm" | "lg" | "icon"
  /**
   * Additional class names
   */
  className?: string
  /**
   * Show expanded view with status and transcript
   */
  showExpanded?: boolean
  /**
   * Whether the button is disabled
   */
  disabled?: boolean
}

/**
 * Voice button component that integrates Retell AI with chat interfaces.
 * 
 * When the user speaks, their transcribed speech is sent to `onUserMessage`.
 * When the AI agent responds, the response is sent to `onAgentMessage`.
 * 
 * This allows seamless integration with any chat system - just wire up
 * the callbacks to your existing message handling.
 */
export function RetellChatVoiceButton({
  onUserMessage,
  onAgentMessage,
  onUserTurnComplete,
  onAgentTurnComplete,
  onCallEnd,
  agentId,
  metadata,
  dynamicVariables,
  variant = "outline",
  size = "icon",
  className,
  showExpanded = false,
  disabled = false,
}: RetellChatVoiceButtonProps) {
  // Track the last processed message content to avoid duplicates
  const [lastUserContent, setLastUserContent] = useState<string>("")
  const [lastAgentContent, setLastAgentContent] = useState<string>("")

  const handleMessage = useCallback((message: TranscriptMessage) => {
    // Retell sends incremental updates, so we only want to process
    // when the content actually changes
    if (message.role === "user") {
      if (message.content !== lastUserContent) {
        setLastUserContent(message.content)
        onUserMessage?.(message.content)
      }
    } else if (message.role === "agent") {
      if (message.content !== lastAgentContent) {
        setLastAgentContent(message.content)
        onAgentMessage?.(message.content)
      }
    }
  }, [lastUserContent, lastAgentContent, onUserMessage, onAgentMessage])

  const handleUserTurnComplete = useCallback((message: TranscriptMessage) => {
    onUserTurnComplete?.(message.content)
  }, [onUserTurnComplete])

  const handleAgentTurnComplete = useCallback((message: TranscriptMessage) => {
    onAgentTurnComplete?.(message.content)
  }, [onAgentTurnComplete])

  const handleCallEnd = useCallback((transcript: TranscriptMessage[]) => {
    // Reset tracking state
    setLastUserContent("")
    setLastAgentContent("")
    onCallEnd?.(transcript)
  }, [onCallEnd])

  const {
    isConnected,
    isConnecting,
    isSpeaking,
    transcript,
    error,
    toggleCall,
  } = useRetellVoice({
    agentId,
    metadata,
    dynamicVariables,
    onMessage: handleMessage,
    onUserTurnComplete: handleUserTurnComplete,
    onAgentTurnComplete: handleAgentTurnComplete,
    onCallEnd: handleCallEnd,
  })

  const getButtonContent = () => {
    if (isConnecting) {
      return <Loader2 className="h-4 w-4 animate-spin" />
    }
    if (isConnected) {
      return <MicOff className="h-4 w-4" />
    }
    return <Mic className="h-4 w-4" />
  }

  const getButtonTitle = () => {
    if (isConnecting) return "Connecting to voice assistant..."
    if (isConnected) return isSpeaking ? "Agent speaking... Click to end" : "Listening... Click to end"
    if (error) return `Error: ${error}. Click to retry`
    return "Start voice conversation"
  }

  // Simple button mode
  if (!showExpanded) {
    if (disabled) {
      return null // Don't render when disabled
    }
    return (
      <Button
        type="button"
        variant={isConnected ? "default" : variant}
        size={size}
        className={cn(
          isConnected && "bg-red-500 hover:bg-red-600",
          className
        )}
        onClick={toggleCall}
        disabled={isConnecting}
        title={getButtonTitle()}
      >
        {getButtonContent()}
      </Button>
    )
  }

  // Expanded mode with status indicator
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant={isConnected ? "default" : variant}
        size={size}
        className={cn(isConnected && "bg-red-500 hover:bg-red-600")}
        onClick={toggleCall}
        disabled={isConnecting}
        title={getButtonTitle()}
      >
        {getButtonContent()}
      </Button>

      {/* Status indicator */}
      {isConnected && (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isSpeaking ? "bg-yellow-500 animate-pulse" : "bg-green-500"
            )}
          />
          <span className="text-xs text-muted-foreground">
            {isSpeaking ? "Agent speaking..." : "Listening..."}
          </span>
          {transcript.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {transcript.length} messages
            </Badge>
          )}
        </div>
      )}

      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  )
}

/**
 * Floating voice call button that appears in the corner of the screen
 */
export function RetellFloatingVoiceButton({
  onUserMessage,
  onAgentMessage,
  onCallEnd,
  agentId,
  metadata,
  dynamicVariables,
}: Omit<RetellChatVoiceButtonProps, 'variant' | 'size' | 'className' | 'showExpanded'>) {
  const [lastUserContent, setLastUserContent] = useState<string>("")
  const [lastAgentContent, setLastAgentContent] = useState<string>("")

  const handleMessage = useCallback((message: TranscriptMessage) => {
    if (message.role === "user") {
      if (message.content !== lastUserContent) {
        setLastUserContent(message.content)
        onUserMessage?.(message.content)
      }
    } else if (message.role === "agent") {
      if (message.content !== lastAgentContent) {
        setLastAgentContent(message.content)
        onAgentMessage?.(message.content)
      }
    }
  }, [lastUserContent, lastAgentContent, onUserMessage, onAgentMessage])

  const handleCallEnd = useCallback((transcript: TranscriptMessage[]) => {
    setLastUserContent("")
    setLastAgentContent("")
    onCallEnd?.(transcript)
  }, [onCallEnd])

  const {
    isConnected,
    isConnecting,
    isSpeaking,
    toggleCall,
  } = useRetellVoice({
    agentId,
    metadata,
    dynamicVariables,
    onMessage: handleMessage,
    onCallEnd: handleCallEnd,
  })

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <Button
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-xl transition-all duration-300 hover:scale-110",
          isConnected
            ? "bg-red-500 hover:bg-red-600"
            : "bg-primary hover:bg-primary/90"
        )}
        onClick={toggleCall}
        disabled={isConnecting}
        title={isConnected ? "End voice call" : "Start voice call"}
      >
        {isConnecting ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : isConnected ? (
          <Phone className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>

      {/* Speaking indicator */}
      {isConnected && isSpeaking && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full animate-ping" />
      )}
    </div>
  )
}
