"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Shield } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { useFloatingChat } from "@/components/ai/floating-chat-context"

interface SuspiciousTransaction {
  id: string
  description: string
  amount: number
  date: string
  reason: string
  category?: string
}

interface SuspiciousTransactionsCardProps {
  data: {
    transactions: SuspiciousTransaction[]
  }
}

export function SuspiciousTransactionsCard({ data }: SuspiciousTransactionsCardProps) {
  const { openChatWithMessage } = useFloatingChat()

  const handleDispute = (transaction: SuspiciousTransaction) => {
    const message = `I want to dispute this transaction: ${transaction.description} for ${formatCurrency(transaction.amount)} on ${formatDate(transaction.date)}. ${transaction.reason}`
    setTimeout(() => {
      openChatWithMessage(message)
    }, 100)
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg">Suspicious Transactions</CardTitle>
        </div>
        <CardDescription>
          Review the transactions below that have been flagged as potentially suspicious
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-start justify-between gap-4 p-3 rounded-lg border border-amber-500/20 bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <p className="font-medium text-sm truncate">{tx.description}</p>
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                <strong>Reason:</strong> {tx.reason}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatDate(tx.date)}</span>
                {tx.category && (
                  <>
                    <span>•</span>
                    <span>{tx.category}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(tx.amount)}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs border-red-500/30 text-red-600 hover:bg-red-500/10 hover:border-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (e.nativeEvent.stopImmediatePropagation) {
                    e.nativeEvent.stopImmediatePropagation()
                  }
                  handleDispute(tx)
                }}
              >
                <Shield className="h-3 w-3 mr-1" />
                Dispute
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

