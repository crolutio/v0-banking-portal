"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { StatCard } from "@/components/ui/stat-card"
import { CitationBadge, ConfidenceIndicator } from "@/components/ai/citation-badge"
import { formatCurrency } from "@/lib/format"
import { portfolioHoldings } from "@/lib/mock-data"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Plus,
  Star,
  AlertTriangle,
  Bot,
  Shield,
  ExternalLink,
  HelpCircle,
  BookOpen,
  UserPlus,
  Building2,
  Landmark,
  Gem,
  Briefcase,
  Wallet,
  Palmtree,
  Search,
  ChevronRight,
  Lock,
  Home,
} from "lucide-react"

// Mock watchlist
const watchlist = [
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 142.65, change: 1.23, changePercent: 0.87 },
  { symbol: "AMZN", name: "Amazon.com Inc.", price: 178.25, change: -2.15, changePercent: -1.19 },
  { symbol: "TSLA", name: "Tesla Inc.", price: 248.5, change: 5.75, changePercent: 2.37 },
  { symbol: "NVDA", name: "NVIDIA Corporation", price: 495.22, change: 12.33, changePercent: 2.55 },
]

// Mock market news
const marketNews = [
  {
    id: 1,
    title: "Federal Reserve Signals Rate Decision in December Meeting",
    source: "Financial Times",
    time: "2 hours ago",
    summary: "The Federal Reserve indicated potential policy changes in their upcoming December meeting...",
  },
  {
    id: 2,
    title: "Tech Stocks Rally on AI Optimism",
    source: "Bloomberg",
    time: "4 hours ago",
    summary: "Major technology companies saw significant gains as investors remain bullish on AI developments...",
  },
  {
    id: 3,
    title: "UAE Market Opens Higher Amid Regional Growth",
    source: "Gulf News",
    time: "6 hours ago",
    summary: "The Abu Dhabi Securities Exchange and Dubai Financial Market both opened in positive territory...",
  },
]

