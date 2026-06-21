-- 1) Comissão padrão do montador: 5%
ALTER TABLE public.assemblers ALTER COLUMN default_commission_percent SET DEFAULT 5;
UPDATE public.assemblers SET default_commission_percent = 5 WHERE default_commission_percent = 10;

-- 2) Novas colunas no fluxo Retail/Furniture em deliveries
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS supplier_order_date timestamptz,
  ADD COLUMN IF NOT EXISTS supplier_manufacturing_days integer,
  ADD COLUMN IF NOT EXISTS supplier_delivery_days integer,
  ADD COLUMN IF NOT EXISTS supplier_expected_date date,
  ADD COLUMN IF NOT EXISTS supplier_received_date timestamptz,
  ADD COLUMN IF NOT EXISTS sent_to_assembler_at timestamptz,
  ADD COLUMN IF NOT EXISTS mounted_at timestamptz,
  ADD COLUMN IF NOT EXISTS stock_available_at_sale boolean,
  ADD COLUMN IF NOT EXISTS supplier_notes text,
  ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3) Normalizar status legados para o novo fluxo
-- 'pending' (sem fornecedor) -> 'ready'; 'assembled' -> 'ready' (estava sem montador)
UPDATE public.deliveries
SET status = 'ready'
WHERE status IN ('pending','assembled') AND (assembler_id IS NULL);

UPDATE public.deliveries
SET status = 'with_assembler', sent_to_assembler_at = COALESCE(sent_to_assembler_at, now())
WHERE status IN ('pending','assembled') AND assembler_id IS NOT NULL;