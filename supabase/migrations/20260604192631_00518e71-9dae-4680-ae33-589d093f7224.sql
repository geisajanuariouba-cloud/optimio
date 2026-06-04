-- Knowledge base articles
CREATE TABLE public.knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'published',
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_articles TO authenticated;
GRANT ALL ON public.knowledge_articles TO service_role;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ka tenant read" ON public.knowledge_articles FOR SELECT TO authenticated
  USING (user_id = public.current_tenant_owner());
CREATE POLICY "ka owner write" ON public.knowledge_articles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_ka_updated BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- User dashboard preferences
CREATE TABLE public.user_dashboard_prefs (
  user_id uuid PRIMARY KEY,
  hidden_widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  widget_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_dashboard_prefs TO authenticated;
GRANT ALL ON public.user_dashboard_prefs TO service_role;
ALTER TABLE public.user_dashboard_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "udp self" ON public.user_dashboard_prefs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_udp_updated BEFORE UPDATE ON public.user_dashboard_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();