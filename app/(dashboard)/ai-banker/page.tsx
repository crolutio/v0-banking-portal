"use client"

import { AIBankerChatInterface } from "@/components/ai/ai-banker-chat-interface"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Wallet, Receipt, ShieldCheck } from "lucide-react"

function AIBankerPageContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || searchParams.get("scope") ? undefined : undefined
  
  // Construct a more complex initial message if scope is present? 
  // For now, let's just use 'q' parameter for the prompt.
  const prompt = searchParams.get("q") || undefined

  return (
    <div className="h-[calc(100vh-4rem)] p-4">
      <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4 overflow-y-auto pr-1">
          <Card>
            <CardHeader>
              <CardTitle>AI Banker Overview</CardTitle>
              <CardDescription>
                Ask questions across your accounts, cards, transactions, fees and support in one place.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600" />
                <span>Summarize balances and recent activity across all of your accounts.</span>
              </div>
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-sky-600" />
                <span>Explain unusual transactions, recurring payments, and monthly spend.</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                <span>Get safe, policy‑aware answers before taking important actions.</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Suggested Prompts</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {[
                "What changed in my accounts this month?",
                "Why was I charged this fee?",
                "Show me a summary of my last 30 days of spending.",
                "What are the most unusual transactions I should review?",
              ].map((q) => (
                <Badge key={q} variant="outline" className="text-xs py-1 px-2">
                  {q}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="h-full bg-background rounded-xl border shadow-sm overflow-hidden">
          <AIBankerChatInterface initialMessage={prompt} />
        </div>
      </div>
    </div>
  )
}

export default function AIBankerPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AIBankerPageContent />
    </Suspense>
  )
}
