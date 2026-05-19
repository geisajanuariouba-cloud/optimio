
-- PRODUCTS: codname, has_variations, medidas estruturadas
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS codname text,
  ADD COLUMN IF NOT EXISTS has_variations boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS width numeric,
  ADD COLUMN IF NOT EXISTS height numeric,
  ADD COLUMN IF NOT EXISTS depth numeric,
  ADD COLUMN IF NOT EXISTS length_cm numeric,
  ADD COLUMN IF NOT EXISTS weight numeric,
  ADD COLUMN IF NOT EXISTS measure_unit text DEFAULT 'cm';

CREATE INDEX IF NOT EXISTS idx_products_codname ON public.products (user_id, lower(codname));
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products (user_id, lower(code));

-- PRODUCT_VARIATIONS: codname, sku, atributos estruturados, medidas, fornecedor
ALTER TABLE public.product_variations
  ADD COLUMN IF NOT EXISTS codname text,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS fabric text,
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS variation_type text,
  ADD COLUMN IF NOT EXISTS supplier_id uuid,
  ADD COLUMN IF NOT EXISTS width numeric,
  ADD COLUMN IF NOT EXISTS height numeric,
  ADD COLUMN IF NOT EXISTS depth numeric,
  ADD COLUMN IF NOT EXISTS length_cm numeric,
  ADD COLUMN IF NOT EXISTS weight numeric,
  ADD COLUMN IF NOT EXISTS measure_unit text DEFAULT 'cm',
  ADD COLUMN IF NOT EXISTS min_stock integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pv_product ON public.product_variations (product_id);
CREATE INDEX IF NOT EXISTS idx_pv_codname ON public.product_variations (user_id, lower(codname));
CREATE INDEX IF NOT EXISTS idx_pv_sku ON public.product_variations (user_id, lower(sku));

-- Função de geração de codname (simples, idempotente)
CREATE OR REPLACE FUNCTION public.generate_codname(_name text, _size text DEFAULT NULL, _color text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  base text;
  szpart text := '';
  colorpart text := '';
BEGIN
  IF _name IS NULL OR length(trim(_name)) = 0 THEN RETURN NULL; END IF;
  -- primeiras letras alfanuméricas do primeiro token, até 4
  base := upper(regexp_replace(split_part(trim(_name), ' ', 1), '[^A-Za-z0-9]', '', 'g'));
  base := substring(base from 1 for 4);
  IF _size IS NOT NULL THEN
    szpart := regexp_replace(_size, '[^0-9]', '', 'g');
    szpart := substring(szpart from 1 for 4);
  END IF;
  IF _color IS NOT NULL THEN
    colorpart := upper(regexp_replace(_color, '[^A-Za-z]', '', 'g'));
    colorpart := substring(colorpart from 1 for 2);
  END IF;
  RETURN base || szpart || colorpart;
END $$;

-- Preencher codname dos produtos antigos
UPDATE public.products
SET codname = public.generate_codname(name)
WHERE codname IS NULL OR codname = '';
