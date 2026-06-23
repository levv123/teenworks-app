-- Part 4: direct service bookings + saved services
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.provider_services(id);

CREATE TABLE IF NOT EXISTS public.saved_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.provider_services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, service_id)
);

ALTER TABLE public.saved_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_services_owner"
  ON public.saved_services FOR ALL USING (auth.uid() = user_id);
