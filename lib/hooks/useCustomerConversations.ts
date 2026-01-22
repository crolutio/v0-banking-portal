"use client";

import { useEffect, useState } from "react";
import { createCallCenterClient } from "../supabase/call-center-client";
import type { DbConversation } from "../types";


export function useCustomerConversations(params: {
  customerId: string;
}) {
  const { customerId } = params;
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [loading, setLoading] = useState(true);
  // #region agent log
  if (typeof window !== "undefined") {
    fetch("http://127.0.0.1:7243/ingest/416c505f-0f39-4083-9a11-a59f7ac8dac3", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "useCustomerConversations.ts:12",
        message: "hook entry",
        data: { customerId, customerIdTruthy: !!customerId, customerIdLength: customerId?.length },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run3",
        hypothesisId: "A",
      }),
    }).catch(() => {});
  }
  // #endregion

  async function refresh() {
    if (!customerId) {
      // #region agent log
      if (typeof window !== "undefined") {
        fetch("http://127.0.0.1:7243/ingest/416c505f-0f39-4083-9a11-a59f7ac8dac3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "useCustomerConversations.ts:18",
            message: "refresh early return - no customerId",
            data: { customerId },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run3",
            hypothesisId: "A",
          }),
        }).catch(() => {});
      }
      // #endregion
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = createCallCenterClient();
      // #region agent log
      if (typeof window !== "undefined") {
        fetch("http://127.0.0.1:7243/ingest/416c505f-0f39-4083-9a11-a59f7ac8dac3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "useCustomerConversations.ts:29",
            message: "before query",
            data: { customerId, table: "conversations" },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run3",
            hypothesisId: "B",
          }),
        }).catch(() => {});
      }
      // #endregion
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("customer_id", customerId)
        .order("updated_at", { ascending: false });

      // #region agent log
      if (typeof window !== "undefined") {
        fetch("http://127.0.0.1:7243/ingest/416c505f-0f39-4083-9a11-a59f7ac8dac3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "useCustomerConversations.ts:38",
            message: "after query",
            data: {
              customerId,
              hasError: !!error,
              errorString: error ? JSON.stringify(error) : null,
              errorMessage: error?.message,
              errorCode: error?.code,
              dataLength: data?.length,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run3",
            hypothesisId: "B",
          }),
        }).catch(() => {});
      }
      // #endregion

      if (error) {
        console.error("[useCustomerConversations] fetch error", error);
        console.error("[useCustomerConversations] error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          customerId,
        });
        setConversations([]);
        setLoading(false);
        return;
      }

      setConversations((data ?? []) as DbConversation[]);
    } catch (err) {
      console.error("[useCustomerConversations] unexpected error:", err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!customerId) return;
    refresh().catch(console.error);

    // Realtime subscription (best effort)
    const supabase = createCallCenterClient();
    const channel = supabase
      .channel(`cust:${customerId}:conversations`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          // simplest: re-fetch to keep list correct
          refresh().catch(console.error);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId]);

  return { conversations, loading, refresh };
}
