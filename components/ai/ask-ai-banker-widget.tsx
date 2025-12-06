"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, MessageSquare, Sparkles } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { AIBankerChatInterface, AI_AGENT_THEMES } from "@/components/ai/ai-banker-chat-interface"
import { AI_AGENT_PERSONAS, type AIAgentId } from "@/lib/ai/agents"

interface AskAIBankerWidgetProps {
  questions: string[]
  title?: string
  description?: string
  agentId?: AIAgentId
}

export function AskAIBankerWidget({
  questions,
  title,
  description,
  agentId = "banker"
}: AskAIBankerWidgetProps) {
  const theme = AI_AGENT_THEMES[agentId] ?? AI_AGENT_THEMES.banker
  const persona = AI_AGENT_PERSONAS[agentId] ?? AI_AGENT_PERSONAS.banker
  const displayTitle = title || `Ask ${persona.title}`
  const displayDescription = description || persona.shortDescription
  const [open, setOpen] = useState(false)
  const [initialQuestion, setInitialQuestion] = useState("")

  const handleQuestionClick = (question: string) => {
    setInitialQuestion(question)
    setOpen(true)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Card
        className="border rounded-2xl"
        style={{
          backgroundImage: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
          borderColor: theme.accentMuted
        }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <theme.icon className="h-5 w-5" style={{ color: theme.accent }} />
              <CardTitle className="text-lg">{displayTitle}</CardTitle>
            </div>
            {/* Sheet Trigger Button (Icon only) */}
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setInitialQuestion("")}>
                <MessageSquare className="h-5 w-5" style={{ color: theme.accent }} />
              </Button>
            </SheetTrigger>
          </div>
          <CardDescription>{displayDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {questions.map((question) => (
              <Button
                key={question}
                variant="secondary"
                size="sm"
                className="text-xs h-auto py-2 px-3"
                style={{
                  borderColor: theme.accent,
                  color: theme.accent
                }}
                onClick={() => handleQuestionClick(question)}
              >
                {question}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <SheetContent className="sm:max-w-md w-[400px] p-0 flex flex-col">
        <SheetTitle className="sr-only">{displayTitle}</SheetTitle>
        <SheetDescription className="sr-only">Chat with the AI assistant</SheetDescription>
        <AIBankerChatInterface embedded={false} initialMessage={initialQuestion} agentId={agentId} />
      </SheetContent>
    </Sheet>
  )
}

export function AskAIButton({ 
  initialQuestion, 
  children,
  className,
  agentId = "banker"
}: { 
  initialQuestion?: string
  children?: React.ReactNode 
  className?: string
  agentId?: AIAgentId
}) {
  const [open, setOpen] = useState(false)
  const theme = AI_AGENT_THEMES[agentId] ?? AI_AGENT_THEMES.banker
  const persona = AI_AGENT_PERSONAS[agentId] ?? AI_AGENT_PERSONAS.banker

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className={className}>
            <Sparkles className="h-4 w-4" style={{ color: theme.accent }} />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="sm:max-w-md w-[400px] p-0 flex flex-col">
        <SheetTitle className="sr-only">{persona.title}</SheetTitle>
        <SheetDescription className="sr-only">Chat with the AI assistant</SheetDescription>
        <AIBankerChatInterface embedded={false} initialMessage={initialQuestion} agentId={agentId} />
      </SheetContent>
    </Sheet>
  )
}
