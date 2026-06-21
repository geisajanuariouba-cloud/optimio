
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  whatsapp_link TEXT,
  support_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read all" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.app_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
INSERT INTO public.app_settings (id, whatsapp_link) VALUES (1, '') ON CONFLICT DO NOTHING;
