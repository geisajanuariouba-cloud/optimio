-- RPC para super admins gerenciarem planos de qualquer usuário via email.
-- SECURITY DEFINER permite acesso a auth.users sem expor a tabela diretamente.
CREATE OR REPLACE FUNCTION public.admin_set_plan_by_email(
  p_email  TEXT,
  p_plan   TEXT,
  p_months INT DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller  UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_target  UUID;
  v_sub_id  UUID;
  v_end     TIMESTAMPTZ;
BEGIN
  -- Apenas super admins (papel 'admin') podem chamar esta função
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  -- Localiza o usuário pelo email em auth.users
  SELECT id INTO v_target
  FROM auth.users
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Usuário com email "%" não encontrado.', p_email;
  END IF;

  -- Atualiza plano no perfil
  UPDATE public.profiles
  SET plan = p_plan, account_status = 'active'
  WHERE id = v_target;

  -- Atualiza ou cria a subscription
  SELECT id, current_period_end INTO v_sub_id, v_end
  FROM public.subscriptions
  WHERE user_id = v_target
  ORDER BY current_period_end DESC
  LIMIT 1;

  v_end := GREATEST(NOW(), COALESCE(v_end, NOW())) + (p_months || ' months')::INTERVAL;

  IF v_sub_id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET plan_slug = p_plan, status = 'active',
        current_period_end = v_end, last_paid_at = NOW()
    WHERE id = v_sub_id;
  ELSE
    INSERT INTO public.subscriptions (user_id, plan_slug, status, current_period_end, last_paid_at)
    VALUES (v_target, p_plan, 'active', v_end, NOW());
  END IF;

  RETURN json_build_object(
    'success', true,
    'user_id', v_target,
    'plan', p_plan,
    'period_end', v_end
  );
END;
$$;

-- Garante que usuários normais não possam chamar a função diretamente
REVOKE ALL ON FUNCTION public.admin_set_plan_by_email(TEXT, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_plan_by_email(TEXT, TEXT, INT) TO authenticated;
