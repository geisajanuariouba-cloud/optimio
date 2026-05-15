
-- FASE B: Recorrência
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS recurrence_type text NOT NULL DEFAULT 'smart',
  ADD COLUMN IF NOT EXISTS sessions_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sessions_used integer NOT NULL DEFAULT 0;

-- FASE C: Logística
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS max_delivery_date date;

-- FASE D: Combos
CREATE TABLE IF NOT EXISTS public.combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  original_price numeric NOT NULL DEFAULT 0,
  combo_price numeric NOT NULL DEFAULT 0,
  starts_at date,
  ends_at date,
  status text NOT NULL DEFAULT 'active',
  color text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combos owner all" ON public.combos;
CREATE POLICY "combos owner all" ON public.combos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.combo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id uuid NOT NULL,
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  product_id uuid,
  service_id uuid,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combo_items owner all" ON public.combo_items;
CREATE POLICY "combo_items owner all" ON public.combo_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.combo_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id uuid NOT NULL,
  user_id uuid NOT NULL,
  client_id uuid,
  financial_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  sold_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.combo_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combo_sales owner all" ON public.combo_sales;
CREATE POLICY "combo_sales owner all" ON public.combo_sales FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FASE E: Dashboard customizável + Quick Notes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dashboard_widgets jsonb NOT NULL DEFAULT '{"sales_month":true,"stock":true,"deliveries_pending":true,"pickups_pending":true,"tables":true,"catalog":true,"overdue_debts":true,"quick_notes":true}'::jsonb;

CREATE TABLE IF NOT EXISTS public.quick_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quick_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "qn owner all" ON public.quick_notes;
CREATE POLICY "qn owner all" ON public.quick_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FASE F: Variações, Orçamentos, Motor de Precificação
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS measurements jsonb,
  ADD COLUMN IF NOT EXISTS out_of_line boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS margin_percent numeric,
  ADD COLUMN IF NOT EXISTS markup_percent numeric;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS pricing_rules jsonb NOT NULL DEFAULT '{"is_net": true, "discount_percent": 0}'::jsonb,
  ADD COLUMN IF NOT EXISTS default_margin_percent numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS default_markup_percent numeric NOT NULL DEFAULT 20;

ALTER TABLE public.financial
  ADD COLUMN IF NOT EXISTS is_duplicate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS variation_id uuid,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.product_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  cost numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  image_url text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pv owner all" ON public.product_variations;
CREATE POLICY "pv owner all" ON public.product_variations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS pv_product_idx ON public.product_variations(product_id);

CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid,
  status text NOT NULL DEFAULT 'open',
  payment_method text,
  installments integer DEFAULT 1,
  notes text,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quotes owner all" ON public.quotes;
CREATE POLICY "quotes owner all" ON public.quotes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  user_id uuid NOT NULL,
  product_id uuid,
  variation_id uuid,
  quantity integer NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  margin_percent numeric NOT NULL DEFAULT 100,
  unit_price numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "qi owner all" ON public.quote_items;
CREATE POLICY "qi owner all" ON public.quote_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS qi_quote_idx ON public.quote_items(quote_id);

-- Storage: product-images (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "product-images public read" ON storage.objects;
CREATE POLICY "product-images public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product-images owner write" ON storage.objects;
CREATE POLICY "product-images owner write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "product-images owner update" ON storage.objects;
CREATE POLICY "product-images owner update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "product-images owner delete" ON storage.objects;
CREATE POLICY "product-images owner delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
