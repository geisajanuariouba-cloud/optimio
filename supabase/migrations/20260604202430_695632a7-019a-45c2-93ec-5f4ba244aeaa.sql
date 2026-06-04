
-- 1) Campos de RH em team_members
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS hire_date date,
  ADD COLUMN IF NOT EXISTS salary numeric;

-- 2) Presets de cargo (role templates) por tenant
CREATE TABLE IF NOT EXISTS public.role_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  area text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_templates TO authenticated;
GRANT ALL ON public.role_templates TO service_role;

ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rt owner all" ON public.role_templates
  FOR ALL USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE TRIGGER tg_role_templates_updated
  BEFORE UPDATE ON public.role_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Escalas semanais
CREATE TABLE IF NOT EXISTS public.employee_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  member_user_id uuid,
  member_name text,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_shifts TO authenticated;
GRANT ALL ON public.employee_shifts TO service_role;

ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "es owner all" ON public.employee_shifts
  FOR ALL USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "es member read self" ON public.employee_shifts
  FOR SELECT USING (auth.uid() = member_user_id);

CREATE TRIGGER tg_employee_shifts_updated
  BEFORE UPDATE ON public.employee_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS employee_shifts_owner_idx ON public.employee_shifts(owner_user_id);
CREATE INDEX IF NOT EXISTS employee_shifts_member_idx ON public.employee_shifts(member_user_id);
