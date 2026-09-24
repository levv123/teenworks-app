-- ============================================================
-- Migration 017: Post a Service compatibility
--
-- The Post a Service form collects four things provider_services
-- cannot hold today. Each is added as a new column with a default
-- (or NULL), so every existing row, query and screen keeps working:
--
--   pricing_type      hourly vs fixed. starting_price alone can't say
--                     whether $25 is per hour or for the whole job.
--   duration_minutes  how long the job takes. delivery_days is a
--                     turnaround in whole days and is used by the
--                     browse filter, so it is left as it is.
--   location          the place label the service is offered in
--                     ("Surfside, FL"). Services had no location.
--   availability_days the days this service is offered. The only
--                     existing field, provider_profiles.availability_days,
--                     is per provider: writing it from one service's
--                     form would change the days on all their others.
--
-- It also adds the three categories the form offers that the
-- categories table is missing, so every pick resolves to a category_id.
-- ============================================================

ALTER TABLE public.provider_services
  ADD COLUMN IF NOT EXISTS pricing_type TEXT NOT NULL DEFAULT 'fixed'
    CHECK (pricing_type IN ('fixed', 'hourly')),
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER
    CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS availability_days TEXT[] NOT NULL DEFAULT '{}'
    CHECK (availability_days <@ ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun']::TEXT[]);

-- Same columns and ON CONFLICT as seed.sql, so re-running either is harmless.
INSERT INTO public.categories (id, name, icon, description, color) VALUES
  ('c1000000-0000-0000-0000-000000000009', 'Yard Work', 'leaf',   'Mowing, raking, weeding and yard cleanup', '#32D74B'),
  ('c1000000-0000-0000-0000-000000000010', 'Tech Help', 'laptop', 'Phone, computer and smart-home setup',     '#BF7BFF'),
  ('c1000000-0000-0000-0000-000000000011', 'Errands',   'bicycle','Pickups, drop-offs and running errands',   '#FFD60A')
ON CONFLICT (name) DO NOTHING;
