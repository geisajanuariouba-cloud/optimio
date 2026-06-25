-- Garante que o Super Admin Optimio (sliviaaz.uba@gmail.com) tenha papel admin.
-- Idempotente: ON CONFLICT DO NOTHING.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'sliviaaz.uba@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
