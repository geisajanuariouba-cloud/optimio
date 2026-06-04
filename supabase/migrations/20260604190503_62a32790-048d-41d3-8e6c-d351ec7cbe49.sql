
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid;

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  company text,
  phone text,
  email text,
  potential_value numeric(12,2) NOT NULL DEFAULT 0,
  responsible_user_id uuid,
  notes text,
  stage text NOT NULL DEFAULT 'novo' CHECK (stage IN ('novo','contato','proposta','negociacao','fechado','perdido')),
  position integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads owner all" ON public.leads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leads team access" ON public.leads
  TO authenticated
  USING (user_id = public.current_tenant_owner())
  WITH CHECK (user_id = public.current_tenant_owner());

CREATE INDEX IF NOT EXISTS leads_user_stage_idx ON public.leads(user_id, stage, position);

CREATE TRIGGER leads_upd BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
