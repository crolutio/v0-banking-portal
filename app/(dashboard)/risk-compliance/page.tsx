"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { StatCard } from "@/components/ui/stat-card"
import { CitationBadge, ConfidenceIndicator } from "@/components/ai/citation-badge"
import { useRole } from "@/lib/role-context"
import { riskAlerts, users } from "@/lib/mock-data"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Search,
  Bot,
  FileText,
  User,
  Eye,
  Ban,
  Scale,
  Gavel,
  Flag,
  XCircle,
  Lightbulb,
} from "lucide-react"
import type { RiskAlert } from "@/lib/types"

const severityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  investigating: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  escalated: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

const typeIcons: Record<string, React.ElementType> = {
  aml: Scale,
  kyc: FileText,
  fraud: AlertTriangle,
  policy_breach: Ban,
  unusual_activity: Eye,
}

export default function RiskCompliancePage() {
  const { currentRole } = useRole()
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [decisionDialog, setDecisionDialog] = useState(false)

  // Check if user has access
  if (currentRole !== "risk_compliance" && currentRole !== "admin") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Risk & Compliance is only available to Risk/Compliance and Admin users.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredAlerts = riskAlerts.filter((alert) => {
    const matchesSearch =
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter
    const matchesStatus = statusFilter === "all" || alert.status === statusFilter
    return matchesSearch && matchesSeverity && matchesStatus
  })

  const openAlerts = riskAlerts.filter((a) => a.status === "open").length
  const criticalAlerts = riskAlerts.filter((a) => a.severity === "critical").length
  const escalatedAlerts = riskAlerts.filter((a) => a.status === "escalated").length
  const aiQuestions = [
    "Summarize today's highest risk alerts",
    "Which investigations require escalation?",
    "What policy applies to this AML alert?",
    "List evidence gathered for this case"
  ]

  const recentWindow = new Date()
  recentWindow.setDate(recentWindow.getDate() - 7)
  const recentAlerts = riskAlerts.filter((a) => new Date(a.createdAt) >= recentWindow)
  const newCritical = recentAlerts.filter((a) => a.severity === "critical").length
  const amlAlerts = riskAlerts.filter((a) => a.type === "aml").length
  const fraudAlerts = riskAlerts.filter((a) => a.type === "fraud").length

  const riskInsights = [
    {
      id: "recent",
      title: `${recentAlerts.length} alert${recentAlerts.length !== 1 ? "s" : ""} created in the last 7 days`,
      detail: `${newCritical} critical and ${recentAlerts.length - newCritical} non‑critical items require triage.`,
    },
    {
      id: "aml-fraud",
      title: "Mix of AML and fraud cases in the queue",
      detail: `${amlAlerts} AML‑type and ${fraudAlerts} fraud‑type alerts are currently open or under investigation.`,
    },
    {
      id: "escalations",
      title: `${escalatedAlerts} alert${escalatedAlerts !== 1 ? "s" : ""} escalated for senior decision`,
      detail:
        "Ensure outcomes and rationales are documented to keep the audit trail complete and support future reviews.",
    },
  ]

  const getCustomerName = (userId?: string) => {
    if (!userId) return "System"
    const user = users.find((u) => u.id === userId)
    return user?.name || "Unknown"
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Risk & Compliance</h1>
          <p className="text-muted-foreground">Monitor alerts, manage cases, and ensure policy compliance</p>
        </div>
      </div>

      <Card className="border border-border/80">
        <CardContent className="space-y-3 pt-4">
          {riskInsights.map((insight) => (
            <div
              key={insight.id}
              className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3"
            >
              <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Lightbulb className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">{insight.title}</p>
                <p className="text-xs text-muted-foreground">{insight.detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AskAIBankerWidget
        agentId="risk_guardian"
        title="Ask AI Risk Guardian"
        description="Get contextual guidance on alerts, policies, and compliance actions"
        questions={aiQuestions}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Open Alerts"
          value={openAlerts.toString()}
          icon={AlertCircle}
          description="Require attention"
        />
        <StatCard
          title="Critical"
          value={criticalAlerts.toString()}
          icon={AlertTriangle}
          description="Highest priority"
          trend={{ value: 1, direction: "up" }}
        />
        <StatCard title="Escalated" value={escalatedAlerts.toString()} icon={Flag} description="Awaiting decision" />
        <StatCard title="Resolved Today" value="3" icon={CheckCircle2} description="Closed cases" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts Queue */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle>Alerts Queue</CardTitle>
            <div className="space-y-2 mt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="px-4 pb-4 space-y-2">
                {filteredAlerts.map((alert) => {
                  const Icon = typeIcons[alert.type] || AlertCircle
                  return (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAlert?.id === alert.id ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            alert.severity === "critical"
                              ? "bg-red-100 dark:bg-red-900"
                              : alert.severity === "high"
                                ? "bg-orange-100 dark:bg-orange-900"
                                : "bg-yellow-100 dark:bg-yellow-900"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${
                              alert.severity === "critical"
                                ? "text-red-600 dark:text-red-400"
                                : alert.severity === "high"
                                  ? "text-orange-600 dark:text-orange-400"
                                  : "text-yellow-600 dark:text-yellow-400"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1">{alert.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{alert.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={severityColors[alert.severity]}>
                              {alert.severity}
                            </Badge>
                            <Badge variant="outline" className={statusColors[alert.status]}>
                              {alert.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Alert Detail / Case Management */}
        <Card className="lg:col-span-2">
          {selectedAlert ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-12 w-12 rounded-full flex items-center justify-center ${
                        selectedAlert.severity === "critical"
                          ? "bg-red-100 dark:bg-red-900"
                          : selectedAlert.severity === "high"
                            ? "bg-orange-100 dark:bg-orange-900"
                            : "bg-yellow-100 dark:bg-yellow-900"
                      }`}
                    >
                      {(() => {
                        const Icon = typeIcons[selectedAlert.type] || AlertCircle
                        return (
                          <Icon
                            className={`h-6 w-6 ${
                              selectedAlert.severity === "critical"
                                ? "text-red-600 dark:text-red-400"
                                : selectedAlert.severity === "high"
                                  ? "text-orange-600 dark:text-orange-400"
                                  : "text-yellow-600 dark:text-yellow-400"
                            }`}
                          />
                        )
                      })()}
                    </div>
                    <div>
                      <CardTitle>{selectedAlert.title}</CardTitle>
                      <CardDescription className="mt-1">{selectedAlert.description}</CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={severityColors[selectedAlert.severity]}>
                          {selectedAlert.severity}
                        </Badge>
                        <Badge variant="outline" className={statusColors[selectedAlert.status]}>
                          {selectedAlert.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(selectedAlert.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedAlert.status !== "resolved" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setDecisionDialog(true)}>
                          <Gavel className="h-4 w-4 mr-2" />
                          Make Decision
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="details" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border">
                        <p className="text-sm text-muted-foreground">Alert Type</p>
                        <p className="font-medium capitalize">{selectedAlert.type.replace("_", " ")}</p>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <p className="text-sm text-muted-foreground">Related Customer</p>
                        <p className="font-medium">{getCustomerName(selectedAlert.userId)}</p>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <p className="text-sm text-muted-foreground">Assigned To</p>
                        <p className="font-medium">
                          {selectedAlert.assignedTo ? getCustomerName(selectedAlert.assignedTo) : "Unassigned"}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="font-medium">{new Date(selectedAlert.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    {selectedAlert.evidence && (
                      <div className="p-4 rounded-lg border">
                        <p className="text-sm text-muted-foreground mb-2">Evidence</p>
                        <ul className="space-y-1">
                          {selectedAlert.evidence.map((e, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              {e}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Human Decision Required Banner */}
                    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Gavel className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-orange-800 dark:text-orange-200">
                              Human Decision Required
                            </h4>
                            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                              AI can provide analysis and recommendations, but final decisions on risk alerts must be
                              made by authorized personnel. All decisions are logged in the audit trail.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="timeline" className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 text-primary" />
                          </div>
                          <div className="w-0.5 h-full bg-border mt-2" />
                        </div>
                        <div className="pb-4">
                          <p className="font-medium">Alert Created</p>
                          <p className="text-sm text-muted-foreground">
                            System detected {selectedAlert.type.replace("_", " ")} pattern
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(selectedAlert.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {selectedAlert.assignedTo && (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="w-0.5 h-full bg-border mt-2" />
                          </div>
                          <div className="pb-4">
                            <p className="font-medium">Assigned to {getCustomerName(selectedAlert.assignedTo)}</p>
                            <p className="text-sm text-muted-foreground">Case assigned for investigation</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(selectedAlert.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedAlert.status === "investigating" && (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                              <Eye className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            </div>
                          </div>
                          <div>
                            <p className="font-medium">Investigation in Progress</p>
                            <p className="text-sm text-muted-foreground">Gathering additional evidence and context</p>
                            <p className="text-xs text-muted-foreground mt-1">Ongoing</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="ai-analysis" className="space-y-4">
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Bot className="h-5 w-5 text-primary mt-0.5" />
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-medium">AI Case Summary</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                This alert was triggered due to {selectedAlert.description.toLowerCase()}. Based on the
                                available data, this pattern matches known {selectedAlert.type.replace("_", " ")}{" "}
                                indicators with {selectedAlert.severity === "critical" ? "high" : "moderate"}{" "}
                                confidence.
                              </p>
                            </div>

                            <Separator />

                            <div>
                              <h4 className="font-medium">Policy References</h4>
                              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                                <li>• KYC Policy v4.2 - Enhanced due diligence requirements</li>
                                <li>• AML Policy - Transaction monitoring thresholds</li>
                                <li>• Risk Framework - Escalation procedures</li>
                              </ul>
                            </div>

                            <Separator />

                            <div>
                              <h4 className="font-medium">Recommended Actions</h4>
                              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                                <li>1. Review customer transaction history for last 90 days</li>
                                <li>2. Verify source of funds documentation</li>
                                <li>3. Contact customer for clarification if needed</li>
                                <li>4. Document findings and make decision</li>
                              </ul>
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-2">
                              <CitationBadge citation={{ id: "1", source: "KYC Policy v4.2", type: "policy" }} />
                              <CitationBadge
                                citation={{ id: "2", source: "Transaction Data", type: "transaction_history" }}
                              />
                              <CitationBadge citation={{ id: "3", source: "Risk Rules Engine", type: "risk_rules" }} />
                            </div>
                            <ConfidenceIndicator
                              confidence={selectedAlert.severity === "critical" ? "high" : "medium"}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-sm">
                      <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span className="text-orange-700 dark:text-orange-300">
                        AI analysis is provided as guidance only. All final decisions must be made by authorized
                        compliance personnel and will be recorded in the audit log.
                      </span>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[500px] text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Select an Alert</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Choose an alert from the queue to view details, timeline, and AI analysis.
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Decision Dialog */}
      <AlertDialog open={decisionDialog} onOpenChange={setDecisionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Make Decision</AlertDialogTitle>
            <AlertDialogDescription>
              Select an action for this alert. Your decision will be logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col bg-transparent">
                <CheckCircle2 className="h-6 w-6 mb-2 text-green-600" />
                <span className="font-medium">Clear</span>
                <span className="text-xs text-muted-foreground">No action needed</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col bg-transparent">
                <Flag className="h-6 w-6 mb-2 text-orange-600" />
                <span className="font-medium">Escalate</span>
                <span className="text-xs text-muted-foreground">Needs senior review</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col bg-transparent">
                <Eye className="h-6 w-6 mb-2 text-blue-600" />
                <span className="font-medium">Monitor</span>
                <span className="text-xs text-muted-foreground">Continue observation</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col text-red-600 bg-transparent">
                <XCircle className="h-6 w-6 mb-2" />
                <span className="font-medium">Block</span>
                <span className="text-xs text-muted-foreground">Restrict account</span>
              </Button>
            </div>
            <div>
              <label className="text-sm font-medium">Decision Notes</label>
              <Textarea placeholder="Document your reasoning..." className="mt-1" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Submit Decision</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
