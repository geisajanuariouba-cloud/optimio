
-- 1) site_orders: restrict anonymous insert to valid published site + matching user_id
DROP POLICY IF EXISTS "so public insert" ON public.site_orders;

CREATE POLICY "so public insert valid site"
ON public.site_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  site_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.sites s
    WHERE s.id = site_orders.site_id
      AND s.user_id = site_orders.user_id
      AND s.published = true
  )
);

-- 2) system_settings: restrict global read to authenticated users
DROP POLICY IF EXISTS "ss global public read" ON public.system_settings;

CREATE POLICY "ss global authenticated read"
ON public.system_settings
FOR SELECT
TO authenticated
USING (scope = 'global');
