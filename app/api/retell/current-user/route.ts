import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request: NextRequest) {
  try {
    const headersProfileId = request.headers.get("x-profile-id")
    const headersCustomerId = request.headers.get("x-customer-id")
    const headersUserId = request.headers.get("x-user-id")

    let body: {
      profile_id?: string
      customer_id?: string
      user_id?: string
      userId?: string
    } = {}
    try {
      body = await request.json()
    } catch {
      // empty body is fine
    }

    const customerId = body.customer_id || headersCustomerId || ""
    const profileId =
      body.profile_id || body.user_id || body.userId || headersProfileId || headersUserId || ""

    if (customerId) {
      return NextResponse.json({
        profile_id: profileId || null,
        customer_id: customerId,
        source: "provided",
      })
    }

    if (!profileId) {
      return NextResponse.json(
        { error: "profile_id or customer_id is required" },
        { status: 400 }
      )
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await supabase
      .from("profiles")
      .select("id, customer_id, full_name, email")
      .eq("id", profileId)
      .maybeSingle()

    if (error) {
      console.error("[Retell] Failed to resolve profile:", error)
      return NextResponse.json(
        { error: "Failed to resolve profile" },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      profile_id: data.id,
      customer_id: data.customer_id,
      full_name: data.full_name,
      email: data.email,
      source: "profile_lookup",
    })
  } catch (error) {
    console.error("[Retell] Error resolving current user:", error)
    return NextResponse.json(
      { error: "Failed to resolve current user" },
      { status: 500 }
    )
  }
}
