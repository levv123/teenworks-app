-- ============================================================
-- Migration 012: Trust Score History & Milestones
-- Records every trust score change + milestone events
-- so providers can track their reputation growth over time.
-- ============================================================

-- ── trust_history table ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS trust_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID        NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,

  -- What kind of event triggered this entry
  event_type    TEXT        NOT NULL,
  -- e.g. 'score_change' | 'milestone' | 'level_up' | 'verification' | 'review_received'

  -- Score snapshot at time of event
  score_before  INTEGER,    -- null for first-ever entry
  score_after   INTEGER     NOT NULL,
  score_delta   INTEGER     GENERATED ALWAYS AS (
    CASE WHEN score_before IS NOT NULL THEN score_after - score_before ELSE NULL END
  ) STORED,

  -- Human-readable title + optional detail
  title         TEXT        NOT NULL,
  detail        TEXT,

  -- Structured metadata (e.g. { milestone_key: 'reviews_10', threshold: 10 })
  metadata      JSONB       NOT NULL DEFAULT '{}',

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-provider queries, newest-first
CREATE INDEX idx_trust_history_provider ON trust_history (provider_id, created_at DESC);

-- ── Trigger: record score change on provider_profiles ────────

CREATE OR REPLACE FUNCTION record_trust_score_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_level_before SMALLINT;
  v_level_after  SMALLINT;
BEGIN
  -- Only fire when trust_score actually changed
  IF OLD.trust_score IS NOT DISTINCT FROM NEW.trust_score THEN
    RETURN NEW;
  END IF;

  v_level_before := OLD.trust_level;
  v_level_after  := NEW.trust_level;

  -- 1. Insert score change event
  INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
  VALUES (
    NEW.user_id,
    'score_change',
    OLD.trust_score,
    NEW.trust_score,
    CASE
      WHEN NEW.trust_score > OLD.trust_score
        THEN 'Trust Score increased to ' || NEW.trust_score
      ELSE 'Trust Score changed to ' || NEW.trust_score
    END,
    CASE
      WHEN NEW.trust_score > OLD.trust_score
        THEN '+' || (NEW.trust_score - OLD.trust_score) || ' points'
      ELSE (NEW.trust_score - OLD.trust_score) || ' points'
    END,
    jsonb_build_object(
      'delta', NEW.trust_score - OLD.trust_score,
      'completion_rate', NEW.completion_rate,
      'review_count', NEW.review_count
    )
  );

  -- 2. Level-up event (when trust_level increases)
  IF v_level_after > v_level_before THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (
      NEW.user_id,
      'level_up',
      OLD.trust_score,
      NEW.trust_score,
      'Reached ' || CASE v_level_after
        WHEN 2 THEN 'Trusted Worker'
        WHEN 3 THEN 'Verified Pro'
        WHEN 4 THEN 'Elite Worker'
        WHEN 5 THEN 'TeenWorks Legend'
        ELSE 'Level ' || v_level_after
      END,
      'Level ' || v_level_before || ' → Level ' || v_level_after,
      jsonb_build_object('level_before', v_level_before, 'level_after', v_level_after)
    );
  END IF;

  -- 3. Score milestone events (round-number trust scores)
  IF NEW.trust_score >= 50 AND OLD.trust_score < 50 THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'milestone', OLD.trust_score, NEW.trust_score,
      'Reached Trust Score 50', 'Halfway to the top!',
      jsonb_build_object('milestone_key', 'score_50', 'threshold', 50));
  END IF;
  IF NEW.trust_score >= 75 AND OLD.trust_score < 75 THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'milestone', OLD.trust_score, NEW.trust_score,
      'Reached Trust Score 75', 'Elite Worker territory!',
      jsonb_build_object('milestone_key', 'score_75', 'threshold', 75));
  END IF;
  IF NEW.trust_score >= 90 AND OLD.trust_score < 90 THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'milestone', OLD.trust_score, NEW.trust_score,
      'Reached Trust Score 90', 'TeenWorks Legend status!',
      jsonb_build_object('milestone_key', 'score_90', 'threshold', 90));
  END IF;

  -- 4. Review count milestones
  IF NEW.review_count >= 1  AND OLD.review_count < 1  THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'milestone', OLD.trust_score, NEW.trust_score,
      'Received first review', 'Your reputation journey begins!',
      jsonb_build_object('milestone_key', 'reviews_1', 'threshold', 1));
  END IF;
  IF NEW.review_count >= 5  AND OLD.review_count < 5  THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'milestone', OLD.trust_score, NEW.trust_score,
      'Received 5th review', '5 clients trust your work.',
      jsonb_build_object('milestone_key', 'reviews_5', 'threshold', 5));
  END IF;
  IF NEW.review_count >= 10 AND OLD.review_count < 10 THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'milestone', OLD.trust_score, NEW.trust_score,
      'Received 10th review', '10 people have trusted you with their work.',
      jsonb_build_object('milestone_key', 'reviews_10', 'threshold', 10));
  END IF;
  IF NEW.review_count >= 25 AND OLD.review_count < 25 THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'milestone', OLD.trust_score, NEW.trust_score,
      'Received 25th review', 'A proven track record.',
      jsonb_build_object('milestone_key', 'reviews_25', 'threshold', 25));
  END IF;
  IF NEW.review_count >= 50 AND OLD.review_count < 50 THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'milestone', OLD.trust_score, NEW.trust_score,
      'Received 50th review', 'Half-century of satisfied clients!',
      jsonb_build_object('milestone_key', 'reviews_50', 'threshold', 50));
  END IF;

  -- 5. Completed bookings milestones
  IF NEW.completed_bookings >= 1  AND OLD.completed_bookings < 1  THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'milestone', OLD.trust_score, NEW.trust_score,
      'Completed first project', 'Your career starts here!',
      jsonb_build_object('milestone_key', 'jobs_1', 'threshold', 1));
  END IF;
  IF NEW.completed_bookings >= 5  AND OLD.completed_bookings < 5  THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'milestone', OLD.trust_score, NEW.trust_score,
      'Completed 5 projects', 'Building a solid work history.',
      jsonb_build_object('milestone_key', 'jobs_5', 'threshold', 5));
  END IF;
  IF NEW.completed_bookings >= 10 AND OLD.completed_bookings < 10 THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'milestone', OLD.trust_score, NEW.trust_score,
      'Completed 10 projects', 'Double digits — you''re on a roll!',
      jsonb_build_object('milestone_key', 'jobs_10', 'threshold', 10));
  END IF;
  IF NEW.completed_bookings >= 25 AND OLD.completed_bookings < 25 THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'milestone', OLD.trust_score, NEW.trust_score,
      'Completed 25 projects', 'Top 10% of TeenWorks providers.',
      jsonb_build_object('milestone_key', 'jobs_25', 'threshold', 25));
  END IF;
  IF NEW.completed_bookings >= 50 AND OLD.completed_bookings < 50 THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'milestone', OLD.trust_score, NEW.trust_score,
      'Completed 50 projects', 'Half-century of completed work!',
      jsonb_build_object('milestone_key', 'jobs_50', 'threshold', 50));
  END IF;
  IF NEW.completed_bookings >= 100 AND OLD.completed_bookings < 100 THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'milestone', OLD.trust_score, NEW.trust_score,
      'Completed 100 projects', 'Century club — legendary achievement!',
      jsonb_build_object('milestone_key', 'jobs_100', 'threshold', 100));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_record_trust_history
  AFTER UPDATE ON provider_profiles
  FOR EACH ROW
  EXECUTE FUNCTION record_trust_score_change();

