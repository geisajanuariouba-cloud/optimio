
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog-images', 'catalog-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'catalog-images public read' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "catalog-images public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'catalog-images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'catalog-images auth upload' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "catalog-images auth upload"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'catalog-images' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'catalog-images auth update' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "catalog-images auth update"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'catalog-images' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'catalog-images auth delete' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "catalog-images auth delete"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'catalog-images' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
