-- Seed contact center conversations (call-center Supabase)
-- This script inserts demo data. Call transcripts are append-only, so deletes can fail.
-- If you need to hide old demo conversations, archive them instead:
UPDATE conversations
SET source = 'banking_archived',
    status = 'closed',
    handover_required = false,
    escalation_risk = false,
    priority = 'low',
    queue = 'Archived',
    topic = 'Archived',
    updated_at = NOW(),
    last_message_time = NOW()
WHERE source = 'banking';

-- Ensure anon can read banking demo conversations/messages
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversations'
      AND policyname = 'banking_select_conversations'
  ) THEN
    CREATE POLICY banking_select_conversations
      ON conversations
      FOR SELECT
      TO anon
      USING (source = 'banking');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'banking_select_messages'
  ) THEN
    CREATE POLICY banking_select_messages
      ON messages
      FOR SELECT
      TO anon
      USING (source = 'banking');
  END IF;
END $$;

-- Remove stray single-message conversation
DELETE FROM messages
WHERE source IN ('banking', 'banking_archived')
  AND content = 'Hello I am sarah';

DELETE FROM conversations
WHERE source IN ('banking', 'banking_archived')
  AND (subject = 'Hello I am sarah' OR last_message = 'Hello I am sarah');

INSERT INTO conversations (
  id,
  customer_id,
  subject,
  channel,
  status,
  priority,
  assigned_agent_id,
  last_message,
  created_at,
  updated_at,
  source,
  handover_required,
  provider,
  provider_conversation_id,
  sentiment,
  sentiment_score,
  sla_deadline,
  sla_remaining,
  sla_status,
  queue,
  topic,
  last_message_time,
  start_time,
  escalation_risk,
  tags,
  industry,
  handling_mode,
  ai_confidence
) VALUES
-- Sarah Chen (2 escalated, 2 not)
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0001', '4e140685-8f38-49ff-aae0-d6109c46873d', 'Card dispute: unfamiliar merchant', 'chat', 'active', 'medium', NULL,
 'Please confirm the merchant and date so we can file the dispute.', '2026-01-25T09:05:00Z', '2026-01-25T09:12:00Z',
 'banking', false, 'app', 'conv-SAR-2026-001', 'neutral', 0.52,
 '2026-01-25T09:35:00Z', 20, 'healthy', 'Disputes', 'Card Dispute',
 '2026-01-25T09:12:00Z', '2026-01-25T09:05:00Z', false, ARRAY['card','dispute'], 'banking', 'ai', 0.77),
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0002', '4e140685-8f38-49ff-aae0-d6109c46873d', 'Travel notice: London trip', 'chat', 'open', 'low', NULL,
 'Travel notice added for your cards through Feb 5.', '2026-01-25T09:40:00Z', '2026-01-25T09:45:00Z',
 'banking', false, 'app', 'conv-SAR-2026-002', 'positive', 0.71,
 '2026-01-25T10:10:00Z', 25, 'healthy', 'Cards', 'Travel Notice',
 '2026-01-25T09:45:00Z', '2026-01-25T09:40:00Z', false, ARRAY['travel','cards'], 'banking', 'ai', 0.82),
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0003', '4e140685-8f38-49ff-aae0-d6109c46873d', 'Urgent: card chargeback request', 'chat', 'escalated', 'high', NULL,
 'Escalated to a human agent for urgent dispute handling.', '2026-01-25T10:20:00Z', '2026-01-25T10:28:00Z',
 'banking', true, 'app', 'conv-SAR-2026-003', 'negative', 0.31,
 '2026-01-25T10:40:00Z', 8, 'at_risk', 'Disputes', 'Chargeback',
 '2026-01-25T10:28:00Z', '2026-01-25T10:20:00Z', true, ARRAY['chargeback','urgent'], 'banking', 'human', 0.38),
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0004', '4e140685-8f38-49ff-aae0-d6109c46873d', 'Account access locked', 'chat', 'escalated', 'high', NULL,
 'Escalated to restore access and verify identity.', '2026-01-25T10:55:00Z', '2026-01-25T11:05:00Z',
 'banking', true, 'app', 'conv-SAR-2026-004', 'negative', 0.27,
 '2026-01-25T11:20:00Z', 6, 'at_risk', 'Digital Support', 'Login Issue',
 '2026-01-25T11:05:00Z', '2026-01-25T10:55:00Z', true, ARRAY['login','urgent'], 'banking', 'human', 0.34),

