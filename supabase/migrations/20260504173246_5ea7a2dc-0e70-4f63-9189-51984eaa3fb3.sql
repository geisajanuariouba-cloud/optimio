
-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text default 'Studio',
  logo_url text,
  plan text not null default 'basic' check (plan in ('basic','standard','unlimited')),
  enabled_modules jsonb not null default '["dashboard","appointments","clients","packages","services","products","financial","marketing"]'::jsonb,
  custom_properties jsonb not null default '{}'::jsonb,
  remember_me boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, company_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), coalesce(new.raw_user_meta_data->>'company_name','Studio'));
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- generic owner+timestamps helper for the rest
-- ============ CLIENTS ============
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  notes text,
  custom_fields jsonb default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clients enable row level security;
create policy "clients owner all" on public.clients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger clients_upd before update on public.clients for each row execute function public.set_updated_at();

-- ============ SERVICES ============
create table public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  starting_price numeric(10,2) not null default 0,
  duration_minutes int not null default 30,
  cost numeric(10,2) default 0,
  category text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.services enable row level security;
create policy "services owner all" on public.services for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger services_upd before update on public.services for each row execute function public.set_updated_at();

-- ============ PACKAGE TEMPLATES ============
create table public.package_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  finish_type text not null default 'escova_chapinha' check (finish_type in ('escova_chapinha','curvatura')),
  treatments jsonb not null default '[]'::jsonb,
  price numeric(10,2) not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.package_templates enable row level security;
create policy "tmpl owner all" on public.package_templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger tmpl_upd before update on public.package_templates for each row execute function public.set_updated_at();

-- ============ PACKAGES ============
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  template_id uuid references public.package_templates(id),
  name text not null,
  total_price numeric(10,2) not null default 0,
  payment_method text,
  status text not null default 'in_progress' check (status in ('in_progress','completed','cancelled')),
  start_date date default current_date,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.packages enable row level security;
create policy "packages owner all" on public.packages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger packages_upd before update on public.packages for each row execute function public.set_updated_at();

-- ============ PACKAGE SESSIONS ============
create table public.package_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete cascade,
  session_number int not null,
  treatment text not null,
  service_id uuid references public.services(id),
  status text not null default 'pending' check (status in ('pending','completed')),
  appointment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.package_sessions enable row level security;
create policy "sessions owner all" on public.package_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ APPOINTMENTS ============
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  service_id uuid references public.services(id),
  package_id uuid references public.packages(id),
  professional text,
  appointment_date date not null,
  appointment_time time not null,
  amount numeric(10,2) not null default 0,
  payment_method text default 'nao_escolhido',
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
  is_walk_in boolean not null default false,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.appointments enable row level security;
create policy "appts owner all" on public.appointments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger appts_upd before update on public.appointments for each row execute function public.set_updated_at();

-- ============ PRODUCTS ============
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  cost numeric(10,2) default 0,
  sale_price numeric(10,2) not null default 0,
  stock int not null default 0,
  min_stock int not null default 0,
  is_ingredient_residue boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "products owner all" on public.products for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger products_upd before update on public.products for each row execute function public.set_updated_at();

-- ============ FINANCIAL ============
create table public.financial (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  origin text,
  origin_id uuid,
  description text,
  gross_amount numeric(10,2) not null default 0,
  payment_method text,
  fee_percent numeric(5,2) default 0,
  fee_amount numeric(10,2) default 0,
  net_amount numeric(10,2) not null default 0,
  category text,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.financial enable row level security;
create policy "fin owner all" on public.financial for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ ANAMNESIS ============
create table public.anamnesis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  client_notes text,
  professional_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.anamnesis enable row level security;
create policy "anam owner all" on public.anamnesis for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger anam_upd before update on public.anamnesis for each row execute function public.set_updated_at();
