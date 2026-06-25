-- ============================================================================
-- 20260624110014_conversation_read_state
-- Per-participant read tracking for conversations. A conversation is "unread"
-- for a participant when the OTHER party has sent a message after this
-- timestamp (NULL = never opened → all incoming messages are unread).
-- Updated by participants via the existing conv_participant_update RLS policy.
-- ============================================================================

alter table public.conversations
  add column buyer_last_read_at  timestamptz,
  add column seller_last_read_at timestamptz;