-- Fatima Hassan (2 escalated, 2 not)
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0005', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', 'Payroll transfer flagged', 'chat', 'escalated', 'high', NULL,
 'Escalated to a human agent for urgent review.', '2026-01-25T12:10:00Z', '2026-01-25T12:25:00Z',
 'banking', true, 'app', 'conv-FAT-2026-001', 'negative', 0.29,
 '2026-01-25T12:40:00Z', 5, 'at_risk', 'Payments', 'Payroll Transfer',
 '2026-01-25T12:25:00Z', '2026-01-25T12:10:00Z', true, ARRAY['payroll','urgent'], 'banking', 'human', 0.38),
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0006', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', 'Statement request for audit', 'chat', 'open', 'medium', NULL,
 'I will prepare stamped statements and email them today.', '2026-01-25T12:50:00Z', '2026-01-25T12:58:00Z',
 'banking', false, 'app', 'conv-FAT-2026-002', 'neutral', 0.6,
 '2026-01-25T13:20:00Z', 22, 'healthy', 'SME Support', 'Statements',
 '2026-01-25T12:58:00Z', '2026-01-25T12:50:00Z', false, ARRAY['statements','sme'], 'banking', 'ai', 0.74),
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0007', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', 'Wire transfer dispute', 'chat', 'escalated', 'high', NULL,
 'Escalated to a human agent for fee dispute review.', '2026-01-25T13:30:00Z', '2026-01-25T13:38:00Z',
 'banking', true, 'app', 'conv-FAT-2026-003', 'negative', 0.34,
 '2026-01-25T13:50:00Z', 6, 'at_risk', 'Payments', 'Fees Dispute',
 '2026-01-25T13:38:00Z', '2026-01-25T13:30:00Z', true, ARRAY['fees','urgent'], 'banking', 'human', 0.42),
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0008', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', 'Add new beneficiary', 'chat', 'active', 'low', NULL,
 'Beneficiary added successfully. Please confirm the transfer amount.', '2026-01-25T14:05:00Z', '2026-01-25T14:10:00Z',
 'banking', false, 'app', 'conv-FAT-2026-004', 'positive', 0.68,
 '2026-01-25T14:30:00Z', 24, 'healthy', 'Transfers', 'Beneficiary',
 '2026-01-25T14:10:00Z', '2026-01-25T14:05:00Z', false, ARRAY['beneficiary','transfer'], 'banking', 'ai', 0.8),

-- James Rodriguez (2 escalated, 2 not)
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0009', '51880b1d-3935-49dd-bac6-9469d33d3ee3', 'Client access request', 'chat', 'open', 'medium', NULL,
 'I can help route this request to admin for approval.', '2026-01-25T15:00:00Z', '2026-01-25T15:06:00Z',
 'banking', false, 'app', 'conv-JAM-2026-001', 'neutral', 0.61,
 '2026-01-25T15:30:00Z', 30, 'healthy', 'RM Support', 'Access Request',
 '2026-01-25T15:06:00Z', '2026-01-25T15:00:00Z', false, ARRAY['access','rm'], 'banking', 'ai', 0.72),
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000a', '51880b1d-3935-49dd-bac6-9469d33d3ee3', 'Portfolio report request', 'chat', 'active', 'low', NULL,
 'Monthly portfolio summary prepared and shared.', '2026-01-25T15:40:00Z', '2026-01-25T15:45:00Z',
 'banking', false, 'app', 'conv-JAM-2026-002', 'positive', 0.7,
 '2026-01-25T16:05:00Z', 26, 'healthy', 'RM Support', 'Portfolio Report',
 '2026-01-25T15:45:00Z', '2026-01-25T15:40:00Z', false, ARRAY['portfolio','report'], 'banking', 'ai', 0.79),
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000b', '51880b1d-3935-49dd-bac6-9469d33d3ee3', 'VIP client complaint escalation', 'chat', 'escalated', 'high', NULL,
 'Escalated to a human agent for immediate resolution.', '2026-01-25T16:15:00Z', '2026-01-25T16:22:00Z',
 'banking', true, 'app', 'conv-JAM-2026-003', 'negative', 0.3,
 '2026-01-25T16:35:00Z', 7, 'at_risk', 'RM Support', 'Client Complaint',
 '2026-01-25T16:22:00Z', '2026-01-25T16:15:00Z', true, ARRAY['vip','complaint'], 'banking', 'human', 0.4),
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000c', '51880b1d-3935-49dd-bac6-9469d33d3ee3', 'Account exception approval', 'chat', 'escalated', 'high', NULL,
 'Escalated for admin approval on policy exception.', '2026-01-25T16:50:00Z', '2026-01-25T16:58:00Z',
 'banking', true, 'app', 'conv-JAM-2026-004', 'negative', 0.35,
 '2026-01-25T17:10:00Z', 9, 'at_risk', 'RM Support', 'Exception Approval',
 '2026-01-25T16:58:00Z', '2026-01-25T16:50:00Z', true, ARRAY['exception','approval'], 'banking', 'human', 0.43),