const investmentCategories = [
  {
    id: "public-markets",
    name: "Public Market Investments",
    icon: Landmark,
    description: "Traditional publicly traded securities",
    color: "bg-blue-500",
    investments: [
      { name: "Stocks (Individual)", risk: "High", minInvestment: "$100", liquidity: "High" },
      { name: "ETFs (Index Funds)", risk: "Medium", minInvestment: "$50", liquidity: "High" },
      { name: "Mutual Funds", risk: "Medium", minInvestment: "$1,000", liquidity: "Medium" },
      { name: "Government Bonds", risk: "Low", minInvestment: "$1,000", liquidity: "Medium" },
      { name: "Corporate Bonds", risk: "Medium", minInvestment: "$5,000", liquidity: "Medium" },
      { name: "Money Market Funds", risk: "Low", minInvestment: "$500", liquidity: "High" },
    ],
  },
  {
    id: "private-markets",
    name: "Private Market Investments",
    icon: Building2,
    description: "Exclusive opportunities for qualified investors",
    color: "bg-purple-500",
    investments: [
      { name: "Private Equity Funds", risk: "High", minInvestment: "$250,000", liquidity: "Low" },
      { name: "Venture Capital Funds", risk: "Very High", minInvestment: "$100,000", liquidity: "Low" },
      { name: "Hedge Funds", risk: "High", minInvestment: "$500,000", liquidity: "Low" },
      { name: "Private Credit Funds", risk: "Medium", minInvestment: "$100,000", liquidity: "Low" },
      { name: "Structured Notes", risk: "Medium", minInvestment: "$50,000", liquidity: "Medium" },
      { name: "Secondary Market Private Shares", risk: "High", minInvestment: "$25,000", liquidity: "Low" },
    ],
  },
  {
    id: "real-estate",
    name: "Real Estate Investments",
    icon: Home,
    description: "Property and land-based investments",
    color: "bg-emerald-500",
    investments: [
      { name: "Residential Properties", risk: "Medium", minInvestment: "$50,000", liquidity: "Low" },
      { name: "Commercial Properties", risk: "Medium", minInvestment: "$100,000", liquidity: "Low" },
      { name: "Rental Properties", risk: "Medium", minInvestment: "$30,000", liquidity: "Low" },
      { name: "Land Investments", risk: "Medium", minInvestment: "$20,000", liquidity: "Low" },
      { name: "Real Estate Development Projects", risk: "High", minInvestment: "$500,000", liquidity: "Very Low" },
      { name: "REITs", risk: "Medium", minInvestment: "$500", liquidity: "High" },
      { name: "Private Real Estate Funds", risk: "Medium", minInvestment: "$100,000", liquidity: "Low" },
    ],
  },
  {
    id: "alternative-assets",
    name: "Alternative Assets",
    icon: Gem,
    description: "Non-traditional investment opportunities",
    color: "bg-amber-500",
    investments: [
      { name: "Gold & Precious Metals", risk: "Medium", minInvestment: "$1,000", liquidity: "High" },
      { name: "Commodities (Oil, Gas, Agriculture)", risk: "High", minInvestment: "$5,000", liquidity: "Medium" },
      { name: "Art & Fine Collectibles", risk: "High", minInvestment: "$10,000", liquidity: "Low" },
      { name: "Luxury Watches", risk: "Medium", minInvestment: "$5,000", liquidity: "Low" },
      { name: "Classic Cars", risk: "High", minInvestment: "$50,000", liquidity: "Low" },
      { name: "Wine Collections", risk: "Medium", minInvestment: "$2,500", liquidity: "Low" },
      { name: "Crypto (BTC, ETH, etc.)", risk: "Very High", minInvestment: "$100", liquidity: "High" },
      { name: "Crypto VC Funds", risk: "Very High", minInvestment: "$50,000", liquidity: "Low" },
    ],
  },
  {
    id: "business-ownership",
    name: "Business Ownership",
    icon: Briefcase,
    description: "Direct ownership and equity investments",
    color: "bg-rose-500",
    investments: [
      { name: "Owning Private Companies", risk: "Very High", minInvestment: "$100,000", liquidity: "Very Low" },
      { name: "Equity in Operating Businesses", risk: "High", minInvestment: "$50,000", liquidity: "Low" },
      { name: "Franchises", risk: "High", minInvestment: "$75,000", liquidity: "Low" },
      { name: "Joint Ventures", risk: "High", minInvestment: "$100,000", liquidity: "Low" },
      { name: "Licensing / IP Assets", risk: "Medium", minInvestment: "$25,000", liquidity: "Low" },
      { name: "Dividend-Producing Companies", risk: "Medium", minInvestment: "$10,000", liquidity: "Medium" },
    ],
  },
  {
    id: "wealth-preservation",
    name: "Wealth Preservation Structures",
    icon: Wallet,
    description: "Tax-efficient and protective structures",
    color: "bg-slate-500",
    investments: [
      { name: "Trusts", risk: "Low", minInvestment: "$500,000", liquidity: "Medium" },
      { name: "Holding Companies", risk: "Low", minInvestment: "$250,000", liquidity: "Low" },
      { name: "Family Offices", risk: "Low", minInvestment: "$10,000,000", liquidity: "Medium" },
      { name: "Offshore Companies (Legal)", risk: "Low", minInvestment: "$100,000", liquidity: "Low" },
      { name: "Insurance-Based Investment Products", risk: "Low", minInvestment: "$50,000", liquidity: "Medium" },
    ],
  },
  {
    id: "lifestyle-investments",
    name: "Lifestyle Investments",
    icon: Palmtree,
    description: "Luxury assets with income potential",
    color: "bg-cyan-500",
    investments: [
      { name: "Yachts (Chartering Income)", risk: "High", minInvestment: "$500,000", liquidity: "Low" },
      { name: "Private Jets (Fractional Ownership)", risk: "High", minInvestment: "$250,000", liquidity: "Low" },
      { name: "Vacation Homes (Airbnb Rental)", risk: "Medium", minInvestment: "$200,000", liquidity: "Low" },
      { name: "Luxury Real Estate Portfolios", risk: "Medium", minInvestment: "$1,000,000", liquidity: "Low" },
      { name: "Hotels or Hospitality Assets", risk: "High", minInvestment: "$500,000", liquidity: "Low" },
      { name: "Sports Teams or Club Shares", risk: "High", minInvestment: "$1,000,000", liquidity: "Very Low" },
    ],
  },
]

