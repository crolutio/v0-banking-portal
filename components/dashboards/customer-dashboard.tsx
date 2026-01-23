"use client"

import { useMemo, useEffect, useState } from "react"
import Link from "next/link"
import { useFloatingChat } from "@/components/ai/floating-chat-context"
import { useRole } from "@/lib/role-context"
import { formatCurrency, formatDate, getCategoryColor } from "@/lib/format"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  AlertTriangle,
  FileQuestion,
  Landmark,
  Bot,
  Calendar,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Account, Transaction, Card as CardType, Loan, TransactionCategory } from "@/lib/types"

export function CustomerDashboard() {
  const { currentUser, currentBankingUserId } = useRole()
  const { openChatWithMessage } = useFloatingChat()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [cards, setCards] = useState<CardType[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined") return
    const STORAGE_KEY = "bof-last-categorize-run"
    if (window.sessionStorage.getItem(STORAGE_KEY)) return
    window.sessionStorage.setItem(STORAGE_KEY, new Date().toISOString())

    fetch("/api/transactions/categorize", { method: "POST" })
      .then(() => fetch("/api/transactions/detect-unusual", { method: "POST" }))
      .catch((error) => {
      console.warn("Auto-processing failed", error)
      window.sessionStorage.removeItem(STORAGE_KEY)
    })
  }, [])

  useEffect(() => {
    async function fetchData() {
      if (!currentBankingUserId) return

      setIsLoading(true)
      const supabase = createClient()

      // Fetch Accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("customer_id", currentBankingUserId)

      // #region agent log
      if (typeof window !== "undefined") {
        console.log("[debug] dashboard accounts query result", {
          userId: currentBankingUserId,
          hasError: !!accountsError,
          errorMessage: accountsError?.message,
          errorCode: accountsError?.code,
          count: accountsData?.length,
        })
        fetch("http://127.0.0.1:7243/ingest/416c505f-0f39-4083-9a11-a59f7ac8dac3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "customer-dashboard.tsx:66",
            message: "accounts query result",
            data: {
              userId: currentBankingUserId,
              hasError: !!accountsError,
              errorMessage: accountsError?.message,
              errorCode: accountsError?.code,
              count: accountsData?.length,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run8",
            hypothesisId: "G",
          }),
        }).catch((err) => console.warn("[debug] log POST failed", err))
      }
      // #endregion

      if (accountsError) {
        console.error("Error fetching accounts:", accountsError)
      }
      
      const mappedAccounts: Account[] = (accountsData || []).map((a: any) => ({
        id: a.id,
        userId: a.customer_id,
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

      // Fetch Transactions (for all accounts)
      if (mappedAccounts.length > 0) {
        const accountIds = mappedAccounts.map(a => a.id)
        // #region agent log
        if (typeof window !== "undefined") {
          fetch("http://127.0.0.1:7243/ingest/416c505f-0f39-4083-9a11-a59f7ac8dac3", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "customer-dashboard.tsx:138",
              message: "transactions query start",
              data: { table: "transactions", filterColumn: "account_id", accountIdCount: accountIds.length },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run9",
              hypothesisId: "H",
            }),
          }).catch(() => {})
        }
        // #endregion
        const { data: txData, error: txError } = await supabase
          .from("transactions")
          .select("*")
          .in("account_id", accountIds)
          .order("date", { ascending: false })

        if (txError) console.error("Error fetching transactions:", txError)

        const mappedTransactions: Transaction[] = (txData || []).map((t: any) => {
          const normalizedCategory = (t.category as TransactionCategory) || "other"
          const confidenceValue =
            typeof t.category_confidence === "number"
              ? t.category_confidence
              : Number(t.category_confidence)

          return {
            id: t.id,
            accountId: t.account_id,
            date: t.date,
            description: t.description,
            merchant: t.merchant,
            category: normalizedCategory,
            categorySource: t.category_source,
            categoryConfidence: Number.isFinite(confidenceValue) ? confidenceValue : 0,
            categoryReason: t.category_reason,
            isUnusual: t.is_unusual,
            unusualReason: t.unusual_reason,
            amount: Number(t.amount),
            balance: Number(t.balance_after),
            type: t.type,
            status: t.status,
            reference: t.reference,
          }
        })
        
        setTransactions(mappedTransactions)
      } else {
        setTransactions([])
      }

      // Fetch Cards
      // #region agent log
      if (typeof window !== "undefined") {
        fetch("http://127.0.0.1:7243/ingest/416c505f-0f39-4083-9a11-a59f7ac8dac3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "customer-dashboard.tsx:191",
            message: "cards query start",
            data: { table: "cards", filterColumn: "customer_id", userId: currentBankingUserId },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run9",
            hypothesisId: "H",
          }),
        }).catch(() => {})
      }
      // #endregion
      const { data: cardsData, error: cardsError } = await supabase
        .from("cards")
        .select("*")
        .eq("customer_id", currentBankingUserId)

      // #region agent log
      if (typeof window !== "undefined") {
        console.log("[debug] dashboard cards query result", {
          userId: currentBankingUserId,
          hasError: !!cardsError,
          errorMessage: cardsError?.message,
          errorCode: cardsError?.code,
          count: cardsData?.length,
        })
        fetch("http://127.0.0.1:7243/ingest/416c505f-0f39-4083-9a11-a59f7ac8dac3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "customer-dashboard.tsx:88",
            message: "cards query result",
            data: {
              userId: currentBankingUserId,
              hasError: !!cardsError,
              errorMessage: cardsError?.message,
              errorCode: cardsError?.code,
              count: cardsData?.length,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run8",
            hypothesisId: "G",
          }),
        }).catch((err) => console.warn("[debug] log POST failed", err))
      }
      // #endregion

      if (cardsError) console.error("Error fetching cards:", cardsError)

      const mappedCards: CardType[] = (cardsData || []).map((c: any) => ({
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

      // Fetch Loans
      // #region agent log
      if (typeof window !== "undefined") {
        fetch("http://127.0.0.1:7243/ingest/416c505f-0f39-4083-9a11-a59f7ac8dac3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "customer-dashboard.tsx:241",
            message: "loans query start",
            data: { table: "loans", filterColumn: "customer_id", userId: currentBankingUserId },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run9",
            hypothesisId: "H",
          }),
        }).catch(() => {})
      }
      // #endregion
      const { data: loansData, error: loansError } = await supabase
        .from("loans")
        .select("*")
        .eq("customer_id", currentBankingUserId)

      // #region agent log
      if (typeof window !== "undefined") {
        console.log("[debug] dashboard loans query result", {
          userId: currentBankingUserId,
          hasError: !!loansError,
          errorMessage: loansError?.message,
          errorCode: loansError?.code,
          count: loansData?.length,
        })
        fetch("http://127.0.0.1:7243/ingest/416c505f-0f39-4083-9a11-a59f7ac8dac3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "customer-dashboard.tsx:121",
            message: "loans query result",
            data: {
              userId: currentBankingUserId,
              hasError: !!loansError,
              errorMessage: loansError?.message,
              errorCode: loansError?.code,
              count: loansData?.length,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run8",
            hypothesisId: "G",
          }),
        }).catch((err) => console.warn("[debug] log POST failed", err))
      }
      // #endregion

      if (loansError) console.error("Error fetching loans:", loansError)

      const mappedLoans: Loan[] = (loansData || []).map((l: any) => ({
        id: l.id,
        userId: l.customer_id,
        type: l.type,
        amount: Number(l.principal_amount),
        remainingBalance: Number(l.remaining_balance),
        interestRate: Number(l.interest_rate),
        term: l.term_months,
        monthlyPayment: Number(l.monthly_payment),
        nextPaymentDate: l.next_payment_date,
        status: l.status
      }))

      setLoans(mappedLoans)
      setIsLoading(false)
    }

    fetchData()
  }, [currentUser])

  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => {
    const rate = acc.currency === "USD" ? 3.67 : 1
    return sum + acc.balance * rate
  }, 0), [accounts])

  const thisMonthSpending = useMemo(() => transactions
    .filter((t) => t.type === "debit" && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum, t) => sum + t.amount, 0), [transactions])

  const upcomingPayments = useMemo(() => loans.reduce((sum, l) => sum + l.monthlyPayment, 0), [loans])

  const quickActions = [
    { label: "View Accounts", icon: Wallet, href: "/accounts" },
    { label: "Freeze Card", icon: CreditCard, href: "/cards" },
    { label: "Dispute Transaction", icon: FileQuestion, href: "/support" },
    { label: "Apply for Loan", icon: Landmark, href: "/loans" },
  ]

  const aiChips = [
    "What subscriptions am I paying for and should I cancel any?",
    "Help me plan a budget for next month",
    "Show me my spending breakdown by category",
  ]

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${currentUser.name.split(" ")[0]}`}
        description="Here's an overview of your finances"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Balance"
          value={formatCurrency(totalBalance)}
          change={3.2}
          changeLabel="vs last month"
          icon={Wallet}
        />
        <StatCard
          title="This Month Spending"
          value={formatCurrency(thisMonthSpending)}
          change={-8.5}
          changeLabel="vs last month"
          icon={ArrowDownRight}
        />
        <StatCard title="Upcoming Bills" value={formatCurrency(upcomingPayments)} icon={Calendar} />
        <StatCard title="Active Cards" value={cards.filter((c) => c.status === "active").length} icon={CreditCard} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <CardDescription>Your latest activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/accounts">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.length > 0 ? (
                transactions.slice(0, 8).map((txn) => (
                  <div
                    key={txn.id}
                    className="group flex items-center justify-between py-2 px-2 -mx-2 border-b border-border last:border-0 hover:bg-muted/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${
                          txn.type === "credit" ? "bg-emerald-500/20" : "bg-muted"
                        }`}
                      >
                        {txn.type === "credit" ? (
                          <ArrowDownRight className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{txn.description}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground">{formatDate(txn.date)}</span>
                          <Badge variant="secondary" className={`text-[10px] py-0 ${getCategoryColor(txn.category)}`}>
                            {txn.category}
                          </Badge>
                          {txn.categorySource === "auto_rule" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 border-dashed"
                              title={txn.categoryReason || "Auto-categorized by spending rules"}
                            >
                              Auto
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-sm font-medium ${txn.type === "credit" ? "text-emerald-500" : "text-foreground"}`}>
                        {txn.type === "credit" ? "+" : "-"}
                        {formatCurrency(txn.amount)}
                      </span>
                      {txn.isUnusual && (
                        <div title={txn.unusualReason || "Unusual activity detected"}>
                          <AlertTriangle className="h-4 w-4 text-amber-500 cursor-help" />
                        </div>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-6 px-2 text-[10px] border-primary/30 text-primary hover:bg-primary/10 hover:border-primary transition-all"
                        onClick={(e) => {
                          e.stopPropagation()
                          openChatWithMessage(`Explain this transaction: ${txn.description} for ${formatCurrency(txn.amount)} on ${formatDate(txn.date)}`)
                        }}
                      >
                        Ask AI
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">No recent transactions</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-2 bg-transparent"
                    asChild
                  >
                    <Link href={action.href}>
                      <action.icon className="h-5 w-5" />
                      <span className="text-xs">{action.label}</span>
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <CardTitle className="text-sm text-red-500">Suspicious Transactions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {transactions.filter(t => t.isUnusual).length > 0 ? (
                <div className="space-y-3">
                  {transactions.filter(t => t.isUnusual).slice(0, 3).map((txn) => (
                    <div key={txn.id} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-foreground">{txn.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{txn.unusualReason}</p>
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">{formatCurrency(txn.amount)} · {formatDate(txn.date)}</p>
                      </div>
                    </div>
                  ))}
                  {transactions.filter(t => t.isUnusual).length > 3 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      +{transactions.filter(t => t.isUnusual).length - 3} more suspicious transactions
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No suspicious transactions detected.</p>
              )}
              <Button 
                variant="default" 
                size="sm"
                className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all" 
                onClick={() => openChatWithMessage("Can you review all my suspicious transactions and explain what makes them suspicious?")}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Review All with AI
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Banker Prompt */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Ask AI Banker</CardTitle>
          </div>
          <CardDescription>Get instant answers about your finances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {aiChips.map((chip) => (
              <Button
                key={chip}
                variant="secondary"
                size="sm"
                className="text-xs h-auto py-2 px-3 bg-background/50 hover:bg-background"
                onClick={() => openChatWithMessage(chip)}
              >
                {chip}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Spending Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Spending Insights</CardTitle>
          <CardDescription>AI-powered analysis of your spending patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => openChatWithMessage("Tell me about my top spending category and how I can optimize it")}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">Top Category</span>
              </div>
              <p className="text-2xl font-bold">Shopping</p>
              <p className="text-xs text-muted-foreground">32% of total spending</p>
            </div>
            <div 
              className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => openChatWithMessage("What are my savings opportunities and how can I save more money?")}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Savings Potential</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(1250)}</p>
              <p className="text-xs text-muted-foreground">Based on subscription analysis</p>
            </div>
            <div 
              className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => openChatWithMessage("Tell me about my upcoming bills and loan payments")}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Next Bill</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(1521.25)}</p>
              <p className="text-xs text-muted-foreground">Loan payment on Jan 15</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}