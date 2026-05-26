// Niche presets — drives Feature Toggle and terminology across the app.
export type NicheKey =
  | "beauty" | "retail" | "services" | "education"
  | "furniture" | "pet" | "restaurant" | "auto" | "tech_repair"
  | "fashion" | "construction" | "agency" | "consulting" | "architecture"
  | "dental" | "tattoo" | "infoproduct" | "ecommerce" | "real_estate"
  | "legal" | "gym" | "pharmacy" | "hotel" | "clinic" | "distributor";

export type NicheConfig = {
  key: NicheKey;
  label: string;
  group: "product" | "service" | "both";
  modules: string[];
  terms: Record<string, string>;
};

const BASE_PRODUCT = ["dashboard","clients","products","financial","marketing","integrations"];
const BASE_SERVICE = ["dashboard","appointments","clients","services","financial","marketing","integrations"];
const BASE_BOTH = ["dashboard","appointments","clients","products","services","financial","marketing","integrations"];

export const NICHES: Record<NicheKey, NicheConfig> = {
  beauty:       { key:"beauty",       label:"Beleza & Saúde",      group:"both",   modules:[...BASE_BOTH,"packages","anamnesis"], terms:{ client:"Cliente", clients:"Clientes", service:"Procedimento", services:"Procedimentos", professional:"Profissional", appointment:"Agendamento" } },
  retail:       { key:"retail",       label:"Varejo & Móveis",     group:"product",modules:[...BASE_PRODUCT,"deliveries","assemblers","suppliers"], terms:{ client:"Cliente", clients:"Clientes", service:"Pedido", services:"Pedidos", professional:"Montador", appointment:"Pedido" } },
  services:     { key:"services",     label:"Serviços / Consultoria",group:"service",modules:BASE_SERVICE, terms:{ client:"Cliente", clients:"Clientes", service:"Projeto", services:"Projetos", professional:"Consultor", appointment:"Sessão" } },
  education:    { key:"education",    label:"Educação & Cursos",   group:"service",modules:BASE_SERVICE, terms:{ client:"Aluno", clients:"Alunos", service:"Aula", services:"Aulas", professional:"Professor", appointment:"Aula" } },
  furniture:    { key:"furniture",    label:"Móveis Planejados",   group:"product",modules:[...BASE_PRODUCT,"deliveries","assemblers","suppliers","quotes"], terms:{ client:"Cliente", clients:"Clientes", service:"Projeto", services:"Projetos", professional:"Montador", appointment:"Visita" } },
  pet:          { key:"pet",          label:"Pet Shop",            group:"both",   modules:[...BASE_BOTH,"packages"], terms:{ client:"Tutor", clients:"Tutores", service:"Banho & Tosa", services:"Serviços", professional:"Tosador", appointment:"Atendimento" } },
  restaurant:   { key:"restaurant",   label:"Restaurante",         group:"product",modules:BASE_PRODUCT, terms:{ client:"Cliente", clients:"Clientes", service:"Pedido", services:"Pedidos", professional:"Garçom", appointment:"Reserva" } },
  auto:         { key:"auto",         label:"Oficina / Auto",      group:"both",   modules:BASE_BOTH, terms:{ client:"Cliente", clients:"Clientes", service:"Ordem", services:"OS", professional:"Mecânico", appointment:"OS" } },
  tech_repair:  { key:"tech_repair",  label:"Assistência Técnica", group:"both",   modules:BASE_BOTH, terms:{ client:"Cliente", clients:"Clientes", service:"Ordem", services:"OS", professional:"Técnico", appointment:"OS" } },
  fashion:      { key:"fashion",      label:"Moda & Vestuário",    group:"product",modules:BASE_PRODUCT, terms:{ client:"Cliente", clients:"Clientes", service:"Venda", services:"Vendas", professional:"Vendedor", appointment:"Atendimento" } },
  construction: { key:"construction", label:"Construção",          group:"both",   modules:BASE_BOTH, terms:{ client:"Cliente", clients:"Clientes", service:"Obra", services:"Obras", professional:"Engenheiro", appointment:"Visita" } },
  agency:       { key:"agency",       label:"Agência de Marketing",group:"service",modules:BASE_SERVICE, terms:{ client:"Cliente", clients:"Clientes", service:"Projeto", services:"Projetos", professional:"Gerente", appointment:"Reunião" } },
  consulting:   { key:"consulting",   label:"Consultoria",         group:"service",modules:BASE_SERVICE, terms:{ client:"Cliente", clients:"Clientes", service:"Mentoria", services:"Mentorias", professional:"Consultor", appointment:"Sessão" } },
  architecture: { key:"architecture", label:"Arquitetura",         group:"service",modules:BASE_SERVICE, terms:{ client:"Cliente", clients:"Clientes", service:"Projeto", services:"Projetos", professional:"Arquiteto", appointment:"Visita" } },
  dental:       { key:"dental",       label:"Odontologia",         group:"service",modules:[...BASE_SERVICE,"anamnesis","packages"], terms:{ client:"Paciente", clients:"Pacientes", service:"Procedimento", services:"Procedimentos", professional:"Dentista", appointment:"Consulta" } },
  tattoo:       { key:"tattoo",       label:"Tatuagem & Piercing", group:"service",modules:[...BASE_SERVICE,"anamnesis"], terms:{ client:"Cliente", clients:"Clientes", service:"Sessão", services:"Sessões", professional:"Tatuador", appointment:"Sessão" } },
  infoproduct:  { key:"infoproduct",  label:"Infoprodutos",        group:"product",modules:BASE_PRODUCT, terms:{ client:"Aluno", clients:"Alunos", service:"Produto", services:"Produtos", professional:"Mentor", appointment:"Aula" } },
  ecommerce:    { key:"ecommerce",    label:"E-commerce",          group:"product",modules:[...BASE_PRODUCT,"deliveries","suppliers"], terms:{ client:"Cliente", clients:"Clientes", service:"Pedido", services:"Pedidos", professional:"Operador", appointment:"Entrega" } },
  real_estate:  { key:"real_estate",  label:"Imobiliária",         group:"both",   modules:BASE_BOTH, terms:{ client:"Cliente", clients:"Clientes", service:"Imóvel", services:"Imóveis", professional:"Corretor", appointment:"Visita" } },
  legal:        { key:"legal",        label:"Advocacia",           group:"service",modules:BASE_SERVICE, terms:{ client:"Cliente", clients:"Clientes", service:"Caso", services:"Casos", professional:"Advogado", appointment:"Audiência" } },
  gym:          { key:"gym",          label:"Academia",            group:"service",modules:[...BASE_SERVICE,"packages"], terms:{ client:"Aluno", clients:"Alunos", service:"Aula", services:"Aulas", professional:"Personal", appointment:"Aula" } },
  pharmacy:     { key:"pharmacy",     label:"Farmácia",            group:"product",modules:BASE_PRODUCT, terms:{ client:"Cliente", clients:"Clientes", service:"Venda", services:"Vendas", professional:"Farmacêutico", appointment:"Atendimento" } },
  hotel:        { key:"hotel",        label:"Hotelaria",           group:"service",modules:BASE_SERVICE, terms:{ client:"Hóspede", clients:"Hóspedes", service:"Reserva", services:"Reservas", professional:"Recepção", appointment:"Reserva" } },
  clinic:       { key:"clinic",       label:"Clínica Médica",      group:"service",modules:[...BASE_SERVICE,"anamnesis","packages"], terms:{ client:"Paciente", clients:"Pacientes", service:"Consulta", services:"Consultas", professional:"Médico", appointment:"Consulta" } },
  distributor:  { key:"distributor",  label:"Distribuidora",       group:"product",modules:[...BASE_PRODUCT,"deliveries","suppliers"], terms:{ client:"Cliente", clients:"Clientes", service:"Pedido", services:"Pedidos", professional:"Vendedor", appointment:"Pedido" } },
};

export const ALL_MODULES = ["dashboard","appointments","clients","packages","services","products","financial","marketing","anamnesis","site","integrations","deliveries","assemblers","suppliers","quotes","tasks","team","stock"];

export const NICHES_WITH_ANAMNESIS: NicheKey[] = ["beauty","dental","tattoo","clinic","pet"];
