"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import {
  Plane,
  ShoppingBag,
  Home,
  GraduationCap,
  Shield,
  Car,
  Heart,
  ReceiptCentIcon as RetirementIcon,
  Target,
  Plus,
  Pause,
  Play,
  Edit,
  TrendingUp,
  Calendar,
  Wallet,
  Sparkles,
  ChevronRight,
  Check,
  AlertCircle,
  PiggyBank,
  ArrowUpRight,
  Gift,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import type { SavingsGoal, SavingsGoalCategory, Account } from "@/lib/types"
import { formatCurrency } from "@/lib/format"
import { CitationBadge } from "@/components/ai/citation-badge"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { useRole } from "@/lib/role-context"
import { createClient } from "@/lib/supabase/client"

const categoryIcons: Record<SavingsGoalCategory, React.ElementType> = {
  travel: Plane,
  shopping: ShoppingBag,
  home: Home,
  education: GraduationCap,
  emergency: Shield,
  vehicle: Car,
  wedding: Heart,
  retirement: RetirementIcon,
  other: Target,
}

const categoryColors: Record<SavingsGoalCategory, string> = {
  travel: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  shopping: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  home: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  education: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  emergency: "bg-red-500/10 text-red-500 border-red-500/20",
  vehicle: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  wedding: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  retirement: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  other: "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

const goalTemplates = [
  { category: "travel" as SavingsGoalCategory, name: "Dream Vacation", suggestedAmount: 15000, suggestedMonthly: 1500 },
  { category: "shopping" as SavingsGoalCategory, name: "New Gadget", suggestedAmount: 5000, suggestedMonthly: 500 },
  {
    category: "home" as SavingsGoalCategory,
    name: "Home Down Payment",
    suggestedAmount: 200000,
    suggestedMonthly: 5000,
  },
  {
    category: "education" as SavingsGoalCategory,
    name: "Course/Certification",
    suggestedAmount: 10000,
    suggestedMonthly: 1000,
  },
  {
    category: "emergency" as SavingsGoalCategory,
    name: "Emergency Fund",
    suggestedAmount: 50000,
    suggestedMonthly: 2500,
  },
  { category: "vehicle" as SavingsGoalCategory, name: "New Car", suggestedAmount: 80000, suggestedMonthly: 3000 },
  { category: "wedding" as SavingsGoalCategory, name: "Wedding Fund", suggestedAmount: 150000, suggestedMonthly: 4000 },
  {
    category: "retirement" as SavingsGoalCategory,
    name: "Retirement Boost",
    suggestedAmount: 100000,
    suggestedMonthly: 3000,
  },
]

function GoalCard({ goal, onAction }: { goal: SavingsGoal; onAction: (action: string, goal: SavingsGoal) => void }) {
  const Icon = categoryIcons[goal.category]
  const progress = (goal.currentAmount / goal.targetAmount) * 100
  const remaining = goal.targetAmount - goal.currentAmount
  const targetDate = new Date(goal.targetDate)
  const today = new Date()
  const monthsLeft = Math.max(
    0,
    (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth()),
  )
  const isOnTrack = monthsLeft > 0 ? remaining / monthsLeft <= goal.monthlyContribution : goal.status === "completed"

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
      <div className="relative h-32 overflow-hidden">
        <Image
          src={goal.image || "/placeholder.svg?height=200&width=400&query=savings goal finance"}
          alt={goal.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-3 left-3">
          <Badge variant="outline" className={`${categoryColors[goal.category]} backdrop-blur-sm`}>
            <Icon className="h-3 w-3 mr-1" />
            {goal.category.charAt(0).toUpperCase() + goal.category.slice(1)}
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          {goal.status === "completed" ? (
            <Badge className="bg-emerald-500 text-white">
              <Check className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          ) : goal.status === "paused" ? (
            <Badge variant="secondary">
              <Pause className="h-3 w-3 mr-1" />
              Paused
            </Badge>
          ) : isOnTrack ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <TrendingUp className="h-3 w-3 mr-1" />
              On Track
            </Badge>
          ) : (
            <Badge variant="destructive" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              <AlertCircle className="h-3 w-3 mr-1" />
              Behind
            </Badge>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-semibold text-lg truncate">{goal.name}</h3>
        </div>
      </div>

      <CardContent className="pt-4 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm">
            <span className="font-medium text-primary">{formatCurrency(goal.currentAmount, goal.currency)}</span>
            <span className="text-muted-foreground">of {formatCurrency(goal.targetAmount, goal.currency)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{new Date(goal.targetDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span>{formatCurrency(goal.monthlyContribution, goal.currency)}/mo</span>
          </div>
        </div>

        {goal.autoDebit && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Auto-debit enabled</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t bg-muted/30 py-3 gap-2">
        {goal.status === "active" && (
          <>
            <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => onAction("add", goal)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Funds
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onAction("pause", goal)}>
              <Pause className="h-4 w-4" />
            </Button>
          </>
        )}
        {goal.status === "paused" && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-transparent"
              onClick={() => onAction("resume", goal)}
            >
              <Play className="h-4 w-4 mr-1" />
              Resume
            </Button>
          </>
        )}
        {goal.status === "completed" && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-transparent"
            onClick={() => onAction("withdraw", goal)}
          >
            <ArrowUpRight className="h-4 w-4 mr-1" />
            Withdraw Funds
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => onAction("edit", goal)}>
          <Edit className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}

function CreateGoalDialog({ open, onOpenChange, accounts }: { open: boolean; onOpenChange: (open: boolean) => void, accounts: Account[] }) {
  const { currentUser, currentBankingUserId } = useRole()
  const [step, setStep] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof goalTemplates)[0] | null>(null)
  const [customGoal, setCustomGoal] = useState({
    name: "",
    category: "other" as SavingsGoalCategory,
    targetAmount: 10000,
    targetDate: "",
    monthlyContribution: 1000,
    autoDebit: true,
    sourceAccountId: accounts[0]?.id || "",
  })

  // Update default source account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !customGoal.sourceAccountId) {
      setCustomGoal(prev => ({ ...prev, sourceAccountId: accounts[0].id }))
    }
  }, [accounts])

  const handleTemplateSelect = (template: (typeof goalTemplates)[0]) => {
    setSelectedTemplate(template)
    setCustomGoal({
      ...customGoal,
      name: template.name,
      category: template.category,
      targetAmount: template.suggestedAmount,
      monthlyContribution: template.suggestedMonthly,
    })
    setStep(2)
  }

  const handleCreate = async () => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('savings_goals')
        .insert({
          customer_id: currentBankingUserId,
          name: customGoal.name,
          category: customGoal.category,
          target_amount: customGoal.targetAmount,
          currency: 'AED', // Default for now
          target_date: customGoal.targetDate,
          monthly_contribution: customGoal.monthlyContribution,
          auto_debit: customGoal.autoDebit,
          source_account_id: customGoal.sourceAccountId,
          status: 'active'
        })
        .select()

      if (error) throw error

      // Refresh list (in a real app, use React Query or Context)
      window.location.reload() 
      
      onOpenChange(false)
      setStep(1)
      setSelectedTemplate(null)
    } catch (error) {
      console.error("Error creating goal:", error)
      // Show error toast
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            Create Savings Goal
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Choose a goal template or create a custom one"}
            {step === 2 && "Customize your savings goal details"}
            {step === 3 && "Review and confirm your goal"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="grid grid-cols-2 gap-3 py-4">
            {goalTemplates.map((template) => {
              const Icon = categoryIcons[template.category]
              return (
                <Card
                  key={template.category}
                  className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${categoryColors[template.category]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ~{formatCurrency(template.suggestedAmount, "AED")}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              )
            })}
            <Card
              className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md border-dashed"
              onClick={() => {
                setSelectedTemplate(null)
                setStep(2)
              }}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-muted">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Custom Goal</p>
                  <p className="text-xs text-muted-foreground">Create your own</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">Goal Name</Label>
              <Input
                id="goal-name"
                placeholder="e.g., Trip to Japan"
                value={customGoal.name}
                onChange={(e) => setCustomGoal({ ...customGoal, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={customGoal.category}
                onValueChange={(v) => setCustomGoal({ ...customGoal, category: v as SavingsGoalCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(categoryIcons).map((cat) => {
                    const Icon = categoryIcons[cat as SavingsGoalCategory]
                    return (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Amount: {formatCurrency(customGoal.targetAmount, "AED")}</Label>
              <Slider
                value={[customGoal.targetAmount]}
                onValueChange={([v]) => setCustomGoal({ ...customGoal, targetAmount: v })}
                min={1000}
                max={500000}
                step={1000}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>AED 1,000</span>
                <span>AED 500,000</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-date">Target Date</Label>
              <Input
                id="target-date"
                type="date"
                value={customGoal.targetDate}
                onChange={(e) => setCustomGoal({ ...customGoal, targetDate: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label>Monthly Contribution: {formatCurrency(customGoal.monthlyContribution, "AED")}</Label>
              <Slider
                value={[customGoal.monthlyContribution]}
                onValueChange={([v]) => setCustomGoal({ ...customGoal, monthlyContribution: v })}
                min={100}
                max={20000}
                step={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-account">Source Account</Label>
              <Select
                value={customGoal.sourceAccountId}
                onValueChange={(v) => setCustomGoal({ ...customGoal, sourceAccountId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} - {formatCurrency(acc.balance, acc.currency)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Auto-debit monthly</p>
                  <p className="text-xs text-muted-foreground">Automatically save every month</p>
                </div>
              </div>
              <Switch
                checked={customGoal.autoDebit}
                onCheckedChange={(checked) => setCustomGoal({ ...customGoal, autoDebit: checked })}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = categoryIcons[customGoal.category]
                    return (
                      <div className={`p-3 rounded-lg ${categoryColors[customGoal.category]}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    )
                  })()}
                  <div>
                    <h3 className="font-semibold text-lg">{customGoal.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{customGoal.category}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Target Amount</p>
                    <p className="font-semibold text-lg">{formatCurrency(customGoal.targetAmount, "AED")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Target Date</p>
                    <p className="font-semibold">{customGoal.targetDate ? new Date(customGoal.targetDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Monthly Contribution</p>
                    <p className="font-semibold">{formatCurrency(customGoal.monthlyContribution, "AED")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Auto-debit</p>
                    <p className="font-semibold">{customGoal.autoDebit ? "Enabled" : "Disabled"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">AI Savings Tip</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on your spending patterns, you could reach this goal 2 months earlier by reducing dining
                    expenses by 15%.
                    <CitationBadge source="Transaction Analysis" type="transaction_history" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < 3 && (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && (!customGoal.name || !customGoal.targetDate)}
            >
              Continue
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleCreate}>
              <PiggyBank className="h-4 w-4 mr-2" />
              Create Goal
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddFundsDialog({
  goal,
  open,
  onOpenChange,
  accounts
}: { goal: SavingsGoal | null; open: boolean; onOpenChange: (open: boolean) => void; accounts: Account[] }) {
  const [amount, setAmount] = useState("")
  const [sourceAccountId, setSourceAccountId] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (goal && accounts.length > 0) {
        setSourceAccountId(goal.sourceAccountId || accounts[0].id)
    }
  }, [goal, accounts])

  if (!goal) return null

  const quickAmounts = [500, 1000, 2000, 5000]

  const handleAddFunds = async () => {
    setIsProcessing(true)
    const supabase = createClient()
    const numericAmount = Number(amount)

    try {
        // 1. Create transaction record
        const { error: txError } = await supabase.from('savings_goal_transactions').insert({
            goal_id: goal.id,
            amount: numericAmount,
            type: 'deposit',
            description: 'Manual deposit'
        })
        if (txError) throw txError

        // 2. Update goal amount
        const { error: goalError } = await supabase.from('savings_goals')
            .update({ current_amount: goal.currentAmount + numericAmount })
            .eq('id', goal.id)
        if (goalError) throw goalError

        // 3. Deduct from account (if we want to be realistic)
        // Check if account has enough funds first? For now, we assume yes or let DB constraint fail
        // Fetch current balance first to be safe or use an RPC. 
        // For demo, we'll skip the account deduction to avoid potential sync issues if we don't have an RPC
        // OR we can do it:
        /*
        const { data: account } = await supabase.from('accounts').select('balance').eq('id', sourceAccountId).single()
        if (account) {
             await supabase.from('accounts').update({ balance: account.balance - numericAmount }).eq('id', sourceAccountId)
        }
        */
       
       // Reload page to reflect changes
       window.location.reload()
       
    } catch (error) {
        console.error("Error adding funds:", error)
    } finally {
        setIsProcessing(false)
        onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Funds to {goal?.name || "Goal"}</DialogTitle>
          <DialogDescription>
            Current balance: {formatCurrency(goal.currentAmount, goal.currency)} of{" "}
            {formatCurrency(goal.targetAmount, goal.currency)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (AED)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Source Account</Label>
            <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                <SelectTrigger>
                    <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                <SelectContent>
                    {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({formatCurrency(acc.balance, acc.currency)})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickAmounts.map((qa) => (
              <Button key={qa} variant="outline" size="sm" onClick={() => setAmount(qa.toString())}>
                +{formatCurrency(qa, "AED")}
              </Button>
            ))}
          </div>

          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="text-muted-foreground">
              After this deposit, you'll have{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(goal.currentAmount + (Number(amount) || 0), goal.currency)}
              </span>{" "}
              ({(((goal.currentAmount + (Number(amount) || 0)) / goal.targetAmount) * 100).toFixed(0)}% of your goal)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!amount || Number(amount) <= 0 || isProcessing} onClick={handleAddFunds}>
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add ${amount ? formatCurrency(Number(amount), "AED") : "Funds"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function SavingsGoalsPage() {
  const { currentUser, currentBankingUserId } = useRole()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [addFundsGoal, setAddFundsGoal] = useState<SavingsGoal | null>(null)
  const [activeTab, setActiveTab] = useState("active")
  
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!currentBankingUserId) return

      setIsLoading(true)
      const supabase = createClient()

      // Fetch Savings Goals
      const { data: goalsData, error: goalsError } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("customer_id", currentBankingUserId)

      if (goalsError) console.error("Error fetching savings goals:", goalsError)

      const mappedGoals: SavingsGoal[] = (goalsData || []).map((g: any) => ({
        id: g.id,
        userId: g.customer_id,
        name: g.name,
        category: g.category,
        targetAmount: Number(g.target_amount),
        currentAmount: Number(g.current_amount),
        currency: g.currency,
        targetDate: g.target_date,
        monthlyContribution: Number(g.monthly_contribution),
        autoDebit: g.auto_debit,
        sourceAccountId: g.source_account_id,
        status: g.status,
        createdAt: g.created_at,
        image: g.image_url
      }))
      
      setSavingsGoals(mappedGoals)

      // Fetch Accounts (for the dropdown in Create Goal)
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("customer_id", currentBankingUserId)

      if (accountsError) console.error("Error fetching accounts:", accountsError)

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
      setIsLoading(false)
    }

    fetchData()
  }, [currentBankingUserId])

  const activeGoals = savingsGoals.filter((g) => g.status === "active")
  const pausedGoals = savingsGoals.filter((g) => g.status === "paused")
  const completedGoals = savingsGoals.filter((g) => g.status === "completed")

  const totalSaved = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0)
  const totalTarget = savingsGoals.filter((g) => g.status !== "completed").reduce((sum, g) => sum + g.targetAmount, 0)
  const monthlyTotal = activeGoals.reduce((sum, g) => sum + g.monthlyContribution, 0)

  const savingsInsights = (() => {
    const items: { id: string; title: string; detail: string }[] = []

    if (activeGoals.length > 0) {
      items.push({
        id: "coverage",
        title: `You have ${activeGoals.length} active goal${activeGoals.length > 1 ? "s" : ""}`,
        detail: `You're saving ${formatCurrency(
          monthlyTotal,
          "AED",
        )} per month towards a remaining target of ${formatCurrency(totalTarget, "AED")}.`,
      })
    }

    const mostUrgent = [...activeGoals].sort(
      (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
    )[0]
    if (mostUrgent) {
      const daysLeft =
        (new Date(mostUrgent.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      const progress = (mostUrgent.currentAmount / mostUrgent.targetAmount) * 100
      items.push({
        id: "urgent-goal",
        title: `${mostUrgent.name} is your most time‑sensitive goal`,
        detail: `${progress.toFixed(0)}% funded with about ${Math.max(
          0,
          Math.round(daysLeft / 30),
        )} month(s) left. Consider increasing monthly contributions if this is a priority.`,
      })
    }

    const autoDebitCount = activeGoals.filter((g) => g.autoDebit).length
    if (autoDebitCount > 0) {
      items.push({
        id: "auto-debit",
        title: `Auto‑debit is enabled on ${autoDebitCount} goal${autoDebitCount > 1 ? "s" : ""}`,
        detail: "Automatic transfers keep your savings on track without manual effort.",
      })
    }

    return items
  })()

  const handleGoalAction = async (action: string, goal: SavingsGoal) => {
    const supabase = createClient()
    
    switch (action) {
      case "add":
        setAddFundsGoal(goal)
        break
      case "pause":
        await supabase.from('savings_goals').update({ status: 'paused' }).eq('id', goal.id)
        setSavingsGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: 'paused' } : g))
        break
      case "resume":
        await supabase.from('savings_goals').update({ status: 'active' }).eq('id', goal.id)
        setSavingsGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: 'active' } : g))
        break
      case "edit":
        // Logic to edit goal (omitted for brevity, would open dialog)
        break
      case "withdraw":
        // Logic to withdraw (would involve transaction)
        break
    }
  }

  const aiQuestions = [
    "How can I accelerate my savings goal?",
    "Am I saving enough to reach my target?",
    "What's the best strategy for my savings goal?",
    "Should I adjust my monthly savings amount?",
  ]

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Savings Goals</h1>
          <p className="text-muted-foreground">Plan and track your financial goals</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </Button>
      </div>

      {savingsInsights.length > 0 && (
        <Card className="border border-border/80">
          <CardContent className="space-y-3 pt-4">
            {savingsInsights.map((insight) => (
              <div
                key={insight.id}
                className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3"
              >
                <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <Sparkles className="h-3.5 w-3.5" />
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content area - 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <PiggyBank className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Saved</p>
                    <p className="text-xl font-bold">{formatCurrency(totalSaved, "AED")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-500/10">
                    <Target className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Target</p>
                    <p className="text-xl font-bold">{formatCurrency(totalTarget, "AED")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10">
                    <Wallet className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Savings</p>
                    <p className="text-xl font-bold">{formatCurrency(monthlyTotal, "AED")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">AI Savings Insight</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You're doing great! Based on your current savings rate, you'll reach your Japan vacation goal by
                    May 2025 - one month ahead of schedule. Consider increasing your emergency fund contribution by AED
                    500/month to reach the recommended 6-month expenses buffer.
                    <CitationBadge source="Account Analysis" type="account_ledger" />
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Adjust Goals
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="active">Active ({activeGoals.length})</TabsTrigger>
              <TabsTrigger value="paused">Paused ({pausedGoals.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedGoals.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-6">
              {activeGoals.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {activeGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onAction={handleGoalAction} />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <PiggyBank className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Active Goals</h3>
                  <p className="text-sm text-muted-foreground mb-4">Start saving for something special!</p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Goal
                  </Button>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="paused" className="mt-6">
              {pausedGoals.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {pausedGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onAction={handleGoalAction} />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Pause className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Paused Goals</h3>
                  <p className="text-sm text-muted-foreground">All your goals are actively progressing!</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {completedGoals.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {completedGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onAction={handleGoalAction} />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Completed Goals Yet</h3>
                  <p className="text-sm text-muted-foreground">Keep saving - you'll get there!</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar with AI widget - 1 column */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <AskAIBankerWidget
              questions={aiQuestions}
              description="Get tips to achieve your savings goals"
              title="Ask AI Savings Coach"
              agentId="savings_coach"
            />
          </div>
        </div>
      </div>

      <CreateGoalDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} accounts={accounts} />
      <AddFundsDialog goal={addFundsGoal} open={!!addFundsGoal} onOpenChange={(open) => !open && setAddFundsGoal(null)} accounts={accounts} />
    </div>
  )
}
