ALTER TABLE public.product_variations
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS finish text;