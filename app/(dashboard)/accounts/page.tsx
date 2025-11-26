"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRole } from "@/lib/role-context"
import { getAccountsByUserId, getTransactionsByAccountId } from "@/lib/mock-data"
import { formatCurrency, formatAccountNumber, formatDate, getCategoryColor, getStatusColor } from "@/lib/format"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ArrowUpRight, ArrowDownRight, Search, TrendingUp, Bot, Copy, Eye, EyeOff, RefreshCw } from "lucide-react"
import type { Account, Transaction } from "@/lib/types"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"

function AccountCard({ account, onClick }: { account: Account; onClick: () => void }) {
  const [showBalance, setShowBalance] = useState(true)

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
              setShowBalance(!showBalance)
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
  showFilters = true,
}: { transactions: Transaction[]; showFilters?: boolean }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const matchesSearch =
        txn.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.merchant?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === "all" || txn.category === categoryFilter
      const matchesType = typeFilter === "all" || txn.type === typeFilter
      return matchesSearch && matchesCategory && matchesType
    })
  }, [transactions, searchQuery, categoryFilter, typeFilter])

  const categories = [...new Set(transactions.map((t) => t.category))]

  return (
    <div className="space-y-4">
      {showFilters && (
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
                <tr key={txn.id} className="border-b last:border-0 hover:bg-muted/20">
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
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{txn.description}</p>
                        {txn.merchant && <p className="text-xs text-muted-foreground truncate">{txn.merchant}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant="secondary" className={`text-xs ${getCategoryColor(txn.category)}`}>
                      {txn.category}
                    </Badge>
                  </td>
                  <td
                    className={`px-4 py-3 text-sm font-medium text-right ${
                      txn.type === "credit" ? "text-emerald-500" : "text-foreground"
                    }`}
                  >
                    {txn.type === "credit" ? "+" : "-"}
                    {formatCurrency(txn.amount)}
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

function AccountInsightsPanel({ account }: { account: Account }) {
  const transactions = getTransactionsByAccountId(account.id)

  const thisMonthSpend = transactions
    .filter((t) => t.type === "debit" && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum, t) => sum + t.amount, 0)

  const recurringPayments = [
    { name: "DEWA", amount: 450, day: 5 },
    { name: "Etisalat", amount: 299, day: 15 },
    { name: "Netflix", amount: 55, day: 22 },
  ]

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
            <span className="text-foreground font-medium">{formatCurrency(thisMonthSpend)}</span>, which is 12% lower
            than last month. You&apos;ve been spending less on restaurants.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
              Account Ledger
            </Badge>
            <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
              Transactions
            </Badge>
          </div>
          <Button variant="link" size="sm" className="px-0 mt-2 text-primary" asChild>
            <Link href={`/ai-banker?scope=account:${account.id}`}>Ask more about this account</Link>
          </Button>
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
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  const accounts = useMemo(() => getAccountsByUserId(currentUser.id), [currentUser.id])
  const transactions = useMemo(() => {
    if (selectedAccount) {
      return getTransactionsByAccountId(selectedAccount.id)
    }
    return accounts
      .flatMap((acc) => getTransactionsByAccountId(acc.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [accounts, selectedAccount])

  const totalBalance = accounts.reduce((sum, acc) => {
    const rate = acc.currency === "USD" ? 3.67 : 1
    return sum + acc.balance * rate
  }, 0)

  const aiQuestions = [
    "What's my current account balance?",
    "Show my spending breakdown this month",
    "Which account has the highest interest rate?",
    "How can I reduce my monthly fees?",
  ]

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
                    <AccountCard account={account} onClick={() => setSelectedAccount(account)} />
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

                    <AccountInsightsPanel account={account} />
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
          <TransactionsTable transactions={transactions} />
        </CardContent>
      </Card>
    </div>
  )
}
