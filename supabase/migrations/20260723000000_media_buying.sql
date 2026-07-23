-- Módulo de Mídia Paga + evolução de Produtos Digitais (nicho E-commerce de Infoprodutos)

-- 1) Estende product_ideas com persona e landing page
ALTER TABLE public.product_ideas
  ADD COLUMN IF NOT EXISTS persona jsonb,
  ADD COLUMN IF NOT EXISTS landing_page_url text,
  ADD COLUMN IF NOT EXISTS landing_page_notes text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2) Entregáveis por produto
CREATE TABLE IF NOT EXISTS public.product_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_idea_id uuid REFERENCES public.product_ideas(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_url text,
  kind text NOT NULL DEFAULT 'ebook' CHECK (kind IN ('ebook','video','curso','bonus','outro')),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_product_deliverables_user ON public.product_deliverables(user_id);
CREATE INDEX IF NOT EXISTS idx_product_deliverables_product ON public.product_deliverables(product_idea_id);

ALTER TABLE public.product_deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_deliverables_select" ON public.product_deliverables FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "product_deliverables_insert" ON public.product_deliverables FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "product_deliverables_update" ON public.product_deliverables FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "product_deliverables_delete" ON public.product_deliverables FOR DELETE USING (user_id = auth.uid());

-- 3) Contas de anúncio (BM / Página / Pixel)
CREATE TABLE IF NOT EXISTS public.ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'meta' CHECK (platform IN ('meta','tiktok','google')),
  business_manager_name text,
  page_name text,
  page_id text,
  pixel_id text,
  pixel_audience_notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','banned','warming','paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_user ON public.ad_accounts(user_id);

ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_accounts_select" ON public.ad_accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ad_accounts_insert" ON public.ad_accounts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ad_accounts_update" ON public.ad_accounts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "ad_accounts_delete" ON public.ad_accounts FOR DELETE USING (user_id = auth.uid());

-- 4) Biblioteca de criativos
CREATE TABLE IF NOT EXISTS public.ad_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_idea_id uuid REFERENCES public.product_ideas(id) ON DELETE SET NULL,
  name text NOT NULL,
  platform text NOT NULL DEFAULT 'meta' CHECK (platform IN ('meta','tiktok','google')),
  format text NOT NULL DEFAULT 'video' CHECK (format IN ('video','imagem','carrossel')),
  file_url text,
  thumbnail_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','testing','validated','paused','killed')),
  hook_notes text,
  performance_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_user ON public.ad_creatives(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_product ON public.ad_creatives(product_idea_id);

ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_creatives_select" ON public.ad_creatives FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ad_creatives_insert" ON public.ad_creatives FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ad_creatives_update" ON public.ad_creatives FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "ad_creatives_delete" ON public.ad_creatives FOR DELETE USING (user_id = auth.uid());

-- 5) Evolui marketing_campaigns para linkar conta de anúncio e preparar sync futura
ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS ad_account_id uuid REFERENCES public.ad_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_campaign_id text,
  ADD COLUMN IF NOT EXISTS daily_spend numeric,
  ADD COLUMN IF NOT EXISTS results_notes text;

-- 6) Caixa de anúncios (saldo manual + histórico de transações)
CREATE TABLE IF NOT EXISTS public.ad_cash_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  current_balance numeric NOT NULL DEFAULT 0,
  low_balance_threshold numeric NOT NULL DEFAULT 200,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_ad_cash_accounts_user ON public.ad_cash_accounts(user_id);

ALTER TABLE public.ad_cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_cash_accounts_select" ON public.ad_cash_accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ad_cash_accounts_insert" ON public.ad_cash_accounts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ad_cash_accounts_update" ON public.ad_cash_accounts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "ad_cash_accounts_delete" ON public.ad_cash_accounts FOR DELETE USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.ad_cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_cash_account_id uuid NOT NULL REFERENCES public.ad_cash_accounts(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL DEFAULT 'deposit' CHECK (type IN ('deposit','spend','adjustment')),
  note text,
  -- Origem da transação: 'manual' (lançada pelo usuário) ou 'gmail' (Fase 2 — parser automático de e-mail)
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','gmail')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_cash_tx_user ON public.ad_cash_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_cash_tx_account ON public.ad_cash_transactions(ad_cash_account_id);

ALTER TABLE public.ad_cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_cash_tx_select" ON public.ad_cash_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ad_cash_tx_insert" ON public.ad_cash_transactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ad_cash_tx_delete" ON public.ad_cash_transactions FOR DELETE USING (user_id = auth.uid());

-- Trigger: toda transação inserida atualiza o saldo da conta de caixa automaticamente
CREATE OR REPLACE FUNCTION public.apply_ad_cash_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ad_cash_accounts
  SET current_balance = current_balance + CASE WHEN NEW.type = 'spend' THEN -NEW.amount ELSE NEW.amount END,
      last_updated_at = now()
  WHERE id = NEW.ad_cash_account_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_ad_cash_transaction ON public.ad_cash_transactions;
CREATE TRIGGER trg_apply_ad_cash_transaction
  AFTER INSERT ON public.ad_cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_ad_cash_transaction();

-- 7) Cliente: categoria de interesse (preenchida automaticamente pela venda)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS interest_category text;
