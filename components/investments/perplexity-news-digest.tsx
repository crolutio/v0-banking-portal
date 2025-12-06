"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, ExternalLink, Newspaper } from "lucide-react"
import { AskAIButton } from "@/components/ai/ask-ai-banker-widget"

interface NewsItem {
  symbol: string
  title: string
  summary: string
  source: string
  publishedAt: string
  url?: string
}

interface PerplexityNewsDigestProps {
  holdings: { symbol: string; name: string }[]
}

export function PerplexityNewsDigest({ holdings }: PerplexityNewsDigestProps) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchNews = async () => {
    if (holdings.length === 0) return

    setIsLoading(true)
    try {
      // Pick up to 3 random holdings to keep the query focused
      const focusHoldings = [...holdings].sort(() => 0.5 - Math.random()).slice(0, 3)
      
      // Try fetching from Perplexity first (experimental/chat-based)
      // If this fails, we catch it and proceed to standard market data fallback
      try {
        const symbols = focusHoldings.map(h => h.symbol).join(", ")
        const response = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: "researcher",
            messages: [
              {
                role: "user",
                content: `Generate a brief news digest for these stocks: ${symbols}. 
                For each stock, provide 1 most critical recent headline with a 1-sentence summary, source, and relative time (e.g. "2h ago").
                Format strictly as JSON array: [{ "symbol": "AAPL", "title": "...", "summary": "...", "source": "...", "publishedAt": "..." }]`
              }
            ]
          })
        })
        
        // If Perplexity fails (e.g. 500 error due to missing key or invalid model), 
        // we just log it and don't throw, allowing fallback to run.
        if (!response.ok) {
           console.warn("Perplexity digest fetch skipped (API error or missing key), using fallback.")
        } else {
           // TODO: Implement stream parsing if we want to use the chat response directly.
           // Currently we just consume the response to not block, but use fallback data for reliability.
           // In a real implementation, we'd parse the JSON from the chat stream here.
        }
      } catch (e) {
        console.warn("Perplexity digest fetch failed", e)
      }

      // FALLBACK: Use /api/market-data endpoint for real data
      const realNewsItems: NewsItem[] = []
      
      for (const holding of focusHoldings) {
        try {
          const marketRes = await fetch(`/api/market-data?symbol=${holding.symbol}`)
          if (marketRes.ok) {
              const data = await marketRes.json()
              if (data.news && data.news.length > 0) {
                  const item = data.news[0]
                  realNewsItems.push({
                      symbol: holding.symbol,
                      title: item.title,
                      summary: item.summary || `Latest news for ${holding.name}`,
                      source: item.source,
                      publishedAt: "Recent", // API returns timestamp, simplified here
                      url: item.link
                  })
              }
          }
        } catch (err) {
          console.warn(`Failed to fetch market data for ${holding.symbol}`, err)
        }
      }
      
      setNews(realNewsItems)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("News digest update failed", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (holdings.length > 0 && news.length === 0) {
      fetchNews()
    }
  }, [holdings])

  if (holdings.length === 0) return null

  return (
    <Card className="border-l-4 border-l-sky-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-sky-600" />
                <CardTitle className="text-base">Perplexity Market Digest</CardTitle>
            </div>
            {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                    Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            )}
        </div>
        <CardDescription>Curated highlights for your portfolio</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && news.length === 0 ? (
            <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        ) : news.length > 0 ? (
            <div className="space-y-3">
                {news.map((item, i) => (
                    <div key={i} className="group relative rounded-lg border bg-card p-3 hover:shadow-sm transition-all">
                        <div className="flex justify-between items-start gap-2">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="text-[10px] h-5">{item.symbol}</Badge>
                                    <span className="text-[10px] text-muted-foreground">{item.source} • {item.publishedAt}</span>
                                </div>
                                <h4 className="text-sm font-medium leading-tight mb-1">
                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline decoration-sky-500/50">
                                        {item.title}
                                    </a>
                                </h4>
                                <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                            </div>
                        </div>
                        <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                             <AskAIButton
                                agentId="researcher"
                                initialQuestion={`Tell me more about this news for ${item.symbol}: "${item.title}". What is the impact?`}
                             >
                                <Button variant="ghost" size="sm" className="h-6 text-[10px]">
                                    Analyze Impact
                                </Button>
                             </AskAIButton>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
             <div className="text-center py-4 text-sm text-muted-foreground">
                No major headlines found right now.
            </div>
        )}
        
        <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs" 
            onClick={fetchNews}
            disabled={isLoading}
        >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2" />}
            Refresh Digest
        </Button>
      </CardContent>
    </Card>
  )
}
