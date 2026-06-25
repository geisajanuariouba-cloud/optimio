-- Trigger: auto-concede papel admin ao primeiro Super Admin da plataforma.
-- Quando o e-mail registrado é o da conta proprietária, concede admin automaticamente.
CREATE OR REPLACE FUNCTION public.auto_grant_superadmin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'sliviaaz.uba@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_superadmin ON auth.users;
CREATE TRIGGER trg_auto_superadmin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_grant_superadmin();

-- Também tenta conceder para quem já existe (re-run seguro)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'sliviaaz.uba@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
