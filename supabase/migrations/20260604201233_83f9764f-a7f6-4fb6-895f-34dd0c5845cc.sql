
-- Card machines
CREATE TABLE IF NOT EXISTS public.card_machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  operator text,
  plan_name text,
  rates jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_machines TO authenticated;
GRANT ALL ON public.card_machines TO service_role;
ALTER TABLE public.card_machines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cm_tenant_all ON public.card_machines;
CREATE POLICY cm_tenant_all ON public.card_machines FOR ALL TO authenticated
  USING (user_id = COALESCE(public.current_tenant_owner(), auth.uid()))
  WITH CHECK (user_id = COALESCE(public.current_tenant_owner(), auth.uid()));
DROP TRIGGER IF EXISTS trg_cm_updated ON public.card_machines;
CREATE TRIGGER trg_cm_updated BEFORE UPDATE ON public.card_machines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Plan history
CREATE TABLE IF NOT EXISTS public.card_machine_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_machine_id uuid NOT NULL REFERENCES public.card_machines(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  rates jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_machine_plans TO authenticated;
GRANT ALL ON public.card_machine_plans TO service_role;
ALTER TABLE public.card_machine_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cmp_tenant_all ON public.card_machine_plans;
CREATE POLICY cmp_tenant_all ON public.card_machine_plans FOR ALL TO authenticated
  USING (user_id = COALESCE(public.current_tenant_owner(), auth.uid()))
  WITH CHECK (user_id = COALESCE(public.current_tenant_owner(), auth.uid()));

-- Marketplaces
CREATE TABLE IF NOT EXISTS public.marketplaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplaces TO authenticated;
GRANT ALL ON public.marketplaces TO service_role;
ALTER TABLE public.marketplaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mk_tenant_all ON public.marketplaces;
CREATE POLICY mk_tenant_all ON public.marketplaces FOR ALL TO authenticated
  USING (user_id = COALESCE(public.current_tenant_owner(), auth.uid()))
  WITH CHECK (user_id = COALESCE(public.current_tenant_owner(), auth.uid()));
DROP TRIGGER IF EXISTS trg_mk_updated ON public.marketplaces;
CREATE TRIGGER trg_mk_updated BEFORE UPDATE ON public.marketplaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Marketplace product stock allocations
CREATE TABLE IF NOT EXISTS public.marketplace_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  marketplace_id uuid NOT NULL REFERENCES public.marketplaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reserved numeric NOT NULL DEFAULT 0,
  external_sku text,
  external_price numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marketplace_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_stock TO authenticated;
GRANT ALL ON public.marketplace_stock TO service_role;
ALTER TABLE public.marketplace_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mks_tenant_all ON public.marketplace_stock;
CREATE POLICY mks_tenant_all ON public.marketplace_stock FOR ALL TO authenticated
  USING (user_id = COALESCE(public.current_tenant_owner(), auth.uid()))
  WITH CHECK (user_id = COALESCE(public.current_tenant_owner(), auth.uid()));
DROP TRIGGER IF EXISTS trg_mks_updated ON public.marketplace_stock;
CREATE TRIGGER trg_mks_updated BEFORE UPDATE ON public.marketplace_stock
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
