import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_BANKING_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_BANKING_SUPABASE_ANON_KEY

export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }
  // Hardcoded for debugging to ensure no env var issues
  return createSupabaseClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    }
  )
}
