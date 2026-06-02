// Status considered "active" — produto visível em Estoque, Vendas, Orçamentos, Combos, etc.
// Outros status (aguardando_revisao, em_revisao, rejeitado, processando, erro, aguardando_tabela_custo,
// discontinued) ficam restritos a telas administrativas (ImportReview, SupplierDetail, SuperAdmin).
export const ACTIVE_PRODUCT_STATUSES = ["active"] as const;

export type ProductStatus = typeof ACTIVE_PRODUCT_STATUSES[number];

export function isActiveProductStatus(status?: string | null): boolean {
  return !!status && (ACTIVE_PRODUCT_STATUSES as readonly string[]).includes(status);
}

// Aplica filtro padrão para listagens públicas (Vendas/Orçamentos/Estoque/Combos/Busca).
// Uso: applyActiveProductsFilter(supabase.from("products").select("..."))
export function applyActiveProductsFilter<T>(q: T): T {
  // @ts-expect-error supabase builder
  return q.eq("status", "active").is("deleted_at", null);
}
