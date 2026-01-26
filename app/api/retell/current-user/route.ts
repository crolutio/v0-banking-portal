import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Helper to safely get a string value (handles null, undefined, empty)
function getString(value: unknown): string {
  if (value === null || value === undefined || value === "") return ""
  return String(value)
}

export async function POST(request: NextRequest) {
  try {
    // Log incoming request for debugging
    const headersProfileId = request.headers.get("x-profile-id")
    const headersCustomerId = request.headers.get("x-customer-id")
    const headersUserId = request.headers.get("x-user-id")

    let body: Record<string, unknown> = {}
    let args: Record<string, unknown> = {}
    try {
      const text = await request.text()
      console.log("[Retell API] Raw request body:", text?.substring(0, 500))
      if (text) {
        body = JSON.parse(text)
        
        // Handle both formats:
        // 1. Args only: { customer_id, profile_id }
        // 2. Full payload: { call_id, ..., args: { customer_id, profile_id } }
        //    or with retell_llm_dynamic_variables
        if (body.args && typeof body.args === "object") {
          // Full payload format - extract args
          args = body.args as Record<string, unknown>
          console.log("[Retell API] Extracted args from full payload:", JSON.stringify(args))
        } else if (body.retell_llm_dynamic_variables && typeof body.retell_llm_dynamic_variables === "object") {
          // Full payload with dynamic variables - use those
          args = body.retell_llm_dynamic_variables as Record<string, unknown>
          console.log("[Retell API] Using retell_llm_dynamic_variables:", JSON.stringify(args))
        } else {
          // Args only format
          args = body
          console.log("[Retell API] Using body directly as args")
        }
      }
    } catch (parseError) {
      console.log("[Retell API] Body parse error:", parseError)
      // empty body is fine
    }

    console.log("[Retell API] Final args:", JSON.stringify(args))
    console.log("[Retell API] Headers - profile_id:", headersProfileId, "customer_id:", headersCustomerId, "user_id:", headersUserId)

    // Extract values from args, handling null explicitly
    const customerId = getString(args.customer_id) || getString(headersCustomerId)
    const profileId =
      getString(args.profile_id) ||
      getString(args.user_id) ||
      getString(args.userId) ||
      getString(headersProfileId) ||
      getString(headersUserId)

    console.log("[Retell API] Resolved - customerId:", customerId, "profileId:", profileId)

    // If we have a customer_id directly, return it
    if (customerId) {
      const response = {
        profile_id: profileId || null,
        customer_id: customerId,
        source: "provided",
      }
      console.log("[Retell API] Returning provided customer_id:", response)
      return NextResponse.json(response)
    }

    // Need profileId to look up customer_id
    if (!profileId) {
      console.log("[Retell API] ERROR: No profileId or customerId found")
      return NextResponse.json(
        {
          error: "profile_id or customer_id is required",
          extracted_args: args,
          had_nested_args: !!body.args,
          had_dynamic_vars: !!body.retell_llm_dynamic_variables,
        },
        { status: 400 }
      )
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log("[Retell API] ERROR: Supabase not configured")
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    console.log("[Retell API] Looking up profile:", profileId)
    
    const { data, error } = await supabase
      .from("profiles")
      .select("id, customer_id, full_name, email")
      .eq("id", profileId)
      .maybeSingle()

    if (error) {
      console.error("[Retell API] Supabase error:", error)
      return NextResponse.json(
        { error: "Failed to resolve profile", details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      console.log("[Retell API] Profile not found for:", profileId)
      return NextResponse.json(
        { error: "Profile not found", profile_id: profileId },
        { status: 404 }
      )
    }

    const response = {
      profile_id: data.id,
      customer_id: data.customer_id,
      full_name: data.full_name,
      email: data.email,
      source: "profile_lookup",
    }
    console.log("[Retell API] SUCCESS:", response)
    return NextResponse.json(response)
  } catch (error) {
    console.error("[Retell API] Unexpected error:", error)
    return NextResponse.json(
      { error: "Failed to resolve current user", details: String(error) },
      { status: 500 }
    )
  }
}
