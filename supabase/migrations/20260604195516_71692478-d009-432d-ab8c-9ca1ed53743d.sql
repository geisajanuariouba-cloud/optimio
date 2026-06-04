-- 1) Perfis: admin master + período operacional
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin_master boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS operational_cycle_start_day smallint NOT NULL DEFAULT 1;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_op_cycle_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_op_cycle_check
      CHECK (operational_cycle_start_day BETWEEN 1 AND 28);
  END IF;
END $$;

-- 2) Procedimentos do agendamento
CREATE TABLE IF NOT EXISTS public.appointment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  name text,
  qty integer NOT NULL DEFAULT 1,
  duration_min integer NOT NULL DEFAULT 30,
  price numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_services TO authenticated;
GRANT ALL ON public.appointment_services TO service_role;

ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant rw appointment_services" ON public.appointment_services;
CREATE POLICY "tenant rw appointment_services"
  ON public.appointment_services
  FOR ALL
  TO authenticated
  USING (user_id = public.current_tenant_owner())
  WITH CHECK (user_id = public.current_tenant_owner());

CREATE INDEX IF NOT EXISTS appointment_services_appointment_idx
  ON public.appointment_services (appointment_id);

-- 3) Função: restaurar conta
CREATE OR REPLACE FUNCTION public.restore_tenant_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner uuid := auth.uid();
  removed jsonb := '{}'::jsonb;
  r integer;
BEGIN
  IF owner IS NULL THEN
    RAISE EXCEPTION 'Sem usuário autenticado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE member_user_id = owner AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Apenas o dono da conta pode restaurar';
  END IF;

  BEGIN DELETE FROM public.appointment_services WHERE user_id = owner; GET DIAGNOSTICS r = ROW_COUNT; removed := removed || jsonb_build_object('appointment_services', r); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.task_comments tc USING public.tasks t WHERE tc.task_id = t.id AND t.user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.tasks WHERE user_id = owner; GET DIAGNOSTICS r = ROW_COUNT; removed := removed || jsonb_build_object('tasks', r); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.alerts WHERE user_id = owner; GET DIAGNOSTICS r = ROW_COUNT; removed := removed || jsonb_build_object('alerts', r); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.projects WHERE user_id = owner; GET DIAGNOSTICS r = ROW_COUNT; removed := removed || jsonb_build_object('projects', r); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.audit_logs WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.audit_log WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.knowledge_articles WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.quick_notes WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.combo_items ci USING public.combos c WHERE ci.combo_id = c.id AND c.user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.combo_sales WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.combos WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.marketing_posts WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.marketing_campaigns WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.quote_items qi USING public.quotes q WHERE qi.quote_id = q.id AND q.user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.quotes WHERE user_id = owner; GET DIAGNOSTICS r = ROW_COUNT; removed := removed || jsonb_build_object('quotes', r); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.debt_payments WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.debt_installments WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.debts WHERE user_id = owner; GET DIAGNOSTICS r = ROW_COUNT; removed := removed || jsonb_build_object('debts', r); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.refunds WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.cash_drawer_transactions WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.financial WHERE user_id = owner; GET DIAGNOSTICS r = ROW_COUNT; removed := removed || jsonb_build_object('financial', r); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.deliveries WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.assembler_commissions WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.assemblers WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.package_sessions WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.packages WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.package_templates WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.anamnesis WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.appointments WHERE user_id = owner; GET DIAGNOSTICS r = ROW_COUNT; removed := removed || jsonb_build_object('appointments', r); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.stock_movements WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.catalog_review_items WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.supplier_catalog_chunks WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.supplier_catalogs WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.supplier_commands WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.product_variations WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.products WHERE user_id = owner; GET DIAGNOSTICS r = ROW_COUNT; removed := removed || jsonb_build_object('products', r); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.suppliers WHERE user_id = owner; GET DIAGNOSTICS r = ROW_COUNT; removed := removed || jsonb_build_object('suppliers', r); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.leads WHERE user_id = owner; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.clients WHERE user_id = owner; GET DIAGNOSTICS r = ROW_COUNT; removed := removed || jsonb_build_object('clients', r); EXCEPTION WHEN undefined_table THEN NULL; END;

  RETURN jsonb_build_object('ok', true, 'removed', removed, 'restored_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.restore_tenant_data() FROM public;
GRANT EXECUTE ON FUNCTION public.restore_tenant_data() TO authenticated;

-- 4) Promove admins ao Admin Master + plano máximo + todos os módulos
UPDATE public.profiles p
   SET is_admin_master = true,
       plan = 'unlimited',
       enabled_modules = (
         SELECT jsonb_agg(DISTINCT m) FROM jsonb_array_elements_text(
           COALESCE(p.enabled_modules, '[]'::jsonb)
           || '["dashboard","clients","appointments","services","products","financial","marketing","packages","integrations","anamnesis"]'::jsonb
         ) m
       )
 WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin');