// Module catalog — drives the "Configurações → Módulos" toggle screen.
// Each module has a key, label, description, group and optional dependencies.
// When a module is enabled, all dependencies become enabled automatically.
// When a module is disabled, modules that depend on it are auto-disabled.

export type ModuleGroup =
  | "core"
  | "comercial"
  | "financeiro"
  | "estoque"
  | "producao"
  | "operacoes"
  | "marketing"
  | "gestao";

export type ModuleDef = {
  key: string;
  label: string;
  description: string;
  group: ModuleGroup;
  depends?: string[];
  /** Módulos sempre ativos (não podem ser desligados). */
  locked?: boolean;
};

export const MODULE_CATALOG: ModuleDef[] = [
  // Core (sempre ligados)
  { key: "dashboard", label: "Dashboard", description: "Painel principal com indicadores.", group: "core", locked: true },
  { key: "clients", label: "Clientes", description: "Cadastro e CRM básico.", group: "core", locked: true },
  { key: "financial", label: "Financeiro", description: "Receitas, despesas e contas.", group: "core", locked: true },

  // Comercial
  { key: "appointments", label: "Agendamentos", description: "Agenda de serviços/atendimentos.", group: "comercial", depends: ["clients"] },
  { key: "services", label: "Serviços", description: "Catálogo de serviços/procedimentos.", group: "comercial" },
  { key: "quotes", label: "Orçamentos", description: "Geração e envio de orçamentos.", group: "comercial", depends: ["clients"] },
  { key: "funnel", label: "Funil de Vendas (CRM)", description: "Kanban de oportunidades.", group: "comercial", depends: ["clients"] },
  { key: "sales", label: "Vendas / PDV", description: "Registro de vendas.", group: "comercial", depends: ["clients"] },
  { key: "packages", label: "Pacotes & Combos", description: "Pacotes de serviços/produtos.", group: "comercial" },

  // Estoque
  { key: "products", label: "Produtos", description: "Catálogo de produtos.", group: "estoque" },
  { key: "stock", label: "Controle de Estoque", description: "Saldo, movimentações e ajustes.", group: "estoque", depends: ["products"] },
  { key: "suppliers", label: "Fornecedores", description: "Cadastro de fornecedores.", group: "estoque" },
  { key: "smart_purchases", label: "Compras Inteligentes", description: "Sugestão de compras por giro.", group: "estoque", depends: ["products", "stock"] },

  // Produção
  { key: "production", label: "Produção", description: "Ordens de produção e BOM.", group: "producao", depends: ["products", "stock"] },

  // Operações
  { key: "deliveries", label: "Entregas", description: "Rotas e status de entregas.", group: "operacoes" },
  { key: "assemblers", label: "Montadores", description: "Cadastro e ordens de montagem.", group: "operacoes" },
  { key: "operations", label: "Operações Diárias", description: "Checklist e turnos.", group: "operacoes" },
  { key: "card_machines", label: "Maquininhas", description: "Taxas e planos de cartão.", group: "operacoes" },
  { key: "marketplaces", label: "Marketplaces", description: "Shopee, ML, Amazon, Magalu.", group: "operacoes", depends: ["products"] },
  { key: "cash_drawer", label: "Caixa", description: "Abertura e fechamento de caixa.", group: "operacoes" },
  { key: "payment_methods", label: "Formas de Pagamento", description: "PIX, cartão, dinheiro etc.", group: "operacoes" },

  // Marketing
  { key: "marketing", label: "Marketing", description: "Visão geral de marketing.", group: "marketing" },
  { key: "campaigns", label: "Campanhas", description: "Campanhas e disparos.", group: "marketing" },
  { key: "automations", label: "Automações", description: "Fluxos automáticos.", group: "marketing", depends: ["clients"] },
  { key: "product_ideas", label: "Ideias de Produto", description: "Banco de ideias e validação.", group: "marketing" },

  // Gestão / RH / Diversos
  { key: "team", label: "Equipe & Permissões", description: "Membros, cargos e acessos.", group: "gestao" },
  { key: "tasks", label: "Tarefas", description: "To-do e projetos internos.", group: "gestao" },
  { key: "projects", label: "Projetos", description: "Gestão de projetos.", group: "gestao" },
  { key: "meetings", label: "Reuniões", description: "Agenda e atas.", group: "gestao" },
  { key: "knowledge", label: "Base de Conhecimento", description: "Documentos e SOPs.", group: "gestao" },
  { key: "anamnesis", label: "Anamnese", description: "Fichas clínicas/estéticas.", group: "gestao", depends: ["clients"] },
  { key: "integrations", label: "Integrações", description: "Conexões externas.", group: "gestao" },
];

export const MODULE_GROUPS: { key: ModuleGroup; label: string }[] = [
  { key: "core", label: "Essenciais" },
  { key: "comercial", label: "Comercial" },
  { key: "estoque", label: "Estoque" },
  { key: "producao", label: "Produção" },
  { key: "operacoes", label: "Operações" },
  { key: "financeiro", label: "Financeiro" },
  { key: "marketing", label: "Marketing" },
  { key: "gestao", label: "Gestão" },
];

export const MODULE_MAP: Record<string, ModuleDef> = Object.fromEntries(
  MODULE_CATALOG.map((m) => [m.key, m])
);

/** Expande dependências: ao ligar X, liga tudo de que X depende (recursivo). */
export function expandWithDeps(keys: string[]): string[] {
  const out = new Set<string>();
  const visit = (k: string) => {
    if (out.has(k)) return;
    out.add(k);
    const def = MODULE_MAP[k];
    def?.depends?.forEach(visit);
  };
  keys.forEach(visit);
  // Sempre inclui core/locked
  MODULE_CATALOG.filter((m) => m.locked).forEach((m) => out.add(m.key));
  return Array.from(out);
}

/** Ao desligar X, remove também os módulos que dependem dele (recursivo). */
export function removeWithDependents(keys: string[], toRemove: string): string[] {
  const set = new Set(keys);
  const removeRec = (k: string) => {
    if (!set.has(k)) return;
    const def = MODULE_MAP[k];
    if (def?.locked) return; // não remove locked
    set.delete(k);
    // Remove dependentes
    MODULE_CATALOG.filter((m) => m.depends?.includes(k)).forEach((m) => removeRec(m.key));
  };
  removeRec(toRemove);
  return Array.from(set);
}
