
-- ============================================================
-- Wave 2: Catálogo — matching custo→produto/variação,
--                    fora de linha, motor de preço, sync flag
-- Tudo aditivo, IF NOT EXISTS, sem quebrar dados existentes.
-- ============================================================

-- 1) Função de normalização (acento, lowercase, alfanumérico)
CREATE OR REPLACE FUNCTION public.normalize_match(_s text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _s IS NULL OR length(trim(_s)) = 0 THEN NULL
    ELSE lower(regexp_replace(
      translate(_s,
        'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
        'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
      ),
      '[^a-z0-9]', '', 'gi'
    ))
  END;
$$;

-- 2) Colunas estruturais em products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS final_cost_price numeric,
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS manual_price_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_out_of_sync boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS engine_suggested_price numeric,
  ADD COLUMN IF NOT EXISTS last_cost_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS match_key_code text,
  ADD COLUMN IF NOT EXISTS match_key_name text;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_pricing_mode_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_pricing_mode_check CHECK (pricing_mode IN ('auto','manual'));

-- 3) Colunas estruturais em product_variations
ALTER TABLE public.product_variations
  ADD COLUMN IF NOT EXISTS final_cost_price numeric,
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS manual_price_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_out_of_sync boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS engine_suggested_price numeric,
  ADD COLUMN IF NOT EXISTS last_cost_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS match_key_code text,
  ADD COLUMN IF NOT EXISTS match_key_name text;

ALTER TABLE public.product_variations
  DROP CONSTRAINT IF EXISTS product_variations_pricing_mode_check;
ALTER TABLE public.product_variations
  ADD CONSTRAINT product_variations_pricing_mode_check CHECK (pricing_mode IN ('auto','manual'));

-- 4) Triggers para manter match keys sempre normalizadas
CREATE OR REPLACE FUNCTION public.products_set_match_keys()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.match_key_code := public.normalize_match(NEW.code);
  NEW.match_key_name := public.normalize_match(NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_set_match_keys ON public.products;
CREATE TRIGGER trg_products_set_match_keys
BEFORE INSERT OR UPDATE OF code, name ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_set_match_keys();

CREATE OR REPLACE FUNCTION public.variations_set_match_keys()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.match_key_code := public.normalize_match(COALESCE(NEW.sku, NEW.codname));
  NEW.match_key_name := public.normalize_match(NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_variations_set_match_keys ON public.product_variations;
CREATE TRIGGER trg_variations_set_match_keys
BEFORE INSERT OR UPDATE OF sku, codname, name ON public.product_variations
FOR EACH ROW EXECUTE FUNCTION public.variations_set_match_keys();

-- 5) Backfill seguro (uma vez)
UPDATE public.products
   SET match_key_code = public.normalize_match(code),
       match_key_name = public.normalize_match(name)
 WHERE match_key_code IS NULL AND match_key_name IS NULL;

UPDATE public.product_variations
   SET match_key_code = public.normalize_match(COALESCE(sku, codname)),
       match_key_name = public.normalize_match(name)
 WHERE match_key_code IS NULL AND match_key_name IS NULL;

-- 6) Índices para matching rápido (parciais, evitam bloat)
CREATE INDEX IF NOT EXISTS idx_products_match_code
  ON public.products (user_id, supplier_id, match_key_code)
  WHERE match_key_code IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_match_name
  ON public.products (user_id, supplier_id, match_key_name)
  WHERE match_key_name IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_variations_match_code
  ON public.product_variations (user_id, supplier_id, match_key_code)
  WHERE match_key_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_variations_match_name
  ON public.product_variations (user_id, supplier_id, match_key_name)
  WHERE match_key_name IS NOT NULL;

