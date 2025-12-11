"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertCircle, FileText } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"

interface DisputedTransaction {
  id: string
  description: string
  amount: number
  date: string
  reason: string
  status: "submitted" | "pending_review" | "approved" | "denied"
}

interface DisputeConfirmationData {
  disputes: DisputedTransaction[]
  caseNumber?: string
  estimatedResolutionDays?: number
}

interface DisputeConfirmationCardProps {
  data: DisputeConfirmationData
}

export function DisputeConfirmationCard({ data }: DisputeConfirmationCardProps) {
  const { disputes, caseNumber, estimatedResolutionDays = 7 } = data

  return (
    <Card className="my-4 border-2 border-green-500/30 bg-green-500/5 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Dispute Confirmation</CardTitle>
            {caseNumber && (
              <p className="text-sm text-muted-foreground mt-1">
                Case #{caseNumber}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <p>
              Successfully submitted {disputes.length} dispute{disputes.length > 1 ? 's' : ''} for review.
              Expected resolution within {estimatedResolutionDays} business days.
            </p>
          </div>

          {/* Disputed Transactions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Disputed Transactions</h3>
            {disputes.map((dispute) => (
              <div
                key={dispute.id}
                className="border border-border rounded-lg p-4 bg-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <p className="font-medium text-sm truncate">{dispute.description}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      <strong>Reason:</strong> {dispute.reason}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(dispute.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(dispute.amount)}
                    </p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {dispute.status === "submitted" ? "Submitted" : dispute.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Next Steps */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Next Steps
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              <li>• We'll investigate each transaction with the merchant</li>
              <li>• You'll receive email updates on the status of your disputes</li>
              <li>• No action needed from you at this time</li>
              <li>• Temporary credits may be issued while we investigate</li>
            </ul>
          </div>

          {/* Action Button */}
          <Button variant="outline" className="w-full" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            View Dispute Status
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

