-- Motor de precificação: separa o "ajuste de custo" (campo único com sinal) em
-- DESCONTO e ACRÉSCIMO distintos, espelhando o fluxo do produto:
--   Custo Original -> Desconto -> Acréscimo -> IPI -> Taxa de custo -> Custo Final
--                  -> Margem -> Taxa extra -> Preço de Venda
-- Aditivo e idempotente. Migra o legado cost_adjust_percent para os novos campos.

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS cost_discount_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_surcharge_percent numeric NOT NULL DEFAULT 0;

-- Migra cost_adjust_percent: negativo -> desconto, positivo -> acréscimo. Depois zera o legado.
UPDATE public.suppliers
   SET cost_discount_percent  = CASE WHEN cost_adjust_percent < 0 THEN abs(cost_adjust_percent) ELSE cost_discount_percent END,
       cost_surcharge_percent = CASE WHEN cost_adjust_percent > 0 THEN cost_adjust_percent ELSE cost_surcharge_percent END,
       cost_adjust_percent    = 0
 WHERE cost_adjust_percent <> 0;

-- engine_compute_sale: aplica desconto -> acréscimo -> IPI -> taxa de custo -> margem -> taxa extra
CREATE OR REPLACE FUNCTION public.engine_compute_sale(_cost numeric, _supplier_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  cf numeric := 0; mg numeric := 100; mk numeric := 0;
  disc numeric := 0; surch numeric := 0; ipi numeric := 0;
  final_cost numeric;
BEGIN
  IF _cost IS NULL OR _cost <= 0 THEN RETURN 0; END IF;
  IF _supplier_id IS NOT NULL THEN
    SELECT COALESCE(cost_fee_percent,0), COALESCE(default_margin_percent,100),
           COALESCE(default_markup_percent,0), COALESCE(cost_discount_percent,0),
           COALESCE(cost_surcharge_percent,0), COALESCE(ipi_percent,0)
      INTO cf, mg, mk, disc, surch, ipi
      FROM public.suppliers WHERE id = _supplier_id;
  END IF;
  final_cost := _cost * (1 - disc/100.0) * (1 + surch/100.0) * (1 + ipi/100.0) * (1 + cf/100.0);
  RETURN round((final_cost * (1 + mg/100.0) * (1 + mk/100.0))::numeric, 2);
END;
$function$;

-- engine_compute_breakdown: detalha cada etapa do fluxo
CREATE OR REPLACE FUNCTION public.engine_compute_breakdown(_cost numeric, _supplier_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  cf numeric := 0; mg numeric := 100; mk numeric := 0;
  disc numeric := 0; surch numeric := 0; ipi numeric := 0;
  after_disc numeric; after_surch numeric; after_ipi numeric; final_cost numeric; sale numeric;
BEGIN
  IF _supplier_id IS NOT NULL THEN
    SELECT COALESCE(cost_fee_percent,0), COALESCE(default_margin_percent,100),
           COALESCE(default_markup_percent,0), COALESCE(cost_discount_percent,0),
           COALESCE(cost_surcharge_percent,0), COALESCE(ipi_percent,0)
      INTO cf, mg, mk, disc, surch, ipi
      FROM public.suppliers WHERE id = _supplier_id;
  END IF;
  after_disc  := COALESCE(_cost,0) * (1 - disc/100.0);
  after_surch := after_disc * (1 + surch/100.0);
  after_ipi   := after_surch * (1 + ipi/100.0);
  final_cost  := after_ipi * (1 + cf/100.0);
  sale := round((final_cost * (1 + mg/100.0) * (1 + mk/100.0))::numeric, 2);
  RETURN jsonb_build_object(
    'cost_original', COALESCE(_cost,0),
    'cost_discount_percent', disc,
    'after_discount', round(after_disc::numeric, 2),
    'cost_surcharge_percent', surch,
    'after_surcharge', round(after_surch::numeric, 2),
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
