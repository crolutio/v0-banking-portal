import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_BANKING_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_BANKING_SUPABASE_PUBLISHABLE_DEFAULT_KEY

export function createClient() {
  // #region agent log
  if (typeof window !== "undefined") {
    fetch("http://127.0.0.1:7243/ingest/416c505f-0f39-4083-9a11-a59f7ac8dac3", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "supabase/client.ts:7",
        message: "createClient",
        data: { supabaseUrl: SUPABASE_URL, hasAnonKey: !!SUPABASE_ANON_KEY },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run5",
        hypothesisId: "C",
      }),
    }).catch(() => {});
  }
  // #endregion
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing NEXT_PUBLIC_BANKING_SUPABASE_URL or NEXT_PUBLIC_BANKING_SUPABASE_PUBLISHABLE_DEFAULT_KEY")
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
