"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { formatCurrency } from "@/lib/format"
import { useRole } from "@/lib/role-context"
import { createClient } from "@/lib/supabase/client"
import type { PortfolioHolding } from "@/lib/types"
import { AskAIBankerWidget, AskAIButton } from "@/components/ai/ask-ai-banker-widget"
import {
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Landmark,
  Building2,
  Home,
  Gem,
  Briefcase,
  Wallet,
  Palmtree,
  Plus,
  Info,
  Loader2,
  X
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

// Static Data for Categories
const categoryConfig: Record<string, any> = {
  "public-markets": {
    name: "Public Markets",
    icon: Landmark,
    description: "Stocks, ETFs, Bonds & Mutual Funds",
    dbTypes: ["stock", "etf", "bond", "mutual_fund"],
    color: "text-blue-500 bg-blue-500/10",
    opportunities: [
      { name: "Global Tech ETF", return: "+12.4%", risk: "High", min: "$100" },
      { name: "S&P 500 Index", return: "+9.8%", risk: "Medium", min: "$50" },
      { name: "US Treasury Bonds", return: "+4.2%", risk: "Low", min: "$1,000" },
      { name: "Emerging Markets Fund", return: "+8.5%", risk: "High", min: "$500" },
    ]
  },
  "private-markets": {
    name: "Private Markets",
    icon: Building2,
    description: "Private Equity, Venture Capital & Private Credit",
    dbTypes: ["private_equity", "venture_capital"],
    color: "text-purple-500 bg-purple-500/10",
    opportunities: [
      { name: "Growth Tech Fund IV", return: "Target 20%", risk: "Very High", min: "$100k" },
      { name: "Private Credit Income", return: "Target 12%", risk: "Medium", min: "$50k" },
      { name: "Pre-IPO Secondary Fund", return: "Target 25%", risk: "High", min: "$250k" },
    ]
  },
  "real-estate": {
    name: "Real Estate",
    icon: Home,
    description: "Residential, Commercial Properties & REITs",
    dbTypes: ["real_estate"], // REITs are stocks in DB, so this might be empty for now unless we change DB
    color: "text-emerald-500 bg-emerald-500/10",
    opportunities: [
      { name: "London Commercial REIT", return: "+5.5% Yield", risk: "Medium", min: "$1,000" },
      { name: "Dubai Residential Fund", return: "+7.2% Yield", risk: "Medium", min: "$25,000" },
      { name: "US Logistics Portfolio", return: "+6.0% Yield", risk: "Low", min: "$10,000" },
    ]
  },
  "alternative-assets": {
    name: "Alternative Assets",
    icon: Gem,
    description: "Cryptocurrency, Gold, Art & Collectibles",
    dbTypes: ["crypto", "commodity", "collectible"],
    color: "text-amber-500 bg-amber-500/10",
    opportunities: [
      { name: "Bitcoin Trust", return: "+150% YTD", risk: "Very High", min: "$100" },
      { name: "Gold Bullion ETF", return: "+12% YTD", risk: "Medium", min: "$100" },
      { name: "Fine Art Fund", return: "Target 10%", risk: "High", min: "$50,000" },
    ]
  },
  "business-ownership": {
    name: "Business Ownership",
    icon: Briefcase,
    description: "Direct Equity & Franchises",
    dbTypes: ["business_equity"],
    color: "text-rose-500 bg-rose-500/10",
    opportunities: [
      { name: "Tech Startup Angel Group", return: "Varies", risk: "Very High", min: "$25k" },
      { name: "F&B Franchise Pool", return: "Target 15%", risk: "High", min: "$100k" },
    ]
  },
  "wealth-preservation": {
    name: "Wealth Preservation",
    icon: Wallet,
    description: "Trusts & Holding Structures",
    dbTypes: ["trust"],
    color: "text-slate-500 bg-slate-500/10",
    opportunities: [
      { name: "Family Trust Setup", return: "N/A", risk: "Low", min: "$500k" },
      { name: "Offshore Holding Co.", return: "N/A", risk: "Low", min: "$100k" },
    ]
  },
  "lifestyle-investments": {
    name: "Lifestyle Investments",
    icon: Palmtree,
    description: "Yachts, Jets & Luxury Assets",
    dbTypes: ["luxury_asset"],
    color: "text-cyan-500 bg-cyan-500/10",
    opportunities: [
      { name: "Private Jet Fractional", return: "Usage Rights", risk: "Medium", min: "$250k" },
      { name: "Luxury Yacht Charter", return: "Target 5%", risk: "High", min: "$500k" },
    ]
  }
}

export default function InvestmentCategoryPage() {
  const params = useParams()
  const router = useRouter()
  const { currentUser } = useRole()
  const categoryId = params.category as string
  const config = categoryConfig[categoryId]

  const [holdings, setHoldings] = useState<PortfolioHolding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedHolding, setSelectedHolding] = useState<PortfolioHolding | null>(null)

  useEffect(() => {
    if (!config) {
        // Handle invalid category
        setIsLoading(false)
        return
    }

    async function fetchHoldings() {
      if (!currentUser?.id) return
      setIsLoading(true)
      const supabase = createClient()

      // Fetch all holdings for user
      const { data, error } = await supabase
        .from("portfolio_holdings")
        .select("*")
        .eq("user_id", currentUser.id)

      if (error) {
        console.error("Error fetching holdings:", error)
      } else if (data) {
        // Filter in memory for simplicity with mapped types
        const filtered = data.filter((h: any) => config.dbTypes.includes(h.type))
        
        // Map to UI model
        const mapped = filtered.map((h: any) => ({
            id: h.id,
            userId: h.user_id,
            symbol: h.symbol,
            name: h.name,
            type: h.type,
            quantity: Number(h.quantity),
            avgCost: Number(h.avg_cost),
            currentPrice: Number(h.current_price),
            value: Number(h.quantity) * Number(h.current_price),
            gain: (Number(h.current_price) - Number(h.avg_cost)) * Number(h.quantity),
            gainPercent: Number(h.avg_cost) !== 0 
                ? ((Number(h.current_price) - Number(h.avg_cost)) / Number(h.avg_cost)) * 100 
                : 0
        }))
        setHoldings(mapped)
      }
      setIsLoading(false)
    }

    fetchHoldings()
  }, [currentUser, config])

  if (!config) {
    return (
        <div className="p-8 text-center">
            <h2 className="text-xl font-bold">Category not found</h2>
            <Button className="mt-4" onClick={() => router.push('/investments')}>Return to Investments</Button>
        </div>
    )
  }

  const Icon = config.icon
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0)
  const totalGain = holdings.reduce((sum, h) => sum + h.gain, 0)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/investments')}>
            <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="h-6 w-6" />
                </div>
                {config.name}
            </h1>
            <p className="text-muted-foreground">{config.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            {/* Holdings Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Holdings</CardTitle>
                    <CardDescription>
                        Total Value: <span className="font-bold text-foreground">{formatCurrency(totalValue, "USD")}</span>
                        {holdings.length > 0 && (
                            <span className={`ml-3 ${totalGain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain, "USD")}
                            </span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : holdings.length > 0 ? (
                        <div className="space-y-4">
                            {holdings.map((h) => (
                                <button
                                  key={h.id}
                                  onClick={() => setSelectedHolding(h)}
                                  className="flex items-center justify-between w-full text-left p-4 border rounded-lg hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                                            {h.symbol.substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="font-medium">{h.symbol}</p>
                                            <p className="text-sm text-muted-foreground">{h.name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">{formatCurrency(h.value, "USD")}</p>
                                        <p className={`text-xs ${h.gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {h.gain >= 0 ? '+' : ''}{h.gainPercent.toFixed(2)}%
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-muted/20 rounded-lg">
                            <p className="text-muted-foreground">No active holdings in this category.</p>
                            <Button variant="link" className="mt-2">Explore opportunities below</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Opportunities Section */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Investment Opportunities</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.opportunities.map((opp: any, i: number) => (
                        <Card key={i} className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-primary/50">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold">{opp.name}</h4>
                                    <Badge variant="outline">{opp.risk}</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="text-emerald-600 font-medium">{opp.return}</span>
                                    <span>Min: {opp.min}</span>
                                </div>
                                <Button size="sm" variant="secondary" className="w-full mt-3">View Details</Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">About {config.name}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        {config.name} offer a way to diversify your portfolio beyond standard savings.
                        Risks include market volatility and potential loss of principal.
                    </p>
                </CardContent>
            </Card>

            <AskAIBankerWidget 
              questions={[
                `Is ${config.name} right for me?`,
                `What are the risks of ${config.name}?`,
                `Show me top performing ${config.name}`
              ]}
              description={`Ask about ${config.name}`}
              title="Ask AI Investmentor"
              agentId="investmentor"
            />
        </div>
      </div>

      {selectedHolding && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSelectedHolding(null)}
          />
          <div className="fixed top-16 bottom-6 right-0 w-full lg:w-[40vw] bg-background border-l shadow-2xl z-50 flex flex-col">
            <div className="flex items-start justify-between border-b p-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Holding Details</p>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  {selectedHolding.name}
                  <Badge variant="secondary">{selectedHolding.symbol}</Badge>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Last price: {formatCurrency(selectedHolding.currentPrice, "USD")} · Position value{" "}
                  <span className="font-medium">{formatCurrency(selectedHolding.value, "USD")}</span>
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedHolding(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <section>
                <h3 className="text-sm font-medium mb-3">Performance Snapshot</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-muted-foreground text-xs">Market Value</p>
                    <p className="text-base font-semibold">{formatCurrency(selectedHolding.value, "USD")}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-muted-foreground text-xs">Unrealized P/L</p>
                    <p className={`text-base font-semibold ${selectedHolding.gain >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {selectedHolding.gain >= 0 ? "+" : ""}
                      {formatCurrency(selectedHolding.gain, "USD")} ({selectedHolding.gainPercent.toFixed(2)}%)
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-muted-foreground text-xs">Quantity</p>
                    <p className="text-base font-semibold">{selectedHolding.quantity.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-muted-foreground text-xs">Average Cost</p>
                    <p className="text-base font-semibold">
                      {formatCurrency(selectedHolding.avgCost, "USD")}
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Market Value History</h3>
                  <span className="text-xs text-muted-foreground">5-year trend</span>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={generateMockPriceHistory(selectedHolding.symbol)}>
                      <defs>
                        <linearGradient id="holdingArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#16a34a"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#holdingArea)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Latest News & Signals</h3>
                  <Badge variant="outline" className="text-xs">Curated</Badge>
                </div>
                <div className="space-y-3">
                  {generateMockNews(selectedHolding.symbol).map((news, idx) => (
                    <div key={idx} className="rounded-xl border p-3">
                      <p className="text-sm font-medium">{news.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{news.source} · {news.time}</p>
                      <p className="text-xs text-muted-foreground mt-2">{news.summary}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-medium mb-3">AI Agent Actions</h3>
                <div className="grid gap-2">
                  <AskAIButton
                    agentId="investmentor"
                    initialQuestion={`Summarize ${selectedHolding.name} (${selectedHolding.symbol}) performance and suggest if I should add to my position.`}
                  >
                    <Button variant="outline" className="w-full justify-between">
                      Ask Investmentor for advice
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </AskAIButton>
                  <AskAIButton
                    agentId="investmentor"
                    initialQuestion={`What are the key risks for ${selectedHolding.name} (${selectedHolding.symbol}) right now?`}
                  >
                    <Button variant="ghost" className="w-full justify-between">
                      Request risk outlook
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </AskAIButton>
                  <AskAIButton
                    agentId="researcher"
                    initialQuestion={`Provide the latest news and market commentary on ${selectedHolding.name} (${selectedHolding.symbol}).`}
                  >
                    <Button variant="ghost" className="w-full justify-between">
                      Ask Research Analyst
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </AskAIButton>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function generateMockPriceHistory(symbol: string) {
  const now = new Date()
  return Array.from({ length: 10 }).map((_, idx) => {
    const year = now.getFullYear() - (9 - idx)
    return {
      label: year.toString(),
      value: Math.round(5000 + Math.sin(idx / 2) * 2000 + idx * 500),
    }
  })
}

function generateMockNews(symbol: string) {
  return [
    {
      title: `${symbol} beats earnings expectations`,
      source: "Bloomberg",
      time: "2h ago",
      summary: `${symbol} posted stronger-than-expected quarterly revenue on resilient enterprise demand.`,
    },
    {
      title: `${symbol} expands AI partnership`,
      source: "Reuters",
      time: "6h ago",
      summary: `Management announced a multi-year collaboration to accelerate AI workloads using ${symbol}'s hardware.`,
    },
    {
      title: `${symbol} technical indicators flashing overbought`,
      source: "CNBC",
      time: "12h ago",
      summary: `Relative strength index approaches 75; traders watching for consolidation before next leg higher.`,
    },
  ]
}