-- David Kim (2 escalated, 2 not)
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000d', '2be06428-7933-41f5-a426-f27478e75c1c', 'Fraud alert review', 'chat', 'escalated', 'high', NULL,
 'Escalated for compliance confirmation and case notes.', '2026-01-25T17:30:00Z', '2026-01-25T17:38:00Z',
 'banking', true, 'app', 'conv-DAV-2026-001', 'negative', 0.33,
 '2026-01-25T17:50:00Z', 8, 'at_risk', 'Risk & Compliance', 'Fraud Review',
 '2026-01-25T17:38:00Z', '2026-01-25T17:30:00Z', true, ARRAY['fraud','compliance'], 'banking', 'human', 0.41),
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000e', '2be06428-7933-41f5-a426-f27478e75c1c', 'KYC refresh verification', 'chat', 'active', 'medium', NULL,
 'KYC refresh checklist shared and awaiting documents.', '2026-01-25T18:05:00Z', '2026-01-25T18:12:00Z',
 'banking', false, 'app', 'conv-DAV-2026-002', 'neutral', 0.59,
 '2026-01-25T18:30:00Z', 24, 'healthy', 'Risk & Compliance', 'KYC Review',
 '2026-01-25T18:12:00Z', '2026-01-25T18:05:00Z', false, ARRAY['kyc','review'], 'banking', 'ai', 0.75),
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000f', '2be06428-7933-41f5-a426-f27478e75c1c', 'AML escalation: unusual pattern', 'chat', 'escalated', 'high', NULL,
 'Escalated for AML case logging and follow-up.', '2026-01-25T18:40:00Z', '2026-01-25T18:48:00Z',
 'banking', true, 'app', 'conv-DAV-2026-003', 'negative', 0.28,
 '2026-01-25T19:00:00Z', 6, 'at_risk', 'Risk & Compliance', 'AML Review',
 '2026-01-25T18:48:00Z', '2026-01-25T18:40:00Z', true, ARRAY['aml','urgent'], 'banking', 'human', 0.39),
('0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0010', '2be06428-7933-41f5-a426-f27478e75c1c', 'Policy clarification', 'chat', 'open', 'low', NULL,
 'Provided policy citation and next steps.', '2026-01-25T19:15:00Z', '2026-01-25T19:20:00Z',
 'banking', false, 'app', 'conv-DAV-2026-004', 'positive', 0.66,
 '2026-01-25T19:40:00Z', 28, 'healthy', 'Risk & Compliance', 'Policy Question',
 '2026-01-25T19:20:00Z', '2026-01-25T19:15:00Z', false, ARRAY['policy','question'], 'banking', 'ai', 0.81)

-- Ensure re-runs are safe
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  subject = EXCLUDED.subject,
  channel = EXCLUDED.channel,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  assigned_agent_id = EXCLUDED.assigned_agent_id,
  last_message = EXCLUDED.last_message,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at,
  source = EXCLUDED.source,
  handover_required = EXCLUDED.handover_required,
  provider = EXCLUDED.provider,
  provider_conversation_id = EXCLUDED.provider_conversation_id,
  sentiment = EXCLUDED.sentiment,
  sentiment_score = EXCLUDED.sentiment_score,
  sla_deadline = EXCLUDED.sla_deadline,
  sla_remaining = EXCLUDED.sla_remaining,
  sla_status = EXCLUDED.sla_status,
  queue = EXCLUDED.queue,
  topic = EXCLUDED.topic,
  last_message_time = EXCLUDED.last_message_time,
  start_time = EXCLUDED.start_time,
  escalation_risk = EXCLUDED.escalation_risk,
  tags = EXCLUDED.tags,
  industry = EXCLUDED.industry,
  handling_mode = EXCLUDED.handling_mode,
  ai_confidence = EXCLUDED.ai_confidence;

-- Remove prior banking messages to avoid mixed ordering
DELETE FROM messages
WHERE source = 'banking';

