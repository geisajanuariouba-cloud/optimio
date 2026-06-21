
-- 1) Products: description
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description text;

-- 2) Debt installments: partial payment fields
ALTER TABLE public.debt_installments
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method text;

-- Backfill status for already-paid installments
UPDATE public.debt_installments
   SET status = 'paid', amount_paid = amount
 WHERE paid_at IS NOT NULL AND (status IS NULL OR status = 'pending');

-- 3) Debt payments history
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  debt_id uuid NOT NULL,
  installment_id uuid,
  client_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'dinheiro',
  payment_date timestamptz NOT NULL DEFAULT now(),
  note text,
  financial_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_payments owner all" ON public.debt_payments;
CREATE POLICY "debt_payments owner all" ON public.debt_payments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "debt_payments_team_access" ON public.debt_payments;
CREATE POLICY "debt_payments_team_access" ON public.debt_payments
  FOR ALL TO authenticated
  USING (user_id = current_tenant_owner())
  WITH CHECK (user_id = current_tenant_owner());

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON public.debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_installment ON public.debt_payments(installment_id);

-- 4) Cash drawer: payment method
ALTER TABLE public.cash_drawer_transactions
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'dinheiro';
