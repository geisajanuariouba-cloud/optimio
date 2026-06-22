-- Backfill de enabled_modules para preservar a visibilidade atual da navegação
-- após o alinhamento das chaves de módulo na sidebar/topnav:
--   Estoque        : products        -> stock
--   Fornecedores   : products        -> suppliers
--   Compras        : products        -> smart_purchases
--   Orçamentos     : products        -> quotes
--   Vendas         : financial       -> sales
--   Caixa do Dia   : financial       -> cash_drawer
--   Métodos de Pag.: financial       -> payment_methods
--
-- Tenants que tinham 'products' viam Estoque/Fornecedores/Compras/Orçamentos;
-- tenants que tinham 'financial' viam Vendas/Caixa/Métodos. Sem este backfill,
-- esses itens sumiriam após a mudança (regressão). Garantimos que continuem visíveis.
-- Idempotente: jsonb_agg(DISTINCT ...) elimina duplicatas, pode rodar mais de uma vez.

UPDATE public.profiles
SET enabled_modules = (
  SELECT jsonb_agg(DISTINCT m)
  FROM jsonb_array_elements_text(
    COALESCE(enabled_modules, '[]'::jsonb)
    || CASE WHEN COALESCE(enabled_modules, '[]'::jsonb) ? 'products'
            THEN '["stock","suppliers","smart_purchases","quotes"]'::jsonb
            ELSE '[]'::jsonb END
    || CASE WHEN COALESCE(enabled_modules, '[]'::jsonb) ? 'financial'
            THEN '["sales","cash_drawer","payment_methods"]'::jsonb
            ELSE '[]'::jsonb END
  ) AS m
)
WHERE COALESCE(enabled_modules, '[]'::jsonb) ?| array['products','financial'];
