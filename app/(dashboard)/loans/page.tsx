"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { StatCard } from "@/components/ui/stat-card"
import { CitationBadge, ConfidenceIndicator } from "@/components/ai/citation-badge"
import { formatCurrency } from "@/lib/format"
import { loans, loanOffers, policies } from "@/lib/mock-data"
import {
  Wallet,
  TrendingUp,
  Calendar,
  ArrowRight,
  Home,
  Car,
  Briefcase,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calculator,
  Shield,
  Bot,
  Upload,
  ChevronRight,
  Info,
} from "lucide-react"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"

const loanTypeIcons: Record<string, React.ElementType> = {
  personal: Wallet,
  mortgage: Home,
  auto: Car,
  business: Briefcase,
  credit_line: CreditCard,
}

export default function LoansPage() {
  const [selectedOffer, setSelectedOffer] = useState<(typeof loanOffers)[0] | null>(null)
  const [simulatorAmount, setSimulatorAmount] = useState(50000)
  const [simulatorTerm, setSimulatorTerm] = useState(24)
  const [applicationStep, setApplicationStep] = useState(1)

  // Filter loans for current user (mock)
  const userLoans = loans.filter((loan) => loan.userId === "user_retail_1")
  const totalDebt = userLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0)
  const monthlyPayments = userLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0)

  // Calculate simulated monthly payment
  const calculateMonthlyPayment = (amount: number, rate: number, months: number) => {
    const monthlyRate = rate / 100 / 12
    return (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
  }

  const lendingPolicy = policies.find((p) => p.category === "lending")

  const aiQuestions = [
    "Am I eligible for a personal loan?",
    "What's my debt-to-income ratio?",
    "How can I pay off my loan faster?",
    "Compare my loan interest rates",
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Loans</h1>
          <p className="text-muted-foreground">Manage your loans and explore new credit options</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content area - 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="my-loans" className="space-y-6">
            <TabsList>
              <TabsTrigger value="my-loans">My Loans</TabsTrigger>
              <TabsTrigger value="marketplace">Loan Marketplace</TabsTrigger>
              <TabsTrigger value="simulator">Affordability Simulator</TabsTrigger>
            </TabsList>

            {/* My Loans Tab */}
            <TabsContent value="my-loans" className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Total Outstanding"
                  value={formatCurrency(totalDebt, "AED")}
                  icon={Wallet}
                  description="Across all loans"
                />
                <StatCard
                  title="Monthly Payments"
                  value={formatCurrency(monthlyPayments, "AED")}
                  icon={Calendar}
                  description="Due this month"
                />
                <StatCard
                  title="Debt-to-Income"
                  value="32%"
                  icon={TrendingUp}
                  description="Within healthy range"
                  trend={{ value: 2, direction: "down" }}
                />
              </div>

              {/* Active Loans */}
              <div className="grid gap-4">
                {userLoans.map((loan) => {
                  const Icon = loanTypeIcons[loan.type] || Wallet
                  const progress = ((loan.amount - loan.remainingBalance) / loan.amount) * 100

                  return (
                    <Card key={loan.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <Icon className="h-6 w-6 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <h3 className="font-semibold capitalize">{loan.type.replace("_", " ")} Loan</h3>
                              <p className="text-sm text-muted-foreground">
                                Original amount: {formatCurrency(loan.amount, "AED")}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span>Rate: {loan.interestRate}%</span>
                                <span>Term: {loan.term} months</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-semibold">{formatCurrency(loan.remainingBalance, "AED")}</p>
                            <p className="text-sm text-muted-foreground">remaining</p>
                            <Badge variant={loan.status === "active" ? "default" : "destructive"} className="mt-2">
                              {loan.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-6 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Repayment Progress</span>
                            <span className="font-medium">{progress.toFixed(0)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <Separator className="my-4" />

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Next Payment</p>
                            <p className="font-medium">
                              {formatCurrency(loan.monthlyPayment, "AED")} on {loan.nextPaymentDate}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              View Schedule
                            </Button>
                            <Button size="sm">Make Payment</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {userLoans.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">No Active Loans</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Explore our loan marketplace to find the right financing for your needs
                      </p>
                      <Button>Browse Loan Options</Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Marketplace Tab */}
            <TabsContent value="marketplace" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loanOffers.map((offer) => {
                  const Icon = loanTypeIcons[offer.type] || Wallet

                  return (
                    <Card key={offer.id} className="relative overflow-hidden">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{offer.name}</CardTitle>
                              <CardDescription>
                                {formatCurrency(offer.minAmount, "AED")} - {formatCurrency(offer.maxAmount, "AED")}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">{offer.interestRate}%</p>
                            <p className="text-xs text-muted-foreground">APR {offer.apr}%</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {offer.minTerm} - {offer.maxTerm} months
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {offer.features.map((feature, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t bg-muted/30 pt-4">
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button className="w-full" onClick={() => setSelectedOffer(offer)}>
                              Apply Now
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                            <SheetHeader>
                              <SheetTitle>Apply for {offer.name}</SheetTitle>
                              <SheetDescription>
                                Complete the application form below. We'll pre-fill information from your profile.
                              </SheetDescription>
                            </SheetHeader>

                            <div className="py-6 space-y-6">
                              {/* Application Stepper */}
                              <div className="flex items-center justify-between mb-6">
                                {[1, 2, 3].map((step) => (
                                  <div key={step} className="flex items-center">
                                    <div
                                      className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                        applicationStep >= step
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {step}
                                    </div>
                                    {step < 3 && (
                                      <div
                                        className={`h-0.5 w-16 mx-2 ${applicationStep > step ? "bg-primary" : "bg-muted"}`}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>

                              {applicationStep === 1 && (
                                <div className="space-y-4">
                                  <h4 className="font-medium">Loan Details</h4>
                                  <div className="space-y-3">
                                    <div>
                                      <Label>Loan Amount (AED)</Label>
                                      <Input type="number" defaultValue="50000" />
                                    </div>
                                    <div>
                                      <Label>Loan Term (months)</Label>
                                      <Input type="number" defaultValue="24" />
                                    </div>
                                    <div>
                                      <Label>Purpose</Label>
                                      <Input placeholder="e.g., Home renovation, Education" />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {applicationStep === 2 && (
                                <div className="space-y-4">
                                  <h4 className="font-medium">Documents Required</h4>
                                  <div className="space-y-3">
                                    {[
                                      "Emirates ID (front & back)",
                                      "Salary certificate / Trade license",
                                      "Bank statements (3 months)",
                                      "Proof of address",
                                    ].map((doc, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between p-3 rounded-lg border"
                                      >
                                        <div className="flex items-center gap-3">
                                          <FileText className="h-5 w-5 text-muted-foreground" />
                                          <span className="text-sm">{doc}</span>
                                        </div>
                                        <Button variant="outline" size="sm">
                                          <Upload className="h-4 w-4 mr-2" />
                                          Upload
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {applicationStep === 3 && (
                                <div className="space-y-4">
                                  <h4 className="font-medium">Review & Confirm</h4>

                                  {/* AI Eligibility Explanation */}
                                  <Card className="bg-primary/5 border-primary/20">
                                    <CardContent className="p-4">
                                      <div className="flex items-start gap-3">
                                        <Bot className="h-5 w-5 text-primary mt-0.5" />
                                        <div className="space-y-2">
                                          <p className="text-sm">
                                            Based on your profile, you appear eligible for this loan. Your
                                            debt-to-income ratio of 32% is within our lending guidelines (max 50%).
                                          </p>
                                          <div className="flex flex-wrap gap-1.5">
                                            <CitationBadge
                                              citation={{
                                                id: "1",
                                                source: "Lending Policy v2.5",
                                                type: "policy",
                                                excerpt: "Maximum debt-to-income ratio: 50%",
                                              }}
                                            />
                                            <CitationBadge
                                              citation={{
                                                id: "2",
                                                source: "Income Analysis",
                                                type: "transaction_history",
                                              }}
                                            />
                                          </div>
                                          <ConfidenceIndicator confidence="high" />
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Responsible Lending Guardrails */}
                                  <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
                                    <CardContent className="p-4">
                                      <div className="flex items-start gap-3">
                                        <Shield className="h-5 w-5 text-orange-600" />
                                        <div>
                                          <h5 className="font-medium text-orange-800 dark:text-orange-200">
                                            Responsible Lending Notice
                                          </h5>
                                          <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                            Please ensure you can comfortably afford the monthly payments. Missing
                                            payments may affect your credit score and incur additional charges.
                                          </p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Terms Acceptance */}
                                  <div className="space-y-3">
                                    <div className="flex items-start space-x-3">
                                      <Checkbox id="terms" />
                                      <label htmlFor="terms" className="text-sm leading-relaxed">
                                        I confirm that the information provided is accurate and I agree to the{" "}
                                        <a href="#" className="text-primary hover:underline">
                                          Loan Terms and Conditions
                                        </a>
                                      </label>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                      <Checkbox id="suitability" />
                                      <label htmlFor="suitability" className="text-sm leading-relaxed">
                                        I understand the monthly payment obligation and confirm this loan is suitable
                                        for my financial situation
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <SheetFooter className="flex-row gap-2">
                              {applicationStep > 1 && (
                                <Button
                                  variant="outline"
                                  onClick={() => setApplicationStep((s) => s - 1)}
                                  className="flex-1"
                                >
                                  Back
                                </Button>
                              )}
                              {applicationStep < 3 ? (
                                <Button onClick={() => setApplicationStep((s) => s + 1)} className="flex-1">
                                  Continue
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              ) : (
                                <SheetClose asChild>
                                  <Button className="flex-1">Submit Application</Button>
                                </SheetClose>
                              )}
                            </SheetFooter>
                          </SheetContent>
                        </Sheet>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            {/* Simulator Tab */}
            <TabsContent value="simulator" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Simulator Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Affordability Simulator
                    </CardTitle>
                    <CardDescription>
                      Estimate your monthly payments and see if you can afford a new loan
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <Label>Loan Amount</Label>
                          <span className="text-sm font-medium">{formatCurrency(simulatorAmount, "AED")}</span>
                        </div>
                        <Slider
                          value={[simulatorAmount]}
                          onValueChange={(v) => setSimulatorAmount(v[0])}
                          min={5000}
                          max={500000}
                          step={5000}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>AED 5,000</span>
                          <span>AED 500,000</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-2">
                          <Label>Loan Term</Label>
                          <span className="text-sm font-medium">{simulatorTerm} months</span>
                        </div>
                        <Slider
                          value={[simulatorTerm]}
                          onValueChange={(v) => setSimulatorTerm(v[0])}
                          min={12}
                          max={60}
                          step={6}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>12 months</span>
                          <span>60 months</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interest Rate</span>
                        <span className="font-medium">5.99%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Payment</span>
                        <span className="text-xl font-bold text-primary">
                          {formatCurrency(calculateMonthlyPayment(simulatorAmount, 5.99, simulatorTerm), "AED")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Interest</span>
                        <span className="font-medium">
                          {formatCurrency(
                            calculateMonthlyPayment(simulatorAmount, 5.99, simulatorTerm) * simulatorTerm -
                              simulatorAmount,
                            "AED",
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      AI Affordability Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm leading-relaxed">
                        Based on your financial profile, here's my assessment of a{" "}
                        <strong>{formatCurrency(simulatorAmount, "AED")}</strong> loan over{" "}
                        <strong>{simulatorTerm} months</strong>:
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Within Lending Guidelines</p>
                          <p className="text-sm text-muted-foreground">
                            Your projected DTI of 38% is below the 50% maximum
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Stable Income Detected</p>
                          <p className="text-sm text-muted-foreground">Regular salary credits over the past 6 months</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Consider Emergency Fund</p>
                          <p className="text-sm text-muted-foreground">
                            Ensure you maintain 3-6 months of expenses in savings
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Sources:</p>
                      <div className="flex flex-wrap gap-1.5">
                        <CitationBadge
                          citation={{
                            id: "1",
                            source: "Lending Policy v2.5",
                            type: "policy",
                            excerpt: lendingPolicy?.content.slice(0, 50),
                          }}
                        />
                        <CitationBadge
                          citation={{
                            id: "2",
                            source: "Transaction Analysis",
                            type: "transaction_history",
                          }}
                        />
                        <CitationBadge
                          citation={{
                            id: "3",
                            source: "Existing Loans",
                            type: "account_ledger",
                          }}
                        />
                      </div>
                      <ConfidenceIndicator confidence="high" />
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-sm">
                      <Info className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span className="text-orange-700 dark:text-orange-300">
                        This is an indicative assessment only. Formal approval requires complete documentation and
                        credit checks.
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar with AI widget - 1 column */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <AskAIBankerWidget questions={aiQuestions} description="Get help with loans and financing options" />
          </div>
        </div>
      </div>
    </div>
  )
}
