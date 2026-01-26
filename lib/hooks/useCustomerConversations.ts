"use client";

import { useEffect, useState } from "react";
import { createCallCenterClient } from "../supabase/call-center-client";
import type { DbConversation } from "../types";


export function useCustomerConversations(params: {
  customerId: string;
  showAll?: boolean;
}) {
  const { customerId, showAll = false } = params;
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!customerId && !showAll) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = createCallCenterClient();
      const query = supabase
        .from("conversations")
        .select("*")
        .eq("source", "banking")
        .order("created_at", { ascending: false });

      const { data, error } = showAll
        ? await query
        : await query.eq("customer_id", customerId);

      if (error) {
        console.error("[useCustomerConversations] fetch error", error);
        console.error("[useCustomerConversations] error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          customerId,
          showAll,
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
    if (!customerId && !showAll) return;
    refresh().catch(console.error);

    // Realtime subscription (best effort)
    const supabase = createCallCenterClient();
    const filter = showAll
      ? "source=eq.banking"
      : `customer_id=eq.${customerId}`;

    const channel = supabase
      .channel(showAll ? "conversations:banking" : `cust:${customerId}:conversations`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter,
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
  }, [customerId, showAll]);

  return { conversations, loading, refresh };
}
