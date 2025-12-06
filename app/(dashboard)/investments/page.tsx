"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { formatCurrency } from "@/lib/format"
import { AskAIBankerWidget, AskAIButton } from "@/components/ai/ask-ai-banker-widget"
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Landmark,
  Building2,
  Home,
  Gem,
  Briefcase,
  Wallet,
  Palmtree,
  ChevronRight,
  ArrowRight,
  Loader2,
  Lightbulb,
  AlertTriangle,
} from "lucide-react"
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts"
import { useRole } from "@/lib/role-context"
import { createClient } from "@/lib/supabase/client"
import type { PortfolioHolding } from "@/lib/types"

const investmentCategories = [
  {
    id: "public-markets",
    name: "Public Markets",
    icon: Landmark,
    description: "Stocks, ETFs, Bonds & Mutual Funds",
    color: "bg-blue-500",
    count: 24,
  },
  {
    id: "private-markets",
    name: "Private Markets",
    icon: Building2,
    description: "PE, VC, Hedge Funds & Private Credit",
    color: "bg-purple-500",
    count: 12,
  },
  {
    id: "real-estate",
    name: "Real Estate",
    icon: Home,
    description: "Residential, Commercial & REITs",
    color: "bg-emerald-500",
    count: 8,
  },
  {
    id: "alternative-assets",
    name: "Alternative Assets",
    icon: Gem,
    description: "Gold, Crypto, Art & Collectibles",
    color: "bg-amber-500",
    count: 15,
  },
  {
    id: "business-ownership",
    name: "Business Ownership",
    icon: Briefcase,
    description: "Direct Equity & Franchises",
    color: "bg-rose-500",
    count: 6,
  },
  {
    id: "wealth-preservation",
    name: "Wealth Preservation",
    icon: Wallet,
    description: "Trusts & Holding Structures",
    color: "bg-slate-500",
    count: 5,
  },
  {
    id: "lifestyle-investments",
    name: "Lifestyle",
    icon: Palmtree,
    description: "Yachts, Jets & Luxury Assets",
    color: "bg-cyan-500",
    count: 4,
  },
]

