
-- Wave 4: tenant visual identity
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS secondary_color text,
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS logo_palette jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Logos bucket (public, per-user folder)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-logos', 'tenant-logos', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "tenant-logos public read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'tenant-logos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "tenant-logos owner upload"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'tenant-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "tenant-logos owner update"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'tenant-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "tenant-logos owner delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'tenant-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
