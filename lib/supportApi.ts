import type { DbConversation, DbMessage } from "./types";
import { createClient } from "./supabase/client";

export async function createConversation(args: {
  customer_id: string;
  subject?: string;
  priority?: string;
  channel?: string;
}): Promise<DbConversation> {
  const endpoint = "POST /api/conversations (Supabase: conversations.insert)";
  console.log(`[Support API] Calling: ${endpoint}`);
  console.log(`[Support API] Request data:`, {
    customer_id: args.customer_id,
    subject: args.subject,
    channel: args.channel ?? "app",
    priority: args.priority ?? "medium",
  });

  const supabase = createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      customer_id: args.customer_id,
      subject: args.subject ?? null,
      channel: args.channel ?? "chat",
      priority: args.priority ?? "medium",
      status: "open",
      source: "banking",
      industry: "banking",
      start_time: now,
      last_message_time: now,
    })
    .select()
    .single();

  if (error) {
    console.error(`[Support API] ${endpoint} - Error:`, {
      status: "ERROR",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  console.log(`[Support API] ${endpoint} - Success:`, {
    status: "200 OK",
    conversation_id: data?.id,
  });

  return data as DbConversation;
}

export async function fetchMessages(conversationId: string): Promise<DbMessage[]> {
  const endpoint = `GET /api/conversations/${conversationId}/messages (Supabase: messages.select)`;
  console.log(`[Support API] Calling: ${endpoint}`);
  console.log(`[Support API] Request params:`, { conversationId });

  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("source", "banking")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`[Support API] ${endpoint} - Error:`, {
      status: "ERROR",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  console.log(`[Support API] ${endpoint} - Success:`, {
    status: "200 OK",
    message_count: data?.length ?? 0,
  });

  return (data ?? []) as DbMessage[];
}

export type CustomerMessageResponse = {
  status: "ai" | "handoff" | "human";
  customer_message_id: string;
  ai_reply: string | null;
  ai_message_id: string | null;
};

export async function sendCustomerMessage(args: {
  conversation_id: string;
  sender_customer_id: string;
  content: string;
  channel?: string;
}): Promise<CustomerMessageResponse> {
  const endpoint = "POST /api/messages (Supabase: messages.insert)";
  console.log(`[Support API] Calling: ${endpoint}`);
  console.log(`[Support API] Request data:`, {
    conversation_id: args.conversation_id,
    sender_customer_id: args.sender_customer_id,
    content_length: args.content.length,
    content_preview: args.content.substring(0, 100) + (args.content.length > 100 ? "..." : ""),
  });

  const supabase = createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: args.conversation_id,
      sender_type: "customer",
      sender_customer_id: args.sender_customer_id,
      sender_agent_id: null,
      content: args.content,
      is_internal: false,
      source: "banking",
      channel: args.channel ?? "chat",
      created_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error(`[Support API] ${endpoint} - Error:`, {
      status: "ERROR",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Failed to send message: ${error.message}`);
  }

  let aiReply: string | null = null;
  let aiMessageId: string | null = null;

  try {
    const aiResponse = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: args.content }],
        userId: args.sender_customer_id,
        agentId: "support",
        currentPage: "/support",
        stream: false,
      }),
    });

    if (aiResponse.ok) {
      aiReply = (await aiResponse.text()).trim();
      if (aiReply) {
        const { data: aiMessage, error: aiError } = await supabase
          .from("messages")
          .insert({
            conversation_id: args.conversation_id,
            sender_type: "ai",
            sender_customer_id: null,
            sender_agent_id: null,
            content: aiReply,
            is_internal: false,
            source: "banking",
            channel: args.channel ?? "chat",
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!aiError) {
          aiMessageId = aiMessage?.id ?? null;
        } else {
          console.error("[Support API] AI message insert error:", aiError);
        }
      }
    } else {
      console.error("[Support API] AI chat error:", await aiResponse.text());
    }
  } catch (aiErr) {
    console.error("[Support API] AI chat request failed:", aiErr);
  }

  console.log(`[Support API] ${endpoint} - Success:`, {
    status: "200 OK",
    message_id: data?.id,
    response_status: "ai",
  });

  return {
    status: "ai", // Default to AI processing
    customer_message_id: data.id,
    ai_reply: aiReply,
    ai_message_id: aiMessageId,
  };
}

export async function sendAgentMessage(args: {
  conversation_id: string;
  sender_agent_id: string;
  content: string;
  is_internal?: boolean;
  channel?: string;
}): Promise<DbMessage> {
  const endpoint = "POST /api/messages (Supabase: messages.insert - agent)";
  console.log(`[Support API] Calling: ${endpoint}`);
  console.log(`[Support API] Request data:`, {
    conversation_id: args.conversation_id,
    sender_agent_id: args.sender_agent_id,
    is_internal: !!args.is_internal,
    content_length: args.content.length,
  });

  const supabase = createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: args.conversation_id,
      sender_type: "agent",
      sender_customer_id: null,
      sender_agent_id: args.sender_agent_id,
      content: args.content,
      is_internal: !!args.is_internal,
      source: "banking",
      channel: args.channel ?? "chat",
      created_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error(`[Support API] ${endpoint} - Error:`, {
      status: "ERROR",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Failed to send agent message: ${error.message}`);
  }

  console.log(`[Support API] ${endpoint} - Success:`, {
    status: "200 OK",
    message_id: data?.id,
  });

  return data as DbMessage;
}

export async function requestConversationHandover(args: {
  conversation_id: string;
  channel?: string;
}): Promise<DbConversation> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data: conversation, error: updateError } = await supabase
    .from("conversations")
    .update({
      status: "escalated",
      handover_required: true,
      updated_at: now,
    })
    .eq("id", args.conversation_id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to request handover: ${updateError.message}`);
  }

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: args.conversation_id,
    sender_type: "system",
    sender_customer_id: null,
    sender_agent_id: null,
    content: "Customer requested a human agent handover.",
    is_internal: false,
    source: "banking",
    channel: args.channel ?? "chat",
    created_at: now,
  });

  if (messageError) {
    throw new Error(`Failed to log handover message: ${messageError.message}`);
  }

  return conversation as DbConversation;
}
