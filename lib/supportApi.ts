import type { DbConversation, DbMessage } from "./types";
import { createClient } from "./supabase/client";

export async function createConversation(args: {
  customer_id: string;
  subject?: string;
  priority?: string;
  channel?: string;
}): Promise<DbConversation> {
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
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return data as DbConversation;
}

export async function fetchMessages(conversationId: string): Promise<DbMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("source", "banking")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

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
    throw new Error(`Failed to send message: ${error.message}`);
  }

  return {
    status: "ai", // Default to AI processing
    customer_message_id: data.id,
    ai_reply: null,
    ai_message_id: null,
  };
}

export async function sendAgentMessage(args: {
  conversation_id: string;
  sender_agent_id: string;
  content: string;
  is_internal?: boolean;
  channel?: string;
}): Promise<DbMessage> {
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
    throw new Error(`Failed to send agent message: ${error.message}`);
  }

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
