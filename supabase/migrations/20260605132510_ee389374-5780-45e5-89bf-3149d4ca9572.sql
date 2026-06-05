
ALTER TABLE public.financial
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS paid_at date,
  ADD COLUMN IF NOT EXISTS is_fixed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT 'one_off',
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS financial_status_idx ON public.financial (user_id, status);
CREATE INDEX IF NOT EXISTS financial_due_date_idx ON public.financial (user_id, due_date);
