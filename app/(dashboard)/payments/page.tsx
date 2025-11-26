"use client"

import { useState, useMemo } from "react"
import { useRole } from "@/lib/role-context"
import { getAccountsByUserId } from "@/lib/mock-data"
import { formatCurrency, formatAccountNumber } from "@/lib/format"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { CitationBadge, DataUsedBadges, ConfidenceIndicator } from "@/components/ai/citation-badge"
import {
  ArrowRight,
  Send,
  Globe,
  Building,
  Plus,
  Trash2,
  Bot,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import type { Citation } from "@/lib/types"

interface Beneficiary {
  id: string
  name: string
  bankName: string
  accountNumber: string
  type: "internal" | "domestic" | "international"
  country?: string
}

const mockBeneficiaries: Beneficiary[] = [
  {
    id: "ben_1",
    name: "Sarah Johnson Savings",
    bankName: "Bank of the Future",
    accountNumber: "1234567891",
    type: "internal",
  },
  { id: "ben_2", name: "Ahmed Al-Rashid", bankName: "Emirates NBD", accountNumber: "2345678901", type: "domestic" },
  {
    id: "ben_3",
    name: "TechStart Solutions",
    bankName: "Bank of the Future",
    accountNumber: "3456789012",
    type: "internal",
  },
  {
    id: "ben_4",
    name: "John Smith",
    bankName: "HSBC UK",
    accountNumber: "GB82WEST12345698765432",
    type: "international",
    country: "United Kingdom",
  },
]

function TransferForm() {
  const { currentUser } = useRole()
  const accounts = useMemo(() => getAccountsByUserId(currentUser.id), [currentUser.id])

  const [transferType, setTransferType] = useState<"internal" | "domestic" | "international">("internal")
  const [fromAccount, setFromAccount] = useState<string>("")
  const [toBeneficiary, setToBeneficiary] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [reference, setReference] = useState<string>("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const filteredBeneficiaries = mockBeneficiaries.filter((b) => b.type === transferType)
  const selectedBeneficiary = mockBeneficiaries.find((b) => b.id === toBeneficiary)
  const selectedFromAccount = accounts.find((a) => a.id === fromAccount)

  const getFees = () => {
    if (transferType === "internal") return 0
    if (transferType === "domestic") return 15
    return Math.min(500, Math.max(25, Number.parseFloat(amount || "0") * 0.005))
  }

  const getETA = () => {
    if (transferType === "internal") return "Instant"
    if (transferType === "domestic") return "1-2 business days"
    return "3-5 business days"
  }

  const handleTransfer = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setShowConfirm(false)
      setShowSuccess(true)
    }, 2000)
  }

  const aiExplanation = {
    message:
      `Transfer of ${formatCurrency(Number.parseFloat(amount || "0"))} to ${selectedBeneficiary?.name || "beneficiary"}. ` +
      `Fee: ${formatCurrency(getFees())}. Expected arrival: ${getETA()}.`,
    citations: [
      { id: "cite_1", source: "Fees Policy v2.1", type: "policy" as const },
      { id: "cite_2", source: "Transfer Terms", type: "product_terms" as const },
    ],
    dataUsed: ["Account Balance", "Fees Schedule", "Transfer Limits"],
  }

  return (
    <div className="space-y-6">
      <Tabs value={transferType} onValueChange={(v) => setTransferType(v as typeof transferType)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="internal" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Internal
          </TabsTrigger>
          <TabsTrigger value="domestic" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Domestic
          </TabsTrigger>
          <TabsTrigger value="international" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            International
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fromAccount">From Account</Label>
            <Select value={fromAccount} onValueChange={setFromAccount}>
              <SelectTrigger id="fromAccount">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{acc.name}</span>
                      <span className="text-muted-foreground ml-4">
                        {formatCurrency(acc.availableBalance, acc.currency)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="toBeneficiary">To Beneficiary</Label>
            <Select value={toBeneficiary} onValueChange={setToBeneficiary}>
              <SelectTrigger id="toBeneficiary">
                <SelectValue placeholder="Select beneficiary" />
              </SelectTrigger>
              <SelectContent>
                {filteredBeneficiaries.map((ben) => (
                  <SelectItem key={ben.id} value={ben.id}>
                    <div>
                      <span>{ben.name}</span>
                      <span className="text-muted-foreground text-xs ml-2">{ben.bankName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (AED)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-2xl h-14"
            />
            {selectedFromAccount && Number.parseFloat(amount) > selectedFromAccount.availableBalance && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Insufficient balance
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference (Optional)</Label>
            <Textarea
              id="reference"
              placeholder="Add a note for this transfer..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!fromAccount || !toBeneficiary || !amount || Number.parseFloat(amount) <= 0}
            onClick={() => setShowConfirm(true)}
          >
            Review Transfer
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* AI Helper Panel */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Transfer Assistant</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {amount && Number.parseFloat(amount) > 0 && selectedBeneficiary ? (
              <>
                <p className="text-sm text-muted-foreground">{aiExplanation.message}</p>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Sources:</p>
                  <div className="flex flex-wrap gap-1">
                    {aiExplanation.citations.map((cite) => (
                      <CitationBadge key={cite.id} citation={cite as Citation} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Data used:</p>
                  <DataUsedBadges dataUsed={aiExplanation.dataUsed} />
                </div>
                <ConfidenceIndicator confidence="high" />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Enter transfer details and I&apos;ll explain fees, estimated arrival time, and any applicable limits.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Transfer</DialogTitle>
            <DialogDescription>Please review the transfer details before confirming.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/30 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">From</span>
                <span className="font-medium">{selectedFromAccount?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To</span>
                <span className="font-medium">{selectedBeneficiary?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{formatCurrency(Number.parseFloat(amount || "0"))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee</span>
                <span className="font-medium">{formatCurrency(getFees())}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">{formatCurrency(Number.parseFloat(amount || "0") + getFees())}</span>
              </div>
            </div>

            {/* Compliance Checklist */}
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Compliance Checks
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Sanctions screening: Passed
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Daily limit check: Passed
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Account verification: Verified
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Transfer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <div className="text-center py-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Transfer Initiated</h3>
            <p className="text-muted-foreground">
              Your transfer of {formatCurrency(Number.parseFloat(amount || "0"))} to {selectedBeneficiary?.name} has
              been initiated.
            </p>
            <p className="text-sm text-muted-foreground mt-2">Expected arrival: {getETA()}</p>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                setShowSuccess(false)
                setAmount("")
                setReference("")
                setToBeneficiary("")
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BeneficiariesList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Saved Beneficiaries</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add New
        </Button>
      </div>

      <div className="space-y-3">
        {mockBeneficiaries.map((ben) => (
          <Card key={ben.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    ben.type === "internal"
                      ? "bg-primary/20"
                      : ben.type === "domestic"
                        ? "bg-blue-500/20"
                        : "bg-purple-500/20"
                  }`}
                >
                  {ben.type === "internal" ? (
                    <Building className="h-5 w-5 text-primary" />
                  ) : ben.type === "domestic" ? (
                    <Send className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Globe className="h-5 w-5 text-purple-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{ben.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {ben.bankName} • {formatAccountNumber(ben.accountNumber)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {ben.type}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function PaymentsPage() {
  const aiQuestions = [
    "What are the transfer fees?",
    "How long do international transfers take?",
    "What's my daily transfer limit?",
    "How do I add a new beneficiary?",
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Payments & Transfers" description="Send money and manage your beneficiaries" />

      <Tabs defaultValue="transfer" className="space-y-6">
        <TabsList>
          <TabsTrigger value="transfer">New Transfer</TabsTrigger>
          <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
        </TabsList>

        <TabsContent value="transfer">
          <TransferForm />
        </TabsContent>

        <TabsContent value="beneficiaries">
          <BeneficiariesList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
