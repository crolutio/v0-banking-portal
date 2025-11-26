"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot } from "lucide-react"

interface AskAIBankerWidgetProps {
  questions: string[]
  title?: string
  description?: string
}

export function AskAIBankerWidget({
  questions,
  title = "Ask AI Banker",
  description = "Get instant answers about your finances",
}: AskAIBankerWidgetProps) {
  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {questions.map((question) => (
            <Button
              key={question}
              variant="secondary"
              size="sm"
              className="text-xs h-auto py-2 px-3 bg-background/50 hover:bg-background"
              asChild
            >
              <Link href={`/ai-banker?q=${encodeURIComponent(question)}`}>{question}</Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
