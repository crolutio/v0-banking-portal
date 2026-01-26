"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useChat } from "ai/react"
import type { Message } from "ai"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useFloatingChat } from "@/components/ai/floating-chat-context"
import { LoanApprovalCard, OptimizationResultCard, SuspiciousTransactionsCard } from "@/components/ai/special-cards"
import { DisputeConfirmationCard } from "@/components/ai/special-cards/DisputeConfirmationCard"
import { AI_AGENT_PERSONAS, type AIAgentId } from "@/lib/ai/agents"
import { useRole } from "@/lib/role-context"
import {
  Send,
  User,
  Loader2,
  Minimize2,
  FileText,
  Minimize,
  MessageSquare,
  Maximize,
  X,
  Square,
  Mic,
  MicOff,
  Phone
} from "lucide-react"
import { useRetellVoice } from "@/lib/hooks/useRetellVoice"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts"
import Image from "next/image"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTheme } from "next-themes"
import { Card } from "@/components/ui/card"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

const ChartRenderer = ({ data }: { data: any }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  if (!data || !data.data || data.data.length === 0) return null

  if (data.type === 'bar') {
    return (
      <div className="w-full h-[200px] mt-2 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted-foreground/20" />
            <XAxis 
              dataKey="name" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              className={isDark ? "fill-white" : "fill-foreground"}
              tick={{ fill: isDark ? '#ffffff' : undefined }}
            />
            <YAxis 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              className={isDark ? "fill-white" : "fill-foreground"}
              tick={{ fill: isDark ? '#ffffff' : undefined }}
            />
            <RechartsTooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))',
                color: isDark ? '#ffffff' : 'hsl(var(--foreground))',
                borderRadius: '8px',
                padding: '8px'
              }} 
              labelStyle={{ color: isDark ? '#ffffff' : 'hsl(var(--foreground))' }}
            />
            <Bar 
              dataKey="value" 
              fill={isDark ? '#9ca3af' : 'hsl(var(--primary))'} 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
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
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return null
}

