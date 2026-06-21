
ALTER TABLE public.product_recipes
  ADD COLUMN IF NOT EXISTS yield_quantity numeric NOT NULL DEFAULT 1;

ALTER TABLE public.production_orders
  ADD COLUMN IF NOT EXISTS assignee_user_id uuid,
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS due_date date;

CREATE OR REPLACE FUNCTION public.execute_production_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner uuid := COALESCE(public.current_tenant_owner(), auth.uid());
  ord public.production_orders%ROWTYPE;
  rec record;
  total_cost numeric := 0;
  shortage jsonb := '[]'::jsonb;
  yield_per numeric := 1;
  produced_units numeric := 0;
BEGIN
  SELECT * INTO ord FROM public.production_orders WHERE id = _order_id AND user_id = owner;
  IF ord.id IS NULL THEN RAISE EXCEPTION 'Ordem não encontrada'; END IF;
  IF ord.status = 'done' THEN RAISE EXCEPTION 'Ordem já produzida'; END IF;

  -- rendimento médio das linhas da receita (todas devem ter o mesmo, mas pegamos o primeiro)
  SELECT COALESCE(MAX(yield_quantity), 1) INTO yield_per
    FROM public.product_recipes
    WHERE product_id = ord.product_id AND user_id = owner;
  IF yield_per IS NULL OR yield_per <= 0 THEN yield_per := 1; END IF;

  -- valida estoque
  FOR rec IN
    SELECT pr.raw_material_id, pr.quantity * ord.quantity AS need, rm.stock, rm.average_cost, rm.name
      FROM public.product_recipes pr
      JOIN public.raw_materials rm ON rm.id = pr.raw_material_id
     WHERE pr.product_id = ord.product_id AND pr.user_id = owner
  LOOP
    IF rec.stock < rec.need THEN
      shortage := shortage || jsonb_build_object('raw_material_id', rec.raw_material_id, 'name', rec.name, 'need', rec.need, 'have', rec.stock);
    END IF;
  END LOOP;
  IF jsonb_array_length(shortage) > 0 THEN
    RETURN jsonb_build_object('ok', false, 'shortage', shortage);
  END IF;

  -- consome MP, grava itens (snapshot de custo médio no momento)
  FOR rec IN
    SELECT pr.raw_material_id, pr.quantity * ord.quantity AS need, rm.average_cost
      FROM public.product_recipes pr
      JOIN public.raw_materials rm ON rm.id = pr.raw_material_id
     WHERE pr.product_id = ord.product_id AND pr.user_id = owner
  LOOP
    UPDATE public.raw_materials SET stock = stock - rec.need, updated_at = now() WHERE id = rec.raw_material_id;
    INSERT INTO public.production_order_items (user_id, order_id, raw_material_id, quantity, unit_cost, total_cost)
      VALUES (owner, _order_id, rec.raw_material_id, rec.need, COALESCE(rec.average_cost,0), rec.need * COALESCE(rec.average_cost,0));
    total_cost := total_cost + (rec.need * COALESCE(rec.average_cost,0));
  END LOOP;

  produced_units := ord.quantity * yield_per;

  UPDATE public.products
     SET stock = COALESCE(stock,0) + produced_units,
         updated_at = now()
   WHERE id = ord.product_id AND user_id = owner;

  UPDATE public.production_orders
     SET status = 'done', actual_cost = total_cost, produced_at = now(), updated_at = now()
   WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true, 'total_cost', total_cost, 'produced_units', produced_units);
END;
$$;