-- 7) Motor de preço: aplica taxa, margem e markup do fornecedor
CREATE OR REPLACE FUNCTION public.engine_compute_sale(_cost numeric, _supplier_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  cf numeric := 0; mg numeric := 100; mk numeric := 0;
  final_cost numeric;
BEGIN
  IF _cost IS NULL OR _cost <= 0 THEN RETURN 0; END IF;
  IF _supplier_id IS NOT NULL THEN
    SELECT COALESCE(cost_fee_percent,0), COALESCE(default_margin_percent,100), COALESCE(default_markup_percent,0)
      INTO cf, mg, mk FROM public.suppliers WHERE id = _supplier_id;
  END IF;
  final_cost := _cost * (1 + cf/100.0);
  RETURN round((final_cost * (1 + mg/100.0) * (1 + mk/100.0))::numeric, 2);
END;
$$;

-- 8) RPC para reaplicar preço do motor (com override de manual)
CREATE OR REPLACE FUNCTION public.apply_engine_price(_kind text, _id uuid, _force boolean DEFAULT false)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  owner uuid;
  cost_val numeric; sup uuid; suggested numeric; mode text; manual boolean;
BEGIN
  IF _kind = 'product' THEN
    SELECT user_id, COALESCE(final_cost_price, cost), supplier_id, pricing_mode, manual_price_override
      INTO owner, cost_val, sup, mode, manual
      FROM public.products WHERE id = _id;
    IF owner IS NULL THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
    IF owner <> COALESCE(public.current_tenant_owner(), uid) THEN
      RAISE EXCEPTION 'Sem permissão';
    END IF;
    suggested := public.engine_compute_sale(cost_val, sup);
    IF manual AND NOT _force THEN RETURN suggested; END IF;
    UPDATE public.products
       SET sale_price = suggested,
           engine_suggested_price = suggested,
           price_out_of_sync = false,
           manual_price_override = false,
           pricing_mode = 'auto',
           last_cost_synced_at = now()
     WHERE id = _id;
    RETURN suggested;
  ELSIF _kind = 'variation' THEN
    SELECT user_id, COALESCE(final_cost_price, cost), supplier_id, pricing_mode, manual_price_override
      INTO owner, cost_val, sup, mode, manual
      FROM public.product_variations WHERE id = _id;
    IF owner IS NULL THEN RAISE EXCEPTION 'Variação não encontrada'; END IF;
    IF owner <> COALESCE(public.current_tenant_owner(), uid) THEN
      RAISE EXCEPTION 'Sem permissão';
    END IF;
    suggested := public.engine_compute_sale(cost_val, sup);
    IF manual AND NOT _force THEN RETURN suggested; END IF;
    UPDATE public.product_variations
       SET sale_price = suggested,
           engine_suggested_price = suggested,
           price_out_of_sync = false,
           manual_price_override = false,
           pricing_mode = 'auto',
           last_cost_synced_at = now()
     WHERE id = _id;
    RETURN suggested;
  ELSE
    RAISE EXCEPTION 'Tipo inválido';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_engine_price(text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.engine_compute_sale(numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_match(text) TO authenticated, anon;

-- 9) RPC: marca como fora de linha produtos do fornecedor que não receberam custo nesta tabela
CREATE OR REPLACE FUNCTION public.mark_supplier_out_of_line(_supplier_id uuid, _since timestamptz)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  owner uuid;
  affected integer := 0;
BEGIN
  SELECT user_id INTO owner FROM public.suppliers WHERE id = _supplier_id;
  IF owner IS NULL OR owner <> COALESCE(public.current_tenant_owner(), uid) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  WITH up AS (
    UPDATE public.products
       SET out_of_line = true,
           status = 'discontinued',
           updated_at = now()
     WHERE supplier_id = _supplier_id
       AND user_id = owner
       AND deleted_at IS NULL
       AND (last_cost_synced_at IS NULL OR last_cost_synced_at < _since)
       AND out_of_line = false
     RETURNING 1
  )
  SELECT count(*) INTO affected FROM up;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_supplier_out_of_line(uuid, timestamptz) TO authenticated;
