-- ============================================================
-- Migration 015: Project Status Lifecycle
--
-- Adds a granular project_status to bookings that tracks the
-- full conversation lifecycle beyond the raw booking status.
-- Statuses advance automatically via triggers and system
-- messages are injected into the chat on every transition.
-- ============================================================

-- ── 1. Enum ──────────────────────────────────────────────────

CREATE TYPE project_status AS ENUM (
  'inquiry',          -- conversation started, no formal offer yet
  'offer_sent',       -- booking created (pending), awaiting confirmation
  'accepted',         -- both parties agreed to proceed
  'in_progress',      -- work has begun
  'review_requested', -- deliverable submitted, awaiting client approval
  'completed',        -- project finished and signed off
  'cancelled'         -- project called off by either party
);

-- ── 2. Add column ─────────────────────────────────────────────

ALTER TABLE bookings
  ADD COLUMN project_status project_status NOT NULL DEFAULT 'inquiry';

-- ── 3. BEFORE INSERT — derive initial project_status ─────────

CREATE OR REPLACE FUNCTION init_project_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.project_status := CASE NEW.status
    WHEN 'pending'     THEN 'offer_sent'::project_status
    WHEN 'accepted'    THEN 'accepted'::project_status
    WHEN 'in_progress' THEN 'in_progress'::project_status
    WHEN 'completed'   THEN 'completed'::project_status
    WHEN 'cancelled'   THEN 'cancelled'::project_status
    ELSE 'inquiry'::project_status
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_init_project_status
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION init_project_status();

-- ── 4. BEFORE UPDATE — advance project_status with booking status ──

CREATE OR REPLACE FUNCTION sync_project_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only run when booking status actually changed
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'cancelled' THEN
      -- Always terminal
      NEW.project_status := 'cancelled';

    WHEN 'completed' THEN
      -- Always terminal (overrides review_requested too)
      NEW.project_status := 'completed';

    WHEN 'in_progress' THEN
      -- Don't override review_requested (deliverable still pending)
      IF OLD.project_status NOT IN ('review_requested') THEN
        NEW.project_status := 'in_progress';
      END IF;

    WHEN 'accepted' THEN
      -- Move forward only, never back
      IF OLD.project_status IN ('inquiry', 'offer_sent') THEN
        NEW.project_status := 'accepted';
      END IF;

    WHEN 'pending' THEN
      -- First formal offer
      IF OLD.project_status = 'inquiry' THEN
        NEW.project_status := 'offer_sent';
      END IF;

    ELSE NULL;
  END CASE;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_project_status
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION sync_project_status();

-- ── 5. AFTER UPDATE — inject system message on status change ──

CREATE OR REPLACE FUNCTION emit_project_status_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_body TEXT;
  v_icon TEXT;
  v_ctx  conversation_context_type;
BEGIN
  -- Only fire when project_status actually changed
  IF NEW.project_status = OLD.project_status THEN
    RETURN NEW;
  END IF;

  v_body := CASE NEW.project_status
    WHEN 'offer_sent'::project_status       THEN 'Offer sent — waiting for confirmation'
    WHEN 'accepted'::project_status         THEN 'Offer accepted — project confirmed'
    WHEN 'in_progress'::project_status      THEN 'Work started — project is now in progress'
    WHEN 'review_requested'::project_status THEN 'Work submitted — review requested'
    WHEN 'completed'::project_status        THEN 'Project completed'
    WHEN 'cancelled'::project_status        THEN 'Project cancelled'
    ELSE NEW.project_status::TEXT
  END;

  v_icon := CASE NEW.project_status
    WHEN 'offer_sent'::project_status       THEN 'send-outline'
    WHEN 'accepted'::project_status         THEN 'checkmark-circle-outline'
    WHEN 'in_progress'::project_status      THEN 'construct-outline'
    WHEN 'review_requested'::project_status THEN 'eye-outline'
    WHEN 'completed'::project_status        THEN 'trophy-outline'
    WHEN 'cancelled'::project_status        THEN 'close-circle-outline'
    ELSE 'information-circle-outline'
  END;

  -- Grab context_type from most recent contextual message, or fallback
  SELECT context_type INTO v_ctx
  FROM messages
  WHERE booking_id = NEW.id AND context_type IS NOT NULL
  ORDER BY created_at DESC LIMIT 1;

  v_ctx := COALESCE(v_ctx, 'offer_accepted'::conversation_context_type);

  INSERT INTO messages (
    booking_id, sender_id, body,
    context_type, context_label,
    is_system, system_icon
  ) VALUES (
    NEW.id,
    NEW.provider_id,
    v_body,
    v_ctx,
    '',
    TRUE,
    v_icon
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_emit_project_status_message
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION emit_project_status_message();

-- ── 6. Deliverables → review_requested ───────────────────────

CREATE OR REPLACE FUNCTION sync_status_from_deliverable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Deliverable submitted → review_requested
  IF NEW.status IN ('submitted', 'under_review') AND
     (TG_OP = 'INSERT' OR OLD.status NOT IN ('submitted', 'under_review')) THEN
    UPDATE bookings
    SET project_status = 'review_requested'
    WHERE id = NEW.booking_id
      AND status = 'in_progress'
      AND project_status NOT IN ('completed', 'cancelled');
  END IF;

  -- Revision requested → back to in_progress
  IF TG_OP = 'UPDATE' AND NEW.status = 'revision_requested' THEN
    UPDATE bookings
    SET project_status = 'in_progress'
    WHERE id = NEW.booking_id
      AND project_status = 'review_requested';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deliverable_project_status
  AFTER INSERT OR UPDATE ON deliverables
  FOR EACH ROW EXECUTE FUNCTION sync_status_from_deliverable();

-- ── 7. Backfill existing bookings ─────────────────────────────

UPDATE bookings
SET project_status = CASE status
  WHEN 'pending'     THEN 'offer_sent'
  WHEN 'accepted'    THEN 'accepted'
  WHEN 'in_progress' THEN 'in_progress'
  WHEN 'completed'   THEN 'completed'
  WHEN 'cancelled'   THEN 'cancelled'
  ELSE 'inquiry'
END::project_status;

-- ── 8. Expose project_status in conversations view ────────────

CREATE OR REPLACE VIEW conversations AS
SELECT
  b.id                                          AS booking_id,
  b.provider_id,
  b.client_id,
  b.status                                      AS booking_status,
  b.project_status,

  -- Project financials & timeline
  b.price                                       AS booking_price,
  sr.budget                                     AS request_budget,
  sr.deadline_date                              AS deadline_date,
  sr.scheduled_at                               AS scheduled_at,
  sr.address                                    AS address,

  -- Context
  COALESCE(last_msg.context_type::TEXT, 'offer_accepted')   AS context_type,
  COALESCE(last_msg.context_label, '')                      AS context_label,

  -- Latest message preview
  last_msg.body                                 AS last_message,
  last_msg.sender_id                            AS last_sender_id,
  last_msg.created_at                           AS last_message_at,
  last_msg.is_system                            AS last_is_system,

  -- Participants
  provider_p.full_name                          AS provider_name,
  provider_p.avatar_url                         AS provider_avatar,
  client_p.full_name                            AS client_name,
  client_p.avatar_url                           AS client_avatar,

  -- Project info
  COALESCE(sr.title, ps.title, 'Project')       AS project_title,
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
