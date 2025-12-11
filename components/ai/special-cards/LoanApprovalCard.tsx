"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, AlertTriangle, Info, Calculator, ArrowRight } from "lucide-react"
import type { LoanPreApprovalResult } from "@/lib/calculations/loan-preapproval"
import { useFloatingChat } from "@/components/ai/floating-chat-context"

interface LoanApprovalCardProps {
  data: LoanPreApprovalResult
}

export function LoanApprovalCard({ data }: LoanApprovalCardProps) {
  const {
    approved,
    monthlyPayment,
    interestRate,
    totalInterest,
    dtiPercentage,
    strengths,
    concerns,
    conditions,
    maxLoanAmount,
    requestedAmount,
    requestedTerm
  } = data
  
  const { openChatWithMessage } = useFloatingChat()
  
  const handleApplyNow = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.nativeEvent.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation()
    }
    setTimeout(() => {
      openChatWithMessage(
        `I'd like to proceed with applying for the loan of AED ${requestedAmount.toLocaleString()} for ${requestedTerm} months. Can you guide me through the application process?`
      )
    }, 0)
  }
  
  const handleSimulatePayment = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.nativeEvent.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation()
    }
    setTimeout(() => {
      openChatWithMessage(
        `Can you simulate the payment schedule for a loan of AED ${requestedAmount.toLocaleString()} at ${interestRate}% APR over ${requestedTerm} months? Show me the breakdown of principal and interest for each payment.`
      )
    }, 0)
  }

  // Determine DTI color
  const getDTIColor = (dti: number) => {
    if (dti < 35) return "text-green-600"
    if (dti < 42) return "text-yellow-600"
    return "text-orange-600"
  }

  const getDTIProgressColor = (dti: number) => {
    if (dti < 35) return "bg-green-600"
    if (dti < 42) return "bg-yellow-600"
    return "bg-orange-600"
  }

  return (
    <Card 
      className="my-4 border-2 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundImage: approved 
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(22, 163, 74, 0.02))'
          : 'linear-gradient(135deg, rgba(249, 115, 22, 0.05), rgba(234, 88, 12, 0.02))',
        borderColor: approved ? 'rgba(34, 197, 94, 0.3)' : 'rgba(249, 115, 22, 0.3)'
      }}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-5 w-5" />
              <CardTitle className="text-xl">Loan Pre-Approval Assessment</CardTitle>
            </div>
            <Badge 
              variant={approved ? "default" : "secondary"}
              className="text-sm"
              style={{
                backgroundColor: approved ? 'rgba(34, 197, 94, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                color: approved ? '#15803d' : '#c2410c',
                borderColor: approved ? '#22c55e' : '#f97316'
              }}
            >
              {approved ? '✓ Pre-Approved' : '⚠ Conditional Approval'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Loan Details */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Requested Amount</p>
            <p className="text-2xl font-bold">AED {requestedAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Loan Term</p>
            <p className="text-2xl font-bold">{requestedTerm} months</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Monthly Payment</p>
            <p className="text-xl font-semibold text-primary">
              AED {Math.round(monthlyPayment).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Interest Rate</p>
            <p className="text-xl font-semibold">{interestRate}% APR</p>
          </div>
        </div>

        {/* DTI Ratio */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Debt-to-Income Ratio</span>
            <span className={`text-lg font-bold ${getDTIColor(dtiPercentage)}`}>
              {dtiPercentage}%
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={dtiPercentage} 
              max={50}
              className="h-3"
            />
            <div 
              className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getDTIProgressColor(dtiPercentage)}`}
              style={{ width: `${Math.min(dtiPercentage * 2, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0%</span>
            <span className="text-yellow-600">35% Good</span>
            <span className="text-orange-600">50% Max</span>
          </div>
        </div>

        <Separator />

        {/* Strengths */}
        {strengths.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Strengths
            </h4>
            <ul className="space-y-2">
              {strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-green-600 mt-0.5">●</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concerns */}
        {concerns.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              Concerns
            </h4>
            <ul className="space-y-2">
              {concerns.map((concern, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-orange-600 mt-0.5">●</span>
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Conditions */}
        {conditions.length > 0 && approved && (
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Info className="h-4 w-4" />
              Conditions & Requirements
            </h4>
            <ul className="space-y-2">
              {conditions.map((condition, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5">•</span>
                  <span>{condition}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Max Loan Amount (if different from requested) */}
        {maxLoanAmount && maxLoanAmount < requestedAmount && (
          <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
              Recommended Maximum
            </p>
            <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
              AED {Math.round(maxLoanAmount).toLocaleString()}
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
              Based on your current financial profile, we recommend a lower amount to maintain healthy debt levels.
            </p>
          </div>
        )}

        {/* Total Interest */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Interest Over Term</span>
            <span className="text-lg font-semibold">
              AED {Math.round(totalInterest).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
          <Button 
            type="button"
            className="flex-1" 
            disabled={!approved}
            onClick={handleApplyNow}
          >
            Apply Now
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button 
            type="button"
            variant="outline" 
            className="flex-1"
            onClick={handleSimulatePayment}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Simulate Payment
          </Button>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center">
          This is an indicative assessment only. Final approval subject to credit checks and documentation.
        </p>
      </CardContent>
    </Card>
  )
}

