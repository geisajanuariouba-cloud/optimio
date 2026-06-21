CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.marketing_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  channel TEXT DEFAULT 'instagram',
  scheduled_for DATE,
  status TEXT NOT NULL DEFAULT 'idea',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.marketing_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mp own select" ON public.marketing_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mp own insert" ON public.marketing_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mp own update" ON public.marketing_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "mp own delete" ON public.marketing_posts FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_marketing_posts_updated_at BEFORE UPDATE ON public.marketing_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();