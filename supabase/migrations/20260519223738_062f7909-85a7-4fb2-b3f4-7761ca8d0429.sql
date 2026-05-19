
-- ============ subscriptions: novos campos ============
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_customer_id text,
  ADD COLUMN IF NOT EXISTS provider_subscription_id text,
  ADD COLUMN IF NOT EXISTS provider_product_id text,
  ADD COLUMN IF NOT EXISTS provider_plan_name text,
  ADD COLUMN IF NOT EXISTS internal_plan text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_provider_sub_unique
  ON public.subscriptions(provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

-- ============ billing_events ============
CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  provider text NOT NULL,
  event_type text NOT NULL,
  event_id text NOT NULL,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'received',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS billing_events_provider_event_unique
  ON public.billing_events(provider, event_id);
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_events admin read" ON public.billing_events
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "billing_events owner read" ON public.billing_events
  FOR SELECT USING (auth.uid() = user_id);

-- ============ team_members ============
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  member_user_id uuid NOT NULL,
  name text,
  email text,
  role text NOT NULL DEFAULT 'recepcao',
  status text NOT NULL DEFAULT 'active',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, member_user_id)
);
CREATE INDEX IF NOT EXISTS team_members_member_idx ON public.team_members(member_user_id);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tm owner all" ON public.team_members
  FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "tm member read self" ON public.team_members
  FOR SELECT USING (auth.uid() = member_user_id);

-- ============ team_invites ============
CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'recepcao',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ti owner all" ON public.team_invites
  FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);
-- token lookup público controlado por edge function; sem policy de SELECT pública.

-- ============ audit_logs ============
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  actor_user_id uuid,
  action text NOT NULL,
  module text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "al owner read" ON public.audit_logs
  FOR SELECT USING (auth.uid() = owner_user_id);
CREATE POLICY "al actor insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = actor_user_id OR auth.uid() = owner_user_id);

-- ============ onboarding_status ============
CREATE TABLE IF NOT EXISTS public.onboarding_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  completed boolean NOT NULL DEFAULT false,
  current_step text,
  niche text,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "os owner all" ON public.onboarding_status
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ system_settings ============
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global',
  owner_user_id uuid,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS system_settings_unique
  ON public.system_settings(scope, COALESCE(owner_user_id, '00000000-0000-0000-0000-000000000000'::uuid), key);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ss global public read" ON public.system_settings
  FOR SELECT USING (scope = 'global');
CREATE POLICY "ss admin write global" ON public.system_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND scope = 'global')
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND scope = 'global');
CREATE POLICY "ss tenant owner all" ON public.system_settings
  FOR ALL USING (scope = 'tenant' AND auth.uid() = owner_user_id)
  WITH CHECK (scope = 'tenant' AND auth.uid() = owner_user_id);

-- ============ funções ============
CREATE OR REPLACE FUNCTION public.current_tenant_owner()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT owner_user_id FROM public.team_members
       WHERE member_user_id = auth.uid() AND status = 'active' LIMIT 1),
    auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE member_user_id = _user_id
      AND status = 'active'
      AND (
        role = 'admin_master'
        OR (permissions ? _key AND (permissions->>_key)::boolean = true)
      )
  ) OR EXISTS (
    -- dono da própria conta sempre tem permissão
    SELECT 1 WHERE _user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.team_members WHERE member_user_id = _user_id AND status='active')
  );
$$;

-- trigger updated_at
DROP TRIGGER IF EXISTS tg_tm_updated ON public.team_members;
CREATE TRIGGER tg_tm_updated BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS tg_os_updated ON public.onboarding_status;
CREATE TRIGGER tg_os_updated BEFORE UPDATE ON public.onboarding_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS tg_ss_updated ON public.system_settings;
CREATE TRIGGER tg_ss_updated BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ seed planos ============
INSERT INTO public.plans (slug, name, price, description, modules, limits, active, sort_order)
VALUES
  ('basic','Básico',0,'Essencial para começar','[]'::jsonb,'{"max_users":1}'::jsonb,true,1),
  ('pro','Pro',0,'Mais recursos','[]'::jsonb,'{"max_users":3}'::jsonb,true,2),
  ('advanced','Avançado',0,'Multiusuário e tudo liberado','[]'::jsonb,'{"max_users":9999}'::jsonb,true,3)
ON CONFLICT DO NOTHING;

-- seed system_settings keys (placeholders vazios)
INSERT INTO public.system_settings (scope, key, value) VALUES
  ('global','checkout_basic_url','""'::jsonb),
  ('global','checkout_pro_url','""'::jsonb),
  ('global','checkout_advanced_url','""'::jsonb),
  ('global','kiwify_product_map','{}'::jsonb),
  ('global','demo_video_url','""'::jsonb)
ON CONFLICT DO NOTHING;
