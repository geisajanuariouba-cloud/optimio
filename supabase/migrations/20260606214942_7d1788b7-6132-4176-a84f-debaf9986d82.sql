
-- 1) Variation inheritance
ALTER TABLE public.product_variations 
  ADD COLUMN IF NOT EXISTS inherit_cost boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_price boolean NOT NULL DEFAULT true;

-- 2) Supplier pricing engine
ALTER TABLE public.suppliers 
  ADD COLUMN IF NOT EXISTS cost_adjust_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ipi_percent numeric NOT NULL DEFAULT 0;

-- 3) Stock alert config
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS alert_on_min_stock_exact boolean NOT NULL DEFAULT true;

-- 4) Pricing engine with cost_adjust + ipi
CREATE OR REPLACE FUNCTION public.engine_compute_sale(_cost numeric, _supplier_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  cf numeric := 0; mg numeric := 100; mk numeric := 0;
  ca numeric := 0; ipi numeric := 0;
  final_cost numeric;
BEGIN
  IF _cost IS NULL OR _cost <= 0 THEN RETURN 0; END IF;
  IF _supplier_id IS NOT NULL THEN
    SELECT COALESCE(cost_fee_percent,0), COALESCE(default_margin_percent,100),
           COALESCE(default_markup_percent,0), COALESCE(cost_adjust_percent,0),
           COALESCE(ipi_percent,0)
      INTO cf, mg, mk, ca, ipi
      FROM public.suppliers WHERE id = _supplier_id;
  END IF;
  final_cost := _cost * (1 + ca/100.0) * (1 + ipi/100.0) * (1 + cf/100.0);
  RETURN round((final_cost * (1 + mg/100.0) * (1 + mk/100.0))::numeric, 2);
END;
$function$;

-- 5) Breakdown function
CREATE OR REPLACE FUNCTION public.engine_compute_breakdown(_cost numeric, _supplier_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  cf numeric := 0; mg numeric := 100; mk numeric := 0;
  ca numeric := 0; ipi numeric := 0;
  after_adjust numeric; after_ipi numeric; final_cost numeric; sale numeric;
BEGIN
  IF _supplier_id IS NOT NULL THEN
    SELECT COALESCE(cost_fee_percent,0), COALESCE(default_margin_percent,100),
           COALESCE(default_markup_percent,0), COALESCE(cost_adjust_percent,0),
           COALESCE(ipi_percent,0)
      INTO cf, mg, mk, ca, ipi
      FROM public.suppliers WHERE id = _supplier_id;
  END IF;
  after_adjust := COALESCE(_cost,0) * (1 + ca/100.0);
  after_ipi := after_adjust * (1 + ipi/100.0);
  final_cost := after_ipi * (1 + cf/100.0);
  sale := round((final_cost * (1 + mg/100.0) * (1 + mk/100.0))::numeric, 2);
  RETURN jsonb_build_object(
    'cost_original', COALESCE(_cost,0),
    'cost_adjust_percent', ca,
    'after_adjust', round(after_adjust::numeric, 2),
    'ipi_percent', ipi,
    'after_ipi', round(after_ipi::numeric, 2),
    'cost_fee_percent', cf,
    'final_cost', round(final_cost::numeric, 2),
    'margin_percent', mg,
    'markup_percent', mk,
    'sale_price', sale
  );
END;
$function$;

-- 6) Trigger: propagate parent cost/sale_price to inheriting variations
CREATE OR REPLACE FUNCTION public.products_propagate_to_variations()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.has_variations IS TRUE THEN
    IF NEW.cost IS DISTINCT FROM OLD.cost THEN
      UPDATE public.product_variations
         SET cost = COALESCE(NEW.cost,0), updated_at = now()
       WHERE product_id = NEW.id AND inherit_cost = true;
    END IF;
    IF NEW.sale_price IS DISTINCT FROM OLD.sale_price THEN
      UPDATE public.product_variations
         SET sale_price = COALESCE(NEW.sale_price,0), updated_at = now()
       WHERE product_id = NEW.id AND inherit_price = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_propagate_to_variations ON public.products;
CREATE TRIGGER trg_products_propagate_to_variations
AFTER UPDATE OF cost, sale_price ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_propagate_to_variations();

-- 7) Backfill: variations inheriting with zero values get parent values
UPDATE public.product_variations v
   SET cost = COALESCE(p.cost,0),
       sale_price = COALESCE(p.sale_price,0),
       updated_at = now()
  FROM public.products p
 WHERE v.product_id = p.id
   AND v.inherit_cost = true AND v.inherit_price = true
   AND (v.cost = 0 OR v.sale_price = 0)
   AND (COALESCE(p.cost,0) > 0 OR COALESCE(p.sale_price,0) > 0);
