"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "ai/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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
import { cn } from "@/lib/utils"
import { CitationBadge } from "@/components/ai/citation-badge"
import { useRole } from "@/lib/role-context"
import { AIAction } from "@/lib/types"
import { AI_AGENT_PERSONAS, type AIAgentId } from "@/lib/ai/agents"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts"
import {
  Send,
  Bot,
  User,
  Wallet,
  Receipt,
  FileText,
  BookOpen,
  Database,
  AlertCircle,
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  Pin,
  PinOff,
  MessageSquare,
  LineChart,
  ShieldCheck,
  PiggyBank
} from "lucide-react"

type ScopeOption = {
  id: string
  label: string
  icon: React.ElementType
}

const scopeOptions: ScopeOption[] = [
  { id: "accounts", label: "My Accounts", icon: Wallet },
  { id: "transactions", label: "Transactions", icon: Receipt },
  { id: "fees", label: "Fees & Policies", icon: FileText },
  { id: "products", label: "Product Terms", icon: BookOpen },
  { id: "all", label: "All Allowed Sources", icon: Database },
]

const suggestedPrompts = [
  "How much did I spend on restaurants this month?",
  "Why was I charged this fee?",
  "Can I afford a 3,000 AED monthly payment?",
  "Explain my credit card benefits",
  "What's my current account balance?",
  "Show me my recurring payments",
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

type AgentTheme = {
  icon: typeof Bot
  accent: string
  accentMuted: string
  gradientFrom: string
  gradientTo: string
  badgeBg: string
  badgeText: string
  placeholder: string
  pulseColor: string
  iconGradient: string
}

export const AI_AGENT_THEMES: Record<AIAgentId, AgentTheme> = {
  banker: {
    icon: Bot,
    accent: "#4b5563",
    accentMuted: "rgba(148,163,184,0.15)",
    gradientFrom: "rgba(148,163,184,0.10)",
    gradientTo: "rgba(16,185,129,0)",
    badgeBg: "rgba(148,163,184,0.12)",
    badgeText: "#374151",
    placeholder: "Ask about your accounts...",
    pulseColor: "#6b7280",
    iconGradient: "linear-gradient(135deg, #e5e7eb, #cbd5f5)"
  },
  investmentor: {
    icon: LineChart,
    accent: "#1f2933",
    accentMuted: "rgba(148,163,184,0.18)",
    gradientFrom: "rgba(148,163,184,0.12)",
    gradientTo: "rgba(99,102,241,0)",
    badgeBg: "rgba(148,163,184,0.16)",
    badgeText: "#1f2933",
    placeholder: "Ask about your portfolio or markets...",
    pulseColor: "#4b5563",
    iconGradient: "linear-gradient(135deg, #e5e7eb, #d1d5db)"
  },
  risk_guardian: {
    icon: ShieldCheck,
    accent: "#92400e",
    accentMuted: "rgba(250,204,21,0.15)",
    gradientFrom: "rgba(250,204,21,0.16)",
    gradientTo: "rgba(251,146,60,0)",
    badgeBg: "rgba(254,243,199,0.8)",
    badgeText: "#78350f",
    placeholder: "Ask about alerts, policies, or investigations...",
    pulseColor: "#f59e0b",
    iconGradient: "linear-gradient(135deg, #fef3c7, #fde68a)"
  },
  savings_coach: {
    icon: PiggyBank,
    accent: "#854d0e",
    accentMuted: "rgba(252,211,77,0.2)",
    gradientFrom: "rgba(252,211,77,0.18)",
    gradientTo: "rgba(244,114,182,0)",
    badgeBg: "rgba(254,249,195,0.9)",
    badgeText: "#78350f",
    placeholder: "Ask about savings habits or goal progress...",
    pulseColor: "#fbbf24",
    iconGradient: "linear-gradient(135deg, #fef9c3, #fef3c7)"
  },
  researcher: {
    icon: LineChart,
    accent: "#0f172a",
    accentMuted: "rgba(15,23,42,0.12)",
    gradientFrom: "rgba(148,163,184,0.12)",
    gradientTo: "rgba(148,163,184,0)",
    badgeBg: "rgba(148,163,184,0.16)",
    badgeText: "#0f172a",
    placeholder: "Ask for live research or news...",
    pulseColor: "#0f172a",
    iconGradient: "linear-gradient(135deg, #0f172a, #1e293b)"
  }
}

const ChartRenderer = ({ data }: { data: any }) => {
  if (!data || !data.data || data.data.length === 0) return null;

  if (data.type === 'bar') {
    return (
      <div className="w-full h-[200px] mt-2 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
            <RechartsTooltip 
              cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="value" fill="#000000" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (data.type === 'pie') {
    return (
      <div className="w-full h-[200px] mt-2 mb-4 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
};

const FormattedText = ({ text }: { text: string }) => {
  // Simple markdown parser
  const parts = text.split(/(\*\*.*?\*\*|\n)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
        }
        if (part === "\n") {
           return <br key={i} />;
        }
        return part;
      })}
    </span>
  );
};

const MessageContent = ({ content }: { content: string }) => {
  const parts = content.split(/(```chart[\s\S]*?```)/g);

  return (
    <div className="text-sm space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith("```chart")) {
          try {
            const jsonStr = part.replace(/^```chart\s*/, "").replace(/```$/, "");
            const chartData = JSON.parse(jsonStr);
            return <ChartRenderer key={i} data={chartData} />;
          } catch (e) {
             // If parsing fails (e.g. streaming incomplete), show nothing or raw text
             return null;
          }
        }
        return <FormattedText key={i} text={part} />;
      })}
    </div>
  );
};

interface AIBankerChatInterfaceProps {
  embedded?: boolean
  initialMessage?: string
  agentId?: AIAgentId
}

export function AIBankerChatInterface({
  embedded = false,
  initialMessage,
  agentId = "banker"
}: AIBankerChatInterfaceProps) {
  const { currentRole, currentUser } = useRole()
  const theme = AI_AGENT_THEMES[agentId] ?? AI_AGENT_THEMES.banker
  const persona = AI_AGENT_PERSONAS[agentId] ?? AI_AGENT_PERSONAS.banker
  const AgentIcon = theme.icon
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["all"])
  const [escalateDialog, setEscalateDialog] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const apiPath = agentId === "researcher" ? "/api/research" : "/api/chat"

  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading, setInput, append, error } = useChat({
    api: apiPath,
    body: {
      userId: currentUser?.id,
      agentId
    },
    // Removed initialMessages to avoid conflict with append
    onResponse: (response) => {
      // You can handle response side-effects here
    },
  })

  const hasSentInitialRef = useRef(false)

  // Auto-send initial message if provided
  useEffect(() => {
    if (initialMessage && !hasSentInitialRef.current && messages.length === 0) {
        hasSentInitialRef.current = true
        append({
            role: 'user',
            content: initialMessage
        })
    }
  }, [initialMessage, append, messages.length])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    // Small timeout to allow the DOM to update and ScrollArea to recalculate
    const timeoutId = setTimeout(() => {
      scrollToBottom()
    }, 100)
    return () => clearTimeout(timeoutId)
  }, [messages])

  useEffect(() => {
    if (messages.length > 0) {
      setLastSyncedAt(new Date())
    }
  }, [messages])

  const toggleScope = (scopeId: string) => {
    if (scopeId === "all") {
      setSelectedScopes(["all"])
    } else {
      setSelectedScopes((prev) => {
        const withoutAll = prev.filter((s) => s !== "all")
        if (withoutAll.includes(scopeId)) {
          const newScopes = withoutAll.filter((s) => s !== scopeId)
          return newScopes.length === 0 ? ["all"] : newScopes
        }
        return [...withoutAll, scopeId]
      })
    }
  }

  const handleSuggestedPrompt = (prompt: string) => {
    handleInputChange({ target: { value: prompt } } as any)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header (only if not embedded, or simplified if embedded) */}
      {!embedded && (
        <div className="pb-3 border-b flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center shadow-sm"
              style={{ backgroundImage: theme.iconGradient }}
            >
              <AgentIcon className="h-5 w-5" style={{ color: "#fff" }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{persona.title}</h3>
              <p className="text-xs text-muted-foreground">{persona.shortDescription}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full animate-pulse"
                  style={{ backgroundColor: theme.pulseColor }}
                />
                {lastSyncedAt
                  ? `Live data refreshed at ${lastSyncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                  : "Awaiting first response"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-xs border px-2 py-1"
            style={{ borderColor: theme.accent, color: theme.badgeText, backgroundColor: theme.badgeBg }}
          >
            <Sparkles className="h-3 w-3 mr-1" style={{ color: theme.accent }} />
            {currentRole === "retail_customer" || currentRole === "sme_customer" ? "Customer Mode" : "Staff Mode"}
          </Badge>
        </div>
      )}

      {/* Scope Selector */}
      {/* 
      <div className="px-4 py-3 border-b bg-muted/30">
        <p className="text-xs text-muted-foreground mb-2">Search scope:</p>
        <div className="flex flex-wrap gap-2">
          {scopeOptions.map((scope) => {
            const Icon = scope.icon
            const isSelected = selectedScopes.includes(scope.id)
            return (
              <Badge
                key={scope.id}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors py-1.5 px-3",
                  isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
                onClick={() => toggleScope(scope.id)}
              >
                <Icon className="h-3 w-3 mr-1.5" />
                {scope.label}
              </Badge>
            )
          })}
        </div>
      </div>
      */}

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 min-h-0">
        <div className="py-4 space-y-6">
          {!messages || messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center mb-4 shadow-sm"
                style={{ backgroundColor: theme.accentMuted }}
              >
                <AgentIcon className="h-8 w-8" style={{ color: theme.accent }} />
              </div>
              <h3 className="text-lg font-semibold mb-2">How can I help you today?</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                I can help you check balances, explain fees, make transfers, and more. All my answers include
                citations so you know where the information comes from.
              </p>
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm mb-4 max-w-xs">
                    <p className="font-medium">Error</p>
                    <p>{error.message || "Something went wrong. Please try again."}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {suggestedPrompts.map((prompt, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer py-2 px-3 text-sm border"
                    style={{
                      borderColor: theme.accent,
                      color: theme.accent
                    }}
                    onClick={() => handleSuggestedPrompt(prompt)}
                  >
                    {prompt}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
              >
                {message.role === "assistant" && (
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ backgroundImage: theme.iconGradient }}
                  >
                    <AgentIcon className="h-4 w-4" style={{ color: "#fff" }} />
                  </div>
                )}

                <div className={cn("max-w-[85%] space-y-3", message.role === "user" ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3",
                      message.role === "user" ? "text-white" : "bg-muted",
                    )}
                    style={message.role === "user" ? { backgroundColor: theme.accent } : undefined}
                  >
                    <MessageContent content={message.content} />
                  </div>
                </div>

                {message.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ backgroundImage: theme.iconGradient }}
              >
                <AgentIcon className="h-4 w-4" style={{ color: "#fff" }} />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span
                    className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {error && messages.length > 0 && (
            <div className="flex gap-3">
               <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="bg-destructive/10 text-destructive rounded-2xl px-4 py-3 text-sm">
                <p>Sorry, I encountered an error: {error.message}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-background">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit(e)
          }}
          className="flex gap-3"
        >
          <Input
            placeholder={theme.placeholder}
            value={input || ""}
            onChange={handleInputChange}
            className="flex-1"
          />
          <Button type="submit" disabled={!input?.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          AI responses include citations. Sensitive data is masked.
        </p>
      </div>

      {/* Escalation Dialog */}
      <AlertDialog open={escalateDialog} onOpenChange={setEscalateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Escalate to Human Support
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your question will be forwarded to a human support agent who will respond within 2 business hours.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Escalate Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

