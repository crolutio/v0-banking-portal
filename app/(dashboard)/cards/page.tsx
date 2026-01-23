"use client"

import { useState, useMemo, useEffect } from "react"
import { useRole } from "@/lib/role-context"
import { formatCurrency, formatCardNumber } from "@/lib/format"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { CitationBadge, ConfidenceIndicator } from "@/components/ai/citation-badge"
import { CreditCard, Snowflake, Sun, Settings2, AlertTriangle, TrendingUp, Bot, Copy, RefreshCw, Loader2 } from "lucide-react"
import type { Card as CardType } from "@/lib/types"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { createClient } from "@/lib/supabase/client"

function CreditCardVisual({ card, showDetails = false }: { card: CardType; showDetails?: boolean }) {
  const [flipped, setFlipped] = useState(false)

  const getCardGradient = () => {
    if (card.type === "credit") return "from-slate-800 via-slate-700 to-slate-900"
    if (card.type === "virtual") return "from-indigo-600 via-indigo-500 to-indigo-700"
    return "from-emerald-600 via-emerald-500 to-emerald-700"
  }

  return (
    <div
      className="relative w-full aspect-[1.586/1] perspective-1000 cursor-pointer"
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${flipped ? "rotate-y-180" : ""}`}
      >
        {/* Front */}
        <div
          className={`absolute inset-0 backface-hidden rounded-2xl p-6 flex flex-col justify-between bg-gradient-to-br ${getCardGradient()}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-7 bg-amber-400 rounded-md" />
              {card.type === "virtual" && (
                <Badge variant="outline" className="bg-white/10 border-white/20 text-white text-[10px]">
                  VIRTUAL
                </Badge>
              )}
            </div>
            <span className="text-white/80 text-sm font-medium">{card.brand}</span>
          </div>

          <div>
            <p className="text-white/60 text-xs mb-1">Card Number</p>
            <p className="text-white text-lg tracking-widest font-mono">
              {showDetails ? `•••• •••• •••• ${card.lastFour}` : formatCardNumber(card.lastFour)}
            </p>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/60 text-[10px] mb-0.5">CARDHOLDER</p>
              <p className="text-white text-sm">{card.cardholderName}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-[10px] mb-0.5">EXPIRES</p>
              <p className="text-white text-sm">{card.expiryDate}</p>
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className={`absolute inset-0 backface-hidden rotate-y-180 rounded-2xl bg-gradient-to-br ${getCardGradient()}`}
        >
          <div className="w-full h-10 bg-black/40 mt-6" />
          <div className="p-6 mt-2">
            <div className="bg-white/90 rounded p-2 text-right">
              <span className="text-slate-800 font-mono text-sm tracking-wider">{showDetails ? "•••" : "•••"}</span>
            </div>
            <p className="text-white/60 text-xs mt-4 text-center">Tap to flip back</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CardActions({
  card,
  onFreeze,
  onUnfreeze,
}: {
  card: CardType
  onFreeze: () => void
  onUnfreeze: () => void
}) {
  const [showLimitsDialog, setShowLimitsDialog] = useState(false)
  const [showReplaceDialog, setShowReplaceDialog] = useState(false)
  const [newLimit, setNewLimit] = useState(card.limit || 50000)

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant={card.status === "frozen" ? "default" : "outline"}
          className="flex items-center gap-2"
          onClick={card.status === "frozen" ? onUnfreeze : onFreeze}
        >
          {card.status === "frozen" ? (
            <>
              <Sun className="h-4 w-4" />
              Unfreeze
            </>
          ) : (
            <>
              <Snowflake className="h-4 w-4" />
              Freeze
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-2 bg-transparent"
          onClick={() => setShowLimitsDialog(true)}
        >
          <Settings2 className="h-4 w-4" />
          Limits
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-2 col-span-2 bg-transparent"
          onClick={() => setShowReplaceDialog(true)}
        >
          <RefreshCw className="h-4 w-4" />
          Replace Card
        </Button>
      </div>

      {/* Limits Dialog */}
      <Dialog open={showLimitsDialog} onOpenChange={setShowLimitsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Card Limits</DialogTitle>
            <DialogDescription>Adjust your daily transaction limits</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Daily Transaction Limit</Label>
                <span className="text-sm font-medium">{formatCurrency(newLimit)}</span>
              </div>
              <Slider
                value={[newLimit]}
                onValueChange={([value]) => setNewLimit(value)}
                min={1000}
                max={100000}
                step={1000}
              />
              <p className="text-xs text-muted-foreground">
                Limit can be set between {formatCurrency(1000)} and {formatCurrency(100000)}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="font-medium">Policy Reference</span>
              </div>
              <p className="text-muted-foreground">
                Per Card Terms v3.0, daily limits can be adjusted up to your account maximum. Changes take effect
                immediately.
              </p>
              <CitationBadge
                citation={{ id: "cite_1", source: "Card Terms v3.0", type: "product_terms" }}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLimitsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowLimitsDialog(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Card Dialog */}
      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Card</DialogTitle>
            <DialogDescription>Request a replacement for your card</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Replacement</Label>
              <select
                id="reason"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="damaged">Card Damaged</option>
                <option value="lost">Card Lost</option>
                <option value="stolen">Card Stolen</option>
                <option value="expired">Card Expiring Soon</option>
              </select>
            </div>

            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-500">Important</p>
                  <p className="text-muted-foreground">
                    Your current card will be deactivated immediately if you select &ldquo;Lost&rdquo; or
                    &ldquo;Stolen&rdquo;.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Replacement fee:{" "}
              <span className="text-foreground font-medium">{card.type === "credit" ? "Free" : "AED 50"}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplaceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowReplaceDialog(false)}>Request Replacement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function CardInsightsPanel({ card }: { card: CardType }) {
  const aiInsights = {
    unusualSpend: {
      detected: true,
      category: "Entertainment",
      increase: 45,
    },
    benefits: [
      "Lounge access: 4 complimentary visits remaining",
      "Travel insurance: Active for international trips",
      "Extended warranty: Covers electronics purchases",
    ],
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Card Benefits</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {aiInsights.benefits.map((benefit, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                {benefit}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-1 mt-3">
            <CitationBadge citation={{ id: "cite_1", source: "Card T&Cs v3.0", type: "product_terms" }} />
          </div>
          <ConfidenceIndicator confidence="high" className="mt-2" />
        </CardContent>
      </Card>

      {aiInsights.unusualSpend.detected && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-yellow-500" />
              <CardTitle className="text-sm text-yellow-500">Unusual Spend Detected</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your {aiInsights.unusualSpend.category} spending is {aiInsights.unusualSpend.increase}% higher than your
              average this month.
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              <CitationBadge citation={{ id: "cite_2", source: "Transaction History", type: "transaction_history" }} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function CardsPage() {
  const { currentUser, currentBankingUserId } = useRole()
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null)
  const [cards, setCards] = useState<CardType[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchCards() {
      if (!currentBankingUserId) return

      setIsLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("customer_id", currentBankingUserId)

        console.log("[debug] cards query result", {
          userId: currentBankingUserId,
          hasError: !!error,
          errorMessage: error?.message,
          errorCode: error?.code,
          count: data?.length,
        })

      if (error) {
        console.error("Error fetching cards:", error)
      } else {
        const mappedCards: CardType[] = (data || []).map((c: any) => ({
          id: c.id,
          userId: c.customer_id,
          accountId: c.account_id,
          type: c.type,
          brand: c.brand,
          lastFour: c.last_four,
          expiryDate: c.expiry_date,
          status: c.status,
          limit: c.credit_limit ? Number(c.credit_limit) : undefined,
          spent: c.spent_amount ? Number(c.spent_amount) : undefined,
          cardholderName: c.cardholder_name
        }))
        setCards(mappedCards)
      }
      setIsLoading(false)
    }

    fetchCards()
  }, [currentUser])

  const handleFreeze = async (cardId: string) => {
    // In a real app, we would update Supabase here
    console.log("Freezing card:", cardId)
    // Optimistic update
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: "frozen" } : c))
  }

  const handleUnfreeze = async (cardId: string) => {
    // In a real app, we would update Supabase here
    console.log("Unfreezing card:", cardId)
    // Optimistic update
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: "active" } : c))
  }

  // AI Banker questions relevant to cards page
  const aiQuestions = [
    "Which card should I use for my next purchase?",
    "How can I maximize my card rewards?",
    "Analyze my card spending patterns",
    "What are my available card benefits?",
    "Compare my card usage across different cards",
  ]

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Cards" description="Manage your debit and credit cards" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cards Grid - takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map((card) => (
              <Sheet key={card.id}>
                <SheetTrigger asChild>
                  <Card className="cursor-pointer hover:bg-muted/30 transition-colors overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4">
                        <CreditCardVisual card={card} />
                      </div>

                      <div className="p-4 border-t">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium capitalize">{card.type} Card</p>
                            <p className="text-sm text-muted-foreground">{card.brand}</p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={
                              card.status === "frozen"
                                ? "bg-blue-500/20 text-blue-500"
                                : "bg-emerald-500/20 text-emerald-500"
                            }
                          >
                            {card.status === "frozen" ? "Frozen" : "Active"}
                          </Badge>
                        </div>

                        {card.limit && card.spent !== undefined && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Spent this month</span>
                              <span>
                                {formatCurrency(card.spent)} / {formatCurrency(card.limit)}
                              </span>
                            </div>
                            <Progress value={(card.spent / card.limit) * 100} className="h-2" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </SheetTrigger>

                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="capitalize">{card.type} Card</SheetTitle>
                    <SheetDescription>Manage your card and view insights</SheetDescription>
                  </SheetHeader>

                  <div className="mt-6 px-4 space-y-6">
                    <CreditCardVisual card={card} showDetails />

                    <div className="p-4 rounded-lg bg-muted/30">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Card Number</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">•••• {card.lastFour}</p>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Expiry</p>
                          <p className="text-sm font-medium">{card.expiryDate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge
                            variant="secondary"
                            className={
                              card.status === "frozen"
                                ? "bg-blue-500/20 text-blue-500"
                                : "bg-emerald-500/20 text-emerald-500"
                            }
                          >
                            {card.status}
                          </Badge>
                        </div>
                        {card.limit && (
                          <div>
                            <p className="text-xs text-muted-foreground">Credit Limit</p>
                            <p className="text-sm font-medium">{formatCurrency(card.limit)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <CardActions
                      card={card}
                      onFreeze={() => handleFreeze(card.id)}
                      onUnfreeze={() => handleUnfreeze(card.id)}
                    />

                    <CardInsightsPanel card={card} />
                  </div>
                </SheetContent>
              </Sheet>
            ))}
          </div>
        </div>

        {/* AI Banker Widget - takes 1 column on the side */}
        <div className="lg:col-span-1">
          <AskAIBankerWidget 
            questions={aiQuestions} 
            description="Analyze spending patterns and optimize your budget" 
            title="Ask AI Spending Analyst"
            agentId="spending_analyst"
          />
        </div>
      </div>

      {cards.length === 0 && (
        <Card className="p-12 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Cards Yet</h3>
          <p className="text-muted-foreground mb-4">You don&apos;t have any cards linked to your account.</p>
          <Button>Apply for a Card</Button>
        </Card>
      )}
    </div>
  )
}
