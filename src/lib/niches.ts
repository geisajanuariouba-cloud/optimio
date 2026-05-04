// Niche presets — drives Feature Toggle and terminology across the app.
export type NicheKey = "beauty" | "retail" | "services" | "education";

export type NicheConfig = {
  key: NicheKey;
  label: string;
  modules: string[];
  terms: Record<string, string>;
};

export const NICHES: Record<NicheKey, NicheConfig> = {
  beauty: {
    key: "beauty",
    label: "Beleza & Saúde",
    modules: ["dashboard", "appointments", "clients", "packages", "services", "products", "financial", "marketing", "anamnesis", "site", "integrations"],
    terms: { client: "Cliente", clients: "Clientes", service: "Procedimento", services: "Procedimentos", professional: "Profissional", appointment: "Agendamento" },
  },
  retail: {
    key: "retail",
    label: "Varejo & Móveis",
    modules: ["dashboard", "clients", "products", "financial", "marketing", "site", "integrations"],
    terms: { client: "Cliente", clients: "Clientes", service: "Pedido", services: "Pedidos", professional: "Montador", appointment: "Pedido" },
  },
  services: {
    key: "services",
    label: "Serviços (Consultoria/Pet)",
    modules: ["dashboard", "appointments", "clients", "services", "financial", "marketing", "site", "integrations"],
    terms: { client: "Cliente", clients: "Clientes", service: "Projeto", services: "Projetos", professional: "Consultor", appointment: "Sessão" },
  },
  education: {
    key: "education",
    label: "Educação & Cursos",
    modules: ["dashboard", "appointments", "clients", "services", "financial", "marketing", "site", "integrations"],
    terms: { client: "Aluno", clients: "Alunos", service: "Aula", services: "Aulas", professional: "Professor", appointment: "Aula" },
  },
};

export const ALL_MODULES = ["dashboard","appointments","clients","packages","services","products","financial","marketing","anamnesis","site","integrations"];
