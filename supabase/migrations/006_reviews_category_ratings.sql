-- Part 3: Category ratings on reviews
-- Adds a JSONB column storing per-category scores (1-5 each).
-- Structure: { quality, communication, reliability, professionalism, timeliness }
-- All fields optional – legacy reviews without category_ratings stay valid.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS category_ratings JSONB;

-- Validate shape when present: each sub-key must be 1-5
-- (soft constraint via check; hard enforcement lives in app layer)
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_category_ratings_valid;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_category_ratings_valid CHECK (
    category_ratings IS NULL
    OR (
      (category_ratings->>'quality'        IS NULL OR (category_ratings->>'quality')::numeric BETWEEN 1 AND 5)
      AND (category_ratings->>'communication'   IS NULL OR (category_ratings->>'communication')::numeric BETWEEN 1 AND 5)
      AND (category_ratings->>'reliability'     IS NULL OR (category_ratings->>'reliability')::numeric BETWEEN 1 AND 5)
      AND (category_ratings->>'professionalism' IS NULL OR (category_ratings->>'professionalism')::numeric BETWEEN 1 AND 5)
      AND (category_ratings->>'timeliness'      IS NULL OR (category_ratings->>'timeliness')::numeric BETWEEN 1 AND 5)
    )
  );
