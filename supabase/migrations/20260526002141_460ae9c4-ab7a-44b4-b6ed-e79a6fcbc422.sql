
-- ============ TASKS ============
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  due_date timestamptz,
  assignee_user_id uuid,
  tags text[] DEFAULT ARRAY[]::text[],
  recurrence text,
  completed_at timestamptz,
  ai_generated boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_team_access" ON public.tasks FOR ALL TO authenticated
  USING (user_id = current_tenant_owner()) WITH CHECK (user_id = current_tenant_owner());
CREATE INDEX IF NOT EXISTS idx_tasks_user ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_comments_team_access" ON public.task_comments FOR ALL TO authenticated
  USING (user_id = current_tenant_owner()) WITH CHECK (user_id = current_tenant_owner());

-- ============ STOCK MOVEMENTS ============
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid,
  variation_id uuid,
  movement_type text NOT NULL,
  quantity integer NOT NULL,
  unit_cost numeric DEFAULT 0,
  reason text,
  reference_type text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_movements_team_access" ON public.stock_movements FOR ALL TO authenticated
  USING (user_id = current_tenant_owner()) WITH CHECK (user_id = current_tenant_owner());
CREATE INDEX IF NOT EXISTS idx_stock_mov_product ON public.stock_movements(product_id);

-- ============ PRODUCT IDEAS (IA) ============
CREATE TABLE IF NOT EXISTS public.product_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  reason text,
  estimated_margin numeric,
  potential_score integer DEFAULT 0,
  status text NOT NULL DEFAULT 'suggested',
  source text DEFAULT 'ai',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_ideas_team_access" ON public.product_ideas FOR ALL TO authenticated
  USING (user_id = current_tenant_owner()) WITH CHECK (user_id = current_tenant_owner());

-- ============ MARKETING CAMPAIGNS ============
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'instagram',
  status text NOT NULL DEFAULT 'draft',
  budget numeric DEFAULT 0,
  starts_at date,
  ends_at date,
  objective text,
  audience text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mkt_campaigns_team_access" ON public.marketing_campaigns FOR ALL TO authenticated
  USING (user_id = current_tenant_owner()) WITH CHECK (user_id = current_tenant_owner());

-- ============ TEAM MEETINGS ============
CREATE TABLE IF NOT EXISTS public.team_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  scheduled_for timestamptz,
  duration_minutes integer DEFAULT 30,
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  agenda text,
  summary text,
  action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  scope text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_meetings_team_access" ON public.team_meetings FOR ALL TO authenticated
  USING (user_id = current_tenant_owner()) WITH CHECK (user_id = current_tenant_owner());

-- ============ CATALOG REVIEW ITEMS ============
CREATE TABLE IF NOT EXISTS public.catalog_review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  catalog_id uuid,
  supplier_id uuid,
  source_page integer,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_name text,
  proposed_code text,
  proposed_category text,
  proposed_image_url text,
  proposed_measurements jsonb,
  proposed_variations jsonb,
  dedup_hash text,
  match_status text NOT NULL DEFAULT 'new',
  match_product_id uuid,
  review_status text NOT NULL DEFAULT 'pending',
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_review_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cri_team_access" ON public.catalog_review_items FOR ALL TO authenticated
  USING (user_id = current_tenant_owner()) WITH CHECK (user_id = current_tenant_owner());
CREATE INDEX IF NOT EXISTS idx_cri_catalog ON public.catalog_review_items(catalog_id);
CREATE INDEX IF NOT EXISTS idx_cri_status ON public.catalog_review_items(review_status);
CREATE INDEX IF NOT EXISTS idx_cri_hash ON public.catalog_review_items(dedup_hash);

-- ============ PRODUCTS extra fields ============
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'simple';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dedup_hash text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'approved';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ai_category_suggestion text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_catalog_id uuid;
CREATE INDEX IF NOT EXISTS idx_products_dedup ON public.products(user_id, dedup_hash);
CREATE INDEX IF NOT EXISTS idx_products_review_status ON public.products(review_status);

-- ============ SUPPLIER_CATALOGS extras (idempotent) ============
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='supplier_catalogs') THEN
    ALTER TABLE public.supplier_catalogs ADD COLUMN IF NOT EXISTS review_required boolean DEFAULT true;
    ALTER TABLE public.supplier_catalogs ADD COLUMN IF NOT EXISTS items_pending_review integer DEFAULT 0;
  END IF;
END $$;

-- triggers updated_at
DROP TRIGGER IF EXISTS trg_tasks_updated ON public.tasks;
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_mkt_camp_updated ON public.marketing_campaigns;
CREATE TRIGGER trg_mkt_camp_updated BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_meetings_updated ON public.team_meetings;
CREATE TRIGGER trg_meetings_updated BEFORE UPDATE ON public.team_meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_cri_updated ON public.catalog_review_items;
CREATE TRIGGER trg_cri_updated BEFORE UPDATE ON public.catalog_review_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
