// Niche presets — drives Feature Toggle and terminology across the app.
export type NicheKey = "beauty_salon" | "infoproduct" | "marketplace" | "infoproduct_ecommerce";

export type NicheConfig = {
  key: NicheKey;
  label: string;
  group: "product" | "service" | "both";
  modules: string[];
  terms: Record<string, string>;
};

// ── Módulos por categoria ───────────────────────────────────────────────────
const FINANCIAL_CORE   = ["sales", "cash_drawer", "payment_methods"];
const PRODUCT_CORE     = ["products", "stock", "suppliers", "smart_purchases", "quotes"];
const MARKETING_CORE   = ["marketing", "integrations"];

export const NICHES: Record<NicheKey, NicheConfig> = {
  beauty_salon: {
    key: "beauty_salon",
    label: "Salão de Beleza com Produtos",
    group: "both",
    modules: [
      "dashboard", "clients",
      "appointments", "services", "packages", "anamnesis",
      ...PRODUCT_CORE,
      "financial", ...FINANCIAL_CORE,
      ...MARKETING_CORE,
    ],
    terms: {
      client: "Cliente",
      clients: "Clientes",
      service: "Procedimento",
      services: "Procedimentos",
      professional: "Profissional",
      appointment: "Agendamento",
    },
  },

  infoproduct: {
    key: "infoproduct",
    label: "Venda de Infoprodutos",
    group: "product",
    modules: [
      "dashboard", "clients",
      "products",
      "financial", ...FINANCIAL_CORE,
      ...MARKETING_CORE,
    ],
    terms: {
      client: "Aluno",
      clients: "Alunos",
      service: "Produto Digital",
      services: "Produtos Digitais",
      professional: "Mentor",
      appointment: "Mentoria",
    },
  },

  infoproduct_ecommerce: {
    key: "infoproduct_ecommerce",
    label: "E-commerce de Infoprodutos",
    group: "product",
    modules: [
      "dashboard", "clients",
      "products",
      "funnel", "campaigns",
      "product_ideas", "ad_accounts", "ad_creatives", "ad_cash",
      "financial", ...FINANCIAL_CORE,
      ...MARKETING_CORE,
    ],
    terms: {
      client: "Comprador",
      clients: "Compradores",
      service: "Produto Digital",
      services: "Produtos Digitais",
      professional: "Produtor",
      appointment: "Entrega",
    },
  },

  marketplace: {
    key: "marketplace",
    label: "Brique e Marketplaces",
    group: "product",
    modules: [
      "dashboard", "clients",
      "products", "stock", "suppliers", "smart_purchases", "deliveries", "quotes",
      "financial", ...FINANCIAL_CORE,
      ...MARKETING_CORE,
    ],
    terms: {
      client: "Comprador",
      clients: "Compradores",
      service: "Pedido",
      services: "Pedidos",
      professional: "Vendedor",
      appointment: "Pedido",
    },
  },
};

export const ALL_MODULES = [
  "dashboard", "clients",
  "appointments", "services", "packages", "anamnesis",
  "products", "stock", "suppliers", "smart_purchases", "quotes",
  "deliveries",
  "financial", "sales", "cash_drawer", "payment_methods",
  "marketing", "integrations",
  "tasks", "team",
  "funnel", "campaigns", "product_ideas", "ad_accounts", "ad_creatives", "ad_cash",
];

export const NICHES_WITH_ANAMNESIS: NicheKey[] = ["beauty_salon"];