export default function InvestmentsPage() {
  const { currentUser } = useRole()
  const [userHoldings, setUserHoldings] = useState<PortfolioHolding[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!currentUser?.id) return

      setIsLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from("portfolio_holdings")
        .select("*")
        .eq("user_id", currentUser.id)

      if (error) {
        console.error("Error fetching holdings:", error)
      } else {
        const mappedHoldings: PortfolioHolding[] = (data || []).map((h: any) => {
          const quantity = Number(h.quantity)
          const avgCost = Number(h.avg_cost)
          const currentPrice = Number(h.current_price)
          const value = quantity * currentPrice
          const costBasis = quantity * avgCost
          const gain = value - costBasis
          const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0

          return {
            id: h.id,
            userId: h.user_id,
            symbol: h.symbol,
            name: h.name,
            type: h.type,
            quantity,
            avgCost,
            currentPrice,
            value,
            gain,
            gainPercent
          }
        })
        setUserHoldings(mappedHoldings)
      }
      setIsLoading(false)
    }

    fetchData()
  }, [currentUser])

  const totalValue = userHoldings.reduce((sum, h) => sum + h.value, 0)
  const totalGain = userHoldings.reduce((sum, h) => sum + h.gain, 0)
  const totalGainPercent = totalValue > 0 ? ((totalGain / (totalValue - totalGain)) * 100).toFixed(2) : "0.00"

  // Calculate allocation
  const allocation = userHoldings.reduce(
    (acc, h) => {
      acc[h.type] = (acc[h.type] || 0) + h.value
      return acc
    },
    {} as Record<string, number>,
  )

  const allocationData = Object.entries(allocation).map(([name, value]) => ({
    name: name.replace("_", " "),
    value
  }))

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#64748b', '#06b6d4'];

  const sortedByValue = [...userHoldings].sort((a, b) => b.value - a.value)
  const topHolding = sortedByValue[0]
  const concentration =
    totalValue > 0 && topHolding ? ((topHolding.value / totalValue) * 100).toFixed(1) : "0.0"

  const sortedByGain = [...userHoldings].sort((a, b) => b.gainPercent - a.gainPercent)
  const topGainers = sortedByGain.slice(0, 3).filter((h) => h.gainPercent > 0)
  const topLosers = sortedByGain.slice(-3).filter((h) => h.gainPercent < 0)

  const aiQuestions = [
    "How is my portfolio performing?",
    "Rebalance my portfolio",
    "Suggest new investment opportunities",
    "Analyze my risk exposure",
  ]

  const insights = useMemo(() => {
    const items: {
      id: string
      tone: "positive" | "negative" | "neutral"
      title: string
      detail: string
      source: string
    }[] = []

    if (totalValue > 0) {
      items.push({
        id: "portfolio-return",
        tone: totalGain >= 0 ? "positive" : "negative",
        title:
          totalGain >= 0
            ? `Portfolio is up ${totalGainPercent}% vs cost basis`
            : `Portfolio is down ${Math.abs(Number(totalGainPercent)).toFixed(2)}% vs cost basis`,
        detail: `${formatCurrency(totalGain, "USD")} ${totalGain >= 0 ? "unrealized gain" : "unrealized loss"} across all holdings.`,
        source: "Portfolio Holdings",
      })
    }

    if (topHolding) {
      const conc = Number(concentration)
      items.push({
        id: "concentration",
        tone: conc > 40 ? "negative" : "neutral",
        title: `Largest position ${topHolding.symbol} is ${concentration}% of your portfolio`,
        detail:
          conc > 40
            ? "Exposure is concentrated in a single name. Consider whether this matches your risk tolerance."
            : "Concentration in the top holding is within a typical range for focused portfolios.",
        source: "Position Sizing",
      })
    }

    if (topGainers.length > 0) {
      const g = topGainers[0]
      items.push({
        id: "top-gainer",
        tone: "positive",
        title: `${g.symbol} is your top performer`,
        detail: `${g.name} is up ${g.gainPercent.toFixed(1)}% vs cost basis with unrealized gain of ${formatCurrency(
          g.gain,
          "USD",
        )}.`,
        source: "Performance",
      })
    }

    if (topLosers.length > 0) {
      const l = topLosers[topLosers.length - 1]
      items.push({
        id: "top-loser",
        tone: "negative",
        title: `${l.symbol} is dragging performance`,
        detail: `${l.name} is down ${Math.abs(l.gainPercent).toFixed(
          1,
        )}% vs cost basis. Review whether the original thesis still holds.`,
        source: "Performance",
      })
    }

    return items
  }, [totalValue, totalGain, totalGainPercent, topHolding, concentration, topGainers, topLosers])

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investments</h1>
          <p className="text-muted-foreground mt-1">Manage your wealth across diverse asset classes</p>
        </div>
      </div>

      {/* Portfolio Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Portfolio Value"
          value={formatCurrency(totalValue, "USD")}
          icon={PieChart}
          description="Across all asset classes"
        />
        <StatCard
          title="Total Gain/Loss"
          value={formatCurrency(totalGain, "USD")}
          icon={totalGain >= 0 ? TrendingUp : TrendingDown}
          description={`${totalGainPercent}% all-time return`}
          trend={{ value: Number(totalGainPercent), direction: totalGain >= 0 ? "up" : "down" }}
        />
        <StatCard
          title="Active Holdings"
          value={userHoldings.length.toString()}
          icon={BarChart3}
          description="Across 4 asset classes"
        />
      </div>

      {/* AI-style Insights List */}
      {insights.length > 0 && (
        <Card className="border border-border/80">
          <CardHeader className="pb-3">
            <CardTitle>What Changed in Your Portfolio</CardTitle>
            <CardDescription>Key movements and risks based on your current positions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight) => {
              const isPositive = insight.tone === "positive"
              const Icon = isPositive ? Lightbulb : AlertTriangle
              const iconBg =
                insight.tone === "positive"
                  ? "bg-emerald-50 text-emerald-600"
                  : insight.tone === "negative"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-slate-50 text-slate-600"

              return (
                <div
                  key={insight.id}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3"
                >
                  <div
                    className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs ${iconBg}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.detail}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="outline" className="text-[11px]">
                        {insight.source}
                      </Badge>
                      <AskAIButton
                        agentId="investmentor"
                        initialQuestion={`Explain this portfolio insight: ${insight.title}. Details: ${insight.detail}`}
                      >
                        <button
                          type="button"
                          className="ml-auto text-[11px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        >
                          Explain
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </AskAIButton>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Asset Classes Grid */}
        <div className="lg:col-span-2 space-y-8">
            <div>
                <h2 className="text-xl font-semibold mb-4">Explore Asset Classes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {investmentCategories.map((category) => (
                        <Link href={`/investments/${category.id}`} key={category.id}>
                            <Card className="h-full hover:shadow-md transition-all cursor-pointer group border-l-4" style={{ borderLeftColor: category.color.replace('bg-', 'var(--') }}>
                                <CardContent className="p-5 flex items-start gap-4">
                                    <div className={`p-3 rounded-xl ${category.color} bg-opacity-10 text-white shrink-0`}>
                                        <category.icon className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{category.name}</h3>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs font-normal">
                                                {category.count} Opportunities
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>

        {/* Sidebar: Allocation, Insights & AI */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Allocation</CardTitle>
                    <CardDescription>Current portfolio distribution</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                                <Pie
                                    data={allocationData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {allocationData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    formatter={(value: number) => formatCurrency(value, "USD")}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>
                    {Object.entries(allocation).map(([type, value], index) => {
                      const percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : "0.0"
                      return (
                        <div key={type} className="space-y-2">
                          <div className="flex justify-between text-sm items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="capitalize font-medium">{type.replace("_", " ")}</span>
                            </div>
                            <span>{percentage}%</span>
                          </div>
                          {/* <Progress value={Number(percentage)} className="h-2" /> */}
                          <p className="text-xs text-muted-foreground text-right">{formatCurrency(value, "USD")}</p>
                        </div>
                      )
                    })}
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Portfolio Snapshot</CardTitle>
                <CardDescription>Quick insights from your current holdings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topHolding && (
                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground mb-1">Largest Position</p>
                    <p className="text-sm font-medium">
                      {topHolding.name} ({topHolding.symbol})
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(topHolding.value, "USD")} · {concentration}% of portfolio ·{" "}
                      {topHolding.gainPercent >= 0 ? "Up" : "Down"}{" "}
                      {Math.abs(topHolding.gainPercent).toFixed(1)}%
                    </p>
                  </div>
                )}

                {topGainers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-emerald-700 mb-1">Top Gainers (all‑time)</p>
                    <ul className="space-y-1">
                      {topGainers.map((h) => (
                        <li key={h.id} className="flex items-center justify-between text-xs">
                          <span className="truncate mr-2">
                            {h.name} ({h.symbol})
                          </span>
                          <span className="text-emerald-600 font-semibold">
                            +{h.gainPercent.toFixed(1)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {topLosers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-rose-700 mb-1">Biggest Drags</p>
                    <ul className="space-y-1">
                      {[...topLosers].reverse().map((h) => (
                        <li key={h.id} className="flex items-center justify-between text-xs">
                          <span className="truncate mr-2">
                            {h.name} ({h.symbol})
                          </span>
                          <span className="text-rose-600 font-semibold">
                            {h.gainPercent.toFixed(1)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  These insights are based on your current holdings and unrealized profit/loss. Ask{" "}
                  <span className="font-medium">AI Investmentor</span> to simulate rebalancing or stress‑test
                  different market scenarios.
                </p>
              </CardContent>
            </Card>

            <AskAIBankerWidget
              questions={aiQuestions}
              description="Get AI insights on your portfolio"
              title="Ask AI Investmentor"
              agentId="investmentor"
            />
        </div>
      </div>
    </div>
  )
}
