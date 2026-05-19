
ALTER TABLE public.supplier_catalogs
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS total_pages int,
  ADD COLUMN IF NOT EXISTS processed_pages int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.supplier_catalogs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS internal_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chunk_index int,
  ADD COLUMN IF NOT EXISTS page_start int,
  ADD COLUMN IF NOT EXISTS page_end int;

CREATE INDEX IF NOT EXISTS idx_supplier_catalogs_parent ON public.supplier_catalogs(parent_id);

UPDATE storage.buckets SET file_size_limit = 209715200 WHERE id = 'supplier-catalogs';
