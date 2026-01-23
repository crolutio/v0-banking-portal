import { createClient } from "./supabase/client";

export function subscribeToConversationMessages(
  conversationId: string,
  onNewMessage: (msg: any) => void
) {
  const supabase = createClient();
  const channel = supabase
    .channel(`conv:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onNewMessage(payload.new)
    )
    .subscribe((status) => {
      console.log("[realtime] status:", status, "conversation:", conversationId);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