INSERT INTO messages (
  id,
  conversation_id,
  sender_type,
  sender_customer_id,
  sender_agent_id,
  content,
  is_internal,
  created_at,
  source,
  channel,
  provider,
  provider_message_id,
  from_address,
  to_address,
  status,
  metadata
) VALUES
-- Sarah 1 (non-escalated)
('10000001-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0001', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'I see a card charge I do not recognize.', false, '2026-01-25T09:05:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000001-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0001', 'ai', NULL, NULL,
 'I can help file a dispute. What is the merchant name and date?', false, '2026-01-25T09:06:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000001-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0001', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'Merchant was Midtown Market on Jan 23.', false, '2026-01-25T09:07:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000001-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0001', 'ai', NULL, NULL,
 'Thanks. What amount was charged?', false, '2026-01-25T09:08:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000001-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0001', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'AED 1,240.', false, '2026-01-25T09:09:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000001-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0001', 'ai', NULL, NULL,
 'Got it. I will open the dispute case now.', false, '2026-01-25T09:10:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000001-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0001', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'Will I get provisional credit?', false, '2026-01-25T09:11:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000001-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0001', 'ai', NULL, NULL,
 'We will review eligibility and update you.', false, '2026-01-25T09:12:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000001-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0001', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'Please email me the case number.', false, '2026-01-25T09:13:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000001-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0001', 'ai', NULL, NULL,
 'I will send the case reference to your email.', false, '2026-01-25T09:14:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),

-- Sarah 2 (non-escalated)
('10000002-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0002', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'I am traveling to London next week. Can you add a travel notice?', false, '2026-01-25T09:40:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000002-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0002', 'ai', NULL, NULL,
 'Travel notice added through Feb 5. Do you want ATM usage enabled?', false, '2026-01-25T09:41:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000002-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0002', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'Yes, please enable international ATM usage.', false, '2026-01-25T09:42:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000002-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0002', 'ai', NULL, NULL,
 'ATM usage enabled. Do you want a lower daily limit?', false, '2026-01-25T09:43:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000002-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0002', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'Set the daily limit to AED 2,000.', false, '2026-01-25T09:44:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000002-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0002', 'ai', NULL, NULL,
 'Daily ATM limit set to AED 2,000.', false, '2026-01-25T09:45:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000002-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0002', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'Can you enable travel alerts too?', false, '2026-01-25T09:46:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000002-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0002', 'ai', NULL, NULL,
 'Travel alerts enabled via SMS and email.', false, '2026-01-25T09:47:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000002-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0002', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'Thanks, that covers it.', false, '2026-01-25T09:48:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000002-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0002', 'ai', NULL, NULL,
 'Happy to help. Safe travels.', false, '2026-01-25T09:49:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),

-- Sarah 3 (escalated)
('10000003-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0003', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'I need this chargeback handled today.', false, '2026-01-25T10:20:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000003-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0003', 'agent', NULL, NULL,
 'I am taking over and reviewing your dispute now.', false, '2026-01-25T10:21:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000003-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0003', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'The merchant is SkyMall and the amount is AED 3,950.', false, '2026-01-25T10:22:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000003-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0003', 'agent', NULL, NULL,
 'Details recorded. I have escalated the dispute.', false, '2026-01-25T10:23:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000003-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0003', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'Please confirm provisional credit timing.', false, '2026-01-25T10:24:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000003-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0003', 'agent', NULL, NULL,
 'Provisional credit is typically issued within 10 business days.', false, '2026-01-25T10:25:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000003-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0003', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'Can you keep me updated today?', false, '2026-01-25T10:26:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000003-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0003', 'agent', NULL, NULL,
 'Yes, I will send an update by end of day.', false, '2026-01-25T10:27:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000003-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0003', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'Understood. Thank you.', false, '2026-01-25T10:28:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000003-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0003', 'agent', NULL, NULL,
 'You are welcome. I will follow up shortly.', false, '2026-01-25T10:29:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),

-- Sarah 4 (escalated)
('10000004-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0004', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'I am locked out and need access now.', false, '2026-01-25T10:55:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000004-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0004', 'agent', NULL, NULL,
 'I can help. I am verifying your identity.', false, '2026-01-25T10:56:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000004-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0004', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'I can confirm the last transaction if needed.', false, '2026-01-25T10:57:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000004-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0004', 'agent', NULL, NULL,
 'Thanks. I have reset MFA and sent a new code.', false, '2026-01-25T10:58:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000004-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0004', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'New code works. I am in.', false, '2026-01-25T10:59:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000004-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0004', 'agent', NULL, NULL,
 'Great. I will close the access incident.', false, '2026-01-25T11:00:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000004-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0004', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'Please keep a note if it happens again.', false, '2026-01-25T11:01:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000004-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0004', 'agent', NULL, NULL,
 'Noted. I have added this to your account profile.', false, '2026-01-25T11:02:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000004-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0004', 'customer', '4e140685-8f38-49ff-aae0-d6109c46873d', NULL,
 'Thank you for the quick help.', false, '2026-01-25T11:03:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000004-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0004', 'agent', NULL, NULL,
 'Any time. Let us know if it happens again.', false, '2026-01-25T11:04:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),

-- Fatima 1 (escalated)
('10000005-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0005', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'Our payroll transfer was flagged and we need it released today.', false, '2026-01-25T12:10:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000005-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0005', 'agent', NULL, NULL,
 'I am handling this now. When was the file uploaded?', false, '2026-01-25T12:11:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000005-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0005', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'The file was uploaded at 9:00 AM.', false, '2026-01-25T12:12:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000005-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0005', 'agent', NULL, NULL,
 'File located. We are validating the beneficiaries now.', false, '2026-01-25T12:13:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000005-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0005', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'Please prioritize; payroll is due today.', false, '2026-01-25T12:14:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000005-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0005', 'agent', NULL, NULL,
 'Marked urgent. Estimated release in 30 minutes.', false, '2026-01-25T12:15:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000005-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0005', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'Please confirm once it is released.', false, '2026-01-25T12:16:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000005-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0005', 'agent', NULL, NULL,
 'Will do. I will send confirmation today.', false, '2026-01-25T12:17:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000005-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0005', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'Thanks for the quick handling.', false, '2026-01-25T12:18:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000005-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0005', 'agent', NULL, NULL,
 'You are welcome. We will keep you posted.', false, '2026-01-25T12:19:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),

-- Fatima 2 (non-escalated)
('10000006-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0006', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'I need stamped statements for audit.', false, '2026-01-25T12:50:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000006-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0006', 'ai', NULL, NULL,
 'Understood. Do you want PDF delivery as well?', false, '2026-01-25T12:51:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000006-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0006', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'Yes, please send a PDF copy too.', false, '2026-01-25T12:52:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000006-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0006', 'ai', NULL, NULL,
 'Stamped statements will be prepared and emailed today.', false, '2026-01-25T12:53:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000006-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0006', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'Can you also include last quarter?', false, '2026-01-25T12:54:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000006-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0006', 'ai', NULL, NULL,
 'Yes, I will include the last quarter statements.', false, '2026-01-25T12:55:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000006-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0006', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'Great, thank you.', false, '2026-01-25T12:56:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000006-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0006', 'ai', NULL, NULL,
 'You will receive them by end of day.', false, '2026-01-25T12:57:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000006-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0006', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'Perfect.', false, '2026-01-25T12:58:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000006-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0006', 'ai', NULL, NULL,
 'Happy to help. We will send them today.', false, '2026-01-25T12:59:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),

-- Fatima 3 (escalated)
('10000007-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0007', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'The wire transfer fee looks wrong.', false, '2026-01-25T13:30:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000007-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0007', 'agent', NULL, NULL,
 'I am reviewing the fee schedule now.', false, '2026-01-25T13:31:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000007-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0007', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'The fee applied was AED 450.', false, '2026-01-25T13:32:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000007-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0007', 'agent', NULL, NULL,
 'Thanks. I have opened a fee dispute case.', false, '2026-01-25T13:33:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000007-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0007', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'The transfer amount was AED 90,000.', false, '2026-01-25T13:34:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000007-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0007', 'agent', NULL, NULL,
 'Recorded. We will respond within 2 business days.', false, '2026-01-25T13:35:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000007-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0007', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'Please keep me updated by email.', false, '2026-01-25T13:36:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000007-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0007', 'agent', NULL, NULL,
 'Will do. I will follow up within 2 business days.', false, '2026-01-25T13:37:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000007-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0007', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'Thank you.', false, '2026-01-25T13:38:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000007-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0007', 'agent', NULL, NULL,
 'You are welcome. I will keep you posted.', false, '2026-01-25T13:39:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),

-- Fatima 4 (non-escalated)
('10000008-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0008', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'I need to add a new beneficiary today.', false, '2026-01-25T14:05:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000008-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0008', 'ai', NULL, NULL,
 'Sure. Please share the beneficiary name and IBAN.', false, '2026-01-25T14:06:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000008-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0008', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'Beneficiary name is TechStart LLC.', false, '2026-01-25T14:07:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000008-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0008', 'ai', NULL, NULL,
 'Thanks. Please share the IBAN to complete setup.', false, '2026-01-25T14:08:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000008-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0008', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'IBAN is AE070331234567891234567.', false, '2026-01-25T14:09:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000008-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0008', 'ai', NULL, NULL,
 'IBAN verified and beneficiary saved.', false, '2026-01-25T14:10:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000008-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0008', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'Great. I will submit the transfer now.', false, '2026-01-25T14:11:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000008-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0008', 'ai', NULL, NULL,
 'Let me know if you need a transfer limit increase.', false, '2026-01-25T14:12:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000008-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0008', 'customer', 'e9c42918-fad4-422f-b4ba-24bb5943bb67', NULL,
 'Thanks for the quick setup.', false, '2026-01-25T14:13:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000008-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0008', 'ai', NULL, NULL,
 'Happy to help.', false, '2026-01-25T14:14:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),

-- James 1 (non-escalated)
('10000009-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0009', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Please grant me access to the VIP client portfolio.', false, '2026-01-25T15:00:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000009-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0009', 'ai', NULL, NULL,
 'I can route this to admin for approval.', false, '2026-01-25T15:01:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000009-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0009', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Please include portfolio analytics access.', false, '2026-01-25T15:02:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000009-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0009', 'ai', NULL, NULL,
 'Yes, analytics access is included once approved.', false, '2026-01-25T15:03:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000009-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0009', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Can you expedite if possible?', false, '2026-01-25T15:04:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000009-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0009', 'ai', NULL, NULL,
 'I have marked it as priority.', false, '2026-01-25T15:05:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000009-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0009', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Thanks, please keep me posted.', false, '2026-01-25T15:06:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000009-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0009', 'ai', NULL, NULL,
 'Will do. I will notify you once approved.', false, '2026-01-25T15:07:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000009-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0009', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Appreciate the help.', false, '2026-01-25T15:08:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000009-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0009', 'ai', NULL, NULL,
 'Anytime.', false, '2026-01-25T15:09:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),

-- James 2 (non-escalated)
('1000000a-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000a', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Please send the monthly portfolio report.', false, '2026-01-25T15:40:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000a-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000a', 'ai', NULL, NULL,
 'Report prepared and shared.', false, '2026-01-25T15:41:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000a-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000a', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Include allocation by sector if possible.', false, '2026-01-25T15:42:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000a-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000a', 'ai', NULL, NULL,
 'I added a sector allocation breakdown.', false, '2026-01-25T15:43:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000a-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000a', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Can you also include top performers?', false, '2026-01-25T15:44:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000a-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000a', 'ai', NULL, NULL,
 'Top performers section added.', false, '2026-01-25T15:45:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000a-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000a', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Thanks for the quick turnaround.', false, '2026-01-25T15:46:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000a-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000a', 'ai', NULL, NULL,
 'Happy to help. Let me know if you need updates.', false, '2026-01-25T15:47:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000a-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000a', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'All set.', false, '2026-01-25T15:48:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000a-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000a', 'ai', NULL, NULL,
 'Great.', false, '2026-01-25T15:49:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),

-- James 3 (escalated)
('1000000b-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000b', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'VIP client complaint needs immediate attention.', false, '2026-01-25T16:15:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000b-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000b', 'agent', NULL, NULL,
 'I am taking ownership and will contact the client.', false, '2026-01-25T16:16:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000b-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000b', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Client expects a callback in 10 minutes.', false, '2026-01-25T16:17:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000b-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000b', 'agent', NULL, NULL,
 'Understood. I will call immediately.', false, '2026-01-25T16:18:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000b-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000b', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Please share outcome notes.', false, '2026-01-25T16:19:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000b-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000b', 'agent', NULL, NULL,
 'Will do. I will update the case log.', false, '2026-01-25T16:20:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000b-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000b', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Thanks. Keep me posted.', false, '2026-01-25T16:21:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000b-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000b', 'agent', NULL, NULL,
 'Updates will follow as soon as we speak with the client.', false, '2026-01-25T16:22:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000b-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000b', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Ok.', false, '2026-01-25T16:23:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000b-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000b', 'agent', NULL, NULL,
 'Thank you.', false, '2026-01-25T16:24:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),

-- James 4 (escalated)
('1000000c-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000c', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Need exception approval before EOD.', false, '2026-01-25T16:50:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000c-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000c', 'agent', NULL, NULL,
 'I have requested exception approval from admin.', false, '2026-01-25T16:51:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000c-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000c', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'This is for a VIP transaction limit.', false, '2026-01-25T16:52:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000c-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000c', 'agent', NULL, NULL,
 'Understood. I have flagged this for expedited review.', false, '2026-01-25T16:53:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000c-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000c', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Please confirm once approved.', false, '2026-01-25T16:54:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000c-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000c', 'agent', NULL, NULL,
 'I will notify you immediately after approval.', false, '2026-01-25T16:55:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000c-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000c', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Is there anything else you need from me?', false, '2026-01-25T16:56:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000c-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000c', 'agent', NULL, NULL,
 'No, we have everything required.', false, '2026-01-25T16:57:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000c-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000c', 'customer', '51880b1d-3935-49dd-bac6-9469d33d3ee3', NULL,
 'Understood. Thank you.', false, '2026-01-25T16:58:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000c-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000c', 'agent', NULL, NULL,
 'Happy to help. We are on it.', false, '2026-01-25T16:59:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),

-- David 1 (escalated)
('1000000d-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000d', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'Please review this fraud alert urgently.', false, '2026-01-25T17:30:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000d-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000d', 'agent', NULL, NULL,
 'Fraud review initiated. I am checking device logs.', false, '2026-01-25T17:31:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000d-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000d', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'Please lock the account if needed.', false, '2026-01-25T17:32:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000d-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000d', 'agent', NULL, NULL,
 'Account secured while we complete review.', false, '2026-01-25T17:33:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000d-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000d', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'Thank you. Please keep me updated.', false, '2026-01-25T17:34:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000d-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000d', 'agent', NULL, NULL,
 'Next update in 30 minutes.', false, '2026-01-25T17:35:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000d-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000d', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'Understood.', false, '2026-01-25T17:36:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000d-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000d', 'agent', NULL, NULL,
 'I will add notes to the case file.', false, '2026-01-25T17:37:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000d-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000d', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'Ok, thanks.', false, '2026-01-25T17:38:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000d-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000d', 'agent', NULL, NULL,
 'You are welcome.', false, '2026-01-25T17:39:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),

-- David 2 (non-escalated)
('1000000e-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000e', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'KYC refresh is pending. What is needed?', false, '2026-01-25T18:05:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000e-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000e', 'ai', NULL, NULL,
 'Checklist shared. Do you want digital upload links?', false, '2026-01-25T18:06:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000e-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000e', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'Yes, please send the digital links.', false, '2026-01-25T18:07:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000e-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000e', 'ai', NULL, NULL,
 'Links sent. Please submit within 7 business days.', false, '2026-01-25T18:08:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000e-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000e', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'Ok, I will send them today.', false, '2026-01-25T18:09:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000e-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000e', 'ai', NULL, NULL,
 'Great. I will confirm once received.', false, '2026-01-25T18:10:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000e-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000e', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'Thanks.', false, '2026-01-25T18:11:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000e-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000e', 'ai', NULL, NULL,
 'Anytime.', false, '2026-01-25T18:12:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000e-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000e', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'All set.', false, '2026-01-25T18:13:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000e-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000e', 'ai', NULL, NULL,
 'Great.', false, '2026-01-25T18:14:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),

-- David 3 (escalated)
('1000000f-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000f', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'We detected structuring. Need AML escalation.', false, '2026-01-25T18:40:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000f-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000f', 'agent', NULL, NULL,
 'AML case opened and assigned.', false, '2026-01-25T18:41:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000f-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000f', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'Pattern involves deposits below AED 50,000.', false, '2026-01-25T18:42:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000f-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000f', 'agent', NULL, NULL,
 'We are reviewing transaction patterns.', false, '2026-01-25T18:43:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000f-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000f', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'Please confirm if we should freeze activity.', false, '2026-01-25T18:44:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000f-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000f', 'agent', NULL, NULL,
 'Monitoring is active; freeze if escalation criteria is met.', false, '2026-01-25T18:45:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000f-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000f', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'Understood. I will watch for additional triggers.', false, '2026-01-25T18:46:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000f-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000f', 'agent', NULL, NULL,
 'I will update the risk notes shortly.', false, '2026-01-25T18:47:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('1000000f-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000f', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'Ok, thanks.', false, '2026-01-25T18:48:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('1000000f-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000f', 'agent', NULL, NULL,
 'We will follow up with findings.', false, '2026-01-25T18:49:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),

-- David 4 (non-escalated)
('10000010-0000-0000-0000-000000000001', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0010', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'Need policy clarification on a transaction.', false, '2026-01-25T19:15:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000010-0000-0000-0000-000000000002', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0010', 'ai', NULL, NULL,
 'Sure. Which transaction type is this related to?', false, '2026-01-25T19:16:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000010-0000-0000-0000-000000000003', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0010', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'It is a cross-border transfer over AED 50,000.', false, '2026-01-25T19:17:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000010-0000-0000-0000-000000000004', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0010', 'ai', NULL, NULL,
 'For that threshold, manager sign-off is required.', false, '2026-01-25T19:18:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000010-0000-0000-0000-000000000005', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0010', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'Can you send the checklist?', false, '2026-01-25T19:19:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000010-0000-0000-0000-000000000006', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0010', 'ai', NULL, NULL,
 'Checklist sent. Let me know if you need a memo.', false, '2026-01-25T19:20:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000010-0000-0000-0000-000000000007', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0010', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'All good. Thanks.', false, '2026-01-25T19:21:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000010-0000-0000-0000-000000000008', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0010', 'ai', NULL, NULL,
 'Happy to help.', false, '2026-01-25T19:22:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL),
('10000010-0000-0000-0000-000000000009', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0010', 'customer', '2be06428-7933-41f5-a426-f27478e75c1c', NULL,
 'That is all I needed.', false, '2026-01-25T19:23:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'received', NULL),
('10000010-0000-0000-0000-00000000000a', '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0010', 'ai', NULL, NULL,
 'Great. Reach out if questions come up.', false, '2026-01-25T19:24:00Z',
 'banking', 'chat', 'app', NULL, NULL, NULL, 'sent', NULL)
ON CONFLICT (id) DO NOTHING;

-- Jumble conversation ordering by resetting timestamps per conversation
WITH base_times AS (
  SELECT
    id,
    conversation_id,
    created_at,
    CASE conversation_id
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0001' THEN TIMESTAMPTZ '2026-01-24T09:12:00Z'
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0002' THEN TIMESTAMPTZ '2026-01-25T18:03:00Z'
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0003' THEN TIMESTAMPTZ '2026-01-24T14:47:00Z'
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0004' THEN TIMESTAMPTZ '2026-01-25T08:22:00Z'
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0005' THEN TIMESTAMPTZ '2026-01-24T16:05:00Z'
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0006' THEN TIMESTAMPTZ '2026-01-25T12:31:00Z'
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0007' THEN TIMESTAMPTZ '2026-01-24T10:55:00Z'
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0008' THEN TIMESTAMPTZ '2026-01-25T15:18:00Z'
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0009' THEN TIMESTAMPTZ '2026-01-24T19:40:00Z'
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000a' THEN TIMESTAMPTZ '2026-01-25T09:36:00Z'
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000b' THEN TIMESTAMPTZ '2026-01-24T12:14:00Z'
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000c' THEN TIMESTAMPTZ '2026-01-25T17:42:00Z'
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000d' THEN TIMESTAMPTZ '2026-01-24T08:05:00Z'
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000e' THEN TIMESTAMPTZ '2026-01-25T11:07:00Z'
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a000f' THEN TIMESTAMPTZ '2026-01-24T18:12:00Z'
      WHEN '0b4b1e2e-1c0d-4c3a-8f1d-1f6c0b0a0010' THEN TIMESTAMPTZ '2026-01-25T13:55:00Z'
      ELSE created_at
    END AS base_time
  FROM messages
  WHERE source = 'banking'
),
ranked AS (
  SELECT
    id,
    base_time,
    ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at, id) AS rn
  FROM base_times
)
UPDATE messages m
SET created_at = r.base_time + (r.rn - 1) * INTERVAL '2 minutes'
FROM ranked r
WHERE m.id = r.id;

WITH conv_times AS (
  SELECT
    conversation_id,
    MIN(created_at) AS start_time,
    MAX(created_at) AS last_message_time
  FROM messages
  WHERE source = 'banking'
  GROUP BY conversation_id
),
last_msgs AS (
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    content
  FROM messages
  WHERE source = 'banking'
  ORDER BY conversation_id, created_at DESC, id DESC
)
UPDATE conversations c
SET start_time = t.start_time,
    created_at = t.start_time,
    last_message_time = t.last_message_time,
    updated_at = t.last_message_time,
    last_message = lm.content
FROM conv_times t
JOIN last_msgs lm ON lm.conversation_id = t.conversation_id
WHERE c.id = t.conversation_id;
