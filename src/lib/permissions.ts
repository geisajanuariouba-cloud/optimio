// Permission catalog — drives the 3-level RH/permissions UI.
// Level 1 (Cargo / Role): preset of permissions saved as a role template.
// Level 2 (Área / Area): toggle the whole group at once.
// Level 3 (Usuário / User): override per member (granted in team_members.permissions).

export type PermissionDef = {
  key: string;        // e.g. "financial.view"
  label: string;      // display label
  area: string;       // group/area key
};

export type AreaDef = {
  key: string;
  label: string;
};

export const PERMISSION_AREAS: AreaDef[] = [
  { key: "financial",     label: "Financeiro" },
  { key: "products",      label: "Produtos & Estoque" },
  { key: "sales",         label: "Vendas / PDV" },
  { key: "clients",       label: "Clientes / CRM" },
  { key: "appointments",  label: "Agendamentos" },
  { key: "production",    label: "Produção" },
  { key: "operations",    label: "Operações" },
  { key: "marketing",     label: "Marketing" },
  { key: "team",          label: "Equipe" },
  { key: "reports",       label: "Relatórios" },
  { key: "settings",      label: "Configurações" },
];

export const PERMISSIONS: PermissionDef[] = [
  // Financeiro
  { key: "financial.view",     label: "Visualizar",                   area: "financial" },
  { key: "financial.edit",     label: "Lançar / editar",              area: "financial" },
  { key: "financial.delete",   label: "Excluir lançamentos",          area: "financial" },
  { key: "financial.export",   label: "Exportar relatórios",          area: "financial" },

  // Produtos & Estoque
  { key: "products.view",      label: "Visualizar produtos",          area: "products" },
  { key: "products.edit",      label: "Criar / editar produtos",      area: "products" },
  { key: "products.delete",    label: "Excluir produtos",             area: "products" },
  { key: "stock.adjust",       label: "Ajustar estoque",              area: "products" },
  { key: "stock.transfer",     label: "Movimentar estoque",           area: "products" },

  // Vendas
  { key: "sales.view",         label: "Ver vendas",                   area: "sales" },
  { key: "sales.create",       label: "Registrar vendas",             area: "sales" },
  { key: "sales.refund",       label: "Estornar vendas",              area: "sales" },
  { key: "sales.discount",     label: "Aplicar desconto",             area: "sales" },

  // Clientes
  { key: "clients.view",       label: "Ver clientes",                 area: "clients" },
  { key: "clients.edit",       label: "Criar / editar clientes",      area: "clients" },
  { key: "clients.delete",     label: "Excluir clientes",             area: "clients" },

  // Agendamentos
  { key: "appointments.view",  label: "Ver agenda",                   area: "appointments" },
  { key: "appointments.edit",  label: "Criar / mover agendamentos",   area: "appointments" },

  // Produção
  { key: "production.view",    label: "Ver produção",                 area: "production" },
  { key: "production.execute", label: "Executar ordens",              area: "production" },

  // Operações
  { key: "deliveries.view",    label: "Ver entregas",                 area: "operations" },
  { key: "deliveries.update",  label: "Atualizar entregas",           area: "operations" },
  { key: "cash.open",          label: "Abrir/fechar caixa",           area: "operations" },

  // Marketing
  { key: "marketing.view",     label: "Ver marketing",                area: "marketing" },
  { key: "marketing.edit",     label: "Criar campanhas",              area: "marketing" },

  // Equipe
  { key: "team.view",          label: "Ver equipe",                   area: "team" },
  { key: "team.manage",        label: "Convidar / remover usuários",  area: "team" },

  // Relatórios
  { key: "reports.view",       label: "Ver relatórios",               area: "reports" },

  // Configurações
  { key: "settings.edit",      label: "Editar configurações",         area: "settings" },
  { key: "modules.edit",       label: "Ativar / desativar módulos",   area: "settings" },
];

export const PERMS_BY_AREA: Record<string, PermissionDef[]> = PERMISSIONS.reduce(
  (acc, p) => {
    (acc[p.area] ||= []).push(p);
    return acc;
  },
  {} as Record<string, PermissionDef[]>
);

/** Templates de cargo padrão (podem ser sobrescritos pelos do tenant). */
export type RoleTemplate = {
  slug: string;
  label: string;
  area?: string;
  permissions: Record<string, boolean>;
};

const grant = (keys: string[]): Record<string, boolean> =>
  Object.fromEntries(keys.map((k) => [k, true]));

export const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    slug: "admin_master",
    label: "Admin Master",
    permissions: grant(PERMISSIONS.map((p) => p.key)),
  },
  {
    slug: "financeiro",
    label: "Financeiro",
    area: "financial",
    permissions: grant([
      "financial.view","financial.edit","financial.export",
      "reports.view","clients.view","sales.view",
    ]),
  },
  {
    slug: "estoque",
    label: "Estoque",
    area: "products",
    permissions: grant([
      "products.view","products.edit","stock.adjust","stock.transfer",
      "reports.view",
    ]),
  },
  {
    slug: "vendas",
    label: "Vendas",
    area: "sales",
    permissions: grant([
      "sales.view","sales.create","sales.discount",
      "clients.view","clients.edit","products.view",
    ]),
  },
  {
    slug: "recepcao",
    label: "Recepção",
    area: "appointments",
    permissions: grant([
      "appointments.view","appointments.edit",
      "clients.view","clients.edit","sales.view",
    ]),
  },
  {
    slug: "profissional",
    label: "Profissional",
    area: "appointments",
    permissions: grant([
      "appointments.view","clients.view",
    ]),
  },
  {
    slug: "marketing",
    label: "Marketing",
    area: "marketing",
    permissions: grant([
      "marketing.view","marketing.edit","clients.view","reports.view",
    ]),
  },
  {
    slug: "operacao",
    label: "Operação",
    area: "operations",
    permissions: grant([
      "deliveries.view","deliveries.update","cash.open","products.view",
    ]),
  },
];

/** Resolve permissões finais aplicando: template do cargo + overrides do usuário. */
export function resolvePermissions(
  rolePermissions: Record<string, boolean> | undefined,
  userPermissions: Record<string, boolean> | undefined
): Record<string, boolean> {
  return { ...(rolePermissions ?? {}), ...(userPermissions ?? {}) };
}
