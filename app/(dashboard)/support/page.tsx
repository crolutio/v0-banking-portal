"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CitationBadge } from "@/components/ai/citation-badge"
import { useRole } from "@/lib/role-context"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
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
  Loader2,
} from "lucide-react"
import type { SupportTicket, SupportMessage } from "@/lib/types"

// Mock tickets
const mockTickets: SupportTicket[] = [
  {
    id: "ticket_1",
    userId: "user_retail_1",
    subject: "Issue with international transfer",
    status: "in_progress",
    priority: "high",
    createdAt: "2024-12-18T10:30:00Z",
    messages: [
      {
        id: "msg_1",
        sender: "user",
        content: "I tried to make an international transfer yesterday but it's still showing as pending. Can you help?",
        timestamp: "2024-12-18T10:30:00Z",
      },
      {
        id: "msg_2",
        sender: "ai",
        content:
          "I understand you're concerned about your pending international transfer. Let me check the status for you.\n\nI can see a transfer of AED 5,000 to GB*** initiated on December 17th. International transfers typically take 2-3 business days to complete.\n\nYour transfer is currently in the compliance verification stage, which is standard for international transactions. It should be completed by tomorrow.",
        timestamp: "2024-12-18T10:31:00Z",
        citations: [
          { id: "cit_1", source: "Transfer Status", type: "transaction_history" },
          { id: "cit_2", source: "International Transfer Policy", type: "policy" },
        ],
      },
      {
        id: "msg_3",
        sender: "user",
        content: "Thank you. What if it's not completed by tomorrow?",
        timestamp: "2024-12-18T10:32:00Z",
      },
      {
        id: "msg_4",
        sender: "ai",
        content:
          "If the transfer isn't completed by tomorrow, I recommend contacting our support team directly. However, delays beyond 3 business days are rare.\n\nIn the meantime, you can track the transfer status in real-time from your Payments page. Would you like me to escalate this to a human agent now?",
        timestamp: "2024-12-18T10:33:00Z",
        citations: [{ id: "cit_3", source: "Complaints Policy v1.1", type: "policy" }],
      },
    ],
  },
  {
    id: "ticket_2",
    userId: "user_retail_1",
    subject: "Request for credit limit increase",
    status: "resolved",
    priority: "medium",
    createdAt: "2024-12-15T14:20:00Z",
    messages: [
      {
        id: "msg_1",
        sender: "user",
        content: "I would like to request a credit limit increase on my Mastercard.",
        timestamp: "2024-12-15T14:20:00Z",
      },
      {
        id: "msg_2",
        sender: "agent",
        content:
          "Hi Sarah, I've reviewed your account and based on your excellent payment history, I'm happy to approve a credit limit increase from AED 50,000 to AED 75,000. The change will be effective within 24 hours.",
        timestamp: "2024-12-15T15:45:00Z",
      },
    ],
  },
  {
    id: "ticket_3",
    userId: "user_retail_1",
    subject: "Question about savings account interest",
    status: "open",
    priority: "low",
    createdAt: "2024-12-19T09:00:00Z",
    messages: [
      {
        id: "msg_1",
        sender: "user",
        content: "When is the interest credited to my savings account?",
        timestamp: "2024-12-19T09:00:00Z",
      },
    ],
  },
]

// AI auto-responses for self-serve
const aiAutoResponses: Record<string, { content: string; citations: SupportMessage["citations"] }> = {
  interest: {
    content:
      "Interest on your savings account is credited monthly, on the last business day of each month. For your account with a balance above AED 50,000, you're earning 3.5% p.a.\n\nYour last interest credit was AED 364.58 on November 30, 2024.",
    citations: [
      { id: "cit_1", source: "Savings Account Terms v1.5", type: "product_terms" },
      { id: "cit_2", source: "Account Statement", type: "transaction_history" },
    ],
  },
  fee: {
    content:
      "I can help explain any fees on your account. Could you please specify which fee you're asking about? Common fees include:\n\n• Monthly maintenance fee (AED 25)\n• International transfer fees (0.5%)\n• ATM withdrawal fees (varies)\n\nYou can also view all fees in the Fees & Policies section.",
    citations: [{ id: "cit_1", source: "Fees Policy v2.1", type: "policy" }],
  },
  card: {
    content:
      "I can help with card-related queries. Here are common topics:\n\n• Lost/stolen card - I can freeze your card immediately\n• Card limit changes - Available in Cards section\n• Card replacement - Takes 3-5 business days\n\nWhat would you like help with?",
    citations: [{ id: "cit_1", source: "Card Terms v3.0", type: "product_terms" }],
  },
}

