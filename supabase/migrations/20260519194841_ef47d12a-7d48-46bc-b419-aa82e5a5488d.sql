
CREATE TABLE IF NOT EXISTS public.supplier_catalogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  filename text NOT NULL,
  storage_path text NOT NULL,
  mime text,
  size_bytes integer,
  products_created integer NOT NULL DEFAULT 0,
  products_updated integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_catalogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sc_catalogs owner all" ON public.supplier_catalogs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_supplier_catalogs_supplier ON public.supplier_catalogs(supplier_id);

-- Allow owners to manage their files in supplier-catalogs bucket
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='supplier_catalogs owner read') THEN
    CREATE POLICY "supplier_catalogs owner read" ON storage.objects FOR SELECT
      USING (bucket_id = 'supplier-catalogs' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='supplier_catalogs owner write') THEN
    CREATE POLICY "supplier_catalogs owner write" ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'supplier-catalogs' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='supplier_catalogs owner delete') THEN
    CREATE POLICY "supplier_catalogs owner delete" ON storage.objects FOR DELETE
      USING (bucket_id = 'supplier-catalogs' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
