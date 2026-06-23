-- ============================================================
-- Migration 014: Enrich conversations view with project data
--
-- Adds price, budget, and deadline so InboxScreen can show
-- project context (budget, due date) without extra queries.
-- ============================================================

CREATE OR REPLACE VIEW conversations AS
SELECT
  b.id                                          AS booking_id,
  b.provider_id,
  b.client_id,
  b.status                                      AS booking_status,

  -- Project financials & timeline
  b.price                                       AS booking_price,
  sr.budget                                     AS request_budget,
  sr.deadline_date                              AS deadline_date,
  sr.scheduled_at                               AS scheduled_at,
  sr.address                                    AS address,

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

  -- Request / service title for display
  COALESCE(sr.title, ps.title, 'Project')       AS project_title,

  -- Category name
  cat.name                                      AS category_name,

  b.created_at                                  AS conversation_started_at

FROM bookings b
LEFT JOIN LATERAL (
  SELECT body, sender_id, created_at, context_type, context_label, is_system
  FROM messages
  WHERE booking_id = b.id
  ORDER BY created_at DESC
  LIMIT 1
) last_msg ON TRUE
LEFT JOIN profiles      provider_p ON provider_p.user_id = b.provider_id
LEFT JOIN profiles      client_p   ON client_p.user_id   = b.client_id
LEFT JOIN service_requests sr      ON sr.id = b.request_id
LEFT JOIN provider_services ps     ON ps.id = b.service_id
LEFT JOIN categories    cat        ON cat.id = sr.category_id
WHERE b.status NOT IN ('cancelled');

-- RLS note: this view inherits RLS from the bookings table.
-- No additional policies needed.
