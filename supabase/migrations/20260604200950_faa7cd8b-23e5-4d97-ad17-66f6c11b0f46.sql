
-- Matérias-primas
CREATE TABLE IF NOT EXISTS public.raw_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'un',
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  stock numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  current_cost numeric NOT NULL DEFAULT 0,
  average_cost numeric NOT NULL DEFAULT 0,
  last_cost numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raw_materials TO authenticated;
GRANT ALL ON public.raw_materials TO service_role;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rm_tenant_all ON public.raw_materials;
CREATE POLICY rm_tenant_all ON public.raw_materials FOR ALL TO authenticated
  USING (user_id = COALESCE(public.current_tenant_owner(), auth.uid()))
  WITH CHECK (user_id = COALESCE(public.current_tenant_owner(), auth.uid()));
DROP TRIGGER IF EXISTS trg_rm_updated ON public.raw_materials;
CREATE TRIGGER trg_rm_updated BEFORE UPDATE ON public.raw_materials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Compras de matéria-prima (histórico)
CREATE TABLE IF NOT EXISTS public.raw_material_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  unit_cost numeric NOT NULL,
  total_cost numeric GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raw_material_purchases TO authenticated;
GRANT ALL ON public.raw_material_purchases TO service_role;
ALTER TABLE public.raw_material_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rmp_tenant_all ON public.raw_material_purchases;
CREATE POLICY rmp_tenant_all ON public.raw_material_purchases FOR ALL TO authenticated
  USING (user_id = COALESCE(public.current_tenant_owner(), auth.uid()))
  WITH CHECK (user_id = COALESCE(public.current_tenant_owner(), auth.uid()));

-- Trigger: ao registrar compra, atualiza estoque, custo médio, último custo
CREATE OR REPLACE FUNCTION public.rm_apply_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_stock numeric; old_avg numeric; new_stock numeric; new_avg numeric;
BEGIN
  SELECT stock, average_cost INTO old_stock, old_avg
    FROM public.raw_materials WHERE id = NEW.raw_material_id;
  IF old_stock IS NULL THEN RETURN NEW; END IF;
  new_stock := COALESCE(old_stock,0) + NEW.quantity;
  IF new_stock > 0 THEN
    new_avg := ((COALESCE(old_stock,0) * COALESCE(old_avg,0)) + (NEW.quantity * NEW.unit_cost)) / new_stock;
  ELSE
    new_avg := NEW.unit_cost;
  END IF;
  UPDATE public.raw_materials
     SET stock = new_stock,
         average_cost = round(new_avg::numeric, 4),
         last_cost = NEW.unit_cost,
         current_cost = NEW.unit_cost,
         updated_at = now()
   WHERE id = NEW.raw_material_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_rmp_apply ON public.raw_material_purchases;
CREATE TRIGGER trg_rmp_apply AFTER INSERT ON public.raw_material_purchases
  FOR EACH ROW EXECUTE FUNCTION public.rm_apply_purchase();

-- Receita técnica: produto -> matéria-prima com quantidade
CREATE TABLE IF NOT EXISTS public.product_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, raw_material_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_recipes TO authenticated;
GRANT ALL ON public.product_recipes TO service_role;
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pr_tenant_all ON public.product_recipes;
CREATE POLICY pr_tenant_all ON public.product_recipes FOR ALL TO authenticated
  USING (user_id = COALESCE(public.current_tenant_owner(), auth.uid()))
  WITH CHECK (user_id = COALESCE(public.current_tenant_owner(), auth.uid()));

-- Ordem de produção
CREATE TABLE IF NOT EXISTS public.production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  estimated_cost numeric NOT NULL DEFAULT 0,
  actual_cost numeric NOT NULL DEFAULT 0,
  notes text,
  produced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_orders TO authenticated;
GRANT ALL ON public.production_orders TO service_role;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS po_tenant_all ON public.production_orders;
CREATE POLICY po_tenant_all ON public.production_orders FOR ALL TO authenticated
  USING (user_id = COALESCE(public.current_tenant_owner(), auth.uid()))
  WITH CHECK (user_id = COALESCE(public.current_tenant_owner(), auth.uid()));
DROP TRIGGER IF EXISTS trg_po_updated ON public.production_orders;
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.production_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_order_items TO authenticated;
GRANT ALL ON public.production_order_items TO service_role;
ALTER TABLE public.production_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS poi_tenant_all ON public.production_order_items;
CREATE POLICY poi_tenant_all ON public.production_order_items FOR ALL TO authenticated
  USING (user_id = COALESCE(public.current_tenant_owner(), auth.uid()))
  WITH CHECK (user_id = COALESCE(public.current_tenant_owner(), auth.uid()));

-- Função: executar ordem (consome MP, adiciona ao estoque do produto)
CREATE OR REPLACE FUNCTION public.execute_production_order(_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner uuid := COALESCE(public.current_tenant_owner(), auth.uid());
  ord public.production_orders%ROWTYPE;
  rec record;
  total_cost numeric := 0;
  shortage jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO ord FROM public.production_orders WHERE id = _order_id AND user_id = owner;
  IF ord.id IS NULL THEN RAISE EXCEPTION 'Ordem não encontrada'; END IF;
  IF ord.status = 'done' THEN RAISE EXCEPTION 'Ordem já produzida'; END IF;

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

  -- consome MP, grava itens
  FOR rec IN
    SELECT pr.raw_material_id, pr.quantity * ord.quantity AS need, rm.average_cost, rm.stock
      FROM public.product_recipes pr
      JOIN public.raw_materials rm ON rm.id = pr.raw_material_id
     WHERE pr.product_id = ord.product_id AND pr.user_id = owner
  LOOP
    UPDATE public.raw_materials SET stock = stock - rec.need, updated_at = now() WHERE id = rec.raw_material_id;
    INSERT INTO public.production_order_items (user_id, order_id, raw_material_id, quantity, unit_cost, total_cost)
      VALUES (owner, _order_id, rec.raw_material_id, rec.need, COALESCE(rec.average_cost,0), rec.need * COALESCE(rec.average_cost,0));
    total_cost := total_cost + (rec.need * COALESCE(rec.average_cost,0));
  END LOOP;

  -- atualiza produto: incrementa estoque
  UPDATE public.products
     SET stock = COALESCE(stock,0) + ord.quantity,
         updated_at = now()
   WHERE id = ord.product_id AND user_id = owner;

  UPDATE public.production_orders
     SET status = 'done', actual_cost = total_cost, produced_at = now(), updated_at = now()
   WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true, 'total_cost', total_cost);
END;
$$;
