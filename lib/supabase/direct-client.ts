import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_BANKING_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_BANKING_SUPABASE_PUBLISHABLE_DEFAULT_KEY

// Direct client for API routes that bypasses cookie auth
export function createDirectClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing NEXT_PUBLIC_BANKING_SUPABASE_URL or NEXT_PUBLIC_BANKING_SUPABASE_PUBLISHABLE_DEFAULT_KEY")
  }
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}