const FormattedText = ({ text }: { text: string }) => {
  // Enhanced regex to handle category:value patterns, numbered lists, and markdown
  // Split by markdown patterns, newlines, and numbered lists
  const parts = text.split(/(\*\*.*?\*\*|\n|\*\s|\d+\.\s|([A-Z][a-zA-Z\s]+):\s*\d+)/g)
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (!part) return null
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>
        }
        if (part === "\n") {
          return <br key={i} />
        }
        if (part === "* ") {
          return <span key={i}>• </span>
        }
        // Handle numbered lists (e.g., "1. ", "2. ")
        const numberedListMatch = part.match(/^(\d+)\.\s?(.*)$/)
        if (numberedListMatch) {
          return (
            <span key={i}>
              {numberedListMatch[1]}. {numberedListMatch[2]}
            </span>
          )
        }
        // Handle "Category: number" patterns - make category bold
        const categoryMatch = part.match(/^([A-Z][a-zA-Z\s]+):\s*(\d+.*)$/)
        if (categoryMatch) {
          return (
            <span key={i}>
              <strong className="font-bold text-foreground">{categoryMatch[1]}</strong>: {categoryMatch[2]}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

// Table renderer component
const TableRenderer = ({ markdown, isFullscreen }: { markdown: string; isFullscreen: boolean }) => {
  const [showDialog, setShowDialog] = useState(false)
  
  // Parse markdown table - more robust parsing
  const lines = markdown.trim().split('\n').filter(line => line.trim() && line.trim().startsWith('|'))
  if (lines.length < 2) return null // Need at least header and one data row
  
  // Find separator line (contains dashes and pipes) - but don't require it
  let separatorIndex = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('|') && line.includes('-') && /^[\|\s\-:]+$/.test(line)) {
      separatorIndex = i
      break
    }
  }
  
  // If no separator found, treat first line as header
  let headerLineIndex = 0
  let dataStartIndex = 1
  
  if (separatorIndex !== -1 && separatorIndex > 0) {
    headerLineIndex = 0
    dataStartIndex = separatorIndex + 1
  } else if (separatorIndex === -1) {
    // No separator line, first line is header, rest are data
    headerLineIndex = 0
    dataStartIndex = 1
  } else {
    return null // Separator at position 0 doesn't make sense
  }
  
  // Parse headers
  const headerLine = lines[headerLineIndex].trim()
  const headers = headerLine.split('|').map(h => h.trim()).filter(h => h.length > 0)
  
  if (headers.length === 0) return null
  
  // Parse data rows
  const rows = lines.slice(dataStartIndex)
    .map(line => {
      const cells = line.trim().split('|').map(cell => cell.trim()).filter(cell => cell.length > 0)
      return cells.length > 0 ? cells : null
    })
    .filter(row => row !== null && row.length > 0) as string[][]
  
  // Ensure all rows have the same number of columns as headers
  const numCols = headers.length
  const normalizedRows = rows.map(row => {
    const normalized = [...row]
    while (normalized.length < numCols) {
      normalized.push('')
    }
    return normalized.slice(0, numCols)
  })
  
  if (normalizedRows.length === 0) return null
  
  const TableContent = () => (
    <Card className="my-4 p-4 shadow-lg border-2 bg-card">
      <div className="overflow-x-scroll" style={{ scrollbarWidth: 'thin', overflowX: 'scroll' }}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {headers.map((header, idx) => (
                <TableHead key={idx} className="font-semibold">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {normalizedRows.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                {row.map((cell, cellIdx) => (
                  <TableCell key={cellIdx}>
                    {cell || '\u00A0'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
  
  // If not in fullscreen, show button to open dialog
  if (!isFullscreen) {
    return (
      <>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowDialog(true)}
          className="mt-2"
        >
          <FileText className="h-4 w-4 mr-2" />
          View Table ({normalizedRows.length} rows)
        </Button>
        {showDialog && (
          <div 
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setShowDialog(false)}
          >
            <Card 
              className="max-w-4xl w-full max-h-[80vh] flex flex-col shadow-2xl border-2 animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Table View</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowDialog(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 overflow-auto">
                <div className="overflow-x-scroll" style={{ scrollbarWidth: 'thin', overflowX: 'scroll' }}>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        {headers.map((header, idx) => (
                          <TableHead key={idx} className="font-semibold">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {normalizedRows.map((row, rowIdx) => (
                        <TableRow key={rowIdx}>
                          {row.map((cell, cellIdx) => (
                            <TableCell key={cellIdx}>
                              {cell || '\u00A0'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </div>
        )}
      </>
    )
  }
  
  // In fullscreen, show table directly
  return <TableContent />
}

const MessageContent = ({ content, isFullscreen = false }: { content: string; isFullscreen?: boolean }) => {
  // First, check for tables in the entire content (before splitting by code blocks)
  // This ensures tables are detected even if they're mixed with other content
  // More robust approach: find all consecutive lines that look like table rows
  
  const allTableMatches: Array<{ content: string, index: number }> = []
  
  // Split content into lines for better table detection
  const lines = content.split('\n')
  let currentTableStart = -1
  let currentTableLines: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const startsWithPipe = line.startsWith('|')
    const hasMultiplePipes = line.split('|').length >= 3 // At least 2 columns (3 parts when split)
    const isSeparatorLine = startsWithPipe && /^[\|\s\-:]+$/.test(line) && line.includes('-')
    
    if (startsWithPipe && (hasMultiplePipes || isSeparatorLine)) {
      // This looks like a table row
      if (currentTableStart === -1) {
        currentTableStart = i
        currentTableLines = [line]
      } else {
        currentTableLines.push(line)
      }
    } else {
      // Not a table row - if we were building a table, save it
      if (currentTableStart !== -1 && currentTableLines.length >= 1) {
        // Check if it's a valid table (has at least 2 rows, or 1 row with separator)
        const hasSeparator = currentTableLines.some(l => /^[\|\s\-:]+$/.test(l) && l.includes('-'))
        if (currentTableLines.length >= 2 || (hasSeparator && currentTableLines.length >= 1)) {
          // Calculate the original index in the content
          let index = 0
          for (let j = 0; j < currentTableStart; j++) {
            index += lines[j].length + 1 // +1 for newline
          }
          const tableContent = currentTableLines.join('\n')
          allTableMatches.push({ content: tableContent, index })
        }
        currentTableStart = -1
        currentTableLines = []
      }
    }
  }
  
  // Handle table at the end of content
  if (currentTableStart !== -1 && currentTableLines.length >= 1) {
    const hasSeparator = currentTableLines.some(l => /^[\|\s\-:]+$/.test(l) && l.includes('-'))
    if (currentTableLines.length >= 2 || (hasSeparator && currentTableLines.length >= 1)) {
      let index = 0
      for (let j = 0; j < currentTableStart; j++) {
        index += lines[j].length + 1
      }
      const tableContent = currentTableLines.join('\n')
      allTableMatches.push({ content: tableContent, index })
    }
  }
  
  // Sort by index to maintain order
  allTableMatches.sort((a, b) => a.index - b.index)
  
  // Split by code blocks first, then check for tables in remaining text
  const codeBlockRegex = /```(?:chart|loan-approval|optimization|dispute-confirmation|suspicious-transactions|table)[\s\S]*?```/g
  const codeBlocks: Array<{ type: 'code' | 'text', content: string, index: number }> = []
  let lastIndex = 0
  let match
  
  // Find all code blocks
  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      codeBlocks.push({ type: 'text', content: content.slice(lastIndex, match.index), index: lastIndex })
    }
    codeBlocks.push({ type: 'code', content: match[0], index: match.index })
    lastIndex = codeBlockRegex.lastIndex
  }
  if (lastIndex < content.length) {
    codeBlocks.push({ type: 'text', content: content.slice(lastIndex), index: lastIndex })
  }

  // Process each part
  const processedParts: Array<{ type: 'code' | 'text' | 'table', content: string, index: number }> = []
  
  for (const block of codeBlocks) {
    if (block.type === 'code') {
      processedParts.push(block)
    } else {
      // Check if this text block contains any of the detected tables
      const tablesInBlock = allTableMatches.filter(t => 
        t.index >= block.index && t.index < block.index + block.content.length
      )
      
      if (tablesInBlock.length > 0) {
        let textStart = 0
        for (const table of tablesInBlock) {
          const relativeTableIndex = table.index - block.index
          if (relativeTableIndex > textStart) {
            const textBefore = block.content.slice(textStart, relativeTableIndex)
            // Remove any remaining pipe-separated lines that look like table rows
            const cleanedText = textBefore.split('\n').filter(line => {
              const trimmed = line.trim()
              // Don't filter out lines that are clearly not table rows
              if (!trimmed.startsWith('|')) return true
              // Filter out lines that look like table rows (have multiple pipes)
              const pipeCount = trimmed.split('|').length - 1
              return pipeCount < 2
            }).join('\n')
            if (cleanedText.trim()) {
              processedParts.push({ 
                type: 'text', 
                content: cleanedText, 
                index: block.index + textStart 
              })
            }
          }
          processedParts.push({ 
            type: 'table', 
            content: table.content, 
            index: table.index 
          })
          textStart = relativeTableIndex + table.content.length
        }
        if (textStart < block.content.length) {
          const textAfter = block.content.slice(textStart)
          // Remove any remaining pipe-separated lines that look like table rows
          const cleanedText = textAfter.split('\n').filter(line => {
            const trimmed = line.trim()
            // Don't filter out lines that are clearly not table rows
            if (!trimmed.startsWith('|')) return true
            // Filter out lines that look like table rows (have multiple pipes)
            const pipeCount = trimmed.split('|').length - 1
            return pipeCount < 2
          }).join('\n')
          if (cleanedText.trim()) {
            processedParts.push({ 
              type: 'text', 
              content: cleanedText, 
              index: block.index + textStart 
            })
          }
        }
      } else {
        // No tables in this block, but still filter out any stray table rows
        const cleanedContent = block.content.split('\n').filter(line => {
          const trimmed = line.trim()
          if (!trimmed.startsWith('|')) return true
          const pipeCount = trimmed.split('|').length - 1
          return pipeCount < 2
        }).join('\n')
        if (cleanedContent.trim()) {
          processedParts.push({ 
            type: 'text', 
            content: cleanedContent, 
            index: block.index 
          })
        }
      }
    }
  }

  return (
    <div className="text-sm space-y-2 break-words overflow-wrap-anywhere">
      {processedParts.map((part, i) => {
        // Render tables
        if (part.type === 'table') {
          return <TableRenderer key={i} markdown={part.content} isFullscreen={isFullscreen} />
        }
        
        // Render code blocks
        if (part.type === 'code') {
          if (part.content.startsWith("```chart")) {
            try {
              const jsonStr = part.content.replace(/^```chart\s*/, "").replace(/```$/, "")
              const chartData = JSON.parse(jsonStr)
              return <ChartRenderer key={i} data={chartData} />
            } catch (e) {
              return null
            }
          }
          
          if (part.content.startsWith("```loan-approval")) {
            try {
              const jsonStr = part.content.replace(/^```loan-approval\s*/, "").replace(/```$/, "")
              const loanData = JSON.parse(jsonStr)
              return <LoanApprovalCard key={i} data={loanData} />
            } catch (e) {
              return null
            }
          }
          
          if (part.content.startsWith("```optimization")) {
            try {
              const jsonStr = part.content.replace(/^```optimization\s*/, "").replace(/```$/, "")
              const optimizationData = JSON.parse(jsonStr)
              return <OptimizationResultCard key={i} data={optimizationData} />
            } catch (e) {
              return null
            }
          }
          
          if (part.content.startsWith("```dispute-confirmation")) {
            try {
              const jsonStr = part.content.replace(/^```dispute-confirmation\s*/, "").replace(/```$/, "")
              const disputeData = JSON.parse(jsonStr)
              return <DisputeConfirmationCard key={i} data={disputeData} />
            } catch (e) {
              return null
            }
          }
          
          if (part.content.startsWith("```suspicious-transactions")) {
            try {
              const jsonStr = part.content.replace(/^```suspicious-transactions\s*/, "").replace(/```$/, "")
              const suspiciousData = JSON.parse(jsonStr)
              return <SuspiciousTransactionsCard key={i} data={suspiciousData} />
            } catch (e) {
              return null
            }
          }
        }
        
        // Render text with formatting
        return <FormattedText key={i} text={part.content} />
      })}
    </div>
  )
}

const suggestedPrompts = [
  "I want to take a loan for my Japan trip",
  "Request a new loan for 50,000 AED",
  "Show me a payment schedule for a 3-year loan",
  "Analyze my spending and find savings opportunities",
  "I'm traveling to London next week",
  "Review suspicious transactions",
]

export function FloatingChatBubble() {
  const pathname = usePathname()
  const { currentUser, currentBankingUserId } = useRole()
  const { theme } = useTheme()
  const { chatState, agentId, initialMessage, closeChat, minimizeChat, normalizeChat, toggleFullscreen } = useFloatingChat()
  const persona = AI_AGENT_PERSONAS[agentId] ?? AI_AGENT_PERSONAS.banker
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastSentMessageRef = useRef<string>("")
  const previousStateRef = useRef<string>(chatState)

  const { messages, input, handleInputChange, handleSubmit, isLoading, append, stop, setMessages } = useChat({
    api: "/api/chat",
    id: `floating-chat-${agentId}`, // Stable ID for persistence across pages
    body: {
      userId: currentUser?.id,
      agentId,
      currentPage: pathname, // Send current page context
    },
  })

  // Retell Voice Integration
  const messagesRef = useRef(messages)
  const voiceStartIndexRef = useRef<number | null>(null)
  const voiceCallIdRef = useRef<string | null>(null)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])
  
  const {
    isConnected: isVoiceConnected,
    isConnecting: isVoiceConnecting,
    isSpeaking,
    transcript,
    callId,
    toggleCall,
    endCall,
  } = useRetellVoice({
    dynamicVariables: {
      customer_name: currentUser?.name || "Customer",
      user_id: currentBankingUserId || "",
      userId: currentBankingUserId || "",
      customer_id: currentBankingUserId || "",
      profile_id: currentUser?.id || "",
    },
    metadata: {
      userId: currentUser?.id,
      customerId: currentBankingUserId,
      agentId,
      currentPage: pathname,
    },
    onCallStart: (newCallId) => {
      voiceStartIndexRef.current = messagesRef.current.length
      voiceCallIdRef.current = newCallId
      if (isLoading) {
        stop()
      }
    },
    onCallEnd: () => {
      voiceStartIndexRef.current = null
      voiceCallIdRef.current = null
    },
  })

  useEffect(() => {
    if (!isVoiceConnected) return

    const baseIndex = voiceStartIndexRef.current ?? messagesRef.current.length
    const baseMessages = messagesRef.current.slice(0, baseIndex)
    const voiceIdBase = voiceCallIdRef.current ?? callId ?? "active"

    const voiceMessages: Message[] = transcript.map((msg, index) => ({
      id: `retell-${voiceIdBase}-${index}`,
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }))

    setMessages([...baseMessages, ...voiceMessages])
  }, [transcript, isVoiceConnected, setMessages, callId])

  // Auto-send initial message if provided and it's different from the last one
  useEffect(() => {
    if (initialMessage && initialMessage !== lastSentMessageRef.current) {
      lastSentMessageRef.current = initialMessage
      append({
        role: 'user',
        content: initialMessage
      })
    }
  }, [initialMessage, append])

  // Reset last message ref when minimized
  useEffect(() => {
    if (chatState === "minimized") {
      lastSentMessageRef.current = ""
    }
  }, [chatState])

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const userHasScrolledRef = useRef(false)

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })
  }

  // Check if user is at bottom of scroll area
  const checkIfAtBottom = () => {
    const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollArea) return true
    
    const threshold = 50 // pixels from bottom
    const isAtBottom = scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight < threshold
    
    // If user scrolled to bottom, resume autoscroll
    if (isAtBottom && userHasScrolledRef.current) {
      userHasScrolledRef.current = false
      shouldAutoScrollRef.current = true
    }
    // If user scrolled away from bottom, disable autoscroll
    else if (!isAtBottom && !userHasScrolledRef.current) {
      userHasScrolledRef.current = true
      shouldAutoScrollRef.current = false
    }
    
    return isAtBottom
  }

  // Auto-scroll on new messages only if user hasn't manually scrolled up
  useEffect(() => {
    if (shouldAutoScrollRef.current && !userHasScrolledRef.current) {
      scrollToBottom()
    }
  }, [messages])

  // Scroll to bottom when toggling fullscreen or opening from minimized
  useEffect(() => {
    const prevState = previousStateRef.current
    const isTogglingFullscreen = 
      (prevState === "normal" && chatState === "fullscreen") ||
      (prevState === "fullscreen" && chatState === "normal")
    
    // Scroll if coming from minimized OR toggling fullscreen
    if ((prevState === "minimized" && chatState !== "minimized") || isTogglingFullscreen) {
      shouldAutoScrollRef.current = true
      userHasScrolledRef.current = false
      // Scroll immediately without delay so user doesn't see the animation
      scrollToBottom()
    }
  }, [chatState])

  const handleSuggestedPrompt = async (prompt: string) => {
    await append({ role: 'user', content: prompt })
  }

  // Track previous state - must be before any conditional returns
  const isFullscreen = chatState === "fullscreen"
  const wasMinimized = previousStateRef.current === "minimized"
  
  // Update previous state
  useEffect(() => {
    previousStateRef.current = chatState
  }, [chatState])

  // Determine minimize animation based on previous state
  const getMinimizeAnimation = () => {
    const prevState = previousStateRef.current
    if (prevState === "normal") {
      return "animate-in fade-in slide-in-from-left-full zoom-in-50 duration-500"
    }
    if (prevState === "fullscreen") {
      return "animate-in fade-in zoom-in-0 duration-700"
    }
    return "animate-in fade-in zoom-in duration-500"
  }

  // Minimized state - small floating bubble in corner
  if (chatState === "minimized") {
    return (
      <div 
        key={`minimized-${previousStateRef.current}`}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          getMinimizeAnimation()
        )}
      >
        <Button
          size="lg"
          className="h-16 w-16 rounded-full shadow-2xl bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-110 hover:shadow-primary/50"
          onClick={normalizeChat}
        >
          <MessageSquare className="h-8 w-8 text-white" strokeWidth={2.5} />
        </Button>
        {messages.length > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-7 w-7 flex items-center justify-center rounded-full bg-primary text-white text-xs font-bold border-2 border-white shadow-lg"
          >
            {messages.filter(m => m.role === 'assistant').length}
          </Badge>
        )}
      </div>
    )
  }

  // Normal state - wider chat on right side
  
  // Determine animation class based on state transition
  const getAnimationClass = () => {
    const prevState = previousStateRef.current
    
    // Entering from minimized
    if (prevState === "minimized" && chatState === "normal") {
      return "animate-in fade-in slide-in-from-bottom-8 zoom-in-95 duration-700"
    }
    
    // Entering fullscreen
    if (prevState === "normal" && chatState === "fullscreen") {
      return "animate-in fade-in zoom-in-90 duration-500"
    }
    
    // Exiting fullscreen (zoom out effect)
    if (prevState === "fullscreen" && chatState === "normal") {
      return "animate-in fade-in zoom-in-90 duration-500"
    }
    
    return ""
  }
  
  return (
    <>
      {/* Blur backdrop for fullscreen */}
      {isFullscreen && (
        <div 
          key="backdrop"
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in duration-300"
          onClick={toggleFullscreen}
        />
      )}
      
      <div 
        key={`${chatState}-${previousStateRef.current}`} // Key to trigger animation on state change
        className={cn(
          "fixed shadow-2xl bg-background border flex flex-col z-50",
          isFullscreen ? "rounded-2xl" : "rounded-t-2xl",
          getAnimationClass()
        )}
        style={{
          bottom: isFullscreen ? "2.5vh" : "0",
          right: isFullscreen ? "2.5vw" : "1.5rem",
          top: isFullscreen ? "2.5vh" : "auto",
          width: isFullscreen ? "95vw" : "600px",
          height: isFullscreen ? "95vh" : "600px",
          transition: "all 0.5s ease-in-out",
        }}
      >
      {/* Header */}
      <div 
        className={cn("flex items-center justify-between px-4 py-3 border-b bg-primary/5", isFullscreen ? "rounded-t-2xl" : "rounded-t-2xl")}
      >
        <div className="flex items-center gap-3">
          <Image
            src={theme === "light" ? "/aideology-head-white.webp" : "/aideology-head.png"}
            alt="Aideology"
            width={40}
            height={40}
            className="object-contain"
          />
          <div>
            <h3 className="text-sm font-semibold">{persona.title}</h3>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 transition-transform duration-200 hover:scale-110 active:scale-95"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 transition-transform duration-200 hover:scale-110 active:scale-95"
            onClick={minimizeChat}
            title="Minimize to bubble"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea 
        ref={scrollAreaRef}
        className="flex-1 px-4 min-h-0"
        onScrollCapture={checkIfAtBottom}
      >
        <div className="py-4 space-y-6">
          {!messages || messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center mb-4 shadow-sm bg-primary"
              >
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">How can I help you today?</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md px-4">
                I can help you check balances, explain fees, make transfers, and more. All my answers include
                citations so you know where the information comes from.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg px-4">
                {suggestedPrompts.slice(0, 4).map((prompt, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer py-2 px-3 text-xs border-primary text-primary hover:bg-primary/10 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-sm"
                    onClick={() => handleSuggestedPrompt(prompt)}
                  >
                    {prompt}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div className={cn("max-w-[85%] space-y-1", message.role === "user" ? "items-end" : "items-start")}>
                    <span className={cn("text-xs font-medium text-muted-foreground px-1", message.role === "user" ? "text-right" : "text-left")}>
                      {message.role === "user" ? "You" : "AI Banker"}
                    </span>
                    <div
                      className={cn(
                        "rounded-2xl px-4 break-words overflow-hidden",
                        message.role === "user" ? "bg-primary text-white" : "bg-muted/30",
                        isFullscreen ? "py-4" : "py-2"
                      )}
                      style={{ maxWidth: '100%', wordWrap: 'break-word' }}
                    >
                      <MessageContent content={message.content} isFullscreen={chatState === "fullscreen"} />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {isLoading && (
            <div className="flex gap-3">
              <div className="bg-muted/30 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-background">
        {/* Voice Call Status Banner */}
        {isVoiceConnected && (
          <div className="mb-3 flex items-center justify-between bg-primary/10 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2.5 h-2.5 rounded-full",
                isSpeaking ? "bg-yellow-500 animate-pulse" : "bg-green-500"
              )} />
              <span className="text-sm font-medium">
                {isSpeaking ? "AI is speaking..." : "Listening to you..."}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={endCall}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Phone className="h-4 w-4 mr-1" />
              End Call
            </Button>
          </div>
        )}
        
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 items-center"
        >
          <Input
            placeholder={isVoiceConnected ? "Voice call active..." : "Type your message..."}
            value={input || ""}
            onChange={handleInputChange}
            className="flex-1"
            disabled={isVoiceConnected}
          />
          
          {/* Voice Button */}
          <Button
            type="button"
            variant={isVoiceConnected ? "default" : "outline"}
            size="icon"
            className={cn(
              "shrink-0 transition-all duration-200",
              isVoiceConnected && "bg-red-500 hover:bg-red-600",
              isVoiceConnecting && "animate-pulse"
            )}
            onClick={toggleCall}
            disabled={isVoiceConnecting || isLoading}
            title={isVoiceConnected ? "End voice call" : "Start voice call"}
          >
            {isVoiceConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isVoiceConnected ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          
          {/* Send Button */}
          <Button 
            type={isLoading ? "button" : "submit"}
            disabled={(!input?.trim() && !isLoading) || isVoiceConnected} 
            className="bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={isLoading ? (e) => {
              e.preventDefault()
              stop()
            } : undefined}
          >
            {isLoading ? <Square className="h-4 w-4 fill-current" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
    </>
  )
}

