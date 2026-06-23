-- Part 4: Bidirectional reviews — workers can review clients
-- Add reviewee_role to distinguish provider-reviews from client-reviews
-- Also extend the category_ratings CHECK to allow client-specific keys.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS reviewee_role TEXT
    CHECK (reviewee_role IN ('provider', 'client'));

-- Back-fill: all existing reviews were clients reviewing providers
UPDATE public.reviews SET reviewee_role = 'provider' WHERE reviewee_role IS NULL;

-- Make non-nullable now that it's back-filled
ALTER TABLE public.reviews
  ALTER COLUMN reviewee_role SET NOT NULL,
  ALTER COLUMN reviewee_role SET DEFAULT 'provider';

-- Drop the old category_ratings constraint and replace with an extended one
-- that also allows client-specific keys (fairness, payment_reliability).
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_category_ratings_valid;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_category_ratings_valid CHECK (
    category_ratings IS NULL
    OR (
      -- Worker-review keys
      (category_ratings->>'quality'           IS NULL OR (category_ratings->>'quality')::numeric           BETWEEN 1 AND 5)
      AND (category_ratings->>'communication' IS NULL OR (category_ratings->>'communication')::numeric     BETWEEN 1 AND 5)
      AND (category_ratings->>'reliability'   IS NULL OR (category_ratings->>'reliability')::numeric       BETWEEN 1 AND 5)
      AND (category_ratings->>'professionalism' IS NULL OR (category_ratings->>'professionalism')::numeric BETWEEN 1 AND 5)
      AND (category_ratings->>'timeliness'    IS NULL OR (category_ratings->>'timeliness')::numeric        BETWEEN 1 AND 5)
      -- Client-review keys
      AND (category_ratings->>'fairness'          IS NULL OR (category_ratings->>'fairness')::numeric          BETWEEN 1 AND 5)
      AND (category_ratings->>'payment_reliability' IS NULL OR (category_ratings->>'payment_reliability')::numeric BETWEEN 1 AND 5)
    )
  );

-- Index for fast client-review lookup on a profile page
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_role
  ON public.reviews (reviewee_id, reviewee_role, created_at DESC);
