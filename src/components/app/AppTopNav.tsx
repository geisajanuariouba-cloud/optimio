import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useDevMode } from "@/hooks/useDevMode";
import { isComingSoon } from "@/lib/comingSoon";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { title: string; url: string; mod?: string; ownerOnly?: boolean; adminOnly?: boolean; perm?: string };
type Area = { label: string; items: Item[] };

const AREAS: Area[] = [
  {
    label: "Cadastros",
    items: [
      { title: "Clientes", url: "/app/clients", mod: "clients" },
      { title: "Fornecedores", url: "/app/suppliers", mod: "products" },
      { title: "Produtos", url: "/app/products", mod: "products" },
      { title: "Serviços", url: "/app/services", mod: "services" },
      { title: "Categorias", url: "/app/categories" },
      { title: "Equipe", url: "/app/team", ownerOnly: true },
    ],
  },
  {
    label: "Comercial",
    items: [
      { title: "Orçamentos", url: "/app/quotes", mod: "products" },
      { title: "Vendas", url: "/app/sales", mod: "financial" },
      { title: "CRM / Funil", url: "/app/funnel", mod: "clients" },
      { title: "Cobrança Inteligente", url: "/app/collections", mod: "financial" },
      { title: "Agenda", url: "/app/appointments", mod: "appointments" },
      { title: "Recorrência", url: "/app/packages", mod: "packages" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Financeiro", url: "/app/financial", mod: "financial" },
      { title: "Promissórias", url: "/app/debts", mod: "financial" },
      { title: "Caixa do Dia", url: "/app/cash-drawer", mod: "financial" },
      { title: "Maquininhas", url: "/app/card-machines", mod: "financial" },
    ],
  },
  {
    label: "Estoque",
    items: [
      { title: "Estoque", url: "/app/stock", mod: "products" },
      { title: "Compras Inteligentes", url: "/app/smart-purchases", mod: "products" },
      { title: "Revisão Importação", url: "/app/import-review", mod: "products" },
    ],
  },
  {
    label: "Produção",
    items: [
      { title: "Produção", url: "/app/production", mod: "products" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { title: "Marketing", url: "/app/marketing", mod: "marketing" },
      { title: "Campanhas IA", url: "/app/campaigns", mod: "marketing" },
      { title: "Combos", url: "/app/combos", mod: "marketing" },
      { title: "Marketplaces", url: "/app/marketplaces", mod: "products" },
    ],
  },
  {
    label: "Operações",
    items: [
      { title: "Central Operacional", url: "/app/operations" },
      { title: "Projetos", url: "/app/projects", mod: "marketing" },
      { title: "Tarefas", url: "/app/tasks" },
      { title: "Alertas", url: "/app/alerts" },
      { title: "Sugestões", url: "/app/suggestions" },
      { title: "Logística", url: "/app/deliveries", mod: "financial" },
      { title: "Montadores", url: "/app/assemblers", mod: "financial" },
      { title: "Anamnese", url: "/app/anamnesis", mod: "anamnesis" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "RH", url: "/app/hr", ownerOnly: true },
      { title: "Base de Conhecimento", url: "/app/knowledge" },
      { title: "Reuniões", url: "/app/meetings" },
      { title: "Auditoria", url: "/app/audit", adminOnly: true },
      { title: "Automações", url: "/app/automations", adminOnly: true },
    ],
  },
  {
    label: "Relatórios",
    items: [
      { title: "Dashboard", url: "/app" },
    ],
  },
  {
    label: "Configurações",
    items: [
      { title: "Empresa", url: "/app/settings", perm: "settings.edit" },
      { title: "Pagamentos", url: "/app/payment-methods", perm: "settings.edit" },
      { title: "Integrações", url: "/app/integrations" },
      { title: "Plano", url: "/app/upgrade", ownerOnly: true },
      { title: "Suporte", url: "/app/support" },
      { title: "Lixeira", url: "/app/trash", perm: "settings.edit" },
    ],
  },
];

export function AppTopNav() {
  const { hasModule, isAdmin, isOwner, can } = useTenant();
  const { pathname } = useLocation();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const visible = (i: Item) =>
    (!i.mod || hasModule(i.mod)) &&
    (!i.adminOnly || isAdmin) &&
    (!i.ownerOnly || isOwner) &&
    (!i.perm || isOwner || can(i.perm));

  const isActive = (url: string) =>
    url === "/app" ? pathname === "/app" : pathname === url || pathname.startsWith(url + "/");

  return (
    <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
      {AREAS.map((area, idx) => {
        const items = area.items.filter(visible);
        if (!items.length) return null;
        const hasActive = items.some(i => isActive(i.url));
        const open = openIdx === idx;
        return (
          <div
            key={area.label}
            className="relative"
            onMouseEnter={() => setOpenIdx(idx)}
            onMouseLeave={() => setOpenIdx(o => (o === idx ? null : o))}
          >
            <button
              onClick={() => setOpenIdx(open ? null : idx)}
              className={cn(
                "px-3 h-9 rounded-lg text-sm font-medium inline-flex items-center gap-1 whitespace-nowrap transition-colors",
                hasActive ? "text-primary bg-primary/10" : "text-foreground/80 hover:bg-secondary/60"
              )}
            >
              {area.label}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
            {open && (
              <div className="absolute left-0 top-full mt-1 min-w-[200px] rounded-xl border border-border/60 bg-popover shadow-elegant p-1 z-50">
                {items.map(it => (
                  <NavLink
                    key={it.url}
                    to={it.url}
                    end={it.url === "/app"}
                    onClick={() => setOpenIdx(null)}
                    className={({ isActive: a }) => cn(
                      "block px-3 py-2 rounded-lg text-sm hover:bg-secondary/70",
                      a && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    {it.title}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
