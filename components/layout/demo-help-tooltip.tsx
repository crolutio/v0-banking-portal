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
  "/home": {
    title: "Home Page Demos",
    tips: [
      { 
        prompt: "Show me my spending breakdown for this month",
        description: "View categorized spending analysis"
      },
      { 
        prompt: "Forecast my expenses for next month",
        description: "Predictive analytics"
      }
    ]
  },
  "/loans": {
    title: "Loans Page Demos",
    tips: [
      { 
        prompt: "I want to take a loan for my Japan trip",
        agentId: "spending_analyst",
        description: "🎯 The Strategist - Finds savings instead of loan"
      },
      { 
        prompt: "Request a new loan for 50,000 AED",
        agentId: "loan_advisor",
        description: "📊 Pre-Approval Calculator with DTI analysis"
      },
      { 
        prompt: "Should I refinance my mortgage?",
        agentId: "loan_advisor",
        description: "Loan optimization advice"
      },
      { 
        prompt: "What's my debt-to-income ratio?",
        agentId: "loan_advisor",
        description: "Financial health assessment"
      }
    ]
  },
  "/cards": {
    title: "Cards Page Demos",
    tips: [
      { 
        prompt: "I'm traveling to London next week",
        agentId: "banker",
        description: "🌍 The Concierge - Travel card recommendations"
      },
      { 
        prompt: "Which card should I use for online shopping?",
        description: "Card benefits comparison"
      },
      { 
        prompt: "Analyze my credit card spending patterns",
        agentId: "spending_analyst",
        description: "Card usage insights"
      }
    ]
  },
  "/accounts": {
    title: "Accounts Page Demos",
    tips: [
      { 
        prompt: "Analyze my spending and find savings",
        agentId: "spending_analyst",
        description: "💰 Spending Optimizer"
      },
      { 
        prompt: "What are my recurring payments?",
        description: "Subscription audit"
      },
      { 
        prompt: "Compare my balance trends over time",
        description: "Balance analytics"
      }
    ]
  },
  "/investments": {
    title: "Investments Page Demos",
    tips: [
      { 
        prompt: "Analyze my portfolio performance",
        agentId: "investmentor",
        description: "Investment strategy review"
      },
      { 
        prompt: "What's my asset allocation?",
        agentId: "investmentor",
        description: "Portfolio breakdown"
      },
      { 
        prompt: "Should I rebalance my portfolio?",
        agentId: "investmentor",
        description: "Rebalancing recommendations"
      }
    ]
  },
  "/savings-goals": {
    title: "Savings Goals Demos",
    tips: [
      { 
        prompt: "How can I reach my savings goals faster?",
        agentId: "savings_coach",
        description: "Goal acceleration strategies"
      },
      { 
        prompt: "Analyze my spending to boost savings",
        agentId: "spending_analyst",
        description: "Savings optimization"
      },
      { 
        prompt: "Am I on track for my vacation goal?",
        agentId: "savings_coach",
        description: "Goal progress assessment"
      }
    ]
  },
  "/rewards": {
    title: "Rewards Page Demos",
    tips: [
      { 
        prompt: "How can I maximize my reward points?",
        description: "Points optimization"
      },
      { 
        prompt: "What's the best way to redeem my points?",
        description: "Redemption strategies"
      }
    ]
  }
}

export function DemoHelpTooltip() {
  const pathname = usePathname()
  const [copied, setCopied] = useState<string | null>(null)
  const { openChatWithMessage } = useFloatingChat()

  const currentTips = demoTips[pathname] || {
    title: "General Demos",
    tips: [
      { prompt: "What can you help me with?", description: "Explore AI capabilities" },
      { prompt: "Show me my recent transactions", description: "Transaction history" }
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

