-- Part 6: Service Packages
-- Adds a packages JSONB column to provider_services.
-- Each element: { name, price, delivery_days, features[] }

ALTER TABLE public.provider_services
  ADD COLUMN IF NOT EXISTS packages JSONB NOT NULL DEFAULT '[]';
