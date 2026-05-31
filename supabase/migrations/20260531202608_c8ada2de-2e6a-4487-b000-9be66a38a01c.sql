
-- Public landing-assets bucket for demo video / hero media uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('landing-assets', 'landing-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read
DROP POLICY IF EXISTS "landing-assets public read" ON storage.objects;
CREATE POLICY "landing-assets public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'landing-assets');

-- Admin write (insert/update/delete)
DROP POLICY IF EXISTS "landing-assets admin insert" ON storage.objects;
CREATE POLICY "landing-assets admin insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'landing-assets' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "landing-assets admin update" ON storage.objects;
CREATE POLICY "landing-assets admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'landing-assets' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "landing-assets admin delete" ON storage.objects;
CREATE POLICY "landing-assets admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'landing-assets' AND public.has_role(auth.uid(), 'admin'));
