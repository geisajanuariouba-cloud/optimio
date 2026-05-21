
-- Adiciona policies adicionais permitindo que membros ativos da equipe
-- acessem dados do tenant owner via current_tenant_owner().
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'products','product_variations','product_categories','categories',
    'clients','suppliers','services',
    'financial','quotes','quote_items',
    'deliveries','appointments','packages','package_sessions','package_templates',
    'payment_methods','anamnesis','anamnesis_templates',
    'marketing_posts','assemblers','assembler_commissions',
    'combos','combo_items','combo_sales',
    'debts','debt_installments','refunds',
    'integrations','cash_drawer_transactions','quick_notes',
    'sites','site_orders','legal_pages','promo_commands','audit_log'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_team_access', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (user_id = public.current_tenant_owner()) WITH CHECK (user_id = public.current_tenant_owner())',
      t || '_team_access', t
    );
  END LOOP;
END $$;