-- ── Trigger: verification events (fire on profiles table) ────

CREATE OR REPLACE FUNCTION record_verification_event()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_score INTEGER;
BEGIN
  -- Look up current trust score
  SELECT trust_score INTO v_score
  FROM provider_profiles WHERE user_id = NEW.user_id;

  IF v_score IS NULL THEN RETURN NEW; END IF;

  IF NEW.email_verified AND NOT OLD.email_verified THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'verification', v_score, v_score,
      'Email address verified', '+20 trust points unlocked',
      jsonb_build_object('badge', 'email_verified', 'trust_pts', 20));
  END IF;
  IF NEW.phone_verified AND NOT OLD.phone_verified THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'verification', v_score, v_score,
      'Phone number verified', '+20 trust points unlocked',
      jsonb_build_object('badge', 'phone_verified', 'trust_pts', 20));
  END IF;
  IF NEW.identity_verified AND NOT OLD.identity_verified THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'verification', v_score, v_score,
      'Identity verified', '+25 trust points unlocked',
      jsonb_build_object('badge', 'identity_verified', 'trust_pts', 25));
  END IF;
  IF NEW.parent_approved AND NOT OLD.parent_approved THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'verification', v_score, v_score,
      'Parent approval received', '+20 trust points unlocked',
      jsonb_build_object('badge', 'parent_approved', 'trust_pts', 20));
  END IF;
  IF NEW.verified_professional AND NOT OLD.verified_professional THEN
    INSERT INTO trust_history (provider_id, event_type, score_before, score_after, title, detail, metadata)
    VALUES (NEW.user_id, 'verification', v_score, v_score,
      'Verified Professional status earned', '+15 trust points unlocked',
      jsonb_build_object('badge', 'verified_professional', 'trust_pts', 15));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_record_verification_history
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION record_verification_event();

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE trust_history ENABLE ROW LEVEL SECURITY;

-- Providers can only read their own history
CREATE POLICY "provider_read_own_trust_history"
  ON trust_history FOR SELECT
  USING (provider_id = auth.uid());

-- Service role can insert (triggers run as owner, so this covers trigger inserts)
CREATE POLICY "service_role_insert_trust_history"
  ON trust_history FOR INSERT
  WITH CHECK (true);
