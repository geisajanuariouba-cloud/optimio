ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS auto_out_of_line boolean NOT NULL DEFAULT false;