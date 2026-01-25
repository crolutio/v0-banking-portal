"use client";

import { useEffect, useState } from "react";
import { createClient } from "../supabase/client";
import type { DbConversation } from "../types";


export function useCustomerConversations(params: {
  customerId: string;
}) {
  const { customerId } = params;
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!customerId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("customer_id", customerId)
        .eq("source", "banking")
        .order("updated_at", { ascending: false });

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
