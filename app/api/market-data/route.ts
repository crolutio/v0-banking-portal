import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get("symbol")

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 })
  }

  try {
    const [chartRes, newsRes] = await Promise.all([
      fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5y&interval=1mo`,
        { next: { revalidate: 60 * 60 } } // cache for 1h
      ),
      fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=5`,
        { next: { revalidate: 15 * 60 } } // cache for 15m
      )
    ])

    let history: Array<{ label: string; price: number }> = []
    if (chartRes.ok) {
      const chartJson = await chartRes.json()
      const result = chartJson?.chart?.result?.[0]
      const timestamps: number[] = result?.timestamp || []
      const prices: number[] = result?.indicators?.adjclose?.[0]?.adjclose || []
      history = timestamps
        .map((ts, idx) => {
          const price = prices[idx]
          if (!price) return null
          const date = new Date(ts * 1000)
          return {
            label: `${date
              .toLocaleString("default", { month: "short" })
              .slice(0, 3)} ${date.getFullYear()}`,
            price,
            timestamp: ts
          }
        })
        .filter(Boolean) as Array<{ label: string; price: number; timestamp: number }>
    }

    let news: Array<{ title: string; source: string; link: string; published: number | null; summary?: string }> = []
    if (newsRes.ok) {
      const newsJson = await newsRes.json()
      news =
        newsJson?.news?.map((item: any) => ({
          title: item.title,
          source: item.publisher,
          link: item.link || item.url,
          published: item.providerPublishTime || item.published_at || null,
          summary: item.summary || item.description
        })) ?? []
    }

    return NextResponse.json({
      history,
      news
    })
  } catch (error) {
    console.error("Market data fetch failed:", error)
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 })
  }
}

