import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_CALL_CENTER_SUPABASE_URL
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_CALL_CENTER_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_CALL_CENTER_SUPABASE_PUBLISHABLE_DEFAULT_KEY

let cachedClient: SupabaseClient<any> | null = null

export function createCallCenterClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_CALL_CENTER_SUPABASE_URL or NEXT_PUBLIC_CALL_CENTER_SUPABASE_ANON_KEY"
    )
  }
  if (cachedClient) return cachedClient
  cachedClient = createSupabaseClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  return cachedClient
}
