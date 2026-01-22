import { createDirectClient } from "@/lib/supabase/direct-client"
import { generateForecasts, type ForecastResult } from "@/lib/forecasting/simple-forecast"
import { generateSavingsSuggestions, type SavingSuggestion } from "@/lib/savings/suggestions"
import { analyzeLoanPreApproval, type LoanPreApprovalResult } from "@/lib/calculations/loan-preapproval"
import type { Account, Transaction, Loan } from "@/lib/types"

function toNumber(value: any): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

async function fetchTableByUser<T = any>(
  table: string,
  userId: string,
  column: string = "customer_id",
): Promise<T[]> {
  const supabase = createDirectClient()
  console.log(`[agent/tools] Fetching ${table} for userId: ${userId}, column: ${column}`)
  const { data, error } = await supabase.from(table).select("*").eq(column, userId)

  if (error) {
    console.error(`[agent/tools] Error fetching ${table}:`, error.message)
    return []
  }

  console.log(`[agent/tools] Fetched ${data?.length ?? 0} rows from ${table}`)
  return (data ?? []) as T[]
}

async function fetchUserAccounts(userId: string): Promise<Account[]> {
  return fetchTableByUser<Account>("accounts", userId)
}

async function fetchUserLoans(userId: string): Promise<Loan[]> {
  return fetchTableByUser<Loan>("loans", userId)
}

async function fetchUserTransactionsForAccounts(
  accountIds: string[],
  days?: number,
): Promise<Transaction[]> {
  if (accountIds.length === 0) return []

  const supabase = createDirectClient()
  let query = supabase.from("transactions").select("*").in("account_id", accountIds)

  // Only apply date filter if days is provided and reasonable (< 2 years)
  if (days !== undefined && days > 0 && days < 730) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    query = query.gte("date", since.toISOString())
  }

  const { data, error } = await query.order("date", { ascending: false })

  if (error) {
    console.error("[agent/tools] Error fetching transactions:", error.message)
    return []
  }

  return (data ?? []).map((t: any) => ({
    ...t,
    amount: toNumber(t.amount),
  })) as Transaction[]
}

// 1) Accounts overview -------------------------------------------------------

export interface AccountsOverview {
  accounts: Array<{
    id: string
    name: string
    type: string
    balance: number
    availableBalance: number
    currency: string
    status: string
  }>
  totalBalance: number
  availableCash: number
}

export async function getAccountsOverview(userId: string): Promise<AccountsOverview> {
  console.log(`[agent/tools] getAccountsOverview called for userId: ${userId}`)
  const accounts = await fetchUserAccounts(userId)
  console.log(`[agent/tools] Found ${accounts.length} accounts`)

  if (accounts.length === 0) {
    console.warn(`[agent/tools] No accounts found for userId: ${userId}`)
  }

  // Convert all balances to AED (USD rate = 3.67)
  const totalBalance = accounts.reduce((sum, a) => {
    const balance = toNumber(a.balance)
    const rate = a.currency === "USD" ? 3.67 : 1
    return sum + (balance * rate)
  }, 0)
  const availableCash = accounts.reduce((sum, a) => {
    const balance = toNumber((a as any).availableBalance ?? (a as any).available_balance ?? a.balance)
    const rate = a.currency === "USD" ? 3.67 : 1
    return sum + (balance * rate)
  }, 0)

  const result = {
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: a.balance,
      availableBalance:
        (a as any).availableBalance ?? (a as any).available_balance ?? (a as any).balance ?? 0,
      currency: a.currency,
      status: a.status,
    })),
    totalBalance,
    availableCash,
  }
  
  console.log(`[agent/tools] getAccountsOverview result:`, {
    accountCount: result.accounts.length,
    totalBalance,
    availableCash,
  })
  
  return result
}

// 2) Recent transactions & spending -----------------------------------------

export interface RecentTransactionsResult {
  transactions: Transaction[]
  recent: Transaction[]
  monthlySpending: number
  monthlyIncome: number
}

export async function getRecentTransactions(
  userId: string,
  days?: number,
): Promise<RecentTransactionsResult> {
  const accounts = await fetchUserAccounts(userId)
  const accountIds = accounts.map((a) => a.id)
  // If days not specified, get all transactions (no date filter)
  const transactions = await fetchUserTransactionsForAccounts(accountIds, days)

  const spendingTx = transactions.filter((tx) => tx.type === "debit")
  const incomeTx = transactions.filter((tx) => tx.type === "credit")

  const monthlySpending = spendingTx.reduce(
    (sum, tx) => sum + Math.abs(toNumber(tx.amount)),
    0,
  )
  const monthlyIncome = incomeTx.reduce(
    (sum, tx) => sum + Math.abs(toNumber(tx.amount)),
    0,
  )

  return {
    transactions,
    recent: transactions.slice(0, 10),
    monthlySpending,
    monthlyIncome,
  }
}

// 3) Spending analysis & savings --------------------------------------------

export interface SpendingAnalysisResult {
  forecasts: ForecastResult[]
  totalPredictedSpend: number
  savingsOpportunities: SavingSuggestion[]
  topSpendingCategory: { category: string; amount: number } | null
}

export async function analyzeSpending(userId: string): Promise<SpendingAnalysisResult> {
  // Get all transactions (no date filter) for comprehensive analysis
  const { transactions } = await getRecentTransactions(userId)

  const forecasts = generateForecasts(transactions)
  const totalPredictedSpend = forecasts.reduce((sum, f) => sum + f.predictedAmount, 0)

  const savingsOpportunities = generateSavingsSuggestions(transactions)

  const spendingOnly = transactions.filter((tx) => tx.type === "debit")
  const categoryTotals = spendingOnly.reduce((acc: Record<string, number>, tx) => {
    const cat = tx.category || "uncategorized"
    acc[cat] = (acc[cat] || 0) + Math.abs(toNumber(tx.amount))
    return acc
  }, {})

  const topEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
  const topSpendingCategory = topEntry
    ? { category: topEntry[0], amount: topEntry[1] }
    : null

  return {
    forecasts,
    totalPredictedSpend,
    savingsOpportunities,
    topSpendingCategory,
  }
}

// 4) Loan pre-approval -------------------------------------------------------

export async function analyzeLoanPreapprovalForUser(
  userId: string,
  requestedAmount: number,
  requestedTerm: number,
  creditScore?: number,
): Promise<LoanPreApprovalResult> {
  const accounts = await fetchUserAccounts(userId)
  const loans = await fetchUserLoans(userId)
  const accountIds = accounts.map((a) => a.id)

  // Get all transactions for income estimation (no date filter)
  const transactions = await fetchUserTransactionsForAccounts(accountIds)

  const result = analyzeLoanPreApproval({
    requestedAmount,
    requestedTerm,
    accounts,
    existingLoans: loans,
    transactions,
    creditScore,
  })

  return result
}


