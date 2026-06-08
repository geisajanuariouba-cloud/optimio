-- Secure invite lookup + acceptance via SECURITY DEFINER RPCs
-- so the client never queries team_invites directly by token.

CREATE OR REPLACE FUNCTION public.get_team_invite_by_token(_token text)
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  permissions jsonb,
  status text,
  expires_at timestamptz,
  owner_user_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  SELECT lower(coalesce(u.email, '')) INTO caller_email
    FROM auth.users u WHERE u.id = auth.uid();

  RETURN QUERY
  SELECT ti.id, ti.email, ti.role::text, ti.permissions, ti.status::text,
         ti.expires_at, ti.owner_user_id
    FROM public.team_invites ti
   WHERE ti.token = _token
     AND lower(ti.email) = caller_email
     AND ti.status = 'pending'
     AND ti.expires_at > now()
   LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_invite_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_invite_by_token(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_team_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  caller_email text;
  inv public.team_invites%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  SELECT lower(coalesce(u.email,'')) INTO caller_email
    FROM auth.users u WHERE u.id = uid;

  SELECT * INTO inv FROM public.team_invites
   WHERE token = _token
     AND lower(email) = caller_email
     AND status = 'pending'
     AND expires_at > now()
   LIMIT 1;

  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'invalid_or_expired_invite';
  END IF;

  INSERT INTO public.team_members (owner_user_id, member_user_id, email, role, permissions, status, invited_by)
  VALUES (inv.owner_user_id, uid, inv.email, inv.role, inv.permissions, 'active', inv.created_by)
  ON CONFLICT (owner_user_id, member_user_id)
  DO UPDATE SET status = 'active', role = EXCLUDED.role, permissions = EXCLUDED.permissions;

  UPDATE public.team_invites SET status = 'accepted' WHERE id = inv.id;

  RETURN jsonb_build_object('ok', true, 'owner_user_id', inv.owner_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_team_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_team_invite(text) TO authenticated;