"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare, Sparkles, Bot, Phone, Mail, FileText } from "lucide-react"
import { useFloatingChat } from "@/components/ai/floating-chat-context"
import { AI_AGENT_THEMES } from "@/components/ai/ai-banker-chat-interface"
import { AI_AGENT_PERSONAS, type AIAgentId } from "@/lib/ai/agents"

interface QuickHelpCard {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
  onClick?: () => void
}

interface AskAIBankerWidgetProps {
  questions: string[]
  title?: string
  description?: string
  agentId?: AIAgentId
  quickHelpCards?: QuickHelpCard[]
}

export function AskAIBankerWidget({
  questions,
  title,
  description,
  agentId = "banker",
  quickHelpCards
}: AskAIBankerWidgetProps) {
  const theme = AI_AGENT_THEMES[agentId] ?? AI_AGENT_THEMES.banker
  const persona = AI_AGENT_PERSONAS[agentId] ?? AI_AGENT_PERSONAS.banker
  const displayTitle = title || `Ask ${persona.title}`
  const displayDescription = description || persona.shortDescription
  const { openChatWithMessage } = useFloatingChat()

  const handleQuestionClick = (question: string) => {
    openChatWithMessage(question, agentId)
  }

  return (
    <Card
      className="border rounded-2xl"
      style={{
        backgroundImage: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
        borderColor: theme.accentMuted
      }}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <theme.icon className="h-5 w-5 text-foreground" />
          <CardTitle className="text-lg text-foreground">{displayTitle}</CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">{displayDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {questions.map((question) => (
            <Button
              key={question}
              variant="secondary"
              size="sm"
              className="text-xs h-auto py-2 px-3 whitespace-normal text-left justify-start w-full hover:bg-accent/50 text-foreground border border-border"
              onClick={() => handleQuestionClick(question)}
            >
              {question}
            </Button>
          ))}
        </div>

        {quickHelpCards && quickHelpCards.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="grid grid-cols-1 gap-1.5">
              {quickHelpCards.map((card, index) => (
                <Card
                  key={index}
                  className="cursor-pointer hover:bg-muted/50 transition-colors border-none shadow-none"
                  onClick={card.onClick}
                >
                  <CardContent className="p-1.5 pl-3 flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <card.icon className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-base leading-tight">{card.title}</p>
                      <p className="text-sm leading-tight text-muted-foreground">{card.subtitle}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
  const theme = AI_AGENT_THEMES[agentId] ?? AI_AGENT_THEMES.banker
  const { openChatWithMessage } = useFloatingChat()

  const handleClick = () => {
    openChatWithMessage(initialQuestion || "", agentId)
  }

  if (children) {
    return <div onClick={handleClick}>{children}</div>
  }

  return (
    <Button variant="ghost" size="icon" className={className} onClick={handleClick}>
      <Sparkles className="h-4 w-4" style={{ color: theme.accent }} />
    </Button>
  )
}
