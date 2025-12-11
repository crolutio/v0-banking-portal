"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useRole } from "@/lib/role-context"
import { useFloatingChat } from "@/components/ai/floating-chat-context"
import { formatCurrency, formatAccountNumber, formatDate, getCategoryColor, getStatusColor } from "@/lib/format"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ArrowUpRight, ArrowDownRight, Search, TrendingUp, Bot, Copy, Eye, EyeOff, RefreshCw, Loader2, Sparkles, AlertTriangle } from "lucide-react"
import type { Account, Transaction } from "@/lib/types"
import { AskAIBankerWidget, AskAIButton } from "@/components/ai/ask-ai-banker-widget"
import { createClient } from "@/lib/supabase/client"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

function ArrowTrendingIcon({ tone }: { tone: "positive" | "negative" | "neutral" }) {
  if (tone === "positive") {
    return <ArrowDownRight className="h-3.5 w-3.5" />
  }
  if (tone === "negative") {
    return <ArrowUpRight className="h-3.5 w-3.5" />
  }
  return <Search className="h-3.5 w-3.5" />
}

function AccountCard({ 
  account, 
  onClick, 
  showBalance, 
  onToggleBalance 
}: { 
  account: Account
  onClick: () => void
  showBalance: boolean
  onToggleBalance: () => void
}) {
  const getAccountIcon = () => {
    switch (account.type) {
      case "savings":
        return "💰"
      case "business":
        return "🏢"
      case "fx_wallet":
        return "💱"
      default:
        return "💳"
    }
  }

  return (
    <Card className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-2xl">
              {getAccountIcon()}
            </div>
            <div>
              <p className="font-medium">{account.name}</p>
              <p className="text-sm text-muted-foreground">{formatAccountNumber(account.accountNumber)}</p>
            </div>
          </div>
          <Badge variant="secondary" className={getStatusColor(account.status)}>
            {account.status}
          </Badge>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
            <p className="text-2xl font-bold">
              {showBalance ? formatCurrency(account.availableBalance, account.currency) : "••••••"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation()
              onToggleBalance()
            }}
          >
            {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function TransactionsTable({
  transactions,
  accounts = [],
  showFilters = true,
}: { transactions: Transaction[]; accounts?: Account[]; showFilters?: boolean }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [accountFilter, setAccountFilter] = useState<string>("all")

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const matchesSearch =
        txn.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.merchant?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === "all" || txn.category === categoryFilter
      const matchesType = typeFilter === "all" || txn.type === typeFilter
      const matchesAccount = accountFilter === "all" || txn.accountId === accountFilter
      return matchesSearch && matchesCategory && matchesType && matchesAccount
    })
  }, [transactions, searchQuery, categoryFilter, typeFilter, accountFilter])

  const categories = [...new Set(transactions.map((t) => t.category))]

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {accounts.length > 0 && (
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} (...{acc.accountNumber.slice(-4)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="capitalize">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="credit">Income</SelectItem>
                <SelectItem value="debit">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Total Income</p>
              <p className="text-lg font-bold text-emerald-500">+{formatCurrency(totalIncome)}</p>
            </div>
            <div className="h-full w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Total Expense</p>
              <p className="text-lg font-bold text-foreground">-{formatCurrency(totalExpense)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Description</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">
                  Category
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((txn) => (
                <tr key={txn.id} className="border-b last:border-0 hover:bg-muted/20 group">
                  <td className="px-4 py-3 text-sm">{formatDate(txn.date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                          txn.type === "credit" ? "bg-emerald-500/20" : "bg-muted"
                        }`}
                      >
                        {txn.type === "credit" ? (
                          <ArrowDownRight className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{txn.description}</p>
                        {txn.merchant && <p className="text-xs text-muted-foreground truncate">{txn.merchant}</p>}
                      </div>
                      <AskAIButton 
                        initialQuestion={`Explain this transaction: ${txn.description} for ${formatCurrency(txn.amount)} on ${formatDate(txn.date)}`}
                      >
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 px-2 text-[10px] border-primary/30 text-primary hover:bg-primary/10 hover:border-primary transition-all"
                        >
                          Ask AI
                        </Button>
                      </AskAIButton>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className={`text-xs ${getCategoryColor(txn.category)}`}>
                        {txn.category}
                      </Badge>
                      {txn.categorySource === "auto_rule" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 border-dashed"
                          title={txn.categoryReason || "Auto-categorized"}
                        >
                          Auto
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td
                    className={`px-4 py-3 text-sm font-medium text-right ${
                      txn.type === "credit" ? "text-emerald-500" : "text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <span>
                        {txn.type === "credit" ? "+" : "-"}
                        {formatCurrency(txn.amount)}
                      </span>
                      {txn.isUnusual && (
                        <div title={txn.unusualReason || "Unusual activity detected"}>
                          <AlertTriangle className="h-4 w-4 text-amber-500 cursor-help" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground text-right hidden md:table-cell">
                    {formatCurrency(txn.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No transactions found matching your filters.</div>
      )}
    </div>
  )
}

function AccountInsightsPanel({ account, transactions }: { account: Account, transactions: Transaction[] }) {
  const { openChatWithMessage } = useFloatingChat()
  // Use passed transactions instead of fetching them
  const thisMonthSpend = transactions
    .filter((t) => {
        const d = new Date(t.date)
        const now = new Date()
        return t.type === "debit" && 
               d.getMonth() === now.getMonth() && 
               d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const recurringPayments = [
    { name: "DEWA", amount: 450, day: 5 },
    { name: "Etisalat", amount: 299, day: 15 },
    { name: "Netflix", amount: 55, day: 22 },
  ]

  // Prepare data for the chart (last 6 months spending)
  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const today = new Date()
    const data = []
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const monthName = months[d.getMonth()]
        
        // Calculate spend for this month from transactions
        const monthlySpend = transactions
            .filter(t => {
                const tDate = new Date(t.date)
                return t.type === 'debit' && 
                       tDate.getMonth() === d.getMonth() && 
                       tDate.getFullYear() === d.getFullYear()
            })
            .reduce((sum, t) => sum + t.amount, 0)
            
        data.push({ name: monthName, spend: monthlySpend })
    }
    return data
  }, [transactions])

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">AI Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Your spending this month is{" "}
            <span className="text-foreground font-medium">{formatCurrency(thisMonthSpend)}</span>.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
              Account Ledger
            </Badge>
            <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
              Transactions
            </Badge>
          </div>
          <Button 
            variant="link" 
            size="sm" 
            className="px-0 mt-2 text-primary"
            onClick={() => openChatWithMessage(`Tell me more about my ${account.type} account ending in ${account.accountNumber.slice(-4)}`)}
          >
            Ask more about this account
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm">Spending History</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <XAxis 
                            dataKey="name" 
                            stroke="#888888" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                        />
                        <YAxis 
                            stroke="#888888" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => `${value}`} 
                        />
                        <Tooltip 
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            formatter={(value: number) => [formatCurrency(value), 'Spend']}
                        />
                        <Bar 
                            dataKey="spend" 
                            fill="currentColor" 
                            className="fill-primary" 
                            radius={[4, 4, 0, 0]} 
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recurring Payments Detected</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recurringPayments.map((payment, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{payment.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-muted-foreground">Day {payment.day}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cashflow Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center bg-muted/30 rounded-lg">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Projected balance in 30 days</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(account.balance + 8500)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AccountsPage() {
  const { currentUser } = useRole()
  const { openChatWithMessage } = useFloatingChat()
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAllBalances, setShowAllBalances] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!currentUser?.id) return

      setIsLoading(true)
      const supabase = createClient()

      // Fetch Accounts
      console.log("Fetching accounts for user:", currentUser?.id)
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", currentUser.id)

      if (accountsError) {
        console.error("Error fetching accounts FULL OBJECT:", JSON.stringify(accountsError, null, 2))
        console.error("Error details:", accountsError.message, accountsError.details, accountsError.hint)
      }
      
      const mappedAccounts: Account[] = (accountsData || []).map((a: any) => ({
        id: a.id,
        userId: a.user_id,
        name: a.name,
        type: a.type,
        currency: a.currency,
        balance: Number(a.balance),
        availableBalance: Number(a.available_balance),
        accountNumber: a.account_number,
        iban: a.iban,
        status: a.status
      }))
      
      setAccounts(mappedAccounts)

      // Fetch Transactions
      if (mappedAccounts.length > 0) {
        const accountIds = mappedAccounts.map(a => a.id)
        const { data: txData, error: txError } = await supabase
          .from("transactions")
          .select("*")
          .in("account_id", accountIds)
          .order("date", { ascending: false })

        if (txError) console.error("Error fetching transactions:", txError)

        const mappedTransactions: Transaction[] = (txData || []).map((t: any) => ({
          id: t.id,
          accountId: t.account_id,
          date: t.date,
          description: t.description,
          merchant: t.merchant,
          category: t.category,
          categorySource: t.category_source,
          categoryConfidence: Number(t.category_confidence),
          categoryReason: t.category_reason,
          isUnusual: t.is_unusual,
          unusualReason: t.unusual_reason,
          amount: Number(t.amount),
          balance: Number(t.balance_after),
          type: t.type,
          status: t.status,
          reference: t.reference
        }))
        
        setTransactions(mappedTransactions)
      } else {
        setTransactions([])
      }
      
      setIsLoading(false)
    }

    fetchData()
  }, [currentUser])

  const displayedTransactions = useMemo(() => {
    if (selectedAccount) {
      return transactions.filter(t => t.accountId === selectedAccount.id)
    }
    return transactions
  }, [transactions, selectedAccount])

  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => {
    const rate = acc.currency === "USD" ? 3.67 : 1
    return sum + acc.balance * rate
  }, 0), [accounts])

  const aiQuestions = [
    "Analyze my transaction patterns and identify any unusual activity",
    "Show me a detailed spending breakdown by category this month",
    "Compare my accounts and recommend which one to use for savings",
    "Help me optimize my account structure to reduce fees",
  ]

  const accountInsights = useMemo(() => {
    const now = new Date()
    // Compare last 30 days with the 30 days before that
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const sixtyDaysAgo = new Date(now)
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    let last30DaysSpend = 0
    let previous30DaysSpend = 0
    let unusualCount = 0
    const categoryTotals: Record<string, number> = {}

    transactions.forEach((t) => {
      const d = new Date(t.date)
      if (Number.isNaN(d.getTime())) return

      if (t.isUnusual) unusualCount += 1

      if (t.type === "debit") {
        // Last 30 days
        if (d >= thirtyDaysAgo && d <= now) {
          last30DaysSpend += t.amount
          const key = (t.category || "other").toLowerCase()
          categoryTotals[key] = (categoryTotals[key] || 0) + Math.abs(t.amount)
        } 
        // Previous 30 days (31-60 days ago)
        else if (d >= sixtyDaysAgo && d < thirtyDaysAgo) {
          previous30DaysSpend += t.amount
        }
      }
    })

    const diff = last30DaysSpend - previous30DaysSpend
    
    // Calculate percentage change, but cap extreme values for better UX
    let diffPct = 0
    if (previous30DaysSpend > 0) {
      const rawPct = (diff / previous30DaysSpend) * 100
      // Cap at ±100% for more reasonable display
      diffPct = Math.max(-100, Math.min(100, rawPct))
    } else if (last30DaysSpend > 0) {
      diffPct = 100
    }

    const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]

    const items: { id: string; title: string; detail: string; tone: "positive" | "negative" | "neutral" }[] = []

    if (last30DaysSpend > 0 && Math.abs(diff) > 10) {
      // Only show spending trend if the difference is meaningful (>10 AED)
      items.push({
        id: "spend-trend",
        tone: diff <= 0 ? "positive" : "negative",
        title:
          diff <= 0
            ? `Spending is down ${Math.abs(diffPct).toFixed(1)}% vs previous 30 days`
            : `Spending is up ${Math.abs(diffPct).toFixed(1)}% vs previous 30 days`,
        detail: `In the last 30 days you've spent ${formatCurrency(last30DaysSpend)} on debits across all accounts.`,
      })
    }

    if (topCategoryEntry) {
      const [cat, value] = topCategoryEntry
      items.push({
        id: "top-category",
        tone: "neutral",
        title: `Top category in last 30 days: ${cat.replace("_", " ")}`,
        detail: `You've spent ${formatCurrency(value)} in this category over the last 30 days.`,
      })
    }

    if (unusualCount > 0) {
      items.push({
        id: "unusual",
        tone: "negative",
        title: `${unusualCount} transaction${unusualCount > 1 ? "s" : ""} flagged as unusual`,
        detail: "Review these items to confirm they are expected and detect any potential fraud early.",
      })
    }

    return items
  }, [transactions])

  const transactionsPerMonth = useMemo(() => {
    const totals: Record<string, number> = {}

    transactions.forEach((txn) => {
      const txnDate = new Date(txn.date)
      if (Number.isNaN(txnDate.getTime())) return
      const key = `${txnDate.getFullYear()}-${txnDate.getMonth()}`
      const numericAmount = Number(txn.amount) || 0
      totals[key] = (totals[key] || 0) + Math.abs(numericAmount)
    })

    const now = new Date()
    const data = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      data.push({
        month: d.toLocaleString("default", { month: "short" }),
        total: totals[key] || 0,
      })
    }
    return data
  }, [transactions])

  const totalRecentVolume = useMemo(
    () => transactionsPerMonth.reduce((sum, bucket) => sum + bucket.total, 0),
    [transactionsPerMonth],
  )
  const latestMonthVolume = transactionsPerMonth.length
    ? transactionsPerMonth[transactionsPerMonth.length - 1].total
    : 0

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Accounts" description="Manage your accounts and view transactions" />

      {/* Total Balance Card */}
      <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/30">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
          <p className="text-4xl font-bold">{formatCurrency(totalBalance)}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts Grid - takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((account) => (
              <Sheet key={account.id}>
                <SheetTrigger asChild>
                  <div>
                    <AccountCard 
                      account={account} 
                      onClick={() => setSelectedAccount(account)} 
                      showBalance={showAllBalances}
                      onToggleBalance={() => setShowAllBalances(!showAllBalances)}
                    />
                  </div>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>{account.name}</SheetTitle>
                    <SheetDescription>Account details and insights</SheetDescription>
                  </SheetHeader>

                  <div className="mt-6 space-y-6">
                    <div className="p-4 rounded-lg bg-muted/30">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Account Number</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{formatAccountNumber(account.accountNumber, false)}</p>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Currency</p>
                          <p className="text-sm font-medium">{account.currency}</p>
                        </div>
                        {account.iban && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">IBAN</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium font-mono">{account.iban}</p>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <AccountInsightsPanel 
                      account={account} 
                      transactions={transactions.filter(t => t.accountId === account.id)} 
                    />
                  </div>
                </SheetContent>
              </Sheet>
            ))}
          </div>
        </div>

        {/* AI Banker Widget - takes 1 column on the side */}
        <div className="lg:col-span-1">
          <AskAIBankerWidget questions={aiQuestions} description="Get insights about your accounts" />
        </div>
      </div>

      {/* Account Insights List */}
      {accountInsights.length > 0 && (
        <Card className="border border-border/80">
          <CardHeader className="pb-3">
            <CardTitle>Spending Insights</CardTitle>
            <CardDescription>Last 30 days compared to previous 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accountInsights.map((insight) => (
              <div
                key={insight.id}
                className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  if (insight.id === "spend-trend") {
                    openChatWithMessage("Can you analyze my spending trend compared to last month and explain what caused the change?")
                  } else if (insight.id === "top-category") {
                    openChatWithMessage(`Why is my spending on ${insight.title.split(": ")[1]} so high this month? Show me the breakdown.`)
                  } else if (insight.id === "unusual") {
                    openChatWithMessage("Show me all unusual transactions and explain why they were flagged.")
                  }
                }}
              >
                <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <ArrowTrendingIcon tone={insight.tone} />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground">{insight.title}</p>
                  <p className="text-xs text-muted-foreground">{insight.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Monthly Transaction Volume Trend */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Monthly Transaction Volume</CardTitle>
            <CardDescription>
              Last 6 months · {formatCurrency(totalRecentVolume)} total movement
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {formatCurrency(latestMonthVolume)} last month
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={transactionsPerMonth} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="transactionsArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9ec771" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#9ec771" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#cbd5f5"
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ stroke: "#9ec771", strokeWidth: 1 }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
                  }}
                  formatter={(value: number) => [formatCurrency(value), "Monthly total"]}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#8fbf58"
                  strokeWidth={3}
                  fill="url(#transactionsArea)"
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              {selectedAccount ? `Showing transactions for ${selectedAccount.name}` : "All account transactions"}
            </CardDescription>
          </div>
          {selectedAccount && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedAccount(null)}>
              Show All
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <TransactionsTable transactions={displayedTransactions} />
        </CardContent>
      </Card>
    </div>
  )
}
