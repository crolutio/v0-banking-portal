"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useRole } from "@/lib/role-context"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { useFloatingChat } from "@/components/ai/floating-chat-context"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Plus,
  Clock,
  Phone,
  Mail,
  FileText,
  Headphones,
  UserPlus,
  Mic,
} from "lucide-react"
import { RetellChatVoiceButton } from "@/components/ai/retell-chat-voice-button"
import type { DbConversation, DbMessage } from "@/lib/types"
import { useCustomerConversations } from "@/lib/hooks/useCustomerConversations"
import { useConversationMessages } from "@/lib/hooks/useConversationMessages"
import { createConversation, requestConversationHandover } from "@/lib/supportApi"

const CHART_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]


export default function SupportPage() {
  const { currentUser, currentRole } = useRole()
  const customerId = currentUser?.id
  const { openChatWithMessage } = useFloatingChat()

  
  const [selectedConversation, setSelectedConversation] = useState<DbConversation | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [newTicketDialog, setNewTicketDialog] = useState(false)
  const [newTicketSubject, setNewTicketSubject] = useState("")
  const [newTicketMessage, setNewTicketMessage] = useState("")
  const [newTicketPriority, setNewTicketPriority] = useState("medium")
  const [creating, setCreating] = useState(false)
  const [escalating, setEscalating] = useState(false)
  const [pendingFirstMessage, setPendingFirstMessage] = useState<string | null>(null)
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null)

  const { conversations, refresh } = useCustomerConversations({
    customerId: customerId || "",
  })

  const { messages, send, waitingForReply } = useConversationMessages({
    conversationId: selectedConversation?.id ?? null,
    customerId: customerId || "",
  })

  // Deduplicate messages by ID to prevent React key warnings
  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>()
    return messages.filter((msg) => {
      if (seen.has(msg.id)) {
        return false
      }
      seen.add(msg.id)
      return true
    })
  }, [messages])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true)
  const isUserScrollingRef = useRef(false)

  // Auto-scroll when messages change or when waiting for reply, but only if enabled
  useEffect(() => {
    if (!isAutoScrollEnabled) return

    // Small timeout to allow the DOM to update and ScrollArea to recalculate
    const timeoutId = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }, 100)
    return () => clearTimeout(timeoutId)
  }, [uniqueMessages, waitingForReply, isAutoScrollEnabled])

  // Handle scroll detection to stop/resume auto-scroll
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollContainer) return

    const handleScroll = () => {
      if (isUserScrollingRef.current) return
      
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      
      // Consider "at bottom" if within 50px of the bottom
      const isAtBottom = distanceFromBottom < 50
      
      if (isAtBottom && !isAutoScrollEnabled) {
        setIsAutoScrollEnabled(true)
      } else if (!isAtBottom && isAutoScrollEnabled) {
        setIsAutoScrollEnabled(false)
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [isAutoScrollEnabled])

  // Mark when auto-scroll is triggered to avoid interfering with scroll detection
  useEffect(() => {
    if (isAutoScrollEnabled) {
      isUserScrollingRef.current = true
      const timeoutId = setTimeout(() => {
        isUserScrollingRef.current = false
      }, 200)
      return () => clearTimeout(timeoutId)
    }
  }, [uniqueMessages, waitingForReply, isAutoScrollEnabled])

  const handleSendMessage = async () => {
    if (!selectedConversation) return
    const trimmed = newMessage.trim()
    if (!trimmed) return

    // Clear input immediately for optimistic UI
    setNewMessage("")

    try {
      await send(trimmed)
    } catch (e) {
      console.error("Failed to send message", e)
      // Restore message on error
      setNewMessage(trimmed)
    }
  }

  async function handleSubmitTicket() {
    if (!customerId || !currentUser?.id) return

    const subject = newTicketSubject.trim()
    const firstMsg = newTicketMessage.trim()

    if (!subject || !firstMsg) {
      return
    }

    setCreating(true)
    try {
      const conv = await createConversation({
        customer_id: customerId,
        subject,
        priority: newTicketPriority,
        channel: "chat",
        last_message: firstMsg,
        provider: "app",
      })

      // select it immediately so message hook points at it
      setSelectedConversation(conv)

      setNewTicketDialog(false)

      setNewTicketSubject("")
      setNewTicketMessage("")
      setNewTicketPriority("medium")

      // refresh the list
      await refresh()

      // queue first message to send when the conversation id is active in the hook
      setPendingFirstMessage(firstMsg)
      setPendingConversationId(conv.id)
    } catch (e) {
      console.error("Failed to create ticket", e)
    } finally {
      setCreating(false)
    }
  }
  useEffect(() => {
    if (!pendingFirstMessage || !pendingConversationId) return
    if (selectedConversation?.id !== pendingConversationId) return
    const messageToSend = pendingFirstMessage
    setPendingFirstMessage(null)
    setPendingConversationId(null)
    send(messageToSend).catch((e) => console.error("Failed to send first ticket message", e))
  }, [pendingFirstMessage, pendingConversationId, selectedConversation?.id, send])


  async function handleEscalate() {
    if (!selectedConversation) return
    if (selectedConversation.status === "escalated" || selectedConversation.handover_required) return

    setEscalating(true)
    try {
      const updated = await requestConversationHandover({
        conversation_id: selectedConversation.id,
        channel: "chat",
      })
      setSelectedConversation(updated)
      await refresh()
    } catch (e) {
      console.error("Failed to request handover", e)
    } finally {
      setEscalating(false)
    }
  }


  const statusColors: Record<string, string> = {
    active: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    open: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    escalated: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  }

  const priorityColors: Record<string, string> = {
    low: "text-muted-foreground",
    medium: "text-yellow-600",
    high: "text-red-600",
  }

  const formatStatusLabel = (status: string) => {
    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

  const renderInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\)|\n)/g)
    return parts.map((part, idx) => {
      if (part === "\n") return <br key={idx} />
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        )
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={idx} className="rounded bg-muted px-1 py-0.5 text-xs">
            {part.slice(1, -1)}
          </code>
        )
      }
      const linkMatch = part.match(/^\[(.+)\]\((.+)\)$/)
      if (linkMatch) {
        const [, label, href] = linkMatch
        return (
          <a key={idx} href={href} className="text-primary underline" target="_blank" rel="noreferrer">
            {label}
          </a>
        )
      }
      return <span key={idx}>{part}</span>
    })
  }

  const parseMarkdownTable = (lines: string[]) => {
    if (lines.length < 2) return null
    const headerLine = lines[0].trim()
    const headers = headerLine
      .split("|")
      .map((h) => h.trim())
      .filter((h) => h.length > 0)
    if (headers.length === 0) return null
    const dataLines = lines.slice(1).filter((line) => !/^[\|\s\-:]+$/.test(line.trim()))
    const rows = dataLines.map((line) => {
      const cells = line
        .trim()
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
      const normalized = [...cells]
      while (normalized.length < headers.length) normalized.push("")
      return normalized.slice(0, headers.length)
    })
    if (rows.length === 0) return null
    return { headers, rows }
  }

  const renderChart = (data: { type?: string; data?: Array<{ name: string; value: number }> }) => {
    if (!data?.data || data.data.length === 0) return null
    if (data.type === "bar") {
      return (
        <div className="w-full h-[200px] mt-2 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <RechartsTooltip
                cursor={{ fill: "rgba(0,0,0,0.05)" }}
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              />
              <Bar dataKey="value" fill="#000000" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    }
    if (data.type === "pie") {
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
                {data.data.map((entry, index) => (
                  <Cell key={`cell-${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )
    }
    return null
  }

  const renderTextWithTables = (text: string) => {
    const lines = text.split("\n")
    const blocks: Array<{ type: "text" | "table"; lines: string[] }> = []
    let current: { type: "text" | "table"; lines: string[] } | null = null

    const isTableLine = (line: string) => {
      const trimmed = line.trim()
      return trimmed.startsWith("|") && trimmed.includes("|")
    }

    for (const line of lines) {
      const isTable = isTableLine(line)
      if (!current || current.type !== (isTable ? "table" : "text")) {
        if (current) blocks.push(current)
        current = { type: isTable ? "table" : "text", lines: [line] }
      } else {
        current.lines.push(line)
      }
    }
    if (current) blocks.push(current)

    return (
      <div className="space-y-3">
        {blocks.map((block, idx) => {
          if (block.type === "table") {
            const table = parseMarkdownTable(block.lines.filter((l) => l.trim().length > 0))
            if (!table) return <div key={idx}>{renderInlineMarkdown(block.lines.join("\n"))}</div>
            return (
              <div key={idx} className="overflow-x-auto rounded-lg border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {table.headers.map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.rows.map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <TableCell key={cellIdx}>{cell || "\u00A0"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          }
          return (
            <div key={idx} className="text-sm whitespace-pre-wrap">
              {renderInlineMarkdown(block.lines.join("\n"))}
            </div>
          )
        })}
      </div>
    )
  }

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```chart[\s\S]*?```|`?chart\s*\{[\s\S]*?\}\s*`?)/g)
    return (
      <div className="space-y-3">
        {parts.map((part, idx) => {
          const trimmed = part.trim()
          if (!trimmed) return null

          if (trimmed.startsWith("```chart")) {
            try {
              const jsonStr = trimmed.replace(/^```chart\s*/i, "").replace(/```$/i, "")
              return <div key={idx}>{renderChart(JSON.parse(jsonStr))}</div>
            } catch (err) {
              return <div key={idx}>{renderTextWithTables(part)}</div>
            }
          }

          if (trimmed.startsWith("`chart") || trimmed.startsWith("chart")) {
            try {
              const jsonStr = trimmed.replace(/^`?chart\s*/i, "").replace(/`$/, "")
              return <div key={idx}>{renderChart(JSON.parse(jsonStr))}</div>
            } catch (err) {
              return <div key={idx}>{renderTextWithTables(part)}</div>
            }
          }

          return <div key={idx}>{renderTextWithTables(part)}</div>
        })}
      </div>
    )
  }

  // AI Banker questions relevant to support page
  const aiQuestions = [
    "How do I dispute a transaction?",
    "What's the status of my support ticket?",
    "How can I contact customer service?",
    "What are your support hours?",
    "Help me with a banking issue",
  ]

  // Quick help cards for support
  const quickHelpCards = [
    {
      icon: Bot,
      title: "AI Assistant",
      subtitle: "Get instant answers",
      onClick: () => openChatWithMessage("I need help with a banking issue", "banker")
    },
    {
      icon: Phone,
      title: "Call Us",
      subtitle: "800-BANK-FUTURE",
      onClick: () => window.open("tel:800-BANK-FUTURE")
    },
    {
      icon: Mail,
      title: "Email",
      subtitle: "support@bankfuture.com",
      onClick: () => window.open("mailto:support@bankfuture.com")
    },
    {
      icon: FileText,
      title: "FAQs",
      subtitle: "Browse help articles",
      onClick: () => {
        // Could navigate to a FAQ page or open a modal
        console.log("Navigate to FAQs")
      }
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-3 p-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
          <p className="text-muted-foreground">Get help with your banking needs</p>
        </div>
        <Dialog open={newTicketDialog} onOpenChange={setNewTicketDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
              <DialogDescription>
                Describe your issue and our AI will try to help immediately. If needed, a human agent will follow up.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input
                  placeholder="Brief description of your issue"
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={newTicketPriority} onValueChange={setNewTicketPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - General inquiry</SelectItem>
                    <SelectItem value="medium">Medium - Need assistance</SelectItem>
                    <SelectItem value="high">High - Urgent issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Describe your issue in detail..."
                  rows={4}
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewTicketDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitTicket} disabled={creating}>
                {creating ? "Submitting..." : "Submit Ticket"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>


      {/* Support Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Main content area - Support Interface - 3 columns */}
        <div className="lg:col-span-3 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
            {/* Ticket List */}
            <Card className="lg:col-span-1 flex flex-col h-full min-h-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Your Tickets</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                  <div className="px-4 pb-4 space-y-2">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedConversation?.id === conv.id ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedConversation(conv)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm line-clamp-1">{conv.subject ?? "(no subject)"}</p>
                          <Badge variant="outline" className={statusColors[conv.status]}>
                            {formatStatusLabel(conv.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(conv.created_at).toLocaleDateString()}</span>
                          <span className={priorityColors[conv.priority]}>• {conv.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Window */}
            <Card className="lg:col-span-2 flex flex-col h-full min-h-0">
              {selectedConversation ? (
                <>
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{selectedConversation.subject ?? "(no subject)"}</CardTitle>
                        <CardDescription>
                          Ticket #{selectedConversation.id} • Created{" "}
                          {new Date(selectedConversation.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={statusColors[selectedConversation.status]}>
                        {formatStatusLabel(selectedConversation.status)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <div className="flex-1 overflow-hidden min-h-0">
                    <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                      <div className="space-y-4">
                        {uniqueMessages.map((m, idx) => {
                          const isUser = m.sender_type === "customer"
                          const isSystem = m.sender_type === "system"
                          if (isSystem) {
                            return (
                              <div key={`${m.id}-${idx}`} className="flex justify-center">
                                <div className="rounded-full bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
                                  {m.content}
                                </div>
                              </div>
                            )
                          }
                          return (
                            <div
                              key={`${m.id}-${idx}`}
                              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                            >
                              {!isUser && (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                  <Headphones className="h-4 w-4" />
                                </div>
                              )}

                              <div
                                className={`max-w-[80%] space-y-2 ${isUser ? "items-end" : "items-start"}`}
                              >
                                <div
                                  className={`rounded-2xl px-4 py-3 ${
                                    isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                                  }`}
                                >
                                  {renderMessageContent(m.content)}
                                </div>

                                <p className="text-xs text-muted-foreground px-1">
                                  {new Date(m.created_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>

                              {isUser && (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                  <User className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {/* Loading Spinner */}
                        {waitingForReply && (
                          <div className="flex gap-3 justify-start">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <Headphones className="h-4 w-4" />
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

                        {/* Scroll anchor */}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="p-4 border-t">
                    <div className="flex gap-3">
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                      />
                      {/* Retell Voice Button - sends transcripts to chat */}
                      {/* Hide voice button when escalated (human-only mode) */}
                      {selectedConversation?.status !== "escalated" && !selectedConversation?.handover_required && (
                        <RetellChatVoiceButton
                          onUserTurnComplete={(text) => {
                            // Send user's complete voice message to the conversation
                            send(text).catch(console.error)
                          }}
                          onAgentTurnComplete={(text) => {
                            // Agent responses are shown in real-time via the voice
                            // Optionally log or track them
                            console.log("[Voice Agent Complete]", text)
                          }}
                          metadata={{
                            conversationId: selectedConversation?.id,
                            customerId: customerId,
                            subject: selectedConversation?.subject,
                          }}
                          dynamicVariables={{
                            customer_name: currentUser?.name || "Customer",
                            ticket_subject: selectedConversation?.subject || "Support request",
                            user_id: currentUser?.id || "",
                            userId: currentUser?.id || "",
                            profile_id: currentUser?.id || "",
                            customer_id: "",
                          }}
                        />
                      )}
                      <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleEscalate}
                        disabled={
                          !selectedConversation ||
                          escalating ||
                          selectedConversation?.status === "escalated" ||
                          !!selectedConversation?.handover_required
                        }
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {selectedConversation?.status === "escalated" || selectedConversation?.handover_required === true
                          ? "Escalated"
                          : escalating
                            ? "Escalating..."
                            : "Escalate"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-8 text-center">
                      {selectedConversation?.status === "escalated" || selectedConversation?.handover_required
                        ? "You're now connected with a human agent. Voice mode is disabled."
                        : <>AI will try to help first. Click <Mic className="h-3 w-3 inline" /> for voice, or &quot;Escalate&quot; to speak with a human.</>
                      }
                    </p>
                  </div>
                </>
              ) : (
                <CardContent className="flex-1 flex flex-col items-center justify-center text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Select a Ticket</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Choose a ticket from the list to view the conversation, or create a new ticket to get help.
                  </p>
                </CardContent>
              )}
            </Card>
          </div>
        </div>

        {/* Sidebar with AI widget - 1 column */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <AskAIBankerWidget
              questions={aiQuestions}
              description="Get quick answers to common support questions"
              quickHelpCards={quickHelpCards}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
