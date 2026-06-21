
-- 1) audit_logs: team access SELECT for tenant members
CREATE POLICY "al team read" ON public.audit_logs
FOR SELECT TO authenticated
USING (owner_user_id = public.current_tenant_owner());

-- 2) catalog_review_items: explicit owner ALL policy
CREATE POLICY "cri owner all" ON public.catalog_review_items
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3) payment_proofs: allow owner INSERT
CREATE POLICY "pp owner insert" ON public.payment_proofs
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4) stock_movements: explicit owner ALL policy
CREATE POLICY "sm owner all" ON public.stock_movements
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5) system_settings: restrict global read to a public allow-list of keys
DROP POLICY IF EXISTS "ss global authenticated read" ON public.system_settings;

CREATE POLICY "ss global public keys read" ON public.system_settings
FOR SELECT TO anon, authenticated
USING (
  scope = 'global'
  AND key IN (
    'checkout_basic_url',
    'checkout_pro_url',
    'checkout_advanced_url',
    'demo_video_url'
  )
);

CREATE POLICY "ss global admin read" ON public.system_settings
FOR SELECT TO authenticated
USING (scope = 'global' AND public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.system_settings TO anon;
