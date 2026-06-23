-- ============================================================
-- Migration 016: Project Timeline / Event Log
--
-- Captures every meaningful project event as an immutable
-- audit log row. Events are written by DB triggers so nothing
-- can slip through — every status change, every deliverable
-- action, and every review is recorded automatically.
-- ============================================================

-- ── 1. Event log table ────────────────────────────────────────

CREATE TABLE project_events (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_type   TEXT         NOT NULL,
  title        TEXT         NOT NULL,
  detail       TEXT,
  icon         TEXT         NOT NULL DEFAULT 'information-circle-outline',
  color        TEXT         NOT NULL DEFAULT '#8E8EA0',
  actor_id     UUID         REFERENCES profiles(user_id) ON DELETE SET NULL,
  actor_role   TEXT,                 -- 'client' | 'provider' | 'system'
  metadata     JSONB        NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_events_booking ON project_events (booking_id, created_at ASC);

-- RLS: only participants in the booking can read events
ALTER TABLE project_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_events_participants" ON project_events
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE provider_id = auth.uid() OR client_id = auth.uid()
    )
  );

-- ── 2. Helper: insert a project event (SECURITY DEFINER) ─────

CREATE OR REPLACE FUNCTION insert_project_event(
  p_booking_id UUID,
  p_event_type TEXT,
  p_title      TEXT,
  p_detail     TEXT DEFAULT NULL,
  p_icon       TEXT DEFAULT 'information-circle-outline',
  p_color      TEXT DEFAULT '#8E8EA0',
  p_actor_id   UUID DEFAULT NULL,
  p_actor_role TEXT DEFAULT 'system',
  p_metadata   JSONB DEFAULT '{}'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO project_events
    (booking_id, event_type, title, detail, icon, color, actor_id, actor_role, metadata)
  VALUES
    (p_booking_id, p_event_type, p_title, p_detail, p_icon, p_color, p_actor_id, p_actor_role, p_metadata);
END;
$$;

-- ── 3. Bookings: project_created + status-change events ───────

CREATE OR REPLACE FUNCTION record_booking_events()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_icon  TEXT;
  v_color TEXT;
  v_title TEXT;
  v_detail TEXT;
BEGIN

  -- ── INSERT: project created ──────────────────────────────
  IF TG_OP = 'INSERT' THEN
    PERFORM insert_project_event(
      NEW.id,
      'project_created',
      'Project Created',
      'Conversation started and project workspace opened.',
      'folder-open-outline',
      '#6C47FF',
      NEW.client_id,
      'client'
    );

    -- Also record initial status event
    IF NEW.status = 'pending' THEN
      PERFORM insert_project_event(
        NEW.id,
        'offer_sent',
        'Offer Sent',
        'An offer has been sent and is awaiting confirmation.',
        'send-outline',
        '#3B82F6',
        NEW.provider_id,
        'provider'
      );
    ELSIF NEW.status = 'accepted' THEN
      PERFORM insert_project_event(
        NEW.id,
        'offer_accepted',
        'Offer Accepted',
        'Both parties have agreed to proceed.',
        'checkmark-circle-outline',
        '#10B981',
        NEW.client_id,
        'client'
      );
    END IF;

    RETURN NEW;
  END IF;

  -- ── UPDATE: status transitions ───────────────────────────
  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN

    CASE NEW.status
      WHEN 'accepted' THEN
        v_title  := 'Offer Accepted';
        v_detail := 'Both parties agreed to proceed. The project is now confirmed.';
        v_icon   := 'checkmark-circle-outline';
        v_color  := '#10B981';
        PERFORM insert_project_event(
          NEW.id, 'offer_accepted', v_title, v_detail, v_icon, v_color, NEW.client_id, 'client'
        );

      WHEN 'in_progress' THEN
        v_title  := 'Work Started';
        v_detail := 'The provider has started working on the project.';
        v_icon   := 'construct-outline';
        v_color  := '#6C47FF';
        PERFORM insert_project_event(
          NEW.id, 'work_started', v_title, v_detail, v_icon, v_color, NEW.provider_id, 'provider'
        );

      WHEN 'completed' THEN
        v_title  := 'Project Completed';
        v_detail := 'The project has been marked as complete.';
        v_icon   := 'trophy-outline';
        v_color  := '#10B981';
        PERFORM insert_project_event(
          NEW.id, 'project_completed', v_title, v_detail, v_icon, v_color, NEW.client_id, 'client'
        );

      WHEN 'cancelled' THEN
        v_title  := 'Project Cancelled';
        v_detail := 'The project was cancelled.';
        v_icon   := 'close-circle-outline';
        v_color  := '#EF4444';
        PERFORM insert_project_event(
          NEW.id, 'project_cancelled', v_title, v_detail, v_icon, v_color, NULL, 'system'
        );

      ELSE NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_record_booking_events
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION record_booking_events();

-- ── 4. Deliverables: submitted / revision / approved ─────────

CREATE OR REPLACE FUNCTION record_deliverable_events()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_booking_id UUID;
  v_provider_id UUID;
  v_client_id  UUID;
  v_file_label TEXT;
BEGIN
  SELECT id, provider_id, client_id
  INTO   v_booking_id, v_provider_id, v_client_id
  FROM   bookings WHERE id = NEW.booking_id;

  v_file_label := COALESCE(NEW.file_name, 'File');

  -- ── INSERT ───────────────────────────────────────────────
  IF TG_OP = 'INSERT' AND NEW.status IN ('submitted', 'under_review') THEN
    PERFORM insert_project_event(
      NEW.booking_id,
      'deliverable_submitted',
      'Deliverables Submitted',
      'Provider uploaded: ' || v_file_label,
      'cloud-upload-outline',
      '#3B82F6',
      NEW.uploader_id,
      'provider',
      jsonb_build_object('deliverable_id', NEW.id, 'file_name', NEW.file_name)
    );
    RETURN NEW;
  END IF;

  -- ── UPDATE: status changed ────────────────────────────────
  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    CASE NEW.status
      WHEN 'under_review' THEN
        IF OLD.status NOT IN ('under_review') THEN
          PERFORM insert_project_event(
            NEW.booking_id,
            'deliverable_submitted',
            'Deliverables Submitted',
            'Work submitted for review: ' || v_file_label,
            'cloud-upload-outline',
            '#3B82F6',
            NEW.uploader_id,
            'provider',
            jsonb_build_object('deliverable_id', NEW.id)
          );
        END IF;

      WHEN 'revision_requested' THEN
        PERFORM insert_project_event(
          NEW.booking_id,
          'revision_requested',
          'Revision Requested',
          'Client has requested changes to the submitted work.',
          'refresh-outline',
          '#F59E0B',
          v_client_id,
          'client',
          jsonb_build_object('deliverable_id', NEW.id)
        );

      WHEN 'approved' THEN
        PERFORM insert_project_event(
          NEW.booking_id,
          'deliverable_approved',
          'Work Approved',
          'Client approved the deliverable: ' || v_file_label,
          'checkmark-done-outline',
          '#10B981',
          v_client_id,
          'client',
          jsonb_build_object('deliverable_id', NEW.id)
        );

      ELSE NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_record_deliverable_events
  AFTER INSERT OR UPDATE ON deliverables
  FOR EACH ROW EXECUTE FUNCTION record_deliverable_events();

-- ── 5. Reviews: record when a review is left ─────────────────

CREATE OR REPLACE FUNCTION record_review_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_reviewer_name TEXT;
  v_detail TEXT;
BEGIN
  SELECT full_name INTO v_reviewer_name
  FROM   profiles WHERE user_id = NEW.reviewer_id;

  IF NEW.reviewee_role = 'provider' THEN
    v_detail := COALESCE(v_reviewer_name, 'Client') ||
                ' left a ' || NEW.rating::TEXT || '★ review for the provider.';
  ELSE
    v_detail := COALESCE(v_reviewer_name, 'Provider') ||
                ' left a ' || NEW.rating::TEXT || '★ review for the client.';
  END IF;

  PERFORM insert_project_event(
    NEW.booking_id,
    'review_left',
    'Review Left',
    v_detail,
    'star-outline',
    '#F59E0B',
    NEW.reviewer_id,
    CASE WHEN NEW.reviewee_role = 'provider' THEN 'client' ELSE 'provider' END,
    jsonb_build_object('review_id', NEW.id, 'rating', NEW.rating, 'reviewee_role', NEW.reviewee_role)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_record_review_event
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION record_review_event();

-- ── 6. Backfill existing bookings ────────────────────────────
-- Insert synthetic events from existing booking data.
-- Only for bookings that don't already have events.

INSERT INTO project_events (booking_id, event_type, title, detail, icon, color, actor_id, actor_role, created_at)
SELECT
  b.id,
  'project_created',
  'Project Created',
  'Project workspace opened.',
  'folder-open-outline',
  '#6C47FF',
  b.client_id,
  'client',
  b.created_at
FROM bookings b
WHERE NOT EXISTS (
  SELECT 1 FROM project_events pe WHERE pe.booking_id = b.id AND pe.event_type = 'project_created'
);

-- Backfill offer_sent for pending/above
INSERT INTO project_events (booking_id, event_type, title, detail, icon, color, actor_id, actor_role, created_at)
SELECT
  b.id,
  'offer_sent',
  'Offer Sent',
  'An offer was sent.',
  'send-outline',
  '#3B82F6',
  b.provider_id,
  'provider',
  b.created_at + interval '1 second'
FROM bookings b
WHERE b.status IN ('pending', 'accepted', 'in_progress', 'completed')
  AND NOT EXISTS (
    SELECT 1 FROM project_events pe WHERE pe.booking_id = b.id AND pe.event_type = 'offer_sent'
  );

-- Backfill offer_accepted
INSERT INTO project_events (booking_id, event_type, title, detail, icon, color, actor_id, actor_role, created_at)
SELECT
  b.id,
  'offer_accepted',
  'Offer Accepted',
  'Both parties agreed to proceed.',
  'checkmark-circle-outline',
  '#10B981',
  b.client_id,
  'client',
  COALESCE(b.accepted_at, b.updated_at)
FROM bookings b
WHERE b.status IN ('accepted', 'in_progress', 'completed')
  AND NOT EXISTS (
    SELECT 1 FROM project_events pe WHERE pe.booking_id = b.id AND pe.event_type = 'offer_accepted'
  );

-- Backfill work_started
INSERT INTO project_events (booking_id, event_type, title, detail, icon, color, actor_id, actor_role, created_at)
SELECT
  b.id,
  'work_started',
  'Work Started',
  'The provider started working on the project.',
  'construct-outline',
  '#6C47FF',
  b.provider_id,
  'provider',
  b.updated_at
FROM bookings b
WHERE b.status IN ('in_progress', 'completed')
  AND NOT EXISTS (
    SELECT 1 FROM project_events pe WHERE pe.booking_id = b.id AND pe.event_type = 'work_started'
  );

-- Backfill project_completed
INSERT INTO project_events (booking_id, event_type, title, detail, icon, color, actor_id, actor_role, created_at)
SELECT
  b.id,
  'project_completed',
  'Project Completed',
  'The project was marked as complete.',
  'trophy-outline',
  '#10B981',
  b.client_id,
  'client',
  b.updated_at
FROM bookings b
WHERE b.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM project_events pe WHERE pe.booking_id = b.id AND pe.event_type = 'project_completed'
  );
