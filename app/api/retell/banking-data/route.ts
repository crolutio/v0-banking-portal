import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Helper to safely get string value from various input types
function getString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_BANKING_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_BANKING_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// Allowed query types to prevent arbitrary SQL execution
const ALLOWED_QUERIES = [
  "accounts",
  "transactions",
  "cards",
  "loans",
  "savings_goals",
  "investments",
  "spending_summary",
] as const;

type QueryType = (typeof ALLOWED_QUERIES)[number];

export async function POST(request: NextRequest) {
  console.log("[Banking Data API] Received request");

  try {
    // Parse the request body
    let body: Record<string, unknown> = {};
    let args: Record<string, unknown> = {};

    try {
      const text = await request.text();
      console.log(
        "[Banking Data API] Raw request body:",
        text?.substring(0, 500)
      );

      if (text) {
        body = JSON.parse(text);

        // Handle Retell's full payload format
        if (body.args && typeof body.args === "object") {
          args = body.args as Record<string, unknown>;
          console.log(
            "[Banking Data API] Extracted args from full payload:",
            JSON.stringify(args)
          );
        } else if (
          body.retell_llm_dynamic_variables &&
          typeof body.retell_llm_dynamic_variables === "object"
        ) {
          args = body.retell_llm_dynamic_variables as Record<string, unknown>;
          console.log(
            "[Banking Data API] Using retell_llm_dynamic_variables:",
            JSON.stringify(args)
          );
        } else {
          args = body;
          console.log("[Banking Data API] Using body directly as args");
        }
      }
    } catch (parseError) {
      console.log("[Banking Data API] Body parse error:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Extract parameters
    const customerId =
      getString(args.customer_id) ||
      getString(args.customerId) ||
      getString(args.profile_id) ||
      getString(args.profileId) ||
      getString(args.user_id) ||
      getString(args.userId);

    const queryType = getString(args.query_type) || getString(args.queryType);
    const limit = Number(args.limit) || 10;

    console.log("[Banking Data API] Parameters:", {
      customerId,
      queryType,
      limit,
    });

    // Validate required parameters
    if (!customerId) {
      return NextResponse.json(
        {
          error: "customer_id is required",
          hint: "Pass customer_id, profile_id, or user_id",
        },
        { status: 400 }
      );
    }

    if (!queryType || !ALLOWED_QUERIES.includes(queryType as QueryType)) {
      return NextResponse.json(
        {
          error: "Invalid query_type",
          allowed_types: ALLOWED_QUERIES,
          hint: "Use one of: accounts, transactions, cards, loans, savings_goals, investments, spending_summary",
        },
        { status: 400 }
      );
    }

    // Validate Supabase configuration
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("[Banking Data API] Missing Supabase configuration");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Execute the appropriate query based on query_type
    let result: { data: unknown; error: unknown };

    switch (queryType as QueryType) {
      case "accounts":
        result = await supabase
          .from("accounts")
          .select("id, name, account_type, balance, currency, status")
          .eq("customer_id", customerId)
          .order("balance", { ascending: false });
        break;

      case "transactions":
        result = await supabase
          .from("transactions")
          .select(
            "id, description, amount, currency, type, category, status, created_at, merchant_name"
          )
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(limit);
        break;

      case "cards":
        result = await supabase
          .from("cards")
          .select(
            "id, card_type, card_number, cardholder_name, expiry_date, status, credit_limit, current_balance"
          )
          .eq("customer_id", customerId);
        break;

      case "loans":
        result = await supabase
          .from("loans")
          .select(
            "id, loan_type, principal_amount, remaining_balance, interest_rate, monthly_payment, status, next_payment_date"
          )
          .eq("customer_id", customerId);
        break;

      case "savings_goals":
        result = await supabase
          .from("savings_goals")
          .select(
            "id, name, target_amount, current_amount, target_date, status, category"
          )
          .eq("customer_id", customerId);
        break;

      case "investments":
        result = await supabase
          .from("investments")
          .select(
            "id, investment_type, symbol, name, quantity, purchase_price, current_price, currency"
          )
          .eq("customer_id", customerId);
        break;

      case "spending_summary":
        // Get transactions from last 30 days and group by category
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: transactions, error: txError } = await supabase
          .from("transactions")
          .select("category, amount, type")
          .eq("customer_id", customerId)
          .eq("type", "debit")
          .gte("created_at", thirtyDaysAgo.toISOString());

        if (txError) {
          result = { data: null, error: txError };
        } else {
          // Group by category
          const categoryTotals: Record<string, number> = {};
          let totalSpent = 0;

          for (const tx of transactions || []) {
            const cat = tx.category || "Other";
            const amount = Math.abs(Number(tx.amount) || 0);
            categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
            totalSpent += amount;
          }

          // Convert to array and sort
          const breakdown = Object.entries(categoryTotals)
            .map(([category, amount]) => ({
              category,
              amount: Math.round(amount * 100) / 100,
              percentage: Math.round((amount / totalSpent) * 100),
            }))
            .sort((a, b) => b.amount - a.amount);

          result = {
            data: {
              period: "last_30_days",
              total_spent: Math.round(totalSpent * 100) / 100,
              breakdown,
            },
            error: null,
          };
        }
        break;

      default:
        return NextResponse.json(
          { error: "Unknown query type" },
          { status: 400 }
        );
    }

    // Handle query errors
    if (result.error) {
      console.error("[Banking Data API] Query error:", result.error);
      return NextResponse.json(
        {
          error: "Failed to fetch data",
          details:
            result.error instanceof Error
              ? result.error.message
              : String(result.error),
        },
        { status: 500 }
      );
    }

    // Return successful result
    console.log(
      "[Banking Data API] Query successful, returning",
      Array.isArray(result.data) ? result.data.length : 1,
      "records"
    );

    return NextResponse.json({
      success: true,
      query_type: queryType,
      customer_id: customerId,
      data: result.data,
      count: Array.isArray(result.data) ? result.data.length : 1,
    });
  } catch (error) {
    console.error("[Banking Data API] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support GET for testing
export async function GET() {
  return NextResponse.json({
    message: "Banking Data API",
    usage: "POST with customer_id and query_type",
    allowed_query_types: ALLOWED_QUERIES,
    example: {
      customer_id: "uuid-here",
      query_type: "accounts",
      limit: 10,
    },
  });
}
