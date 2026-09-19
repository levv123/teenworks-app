-- Migration 017: listing-level fields for the redesigned 3-step "Post a Service" flow
-- Adds rate type (hourly/fixed), estimated duration, display location and
-- per-listing availability days to provider_services.
--
-- All columns are additive with defaults, so existing rows and every existing
-- query keep working untouched. The app also degrades gracefully if this
-- migration has not been applied yet (see safeServiceWrite in src/api/services.ts),
-- but the four fields simply will not persist until it is.
--
-- Idempotent: safe to re-run.

ALTER TABLE public.provider_services
  ADD COLUMN IF NOT EXISTS rate_type         TEXT NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS duration_hours    NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS location_text     TEXT,
  ADD COLUMN IF NOT EXISTS availability_days TEXT[] NOT NULL DEFAULT '{}';

-- Constrain rate_type the same way service_requests.status is constrained.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'provider_services_rate_type_check'
  ) THEN
    ALTER TABLE public.provider_services
      ADD CONSTRAINT provider_services_rate_type_check
      CHECK (rate_type IN ('hourly', 'fixed'));
  END IF;
END $$;

COMMENT ON COLUMN public.provider_services.rate_type IS
  'How starting_price should be read: ''hourly'' renders as $X/hr, ''fixed'' as a flat price.';
COMMENT ON COLUMN public.provider_services.duration_hours IS
  'Typical time the job takes, in hours. Distinct from delivery_days, which is turnaround/lead time.';
COMMENT ON COLUMN public.provider_services.location_text IS
  'Human-readable service area shown on the listing, e.g. "Surfside, FL". Display only — not queryable geo.';
COMMENT ON COLUMN public.provider_services.availability_days IS
  'Per-listing weekday availability, e.g. {Mon,Tue,Sat}. Distinct from provider_profiles.availability_days.';
