-- ============================================================
-- Migration 018: "Other" category for Post a Service
--
-- The Post a Service category grid ends with a "More" tile for work
-- that fits none of the listed categories. provider_services needs a
-- category_id for it, and no existing category means "other".
-- ============================================================

-- Same columns and ON CONFLICT as seed.sql and migration 017.
INSERT INTO public.categories (id, name, icon, description, color) VALUES
  ('c1000000-0000-0000-0000-000000000012', 'Other', 'ellipsis-horizontal', 'Services that fit no other category', '#8E8E93')
ON CONFLICT (name) DO NOTHING;
