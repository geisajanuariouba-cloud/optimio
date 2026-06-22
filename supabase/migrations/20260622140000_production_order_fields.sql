-- Ordem de produção: campos adicionais (departamento e prioridade).
-- Responsável, prazo, observações e checklist já existem em migrations anteriores.
ALTER TABLE public.production_orders
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';
