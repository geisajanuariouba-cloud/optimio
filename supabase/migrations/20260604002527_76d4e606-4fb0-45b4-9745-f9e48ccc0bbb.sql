
-- products: flag de imagem pendente
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_review_required boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_products_image_review ON public.products(user_id) WHERE image_review_required = true;

-- financial: juros e total manual
ALTER TABLE public.financial ADD COLUMN IF NOT EXISTS interest_type text DEFAULT 'percent';
ALTER TABLE public.financial ADD COLUMN IF NOT EXISTS interest_percent numeric DEFAULT 0;
ALTER TABLE public.financial ADD COLUMN IF NOT EXISTS interest_amount numeric DEFAULT 0;
ALTER TABLE public.financial ADD COLUMN IF NOT EXISTS total_with_interest numeric;
ALTER TABLE public.financial ADD COLUMN IF NOT EXISTS total_manual boolean DEFAULT false;

-- quote_items: snapshot
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'product';
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS service_id uuid;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS supplier_id uuid;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS supplier_name text;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS measurements_snapshot jsonb;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS final_cost numeric;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS extra_fee_percent numeric DEFAULT 0;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS markup_percent numeric DEFAULT 0;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS subtotal numeric;

-- profiles: preferência de suporte
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS support_button_visible boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS support_button_position text DEFAULT 'bottom-right';

-- catalog_review_items
ALTER TABLE public.catalog_review_items ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.catalog_review_items ADD COLUMN IF NOT EXISTS image_flagged boolean DEFAULT false;
ALTER TABLE public.catalog_review_items ADD COLUMN IF NOT EXISTS approve_with_image_pending boolean DEFAULT false;
