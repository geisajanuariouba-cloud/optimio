
-- PLANS (editáveis pelo Super Admin)
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  description text,
  modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans read all auth" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "plans admin write" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER plans_updated BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.plans (slug,name,price,sort_order,modules) VALUES
  ('basic','Basic',159,1,'["dashboard","appointments","clients","financial"]'::jsonb),
  ('standard','Standard',199,2,'["dashboard","appointments","clients","packages","services","products","financial","marketing"]'::jsonb),
  ('unlimited','Unlimited',399,3,'["dashboard","appointments","clients","packages","services","products","financial","marketing","anamnesis","site","integrations"]'::jsonb);

-- SUBSCRIPTIONS (ciclos 30d)
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_slug text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending|active|overdue|canceled|banned
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  last_paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subs_user ON public.subscriptions(user_id);
CREATE INDEX idx_subs_period ON public.subscriptions(current_period_end);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs owner read" ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "subs admin write" ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER subs_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PAYMENT PROOFS
CREATE TABLE public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  paid_at timestamptz NOT NULL DEFAULT now(),
  method text,
  notes text,
  file_path text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pp owner read" ON public.payment_proofs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pp admin write" ON public.payment_proofs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Phone (WhatsApp) em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;

-- Storage privado para comprovantes
INSERT INTO storage.buckets (id,name,public) VALUES ('payment-proofs','payment-proofs',false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "pp storage admin all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='payment-proofs' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id='payment-proofs' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "pp storage owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
