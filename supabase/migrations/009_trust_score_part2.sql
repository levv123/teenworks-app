-- Migration 009: Trust Score Part 2
-- Adds completion_rate, repeat_client_rate, avg_response_hours to provider_profiles
-- Adds accepted_at to bookings for response speed tracking
-- Rewires triggers to keep all stats fresh

-- ── 1. New stats columns on provider_profiles ─────────────────
ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS completion_rate     NUMERIC(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repeat_client_rate  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_response_hours  NUMERIC(8,2)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_bookings      INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_bookings  INTEGER       NOT NULL DEFAULT 0;

-- ── 2. Track when a booking was first accepted ─────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ DEFAULT NULL;

-- Auto-set accepted_at when status moves to 'accepted' or 'in_progress'
CREATE OR REPLACE FUNCTION trg_set_booking_accepted_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('accepted', 'in_progress') AND OLD.status = 'pending' AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_accepted_at ON bookings;
CREATE TRIGGER trg_booking_accepted_at
  BEFORE UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION trg_set_booking_accepted_at();

-- ── 3. Function: recompute booking stats for a provider ────────
CREATE OR REPLACE FUNCTION compute_provider_booking_stats(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_total           INTEGER := 0;
  v_completed       INTEGER := 0;
  v_total_clients   INTEGER := 0;
  v_repeat_clients  INTEGER := 0;
  v_avg_response    NUMERIC := NULL;
BEGIN
  -- Completion rate: completed / (completed + cancelled)
  SELECT
    COUNT(*) FILTER (WHERE status IN ('completed', 'cancelled')),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total, v_completed
  FROM bookings
  WHERE provider_id = p_user_id;

  -- Repeat client rate (among completed bookings)
  SELECT
    COUNT(DISTINCT client_id),
    COUNT(DISTINCT client_id) FILTER (WHERE cnt > 1)
  INTO v_total_clients, v_repeat_clients
  FROM (
    SELECT client_id, COUNT(*) AS cnt
    FROM bookings
    WHERE provider_id = p_user_id AND status = 'completed'
    GROUP BY client_id
  ) sub;

  -- Average response time in hours (pending → accepted)
  SELECT AVG(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 3600.0)
  INTO v_avg_response
  FROM bookings
  WHERE provider_id = p_user_id AND accepted_at IS NOT NULL;

  UPDATE provider_profiles SET
    completion_rate    = CASE WHEN v_total > 0
                              THEN ROUND((v_completed::NUMERIC / v_total) * 100, 2)
                              ELSE 0 END,
    repeat_client_rate = CASE WHEN v_total_clients > 0
                              THEN ROUND((v_repeat_clients::NUMERIC / v_total_clients) * 100, 2)
                              ELSE 0 END,
    avg_response_hours = v_avg_response,
    total_bookings     = v_total,
    completed_bookings = v_completed
  WHERE user_id = p_user_id;
END;
$$;

-- ── 4. Updated trust score function (5-factor weighted) ───────
CREATE OR REPLACE FUNCTION compute_provider_trust_score(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_pp               provider_profiles%ROWTYPE;
  v_review_count     INTEGER := 0;
  v_avg_rating       NUMERIC := 0;
  v_hire_again_pct   NUMERIC := 0;
  v_hire_opinions    INTEGER := 0;

  -- Factor scores 0–100
  v_reviews_score     NUMERIC := 0;
  v_completion_score  NUMERIC := 0;
  v_response_score    NUMERIC := 0;
  v_repeat_score      NUMERIC := 0;
  v_verif_score       NUMERIC := 0;

  v_final             INTEGER := 0;
  v_pub               RECORD;
BEGIN
  -- Load provider profile
  SELECT * INTO v_pp FROM provider_profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Load public profile for verification fields
  SELECT email_verified, phone_verified, identity_verified, parent_approved
  INTO v_pub
  FROM profiles WHERE id = p_user_id;

  -- Reviews from DB aggregates
  v_review_count := v_pp.review_count;
  v_avg_rating   := COALESCE(v_pp.rating, 0);

  SELECT
    COUNT(*) FILTER (WHERE would_hire_again IS NOT NULL),
    COALESCE(
      AVG(CASE WHEN would_hire_again THEN 1.0 ELSE 0.0 END)
        FILTER (WHERE would_hire_again IS NOT NULL),
      0
    )
  INTO v_hire_opinions, v_hire_again_pct
  FROM reviews
  WHERE reviewee_id = p_user_id AND reviewee_role = 'provider';

  -- A) Reviews score (0-100)
  --    70% from avg rating (dampened until 3 reviews)
  --    30% from would-hire-again (needs 3+ opinions)
  v_reviews_score :=
    (v_avg_rating / 5.0) * 70.0 * LEAST(v_review_count::NUMERIC / 3.0, 1.0)
    + CASE WHEN v_hire_opinions >= 3 THEN v_hire_again_pct * 30.0 ELSE 0 END;

  -- B) Completion rate score (0-100)
  --    New providers get 70 (benefit of the doubt until 3+ bookings)
  v_completion_score := CASE
    WHEN v_pp.total_bookings < 3 THEN 70.0
    ELSE LEAST(v_pp.completion_rate, 100.0)
  END;

  -- C) Response speed score (0-100)
  v_response_score := CASE
    WHEN v_pp.avg_response_hours IS NULL      THEN 60.0  -- no data yet
    WHEN v_pp.avg_response_hours <  1.0       THEN 100.0
    WHEN v_pp.avg_response_hours <  4.0       THEN 90.0
    WHEN v_pp.avg_response_hours < 12.0       THEN 75.0
    WHEN v_pp.avg_response_hours < 24.0       THEN 60.0
    WHEN v_pp.avg_response_hours < 48.0       THEN 40.0
    ELSE 20.0
  END;

  -- D) Repeat clients score (0-100)
  --    Need 3+ distinct clients to activate; new providers get 50
  v_repeat_score := CASE
    WHEN v_pp.total_bookings < 3 THEN 50.0
    ELSE LEAST(v_pp.repeat_client_rate, 100.0)
  END;

  -- E) Verification score (0-100)
  v_verif_score :=
    CASE WHEN COALESCE(v_pub.email_verified,    FALSE) THEN 30.0 ELSE 0 END +
    CASE WHEN COALESCE(v_pub.phone_verified,    FALSE) THEN 25.0 ELSE 0 END +
    CASE WHEN COALESCE(v_pub.identity_verified, FALSE) THEN 30.0 ELSE 0 END +
    CASE WHEN COALESCE(v_pub.parent_approved,   FALSE) THEN 15.0 ELSE 0 END;

  -- Weighted final (Reviews 35%, Completion 25%, Response 20%, Repeat 10%, Verif 10%)
  v_final := LEAST(100, ROUND(
    v_reviews_score    * 0.35 +
    v_completion_score * 0.25 +
    v_response_score   * 0.20 +
    v_repeat_score     * 0.10 +
    v_verif_score      * 0.10
  ));

  UPDATE provider_profiles SET trust_score = v_final WHERE user_id = p_user_id;
END;
$$;

-- ── 5. Trigger: recompute booking stats + trust on booking changes
CREATE OR REPLACE FUNCTION trg_booking_stats_refresh()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_uid UUID;
BEGIN
  v_uid := COALESCE(NEW.provider_id, OLD.provider_id);
  IF v_uid IS NOT NULL THEN
    PERFORM compute_provider_booking_stats(v_uid);
    PERFORM compute_provider_trust_score(v_uid);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_booking_stats ON bookings;
CREATE TRIGGER trg_refresh_booking_stats
  AFTER INSERT OR UPDATE OF status, accepted_at OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trg_booking_stats_refresh();

-- ── 6. Backfill existing providers ────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT user_id FROM provider_profiles LOOP
    PERFORM compute_provider_booking_stats(r.user_id);
    PERFORM compute_provider_trust_score(r.user_id);
  END LOOP;
END;
$$;

-- ── 7. Index for fast trust_score lookups ─────────────────────
CREATE INDEX IF NOT EXISTS idx_provider_profiles_trust_score
  ON provider_profiles (trust_score DESC NULLS LAST);
