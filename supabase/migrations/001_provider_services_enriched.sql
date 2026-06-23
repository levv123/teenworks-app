-- Services Marketplace Part 2: add category, images, faq, portfolio_examples to provider_services
ALTER TABLE public.provider_services
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id),
  ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS faq JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS portfolio_examples UUID[] NOT NULL DEFAULT '{}';