export default function InvestmentsPage() {
  const [riskDialogOpen, setRiskDialogOpen] = useState(false)
  const [riskAnswers, setRiskAnswers] = useState<Record<string, string>>({})
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [interestDialogOpen, setInterestDialogOpen] = useState(false)
  const [selectedInvestment, setSelectedInvestment] = useState<{ category: string; name: string } | null>(null)

  // Filter holdings for current user (using VIP customer for demo)
  const userHoldings = portfolioHoldings.filter((h) => h.userId === "user_retail_2")
  const totalValue = userHoldings.reduce((sum, h) => sum + h.value, 0)
  const totalGain = userHoldings.reduce((sum, h) => sum + h.gain, 0)
  const totalGainPercent = ((totalGain / (totalValue - totalGain)) * 100).toFixed(2)

  // Calculate allocation
  const allocation = userHoldings.reduce(
    (acc, h) => {
      acc[h.type] = (acc[h.type] || 0) + h.value
      return acc
    },
    {} as Record<string, number>,
  )

  const filteredCategories = investmentCategories
    .map((category) => ({
      ...category,
      investments: category.investments.filter((inv) => inv.name.toLowerCase().includes(searchQuery.toLowerCase())),
    }))
    .filter((category) => category.investments.length > 0)

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Low":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "High":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
      case "Very High":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const handleExpressInterest = (categoryName: string, investmentName: string) => {
    setSelectedInvestment({ category: categoryName, name: investmentName })
    setInterestDialogOpen(true)
  }

  // AI Banker questions relevant to investments page
  const aiQuestions = [
    "How is my portfolio performing?",
    "What's my risk profile?",
    "Should I diversify my investments?",
    "Explain ETFs vs mutual funds",
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Disclaimer Banner */}
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-800 dark:text-orange-200">Investment Disclaimer</h3>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                The information provided here is for educational purposes only and does not constitute financial advice.
                Past performance is not indicative of future results. Please consult with a qualified financial advisor
                before making investment decisions.
              </p>
              <Button variant="link" size="sm" className="text-orange-700 dark:text-orange-300 p-0 h-auto mt-1">
                <UserPlus className="h-4 w-4 mr-1" />
                Contact your Relationship Manager
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Investments</h1>
          <p className="text-muted-foreground">View your portfolio and track market trends</p>
        </div>
        <Dialog open={riskDialogOpen} onOpenChange={setRiskDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <HelpCircle className="h-4 w-4 mr-2" />
              Risk Profile Questionnaire
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Risk Profile Assessment</DialogTitle>
              <DialogDescription>
                Answer a few questions to help us understand your investment risk tolerance
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label>1. What is your investment time horizon?</Label>
                <RadioGroup
                  value={riskAnswers.q1}
                  onValueChange={(v) => setRiskAnswers((prev) => ({ ...prev, q1: v }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="short" id="q1-short" />
                    <Label htmlFor="q1-short" className="font-normal">
                      Less than 3 years
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="q1-medium" />
                    <Label htmlFor="q1-medium" className="font-normal">
                      3-7 years
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="long" id="q1-long" />
                    <Label htmlFor="q1-long" className="font-normal">
                      More than 7 years
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>2. How would you react to a 20% drop in your portfolio?</Label>
                <RadioGroup
                  value={riskAnswers.q2}
                  onValueChange={(v) => setRiskAnswers((prev) => ({ ...prev, q2: v }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sell" id="q2-sell" />
                    <Label htmlFor="q2-sell" className="font-normal">
                      Sell immediately
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hold" id="q2-hold" />
                    <Label htmlFor="q2-hold" className="font-normal">
                      Hold and wait
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="buy" id="q2-buy" />
                    <Label htmlFor="q2-buy" className="font-normal">
                      Buy more at lower prices
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>3. What is your primary investment goal?</Label>
                <RadioGroup
                  value={riskAnswers.q3}
                  onValueChange={(v) => setRiskAnswers((prev) => ({ ...prev, q3: v }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="preserve" id="q3-preserve" />
                    <Label htmlFor="q3-preserve" className="font-normal">
                      Preserve capital
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="income" id="q3-income" />
                    <Label htmlFor="q3-income" className="font-normal">
                      Generate income
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="growth" id="q3-growth" />
                    <Label htmlFor="q3-growth" className="font-normal">
                      Maximize growth
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRiskDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setRiskDialogOpen(false)}>Submit Assessment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content area - 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="portfolio" className="space-y-6">
            <TabsList>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              <TabsTrigger value="explore">Explore Investments</TabsTrigger>
              <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
            </TabsList>

            {/* Portfolio Tab */}
            <TabsContent value="portfolio" className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                  title="Total Portfolio Value"
                  value={formatCurrency(totalValue, "USD")}
                  icon={PieChart}
                  description="Across all holdings"
                />
                <StatCard
                  title="Total Gain/Loss"
                  value={formatCurrency(totalGain, "USD")}
                  icon={totalGain >= 0 ? TrendingUp : TrendingDown}
                  description={`${totalGainPercent}% overall`}
                  trend={{ value: Number(totalGainPercent), direction: totalGain >= 0 ? "up" : "down" }}
                />
                <StatCard title="Risk Profile" value="Moderate" icon={BarChart3} description="Last updated Dec 2024" />
                <StatCard
                  title="Holdings"
                  value={userHoldings.length.toString()}
                  icon={PieChart}
                  description="Diversified assets"
                />
              </div>

              {/* Allocation */}
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Allocation</CardTitle>
                  <CardDescription>Distribution of your investments by asset type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(allocation).map(([type, value]) => {
                      const percentage = ((value / totalValue) * 100).toFixed(1)
                      return (
                        <div key={type} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{type.replace("_", " ")}</span>
                            <span className="font-medium">
                              {formatCurrency(value, "USD")} ({percentage}%)
                            </span>
                          </div>
                          <Progress value={Number(percentage)} className="h-2" />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Holdings Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Holdings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userHoldings.map((holding) => (
                      <div
                        key={holding.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                            {holding.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium">{holding.symbol}</p>
                            <p className="text-sm text-muted-foreground">{holding.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(holding.value, "USD")}</p>
                          <p
                            className={`text-sm flex items-center justify-end gap-1 ${
                              holding.gain >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {holding.gain >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {holding.gain >= 0 ? "+" : ""}
                            {formatCurrency(holding.gain, "USD")} ({holding.gainPercent.toFixed(2)}%)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="explore" className="space-y-6">
              {/* Search Bar */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search investment types..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Badge variant="outline" className="text-muted-foreground">
                  {investmentCategories.reduce((sum, c) => sum + c.investments.length, 0)} investment types available
                </Badge>
              </div>

              {/* Accredited Investor Notice */}
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-800 dark:text-blue-200">Accredited Investor Requirements</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Some investments are only available to accredited or qualified investors. Minimum investment
                        amounts and eligibility requirements vary. Contact your Relationship Manager to discuss your
                        options.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Investment Categories */}
              <div className="grid gap-6">
                {(searchQuery ? filteredCategories : investmentCategories).map((category) => (
                  <Card key={category.id} className="overflow-hidden">
                    <CardHeader
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-lg ${category.color} flex items-center justify-center`}>
                            <category.icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                            <CardDescription>{category.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{category.investments.length} options</Badge>
                          <ChevronRight
                            className={`h-5 w-5 text-muted-foreground transition-transform ${
                              selectedCategory === category.id ? "rotate-90" : ""
                            }`}
                          />
                        </div>
                      </div>
                    </CardHeader>

                    {(selectedCategory === category.id || searchQuery) && (
                      <CardContent className="border-t bg-muted/30">
                        <div className="grid gap-3 pt-4">
                          {category.investments.map((investment, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-4 rounded-lg border bg-background hover:shadow-sm transition-shadow"
                            >
                              <div className="flex-1">
                                <h4 className="font-medium">{investment.name}</h4>
                                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                                  <span>Min: {investment.minInvestment}</span>
                                  <span>•</span>
                                  <span>Liquidity: {investment.liquidity}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge className={getRiskColor(investment.risk)}>{investment.risk} Risk</Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleExpressInterest(category.name, investment.name)}
                                >
                                  Learn More
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              {searchQuery && filteredCategories.length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No investment types found matching "{searchQuery}"</p>
                </Card>
              )}
            </TabsContent>

            {/* Watchlist Tab */}
            <TabsContent value="watchlist" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">Your Watchlist</h2>
                  <p className="text-sm text-muted-foreground">Track stocks you're interested in</p>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Symbol
                </Button>
              </div>

              <div className="grid gap-4">
                {watchlist.map((stock) => (
                  <Card key={stock.symbol}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-semibold">
                            {stock.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium">{stock.symbol}</p>
                            <p className="text-sm text-muted-foreground">{stock.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="font-medium">${stock.price.toFixed(2)}</p>
                            <p
                              className={`text-sm flex items-center justify-end gap-1 ${
                                stock.change >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {stock.change >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {stock.change >= 0 ? "+" : ""}
                              {stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                            </p>
                          </div>
                          <Button variant="ghost" size="icon">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="insights" className="space-y-6">
              {/* Portfolio Explanation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Portfolio Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm leading-relaxed">
                      Your portfolio is well-diversified across <strong>stocks (48%)</strong>,{" "}
                      <strong>ETFs (36%)</strong>, and <strong>bonds (16%)</strong>. This allocation aligns with your{" "}
                      <strong>Moderate</strong> risk profile.
                    </p>
                    <p className="text-sm leading-relaxed mt-2">Key observations:</p>
                    <ul className="text-sm list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                      <li>Strong performance in tech holdings (AAPL, MSFT) with gains above 17%</li>
                      <li>Bond allocation provides stability during market volatility</li>
                      <li>Consider rebalancing if any single holding exceeds 30% of portfolio</li>
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <CitationBadge
                      citation={{
                        id: "1",
                        source: "Portfolio Holdings",
                        type: "account_ledger",
                      }}
                    />
                    <CitationBadge
                      citation={{
                        id: "2",
                        source: "Risk Profile Assessment",
                        type: "risk_rules",
                      }}
                    />
                  </div>
                  <ConfidenceIndicator confidence="high" />

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-sm">
                    <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="text-orange-700 dark:text-orange-300">
                      This analysis is for informational purposes only and does not constitute investment advice.
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Market News Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Market News Summary
                  </CardTitle>
                  <CardDescription>AI-curated news relevant to your holdings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {marketNews.map((news) => (
                    <div key={news.id} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-medium">{news.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{news.summary}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>{news.source}</span>
                            <span>•</span>
                            <span>{news.time}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <CitationBadge
                      citation={{
                        id: "1",
                        source: "Financial Times",
                        type: "policy",
                      }}
                    />
                    <CitationBadge
                      citation={{
                        id: "2",
                        source: "Bloomberg",
                        type: "policy",
                      }}
                    />
                    <CitationBadge
                      citation={{
                        id: "3",
                        source: "Gulf News",
                        type: "policy",
                      }}
                    />
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      News summaries are provided for educational purposes. Always verify information from primary
                      sources before making investment decisions.
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar with AI widget - 1 column */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <AskAIBankerWidget questions={aiQuestions} description="Get personalized investment advice and insights" />
          </div>
        </div>
      </div>
    </div>
  )
}
