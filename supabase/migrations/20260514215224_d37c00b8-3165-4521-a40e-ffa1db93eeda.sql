
-- Allow 'service' as a category kind
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_kind_check;
ALTER TABLE public.categories ADD CONSTRAINT categories_kind_check
  CHECK (kind = ANY (ARRAY['income'::text, 'expense'::text, 'product'::text, 'service'::text]));

-- Storage bucket for supplier catalogs (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-catalogs', 'supplier-catalogs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies: users can manage files in their own folder (user_id/...)
DO $$ BEGIN
  CREATE POLICY "supplier catalogs owner read" ON storage.objects
    FOR SELECT USING (bucket_id = 'supplier-catalogs' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "supplier catalogs owner insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'supplier-catalogs' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "supplier catalogs owner delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'supplier-catalogs' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
