ALTER TABLE public.supplier_catalogs
  ADD COLUMN IF NOT EXISTS processing_stage text NOT NULL DEFAULT 'enviado',
  ADD COLUMN IF NOT EXISTS total_chunks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processed_chunks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS products_extracted integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS partial_reason text;

CREATE TABLE IF NOT EXISTS public.supplier_catalog_chunks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_id uuid NOT NULL,
  user_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  storage_path text NOT NULL,
  chunk_index integer NOT NULL,
  page_start integer,
  page_end integer,
  pages integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'enviado',
  products_extracted integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  last_heartbeat_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (catalog_id, chunk_index)
);

ALTER TABLE public.supplier_catalog_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_catalog_chunks owner all"
ON public.supplier_catalog_chunks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_supplier_catalog_chunks_catalog ON public.supplier_catalog_chunks(catalog_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_supplier_catalogs_processing ON public.supplier_catalogs(user_id, supplier_id, processing_status, last_heartbeat_at);