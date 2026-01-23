import { NextResponse } from "next/server"
import { createDirectClient } from "@/lib/supabase/direct-client"
import { generateForecasts } from "@/lib/forecasting/simple-forecast"
import { Transaction } from "@/lib/types"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId") || "4e140685-8f38-49ff-aae0-d6109c46873d" // Sarah Chen

  const supabase = createDirectClient()

  // Fetch last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("account.user_id", userId) // This might fail if we can't join easily without defined relation, better to query by account_ids
  
  // Alternative: fetch accounts first then transactions
  // Or just rely on the fact that for the demo user we fetch all accounts
  // Let's replicate the pattern from chat route: fetch accounts -> fetch txs
  
  const { data: accounts } = await supabase.from("accounts").select("id").eq("customer_id", userId)
  const accountIds = (accounts || []).map(a => a.id)

  if (accountIds.length === 0) {
     return NextResponse.json([])
  }

  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .in("account_id", accountIds)
    .gte("date", sixMonthsAgo.toISOString())
    .order("date", { ascending: false })

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 })
  }

  // Cast to Transaction type
  const typedTxs: Transaction[] = (transactions || []).map((t: any) => ({
    ...t,
    amount: Number(t.amount),
  }))

  const forecasts = generateForecasts(typedTxs)

  return NextResponse.json(forecasts)
}


