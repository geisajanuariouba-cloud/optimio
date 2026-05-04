
-- Profile additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS niche text NOT NULL DEFAULT 'beauty',
  ADD COLUMN IF NOT EXISTS primary_color text NOT NULL DEFAULT '271 91% 65%',
  ADD COLUMN IF NOT EXISTS border_style text NOT NULL DEFAULT 'rounded',
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_volume text;

-- Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

DROP POLICY IF EXISTS "roles self read" ON public.user_roles;
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "roles admin all" ON public.user_roles;
CREATE POLICY "roles admin all" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Admins can read/update all profiles
DROP POLICY IF EXISTS "admin read profiles" ON public.profiles;
CREATE POLICY "admin read profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admin update profiles" ON public.profiles;
CREATE POLICY "admin update profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

-- Sites (builder)
CREATE TABLE IF NOT EXISTS public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'Meu Site',
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sites owner all" ON public.sites;
CREATE POLICY "sites owner all" ON public.sites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "sites public read published" ON public.sites;
CREATE POLICY "sites public read published" ON public.sites FOR SELECT USING (published = true);

CREATE TRIGGER trg_sites_updated BEFORE UPDATE ON public.sites
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Site orders (review queue)
CREATE TABLE IF NOT EXISTS public.site_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  site_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  type text NOT NULL DEFAULT 'sale',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'review',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "so owner all" ON public.site_orders;
CREATE POLICY "so owner all" ON public.site_orders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "so public insert" ON public.site_orders;
CREATE POLICY "so public insert" ON public.site_orders FOR INSERT WITH CHECK (true);

-- Integrations
CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "int owner all" ON public.integrations;
CREATE POLICY "int owner all" ON public.integrations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Refunds log
CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  appointment_id uuid,
  package_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  restocked jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ref owner all" ON public.refunds;
CREATE POLICY "ref owner all" ON public.refunds FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Promo commands history
CREATE TABLE IF NOT EXISTS public.promo_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  command text NOT NULL,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  affected_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.promo_commands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promo owner all" ON public.promo_commands;
CREATE POLICY "promo owner all" ON public.promo_commands FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
