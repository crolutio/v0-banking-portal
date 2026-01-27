"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { HelpCircle, Copy, Send, Sparkles } from "lucide-react"
import { useFloatingChat } from "@/components/ai/floating-chat-context"
import type { AIAgentId } from "@/lib/ai/agents"

interface DemoTip {
  title: string
  tips: Array<{
    prompt: string
    agentId?: AIAgentId
    description?: string
  }>
}

const demoTips: Record<string, DemoTip> = {
  "/cards": {
    title: "Cards Demos",
    tips: [
      { 
        prompt: "Review suspicious transactions",
        agentId: "banker",
        description: "Nobu London verification with auto card actions"
      }
    ]
  },
  "/accounts": {
    title: "Accounts Demos",
    tips: [
      { 
        prompt: "Explain the overdraft warning",
        agentId: "banker",
        description: "Auto-transfer from savings, reversed on payday"
      }
    ]
  },
  "/investments": {
    title: "Investments Demos",
    tips: [
      { 
        prompt: "Explain the market-shock protection you activated",
        agentId: "investmentor",
        description: "Auto risk shift, hedge, and scheduled unwind"
      }
    ]
  },
  "/savings-goals": {
    title: "Savings Goals Demos",
    tips: [
      { 
        prompt: "Auto-boost my Japan trip goal without changing my lifestyle",
        agentId: "savings_coach",
        description: "Subscriptions + round-ups + payday sweep"
      }
    ]
  },
  "/rewards": {
    title: "Rewards Demos",
    tips: [
      { 
        prompt: "I'm traveling—maximize my points for this trip",
        agentId: "banker",
        description: "Best card, default switch, and redemption"
      }
    ]
  }
}

export function DemoHelpTooltip() {
  const pathname = usePathname()
  const [copied, setCopied] = useState<string | null>(null)
  const { openChatWithMessage } = useFloatingChat()

  const currentTips = demoTips[pathname] || {
    title: "Key Demos",
    tips: [
      { prompt: "Review suspicious transactions", description: "Nobu London verification flow" },
      { prompt: "Explain the overdraft warning", description: "Auto-transfer from savings, reversed on payday" }
    ]
  }

  const handleCopy = (prompt: string) => {
    navigator.clipboard.writeText(prompt)
    setCopied(prompt)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSend = (prompt: string, agentId?: AIAgentId) => {
    openChatWithMessage(prompt, agentId || "banker")
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden md:inline text-xs">Demo Tips</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="start">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                {currentTips.title}
              </h4>
              <p className="text-xs text-muted-foreground">
                Try these prompts to explore AI features on this page
              </p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {currentTips.tips.map((tip, index) => (
                <div 
                  key={index}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium break-words">
                        "{tip.prompt}"
                      </p>
                      {tip.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {tip.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handleCopy(tip.prompt)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {copied === tip.prompt ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handleSend(tip.prompt, tip.agentId)}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Try Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground text-center">
                💡 Tip: Click "Try Now" to open chat with the prompt pre-filled
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>

    </>
  )
}

