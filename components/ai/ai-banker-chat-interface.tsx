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
  MessageSquare
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
}

export function AIBankerChatInterface({ embedded = false, initialMessage }: AIBankerChatInterfaceProps) {
  const { currentRole, currentUser } = useRole()
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["all"])
  const [escalateDialog, setEscalateDialog] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading, setInput, append, error } = useChat({
    api: "/api/chat",
    body: {
      userId: currentUser?.id
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
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI Banker</h3>
              <p className="text-xs text-muted-foreground">Your personal banking assistant</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
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
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-primary" />
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
                    className="cursor-pointer hover:bg-primary/10 py-2 px-3 text-sm"
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
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}

                <div className={cn("max-w-[85%] space-y-3", message.role === "user" ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3",
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
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
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary-foreground" />
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
            placeholder="Ask about your accounts..."
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

