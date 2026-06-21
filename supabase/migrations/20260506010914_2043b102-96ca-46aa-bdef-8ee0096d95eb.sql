-- Categorias por tenant
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income','expense','product')),
  name text NOT NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, name)
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat owner all" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Templates de Anamnese customizável (singleton por tenant)
CREATE TABLE IF NOT EXISTS public.anamnesis_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.anamnesis_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anamtmpl owner all" ON public.anamnesis_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Função de seed por nicho
CREATE OR REPLACE FUNCTION public.seed_default_categories(_user_id uuid, _niche text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  income_cats text[];
  expense_cats text[] := ARRAY['Aluguel','Salários','Insumos','Marketing','Energia/Água','Impostos','Outros'];
  product_cats text[];
BEGIN
  IF _niche = 'retail' THEN
    income_cats := ARRAY['Venda Balcão','Venda Online','Promissória','Outros'];
    product_cats := ARRAY['Geral','Promoção','Em estoque','Importado'];
  ELSIF _niche = 'beauty' THEN
    income_cats := ARRAY['Atendimento','Pacote','Produto','Promissória','Outros'];
    product_cats := ARRAY['Cosméticos','Ferramentas','Insumos','Revenda'];
  ELSIF _niche = 'education' THEN
    income_cats := ARRAY['Mensalidade','Curso','Material','Promissória','Outros'];
    product_cats := ARRAY['Material','Apostila','Kit'];
  ELSE
    income_cats := ARRAY['Serviço','Projeto','Promissória','Outros'];
    product_cats := ARRAY['Produto','Insumo'];
  END IF;

  INSERT INTO public.categories (user_id, kind, name)
  SELECT _user_id, 'income', unnest(income_cats)
  ON CONFLICT (user_id, kind, name) DO NOTHING;

  INSERT INTO public.categories (user_id, kind, name)
  SELECT _user_id, 'expense', unnest(expense_cats)
  ON CONFLICT (user_id, kind, name) DO NOTHING;

  INSERT INTO public.categories (user_id, kind, name)
  SELECT _user_id, 'product', unnest(product_cats)
  ON CONFLICT (user_id, kind, name) DO NOTHING;
END;
$$;