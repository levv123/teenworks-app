-- Part 9: Service-specific requests with deadline + attachments + target provider
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS service_id          UUID REFERENCES public.provider_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_provider_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deadline_date       DATE,
  ADD COLUMN IF NOT EXISTS attachments         TEXT[] NOT NULL DEFAULT '{}';

-- Index for provider inbox queries
CREATE INDEX IF NOT EXISTS idx_service_requests_target_provider
  ON public.service_requests (target_provider_id, status);

CREATE INDEX IF NOT EXISTS idx_service_requests_service_id
  ON public.service_requests (service_id);
