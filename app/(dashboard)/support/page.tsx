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
} from "lucide-react"
import type { DbConversation, DbMessage } from "@/lib/types"
import { useCustomerConversations } from "@/lib/hooks/useCustomerConversations"
import { useConversationMessages } from "@/lib/hooks/useConversationMessages"
import { createConversation, sendCustomerMessage } from "@/lib/supportApi"


export default function SupportPage() {
  const { currentUser } = useRole()
  const customerId = currentUser?.id
  
  const [selectedConversation, setSelectedConversation] = useState<DbConversation | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [newTicketDialog, setNewTicketDialog] = useState(false)
  const [newTicketSubject, setNewTicketSubject] = useState("")
  const [newTicketMessage, setNewTicketMessage] = useState("")
  const [newTicketPriority, setNewTicketPriority] = useState("medium")
  const [creating, setCreating] = useState(false)

  const { conversations, refresh } = useCustomerConversations({ 
    customerId: customerId || "" 
  })

  const { messages, send } = useConversationMessages({
    conversationId: selectedConversation?.id ?? null,
    customerId: customerId || "",
  })

  const handleSendMessage = async () => {
    if (!selectedConversation) return
    const trimmed = newMessage.trim()
    if (!trimmed) return

    try {
      await send(trimmed)
      setNewMessage("")
    } catch (e) {
      console.error("Failed to send message", e)
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
        channel: "app",
      })

      // select it immediately so message hook points at it
      setSelectedConversation(conv)

      // send first message
      await sendCustomerMessage({
        conversation_id: conv.id,
        sender_customer_id: customerId,
        content: firstMsg,
      })

      setNewTicketDialog(false)
      setNewTicketSubject("")
      setNewTicketMessage("")
      setNewTicketPriority("medium")

      // refresh the list
      await refresh()
    } catch (e) {
      console.error("Failed to create ticket", e)
    } finally {
      setCreating(false)
    }
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
    "What's the status of my support ticket?",
    "How can I contact customer service?",
    "What are your support hours?",
    "Help me with a banking issue",
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
              <Button onClick={handleSubmitTicket} disabled={creating}>
                {creating ? "Submitting..." : "Submit Ticket"}
              </Button>
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
                            {conv.status.replace("_", " ")}
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
            <Card className="lg:col-span-2 flex flex-col">
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
                        {selectedConversation.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((m) => {
                        const isUser = m.sender_type === "customer"
                        return (
                          <div
                            key={m.id}
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
                                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
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
                      <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
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
