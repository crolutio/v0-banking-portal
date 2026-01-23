-- Script 038: Unify contact-center core tables (banking portal)

-- Ensure conversations columns exist
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handover_required BOOLEAN DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS provider_conversation_id TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sentiment TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sla_remaining INTEGER;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sla_status TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS queue TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_time TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS escalation_risk BOOLEAN;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS industry TEXT;

-- Ensure messages columns exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS from_address TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS to_address TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Realtime: add messages table to supabase_realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- RLS: allow authenticated clients to read messages inserts
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'Authenticated can read messages'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated can read messages"
      ON public.messages
      FOR SELECT
      USING (auth.role() = ''authenticated'')';
  END IF;
END $$;

-- Optional id-preserving migration (run only if cc_* tables exist in this database)
-- Customers
-- INSERT INTO customers (id, name, email, phone, created_at)
-- SELECT
--   c.id,
--   TRIM(CONCAT(c.first_name, ' ', c.last_name)) AS name,
--   COALESCE(c.email, CONCAT(c.customer_id, '@banking.local')) AS email,
--   c.phone,
--   COALESCE(c.created_at, NOW())
-- FROM cc_bank_customers c
-- ON CONFLICT (id) DO UPDATE SET
--   name = EXCLUDED.name,
--   email = EXCLUDED.email,
--   phone = EXCLUDED.phone;
--
-- Conversations
-- INSERT INTO conversations (
--   id,
--   customer_id,
--   subject,
--   channel,
--   status,
--   priority,
--   queue,
--   topic,
--   sentiment,
--   source,
--   industry,
--   provider,
--   provider_conversation_id,
--   start_time,
--   last_message_time,
--   created_at,
--   updated_at
-- )
-- SELECT
--   cc.id,
--   cc.bank_customer_id,
--   cc.topic,
--   cc.channel,
--   cc.status,
--   cc.priority,
--   cc.assigned_queue,
--   cc.topic,
--   cc.sentiment,
--   'banking' AS source,
--   'banking' AS industry,
--   cc.provider,
--   cc.provider_conversation_id,
--   cc.opened_at,
--   COALESCE(cc.closed_at, cc.updated_at, cc.opened_at),
--   COALESCE(cc.created_at, NOW()),
--   COALESCE(cc.updated_at, NOW())
-- FROM cc_conversations cc
-- ON CONFLICT (id) DO UPDATE SET
--   status = EXCLUDED.status,
--   priority = EXCLUDED.priority,
--   queue = EXCLUDED.queue,
--   topic = EXCLUDED.topic,
--   sentiment = EXCLUDED.sentiment,
--   provider = EXCLUDED.provider,
--   provider_conversation_id = EXCLUDED.provider_conversation_id,
--   last_message_time = EXCLUDED.last_message_time,
--   updated_at = EXCLUDED.updated_at;
--
-- Messages
-- INSERT INTO messages (
--   id,
--   conversation_id,
--   sender_type,
--   content,
--   is_internal,
--   created_at,
--   source,
--   channel,
--   provider,
--   provider_message_id,
--   from_address,
--   to_address,
--   status,
--   metadata
-- )
-- SELECT
--   m.id,
--   m.conversation_id,
--   CASE
--     WHEN m.direction = 'inbound' THEN 'customer'
--     ELSE 'agent'
--   END AS sender_type,
--   m.body_text,
--   FALSE AS is_internal,
--   COALESCE(m.created_at, NOW()),
--   'banking' AS source,
--   m.channel,
--   m.provider,
--   m.provider_message_id,
--   m.from_address,
--   m.to_address,
--   m.status,
--   COALESCE(m.metadata, m.body_json)
-- FROM cc_messages m
-- ON CONFLICT (id) DO UPDATE SET
--   status = EXCLUDED.status,
--   metadata = EXCLUDED.metadata;
