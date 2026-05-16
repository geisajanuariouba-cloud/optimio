-- Assemblers (montadores)
CREATE TABLE IF NOT EXISTS public.assemblers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  default_commission_percent numeric NOT NULL DEFAULT 10,
  notes text,
  status text NOT NULL DEFAULT 'active',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assemblers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assemblers owner all" ON public.assemblers;
CREATE POLICY "assemblers owner all" ON public.assemblers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Assembler commissions
CREATE TABLE IF NOT EXISTS public.assembler_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assembler_id uuid NOT NULL,
  delivery_id uuid,
  financial_id uuid,
  cost_base numeric NOT NULL DEFAULT 0,
  percent numeric,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending | calculated | paid
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assembler_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ac owner all" ON public.assembler_commissions;
CREATE POLICY "ac owner all" ON public.assembler_commissions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Deliveries new columns
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS assembler_id uuid;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS needs_assembly boolean NOT NULL DEFAULT false;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS is_pickup boolean NOT NULL DEFAULT false;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS commission_status text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS commission_value numeric;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS commission_percent numeric;

-- Financial new columns
ALTER TABLE public.financial ADD COLUMN IF NOT EXISTS production_status text;
ALTER TABLE public.financial ADD COLUMN IF NOT EXISTS needs_assembly boolean NOT NULL DEFAULT false;
ALTER TABLE public.financial ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.financial ADD COLUMN IF NOT EXISTS quote_id uuid;
ALTER TABLE public.financial ADD COLUMN IF NOT EXISTS has_local_stock boolean;

-- Suppliers new columns
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS cost_fee_percent numeric NOT NULL DEFAULT 10;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS avg_delivery_days integer;

-- Anamnesis 90-day cycle
ALTER TABLE public.anamnesis ADD COLUMN IF NOT EXISTS next_due_date date;

-- Debts: flexible interest
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS interest_type text NOT NULL DEFAULT 'total';

-- Appointments: payment method link
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_method_id uuid;