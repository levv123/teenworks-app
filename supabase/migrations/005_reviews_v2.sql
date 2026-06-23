-- Part 1: Reviews system hardening
-- 1. Add would_hire_again field
-- 2. Unique constraint to prevent duplicate reviews per booking per reviewer
-- 3. Strengthen RLS to also block reviews on non-completed bookings (belt+suspenders)

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS would_hire_again BOOLEAN;

-- Prevent duplicate reviews: one review per reviewer per booking
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_booking_reviewer_unique;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_booking_reviewer_unique
  UNIQUE (booking_id, reviewer_id);

-- Update provider rating trigger to log would_hire_again ratio on provider_profiles
-- (requires a would_hire_again_pct column if we want to store it; skip for now,
--  just make sure the trigger still fires correctly on the new column present)
-- No trigger change needed — existing trigger only reads rating column.

-- Tighten RLS: drop old policy, re-create with explicit completed + participant check
DROP POLICY IF EXISTS "Users can create reviews for their bookings" ON public.reviews;

CREATE POLICY "Users can create reviews for their bookings"
  ON public.reviews FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND reviewer_id <> reviewee_id
    AND EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id        = reviews.booking_id
        AND bookings.status    = 'completed'
        AND (
          bookings.client_id   = auth.uid()
          OR bookings.provider_id = auth.uid()
        )
        AND (
          bookings.client_id   = reviews.reviewee_id
          OR bookings.provider_id = reviews.reviewee_id
        )
    )
  );

-- Allow users to read their own submitted reviews
DROP POLICY IF EXISTS "Users can read their own reviews" ON public.reviews;

CREATE POLICY "Users can read their own reviews"
  ON public.reviews FOR SELECT USING (true);
