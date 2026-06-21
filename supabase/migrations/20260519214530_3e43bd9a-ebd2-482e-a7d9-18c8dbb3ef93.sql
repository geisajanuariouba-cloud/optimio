ALTER TABLE public.supplier_catalog_chunks
  ADD COLUMN IF NOT EXISTS extracted_products jsonb NOT NULL DEFAULT '[]'::jsonb;