export default function SupportPage() {
  const { role } = useRole()
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [newTicketDialog, setNewTicketDialog] = useState(false)
  const [newTicketSubject, setNewTicketSubject] = useState("")
  const [newTicketMessage, setNewTicketMessage] = useState("")
  const [newTicketPriority, setNewTicketPriority] = useState("medium")

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return

    setIsTyping(true)

    // Simulate AI response
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Check for AI auto-response keywords
    const lowerMessage = newMessage.toLowerCase()
    let aiResponse = null
    if (lowerMessage.includes("interest")) {
      aiResponse = aiAutoResponses.interest
    } else if (lowerMessage.includes("fee") || lowerMessage.includes("charge")) {
      aiResponse = aiAutoResponses.fee
    } else if (lowerMessage.includes("card")) {
      aiResponse = aiAutoResponses.card
    }

    setNewMessage("")
    setIsTyping(false)
  }

  const statusColors: Record<string, string> = {
    open: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  }

  const priorityColors: Record<string, string> = {
    low: "text-muted-foreground",
    medium: "text-yellow-600",
    high: "text-red-600",
  }

  // AI Banker questions relevant to support page
  const aiQuestions = [
    "How do I dispute a transaction?",
    "What's the status of my complaint?",
    "How do I contact customer service?",
    "What are your support hours?",
  ]

  return (
    <div className="space-y-6 p-6">
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
              <Button onClick={() => setNewTicketDialog(false)}>Submit Ticket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Help Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">AI Assistant</p>
              <p className="text-xs text-muted-foreground">Get instant answers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Call Us</p>
              <p className="text-xs text-muted-foreground">800-BANK-FUTURE</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Email</p>
              <p className="text-xs text-muted-foreground">support@bankfuture.com</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">FAQs</p>
              <p className="text-xs text-muted-foreground">Browse help articles</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content area - Support Interface - 3 columns */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* Ticket List */}
            <Card className="lg:col-span-1 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Your Tickets</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                  <div className="px-4 pb-4 space-y-2">
                    {mockTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTicket?.id === ticket.id ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm line-clamp-1">{ticket.subject}</p>
                          <Badge variant="outline" className={statusColors[ticket.status]}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                          <span className={priorityColors[ticket.priority]}>• {ticket.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Window */}
            <Card className="lg:col-span-2 flex flex-col">
              {selectedTicket ? (
                <>
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                        <CardDescription>
                          Ticket #{selectedTicket.id} • Created{" "}
                          {new Date(selectedTicket.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={statusColors[selectedTicket.status]}>
                        {selectedTicket.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {selectedTicket.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {message.sender !== "user" && (
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                message.sender === "ai" ? "bg-gradient-to-br from-primary to-primary/60" : "bg-muted"
                              }`}
                            >
                              {message.sender === "ai" ? (
                                <Bot className="h-4 w-4 text-primary-foreground" />
                              ) : (
                                <Headphones className="h-4 w-4" />
                              )}
                            </div>
                          )}

                          <div
                            className={`max-w-[80%] space-y-2 ${message.sender === "user" ? "items-end" : "items-start"}`}
                          >
                            <div
                              className={`rounded-2xl px-4 py-3 ${
                                message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            </div>

                            {message.citations && message.citations.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 px-1">
                                {message.citations.map((citation) => (
                                  <CitationBadge key={citation.id} citation={citation} />
                                ))}
                              </div>
                            )}

                            <p className="text-xs text-muted-foreground px-1">
                              {new Date(message.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>

                          {message.sender === "user" && (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      ))}

                      {isTyping && (
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
                    </div>
                  </ScrollArea>

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
                      <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isTyping}>
                        {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Escalate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      AI will try to help first. Click "Escalate" to speak with a human agent.
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
            <AskAIBankerWidget questions={aiQuestions} description="Get quick answers to common support questions" />
          </div>
        </div>
      </div>
    </div>
  )
}
