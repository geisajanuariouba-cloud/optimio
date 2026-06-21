
-- Clients: CPF/CNPJ + endereço
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cpf_cnpj text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_zip text;

-- Suppliers (fábricas)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  cnpj text,
  contact_name text,
  phone text,
  email text,
  catalog_url text,
  notes text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_zip text,
  full_address text,
  status text NOT NULL DEFAULT 'active',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers owner all" ON public.suppliers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Products: supplier + status
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS supplier_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Payment methods (taxas)
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,             -- pix_qr, pix_chave, debito, dinheiro, credito
  label text NOT NULL,
  installments integer NOT NULL DEFAULT 1, -- p/ crédito: 1,2,3...
  fee_percent numeric NOT NULL DEFAULT 0,
  fee_fixed numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm owner all" ON public.payment_methods FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pm_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Financial extension
ALTER TABLE public.financial
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS payment_method_id uuid,
  ADD COLUMN IF NOT EXISTS installments integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cash_received numeric,
  ADD COLUMN IF NOT EXISTS change_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS needs_delivery boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supplier_id uuid;

-- Cash drawer transactions
CREATE TABLE IF NOT EXISTS public.cash_drawer_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,             -- in / out
  amount numeric NOT NULL,
  reason text NOT NULL,           -- venda_dinheiro, troco, sangria, suprimento, ajuste
  description text,
  financial_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_drawer_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cdt owner all" ON public.cash_drawer_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Deliveries
CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  financial_id uuid,
  client_id uuid,
  supplier_id uuid,               -- pickup necessário
  needs_pickup boolean NOT NULL DEFAULT false,
  destination_address text NOT NULL,
  pickup_address text,
  status text NOT NULL DEFAULT 'pending', -- pending, in_route, delivered, cancelled
  route_order integer,
  distance_km numeric,
  notes text,
  scheduled_for date,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliveries owner all" ON public.deliveries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Supplier commands history
CREATE TABLE IF NOT EXISTS public.supplier_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  command text NOT NULL,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  affected_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc owner all" ON public.supplier_commands FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
