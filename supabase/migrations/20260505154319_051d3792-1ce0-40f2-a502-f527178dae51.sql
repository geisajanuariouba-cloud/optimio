
-- 1) Per-tenant integrations
CREATE TABLE public.tenant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL, -- 'shopify' | 'stripe' | 'make'
  status TEXT NOT NULL DEFAULT 'disconnected', -- connected|disconnected|error
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);
ALTER TABLE public.tenant_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own integrations select" ON public.tenant_integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own integrations insert" ON public.tenant_integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own integrations update" ON public.tenant_integrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own integrations delete" ON public.tenant_integrations FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_tenant_integrations_upd BEFORE UPDATE ON public.tenant_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Legal pages (AI generated)
CREATE TABLE public.legal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  page_type TEXT NOT NULL, -- 'terms'|'privacy'|'refund'|'cookies'|'shipping'
  title TEXT NOT NULL,
  html_content TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  published BOOLEAN NOT NULL DEFAULT false,
  generated_by TEXT, -- model used
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own legal select" ON public.legal_pages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own legal insert" ON public.legal_pages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own legal update" ON public.legal_pages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own legal delete" ON public.legal_pages FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "public read published legal" ON public.legal_pages FOR SELECT USING (published = true);
CREATE TRIGGER trg_legal_pages_upd BEFORE UPDATE ON public.legal_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Audit log (trash actions, sensitive ops)
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'restore'|'purge'|'delete'|'refund'
  entity_table TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own audit select" ON public.audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own audit insert" ON public.audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);
