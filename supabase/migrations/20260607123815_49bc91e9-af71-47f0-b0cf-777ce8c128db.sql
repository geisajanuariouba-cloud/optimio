
-- 1) Trigger para impedir auto-escalada de privilégios em profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_priv boolean := false;
BEGIN
  -- Admin master atual ou role admin podem alterar tudo
  SELECT COALESCE(p.is_admin_master, false) INTO is_priv
    FROM public.profiles p WHERE p.id = auth.uid();
  IF is_priv OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin_master IS DISTINCT FROM OLD.is_admin_master THEN
    NEW.is_admin_master := OLD.is_admin_master;
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    NEW.plan := OLD.plan;
  END IF;
  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    NEW.account_status := OLD.account_status;
  END IF;
  IF NEW.enabled_modules IS DISTINCT FROM OLD.enabled_modules THEN
    NEW.enabled_modules := OLD.enabled_modules;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2) Restringe leitura de app_settings a usuários autenticados
DROP POLICY IF EXISTS "settings read all" ON public.app_settings;
CREATE POLICY "settings read authenticated"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);
