-- ============================================================
-- Migration 013: Project-Based Messaging
--
-- Enforces that every conversation has a business purpose.
-- Adds context tracking to messages and a conversations view
-- so the inbox can group threads by their origin.
-- ============================================================

-- ── conversation_context_type enum ───────────────────────────

CREATE TYPE conversation_context_type AS ENUM (
  'job_application',    -- provider applied to a posted request
  'service_inquiry',    -- client contacted a service listing
  'invitation',         -- client invited a specific provider
  'offer_accepted',     -- both parties agreed to proceed
  'project_started'     -- booking moved to in_progress
);

-- ── Extend messages table ─────────────────────────────────────

-- Every message now carries the conversation context it belongs to.
-- context_type / context_label are set once per booking (first message)
-- and denormalised onto every subsequent message for fast queries.

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS context_type    conversation_context_type,
  ADD COLUMN IF NOT EXISTS context_label   TEXT,          -- human-readable, e.g. "Lawn Mowing · Jun 22"
  ADD COLUMN IF NOT EXISTS is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS system_icon     TEXT;          -- Ionicons name for system events

-- Backfill existing messages with a default context
-- (all existing messages came from bookings = offer_accepted)
UPDATE messages
SET context_type  = 'offer_accepted',
    context_label = 'Existing conversation'
WHERE context_type IS NULL;

-- ── conversations view ────────────────────────────────────────
-- Provides one row per booking-thread for the inbox, with the
-- latest message, context info, and unread indicator.

CREATE OR REPLACE VIEW conversations AS
SELECT
  b.id                                          AS booking_id,
  b.provider_id,
  b.client_id,
  b.status                                      AS booking_status,

  -- Context (from most recent message that has it set)
  COALESCE(last_msg.context_type::TEXT, 'offer_accepted')   AS context_type,
  COALESCE(last_msg.context_label, '')                      AS context_label,

  -- Latest message preview
  last_msg.body                                 AS last_message,
  last_msg.sender_id                            AS last_sender_id,
  last_msg.created_at                           AS last_message_at,
  last_msg.is_system                            AS last_is_system,

  -- Participants (joined profiles)
  provider_p.full_name                          AS provider_name,
  provider_p.avatar_url                         AS provider_avatar,
  client_p.full_name                            AS client_name,
  client_p.avatar_url                           AS client_avatar,

  -- Request title for display
  COALESCE(sr.title, ps.title, 'Project')       AS project_title,

  b.created_at                                  AS conversation_started_at

FROM bookings b
LEFT JOIN LATERAL (
  SELECT body, sender_id, created_at, context_type, context_label, is_system
  FROM messages
  WHERE booking_id = b.id
  ORDER BY created_at DESC
  LIMIT 1
) last_msg ON TRUE
LEFT JOIN profiles provider_p ON provider_p.user_id = b.provider_id
LEFT JOIN profiles client_p   ON client_p.user_id   = b.client_id
LEFT JOIN service_requests sr ON sr.id = b.request_id
LEFT JOIN provider_services ps ON ps.id = b.service_id
WHERE b.status NOT IN ('cancelled');

-- RLS note: this view inherits RLS from the bookings table,
-- so users see only rows where they are provider or client.

-- ── system_message helper function ───────────────────────────
-- Called by application code to insert context-stamped system messages.

CREATE OR REPLACE FUNCTION insert_system_message(
  p_booking_id   UUID,
  p_body         TEXT,
  p_context_type conversation_context_type,
  p_context_label TEXT,
  p_system_icon  TEXT DEFAULT 'information-circle-outline'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_provider_id UUID;
BEGIN
  SELECT provider_id INTO v_provider_id FROM bookings WHERE id = p_booking_id;
  INSERT INTO messages (booking_id, sender_id, body, context_type, context_label, is_system, system_icon)
  VALUES (p_booking_id, v_provider_id, p_body, p_context_type, p_context_label, TRUE, p_system_icon);
END;
$$;

-- ── Index for fast inbox queries ──────────────────────────────

CREATE INDEX IF NOT EXISTS idx_messages_booking_created
  ON messages (booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_context_type
  ON messages (context_type);

-- ── RLS for new columns ───────────────────────────────────────
-- messages already has RLS; the new columns inherit it.
-- No additional policies needed.
