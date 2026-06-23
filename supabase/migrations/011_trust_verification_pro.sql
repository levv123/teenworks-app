-- Migration 011: Trust Score Part 4 — Verification badges
-- Adds verified_professional to the trust score formula (was excluded before).
-- New verification weights: Email 20, Phone 20, Identity 25, Parent 20, Pro 15 = 100

-- Update compute_provider_trust_score to use all 5 verification flags
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

  SELECT
    email_verified, phone_verified, identity_verified,
    parent_approved, verified_professional
  INTO v_pub FROM profiles WHERE id = p_user_id;

  v_review_count := v_pp.review_count;
  v_avg_rating   := COALESCE(v_pp.rating, 0);

  SELECT
    COUNT(*) FILTER (WHERE would_hire_again IS NOT NULL),
    COALESCE(AVG(CASE WHEN would_hire_again THEN 1.0 ELSE 0.0 END)
      FILTER (WHERE would_hire_again IS NOT NULL), 0)
  INTO v_hire_opinions, v_hire_again_pct
  FROM reviews WHERE reviewee_id = p_user_id AND reviewee_role = 'provider';

  -- A) Reviews (0-100)
  v_reviews_score :=
    (v_avg_rating / 5.0) * 70.0 * LEAST(v_review_count::NUMERIC / 3.0, 1.0)
    + CASE WHEN v_hire_opinions >= 3 THEN v_hire_again_pct * 30.0 ELSE 0 END;

  -- B) Completion rate (0-100)
  v_completion_score := CASE
    WHEN v_pp.total_bookings < 3 THEN 70.0
    ELSE LEAST(v_pp.completion_rate, 100.0)
  END;

  -- C) Response speed (0-100)
  v_response_score := CASE
    WHEN v_pp.avg_response_hours IS NULL THEN 60.0
    WHEN v_pp.avg_response_hours <  1.0  THEN 100.0
    WHEN v_pp.avg_response_hours <  4.0  THEN 90.0
    WHEN v_pp.avg_response_hours < 12.0  THEN 75.0
    WHEN v_pp.avg_response_hours < 24.0  THEN 60.0
    WHEN v_pp.avg_response_hours < 48.0  THEN 40.0
    ELSE 20.0
  END;

  -- D) Repeat clients (0-100)
  v_repeat_score := CASE
    WHEN v_pp.total_bookings < 3 THEN 50.0
    ELSE LEAST(v_pp.repeat_client_rate, 100.0)
  END;

  -- E) Verification (0-100) — all 5 badges, updated weights
  v_verif_score :=
    CASE WHEN COALESCE(v_pub.email_verified,         FALSE) THEN 20.0 ELSE 0 END +
    CASE WHEN COALESCE(v_pub.phone_verified,         FALSE) THEN 20.0 ELSE 0 END +
    CASE WHEN COALESCE(v_pub.identity_verified,      FALSE) THEN 25.0 ELSE 0 END +
    CASE WHEN COALESCE(v_pub.parent_approved,        FALSE) THEN 20.0 ELSE 0 END +
    CASE WHEN COALESCE(v_pub.verified_professional,  FALSE) THEN 15.0 ELSE 0 END;

  -- Weighted final (same weights as before)
  v_final := LEAST(100, ROUND(
    v_reviews_score    * 0.35 +
    v_completion_score * 0.25 +
    v_response_score   * 0.20 +
    v_repeat_score     * 0.10 +
    v_verif_score      * 0.10
  ));

  -- Derive level
  v_level := CASE
    WHEN v_final >= 90 THEN 5
    WHEN v_final >= 75 THEN 4
    WHEN v_final >= 55 THEN 3
    WHEN v_final >= 30 THEN 2
    ELSE 1
  END;

  UPDATE provider_profiles
  SET trust_score = v_final, trust_level = v_level
  WHERE user_id = p_user_id;
END;
$$;

-- Trigger: recompute trust when verification fields change on profiles
CREATE OR REPLACE FUNCTION trg_profile_verification_refresh()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only fire when a verification flag actually changed
  IF (NEW.email_verified       IS DISTINCT FROM OLD.email_verified      OR
      NEW.phone_verified        IS DISTINCT FROM OLD.phone_verified       OR
      NEW.identity_verified     IS DISTINCT FROM OLD.identity_verified    OR
      NEW.parent_approved       IS DISTINCT FROM OLD.parent_approved      OR
      NEW.verified_professional IS DISTINCT FROM OLD.verified_professional) THEN
    PERFORM compute_provider_trust_score(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_trust_on_verification ON profiles;
CREATE TRIGGER trg_refresh_trust_on_verification
  AFTER UPDATE OF
    email_verified, phone_verified, identity_verified,
    parent_approved, verified_professional
  ON profiles
  FOR EACH ROW EXECUTE FUNCTION trg_profile_verification_refresh();

-- Backfill with updated formula
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT user_id FROM provider_profiles LOOP
    PERFORM compute_provider_trust_score(r.user_id);
  END LOOP;
END;
$$;
