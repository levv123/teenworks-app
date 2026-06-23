-- Migration 010: Trust Levels (1–5)
-- Adds trust_level to provider_profiles, maintained by the existing trust score trigger.

-- ── 1. Add trust_level column ─────────────────────────────────
ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS trust_level SMALLINT NOT NULL DEFAULT 1
    CHECK (trust_level BETWEEN 1 AND 5);

-- ── 2. Update compute_provider_trust_score to also set level ──
CREATE OR REPLACE FUNCTION compute_provider_trust_score(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_pp               provider_profiles%ROWTYPE;
  v_review_count     INTEGER := 0;
  v_avg_rating       NUMERIC := 0;
  v_hire_again_pct   NUMERIC := 0;
  v_hire_opinions    INTEGER := 0;

  v_reviews_score     NUMERIC := 0;
  v_completion_score  NUMERIC := 0;
  v_response_score    NUMERIC := 0;
  v_repeat_score      NUMERIC := 0;
  v_verif_score       NUMERIC := 0;

  v_final             INTEGER := 0;
  v_level             SMALLINT := 1;
  v_pub               RECORD;
BEGIN
  SELECT * INTO v_pp FROM provider_profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT email_verified, phone_verified, identity_verified, parent_approved
  INTO v_pub FROM profiles WHERE id = p_user_id;

  v_review_count := v_pp.review_count;
  v_avg_rating   := COALESCE(v_pp.rating, 0);

  SELECT
    COUNT(*) FILTER (WHERE would_hire_again IS NOT NULL),
    COALESCE(AVG(CASE WHEN would_hire_again THEN 1.0 ELSE 0.0 END)
      FILTER (WHERE would_hire_again IS NOT NULL), 0)
  INTO v_hire_opinions, v_hire_again_pct
  FROM reviews WHERE reviewee_id = p_user_id AND reviewee_role = 'provider';

  -- Reviews (0-100)
  v_reviews_score :=
    (v_avg_rating / 5.0) * 70.0 * LEAST(v_review_count::NUMERIC / 3.0, 1.0)
    + CASE WHEN v_hire_opinions >= 3 THEN v_hire_again_pct * 30.0 ELSE 0 END;

  -- Completion rate (0-100)
  v_completion_score := CASE
    WHEN v_pp.total_bookings < 3 THEN 70.0
    ELSE LEAST(v_pp.completion_rate, 100.0)
  END;

  -- Response speed (0-100)
  v_response_score := CASE
    WHEN v_pp.avg_response_hours IS NULL THEN 60.0
    WHEN v_pp.avg_response_hours <  1.0  THEN 100.0
    WHEN v_pp.avg_response_hours <  4.0  THEN 90.0
    WHEN v_pp.avg_response_hours < 12.0  THEN 75.0
    WHEN v_pp.avg_response_hours < 24.0  THEN 60.0
    WHEN v_pp.avg_response_hours < 48.0  THEN 40.0
    ELSE 20.0
  END;

  -- Repeat clients (0-100)
  v_repeat_score := CASE
    WHEN v_pp.total_bookings < 3 THEN 50.0
    ELSE LEAST(v_pp.repeat_client_rate, 100.0)
  END;

  -- Verification (0-100)
  v_verif_score :=
    CASE WHEN COALESCE(v_pub.email_verified,    FALSE) THEN 30.0 ELSE 0 END +
    CASE WHEN COALESCE(v_pub.phone_verified,    FALSE) THEN 25.0 ELSE 0 END +
    CASE WHEN COALESCE(v_pub.identity_verified, FALSE) THEN 30.0 ELSE 0 END +
    CASE WHEN COALESCE(v_pub.parent_approved,   FALSE) THEN 15.0 ELSE 0 END;

  -- Weighted final
  v_final := LEAST(100, ROUND(
    v_reviews_score    * 0.35 +
    v_completion_score * 0.25 +
    v_response_score   * 0.20 +
    v_repeat_score     * 0.10 +
    v_verif_score      * 0.10
  ));

  -- Derive level from score
  v_level := CASE
    WHEN v_final >= 90 THEN 5   -- TeenWorks Legend
    WHEN v_final >= 75 THEN 4   -- Elite Worker
    WHEN v_final >= 55 THEN 3   -- Verified Pro
    WHEN v_final >= 30 THEN 2   -- Trusted Worker
    ELSE 1                      -- New Worker
  END;

  UPDATE provider_profiles
  SET trust_score = v_final, trust_level = v_level
  WHERE user_id = p_user_id;
END;
$$;

-- ── 3. Backfill existing providers ────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT user_id FROM provider_profiles LOOP
    PERFORM compute_provider_trust_score(r.user_id);
  END LOOP;
END;
$$;

-- ── 4. Expose trust_level in the provider_services join ───────
-- (The existing SERVICE_SELECT already joins trust_score; extend it.)
-- No schema change needed — the Pick type on provider_profile will be
-- updated in TypeScript to include trust_level.
