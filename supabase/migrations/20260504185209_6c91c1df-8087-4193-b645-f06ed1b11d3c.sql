
-- Tasks (Marketing to-do)
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'todo',
  linked_post_id uuid,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks owner all" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Debts / Promissórias
CREATE TABLE public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  appointment_id uuid,
  origin text NOT NULL DEFAULT 'manual',
  original_amount numeric NOT NULL DEFAULT 0,
  interest_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  installments_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'open',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debts owner all" ON public.debts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_debts_updated BEFORE UPDATE ON public.debts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.debt_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  debt_id uuid NOT NULL,
  number integer NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  paid_at timestamptz,
  payment_method text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.debt_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "di owner all" ON public.debt_installments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Support tickets (AI + human handoff)
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL DEFAULT 'Suporte',
  status text NOT NULL DEFAULT 'ai',
  whatsapp text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tk owner all" ON public.support_tickets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tk admin read" ON public.support_tickets FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE POLICY "tk admin update" ON public.support_tickets FOR UPDATE USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_tk_updated BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sm owner all" ON public.support_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sm admin read" ON public.support_messages FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE POLICY "sm admin insert" ON public.support_messages FOR INSERT WITH CHECK (has_role(auth.uid(),'admin'));

-- Product categories
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc owner all" ON public.product_categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id uuid;

-- Profile extensions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payment_fees jsonb NOT NULL DEFAULT '{"pix":0,"dinheiro":0,"debito":1.5,"credito":3.5,"parcelado":4.5}'::jsonb,
  ADD COLUMN IF NOT EXISTS instagram_discount jsonb NOT NULL DEFAULT '{"enabled":false,"percent":10,"handle":""}'::jsonb;
