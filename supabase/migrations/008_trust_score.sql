-- Trust Score System Part 1
-- Persists a 0-100 trust score on provider_profiles, maintained by triggers.
-- Formula:
--   Verification     30 pts  (email 8, phone 8, identity 10, parent 4)
--   Rating Quality   25 pts  (avg_rating/5 × 25, dampened until 3 reviews)
--   Review Volume    15 pts  (capped at 10 reviews)
--   Would Hire Again 10 pts  (% × 10, only counts with 3+ reviews)
--   Profile Complete 15 pts  (avatar 3, bio 4, skills3 3, rate 2, portfolio 3)
--   Tenure            5 pts  (capped at 6 months)

-- ── 1. Add column ─────────────────────────────────────────────
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 0;

-- ── 2. Add FK so Supabase can join provider_profiles from provider_services
--       (allows: select '*, pp:provider_profiles!fk_ps_pp(trust_score)' on services)
ALTER TABLE public.provider_services
  DROP CONSTRAINT IF EXISTS fk_ps_provider_profile;

ALTER TABLE public.provider_services
  ADD CONSTRAINT fk_ps_provider_profile
  FOREIGN KEY (provider_id) REFERENCES public.provider_profiles(user_id)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- ── 3. Compute function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_provider_trust_score(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile        RECORD;
  v_pp             RECORD;
  v_score          NUMERIC := 0;
  v_review_count   INTEGER := 0;
  v_avg_rating     NUMERIC := 0;
  v_hire_pct       NUMERIC := 0;
  v_hire_total     INTEGER := 0;
  v_age_days       NUMERIC := 0;
  v_has_portfolio  BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_profile FROM public.profiles         WHERE user_id = p_user_id;
  SELECT * INTO v_pp      FROM public.provider_profiles WHERE user_id = p_user_id;
  IF v_profile IS NULL OR v_pp IS NULL THEN RETURN 0; END IF;

  -- A) Verification (30 pts)
  IF v_profile.email_verified    THEN v_score := v_score + 8;  END IF;
  IF v_profile.phone_verified    THEN v_score := v_score + 8;  END IF;
  IF v_profile.identity_verified THEN v_score := v_score + 10; END IF;
  IF v_profile.parent_approved   THEN v_score := v_score + 4;  END IF;

  -- B) Rating Quality (25 pts) — dampened until 3 reviews
  v_review_count := COALESCE(v_pp.review_count, 0);
  v_avg_rating   := COALESCE(v_pp.rating, 0);
  IF v_review_count > 0 THEN
    v_score := v_score
      + (v_avg_rating / 5.0) * 25.0 * LEAST(v_review_count::NUMERIC / 3.0, 1.0);
  END IF;

  -- C) Review Volume (15 pts, caps at 10 reviews)
  v_score := v_score + LEAST(v_review_count::NUMERIC / 10.0, 1.0) * 15.0;

  -- D) Would Hire Again (10 pts, needs 3+ opinionated reviews)
  SELECT
    COUNT(*) FILTER (WHERE would_hire_again IS NOT NULL),
    COALESCE(
      SUM(CASE WHEN would_hire_again = true THEN 1 ELSE 0 END)::NUMERIC
      / NULLIF(COUNT(*) FILTER (WHERE would_hire_again IS NOT NULL), 0),
      0
    ) * 10.0
  INTO v_hire_total, v_hire_pct
  FROM public.reviews
  WHERE reviewee_id = p_user_id AND reviewee_role = 'provider';

  IF v_hire_total >= 3 THEN
    v_score := v_score + v_hire_pct;
  END IF;

  -- E) Profile Completeness (15 pts)
  IF v_profile.avatar_url IS NOT NULL THEN v_score := v_score + 3; END IF;
  IF v_pp.bio IS NOT NULL AND length(v_pp.bio) > 20 THEN v_score := v_score + 4; END IF;
  IF array_length(v_pp.skills, 1) >= 3 THEN v_score := v_score + 3; END IF;
  IF v_pp.hourly_rate IS NOT NULL THEN v_score := v_score + 2; END IF;

  -- Portfolio check (3 pts)
  SELECT EXISTS(
    SELECT 1 FROM public.portfolio WHERE user_id = p_user_id LIMIT 1
  ) INTO v_has_portfolio;
  IF v_has_portfolio THEN v_score := v_score + 3; END IF;

  -- F) Account Tenure (5 pts, caps at 6 months)
  v_age_days := EXTRACT(EPOCH FROM (NOW() - v_profile.created_at)) / 86400.0;
  v_score := v_score + LEAST(v_age_days / 180.0, 1.0) * 5.0;

  RETURN LEAST(100, ROUND(v_score)::INTEGER);
END;
$$;

-- ── 4. Trigger function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_refresh_trust_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Determine which provider to update
  IF TG_TABLE_NAME = 'reviews' THEN
    -- reviews.reviewee_id is the provider being rated
    v_user_id := COALESCE(NEW.reviewee_id, OLD.reviewee_id);
    -- Only recalculate for provider-role reviews
    IF COALESCE(NEW.reviewee_role, OLD.reviewee_role) <> 'provider' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  ELSIF TG_TABLE_NAME = 'portfolio' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'provider_profiles' THEN
    -- Avoid infinite loop: only recalculate if trust_score wasn't just set
    IF NEW.trust_score IS DISTINCT FROM OLD.trust_score THEN
      RETURN NEW;
    END IF;
    v_user_id := NEW.user_id;
  END IF;

  UPDATE public.provider_profiles
    SET trust_score = public.compute_provider_trust_score(v_user_id)
  WHERE user_id = v_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── 5. Attach triggers ────────────────────────────────────────

-- On review changes
DROP TRIGGER IF EXISTS trg_trust_on_review  ON public.reviews;
CREATE TRIGGER trg_trust_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_trust_score();

-- On profile changes (verification flags, avatar)
DROP TRIGGER IF EXISTS trg_trust_on_profile ON public.profiles;
CREATE TRIGGER trg_trust_on_profile
  AFTER UPDATE OF email_verified, phone_verified, identity_verified,
                  parent_approved, avatar_url ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_trust_score();

-- On provider_profile changes (bio, skills, rate)
DROP TRIGGER IF EXISTS trg_trust_on_pp ON public.provider_profiles;
CREATE TRIGGER trg_trust_on_pp
  AFTER UPDATE OF bio, skills, hourly_rate, rating, review_count ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_trust_score();

-- On portfolio changes
DROP TRIGGER IF EXISTS trg_trust_on_portfolio ON public.portfolio;
CREATE TRIGGER trg_trust_on_portfolio
  AFTER INSERT OR DELETE ON public.portfolio
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_trust_score();

-- ── 6. Backfill ───────────────────────────────────────────────
UPDATE public.provider_profiles
  SET trust_score = public.compute_provider_trust_score(user_id);

-- ── 7. Index for browse sorting by trust_score ────────────────
CREATE INDEX IF NOT EXISTS idx_provider_profiles_trust_score
  ON public.provider_profiles (trust_score DESC);
