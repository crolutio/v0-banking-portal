"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sparkles, TrendingDown, ArrowRight, Check } from "lucide-react"
import type { SpendingOptimizationResult } from "@/lib/calculations/spending-optimizer"
import { useFloatingChat } from "@/components/ai/floating-chat-context"

interface OptimizationResultCardProps {
  data: SpendingOptimizationResult
}

export function OptimizationResultCard({ data }: OptimizationResultCardProps) {
  const { totalMonthlySavings, totalAnnualSavings, opportunities, recommendations } = data
  const { openChatWithMessage } = useFloatingChat()

  const handleStartOptimizing = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.nativeEvent.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation()
    }
    const topOpportunity = opportunities[0]
    if (topOpportunity) {
      // Use setTimeout to ensure the event has fully propagated
      setTimeout(() => {
        openChatWithMessage(
          `I want to start optimizing my ${topOpportunity.subcategory} spending. Can you create a detailed action plan for me to save AED ${Math.round(topOpportunity.monthlySavings)}/month?`
        )
      }, 0)
    }
  }

  const handleScheduleReview = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.nativeEvent.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation()
    }
    // Use setTimeout to ensure the event has fully propagated
    setTimeout(() => {
      openChatWithMessage(
        `I'd like to schedule a review of my spending optimization plan. Can you help me set up a reminder and track my progress on these ${opportunities.length} savings opportunities?`
      )
    }, 0)
  }

  return (
    <Card 
      className="my-4 border-2 overflow-hidden"
      style={{
        backgroundImage: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(124, 58, 237, 0.02))',
        borderColor: 'rgba(139, 92, 246, 0.3)'
      }}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-xl">Savings Opportunities Found!</CardTitle>
            </div>
            <Badge 
              variant="secondary"
              className="text-sm"
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                color: '#7c3aed',
                borderColor: '#8b5cf6'
              }}
            >
              {opportunities.length} Optimization{opportunities.length !== 1 ? 's' : ''} Detected
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Total Savings Highlight */}
        <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Potential Savings</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                AED {Math.round(totalMonthlySavings).toLocaleString()}<span className="text-lg">/month</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-700 dark:text-purple-300">That's</span>
            <span className="font-bold text-purple-900 dark:text-purple-100">
              AED {Math.round(totalAnnualSavings).toLocaleString()}
            </span>
            <span className="text-purple-700 dark:text-purple-300">per year!</span>
          </div>
        </div>

        {/* Impact Message */}
        {totalAnnualSavings > 10000 && (
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              💡 With these savings, you could fund a vacation, boost your emergency fund, or invest in your future!
            </p>
          </div>
        )}

        <Separator />

        {/* Opportunities List */}
        <div>
          <h4 className="text-sm font-semibold mb-4">Detailed Opportunities</h4>
          <div className="space-y-4">
            {opportunities.map((opportunity, index) => (
              <div 
                key={index}
                className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{opportunity.icon}</span>
                    <div>
                      <h5 className="font-semibold flex items-center gap-2">
                        {opportunity.subcategory}
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{
                            borderColor: opportunity.priority === 'high' ? '#ef4444' : opportunity.priority === 'medium' ? '#f59e0b' : '#3b82f6',
                            color: opportunity.priority === 'high' ? '#dc2626' : opportunity.priority === 'medium' ? '#d97706' : '#2563eb'
                          }}
                        >
                          {opportunity.priority} priority
                        </Badge>
                      </h5>
                      <p className="text-xs text-muted-foreground">{opportunity.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      +AED {Math.round(opportunity.monthlySavings).toLocaleString()}/mo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      AED {Math.round(opportunity.annualSavings).toLocaleString()}/year
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Current Spending</p>
                    <p className="font-medium">
                      AED {Math.round(opportunity.currentMonthlySpending).toLocaleString()}/mo
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Target Spending</p>
                    <p className="font-medium text-green-600">
                      AED {Math.round(opportunity.targetMonthlySpending).toLocaleString()}/mo
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Action Steps:</p>
                  {opportunity.actions.map((action, actionIndex) => (
                    <div key={actionIndex} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-3">Smart Recommendations</h4>
              <ul className="space-y-2">
                {recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-purple-600 mt-1">●</span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
          <Button 
            type="button"
            className="flex-1 bg-purple-600 hover:bg-purple-700"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (e.nativeEvent.stopImmediatePropagation) {
                e.nativeEvent.stopImmediatePropagation()
              }
              handleStartOptimizing(e)
            }}
          >
            Start Optimizing
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button 
            type="button"
            variant="outline" 
            className="flex-1"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (e.nativeEvent.stopImmediatePropagation) {
                e.nativeEvent.stopImmediatePropagation()
              }
              handleScheduleReview(e)
            }}
          >
            Schedule Review
          </Button>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-muted-foreground text-center">
          Savings estimates are based on your recent transaction history and industry averages.
        </p>
      </CardContent>
    </Card>
  )
}

