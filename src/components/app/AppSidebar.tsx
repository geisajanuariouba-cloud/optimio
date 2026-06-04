import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Calendar, Users, Package, Scissors, Wallet, Megaphone, Boxes, Trash2,
  Settings, LogOut, Shield, ClipboardList, ClipboardCheck, Receipt, LifeBuoy, CreditCard,
  Factory, Truck, Gift, KanbanSquare, FileText, Zap, Wrench, Banknote, ShoppingBag, Sparkles,
  UserCog, CheckSquare, TrendingUp, Lightbulb, Users2, Rocket, Warehouse, Bell, Compass,
  BookOpen, ScrollText,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { NICHES_WITH_ANAMNESIS, NicheKey } from "@/lib/niches";

type Item = {
  mod?: string; title: string; url: string; icon: any; end?: boolean;
  adminOnly?: boolean; anamnesisOnly?: boolean; ownerOnly?: boolean; perm?: string;
};

type Group = { label: string; items: Item[] };

const GROUPS: Group[] = [
  {
    label: "Comercial",
    items: [
      { mod: "clients", title: "termClients", url: "/app/clients", icon: Users },
      { mod: "clients", title: "Funil Comercial", url: "/app/funnel", icon: KanbanSquare },
      { mod: "appointments", title: "Agenda", url: "/app/appointments", icon: Calendar },
      { mod: "products", title: "Orçamentos", url: "/app/quotes", icon: FileText },
      { mod: "financial", title: "Vendas", url: "/app/sales", icon: ShoppingBag },
      { mod: "packages", title: "Recorrência", url: "/app/packages", icon: Package },
      { mod: "anamnesis", title: "Anamnese", url: "/app/anamnesis", icon: ClipboardList, anamnesisOnly: true },
    ],
  },
  {
    label: "Operação",
    items: [
      { mod: "dashboard", title: "Central Operacional", url: "/app/operations", icon: Compass },
      { mod: "dashboard", title: "Tarefas", url: "/app/tasks", icon: CheckSquare },
      { mod: "marketing", title: "Projetos", url: "/app/projects", icon: KanbanSquare },
      { mod: "dashboard", title: "Alertas", url: "/app/alerts", icon: Bell },
      { mod: "dashboard", title: "Sugestões", url: "/app/suggestions", icon: Lightbulb },
      { mod: "products", title: "Produtos", url: "/app/products", icon: Boxes },
      { mod: "products", title: "Estoque", url: "/app/stock", icon: Warehouse },
      { mod: "services", title: "termServices", url: "/app/services", icon: Scissors },
      { mod: "products", title: "Fornecedores", url: "/app/suppliers", icon: Factory },
      { mod: "products", title: "Revisão Importação", url: "/app/import-review", icon: ClipboardCheck },
      { mod: "financial", title: "Logística", url: "/app/deliveries", icon: Truck },
      { mod: "financial", title: "Montadores", url: "/app/assemblers", icon: Wrench },
      { mod: "products", title: "Produção", url: "/app/production", icon: Factory },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { mod: "financial", title: "Financeiro", url: "/app/financial", icon: Wallet },
      { mod: "financial", title: "Caixa do Dia", url: "/app/cash-drawer", icon: Banknote },
      { mod: "financial", title: "Promissórias", url: "/app/debts", icon: Receipt },
      { mod: "financial", title: "Cobrança Inteligente", url: "/app/collections", icon: Banknote },
    ],
  },
  {
    label: "Marketing",
    items: [
      { mod: "marketing", title: "Marketing", url: "/app/marketing", icon: Megaphone },
      { mod: "marketing", title: "Campanhas IA", url: "/app/campaigns", icon: TrendingUp },
      { mod: "marketing", title: "Combos", url: "/app/combos", icon: Gift },
    ],
  },
  {
    label: "Gestão",
    items: [
      { mod: "dashboard", title: "Base de Conhecimento", url: "/app/knowledge", icon: BookOpen },
      { mod: "dashboard", title: "Reuniões", url: "/app/meetings", icon: Users2 },
      { mod: "dashboard", title: "Auditoria", url: "/app/audit", icon: ScrollText, adminOnly: true },
      { mod: "integrations", title: "Automações", url: "/app/automations", icon: Zap, adminOnly: true },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const { hasModule, t, isAdmin, isOwner, can, profile } = useTenant();
  const nicheKey = (profile?.niche as NicheKey) ?? "beauty";

  const filt = (i: Item) =>
    (!i.mod || hasModule(i.mod)) &&
    (!i.adminOnly || isAdmin) &&
    (!i.anamnesisOnly || NICHES_WITH_ANAMNESIS.includes(nicheKey));

  const label = (s: string) =>
    s === "termClients" ? t("clients") : s === "termServices" ? t("services") : s;

  const isActive = (item: Item) =>
    item.end ? pathname === item.url : pathname === item.url || pathname.startsWith(item.url + "/");

  const systemItems: Item[] = [
    { title: "Comece aqui", url: "/app/start", icon: Sparkles, ownerOnly: true },
    { title: "Equipe", url: "/app/team", icon: UserCog, ownerOnly: true },
    { title: "Pagamentos", url: "/app/payment-methods", icon: CreditCard, perm: "settings.edit" },
    { title: "Melhorar plano", url: "/app/upgrade", icon: Rocket, ownerOnly: true },
    { title: "Suporte", url: "/app/support", icon: LifeBuoy },
    { title: "Lixeira", url: "/app/trash", icon: Trash2, perm: "settings.edit" },
    { title: "Configurações", url: "/app/settings", icon: Settings, perm: "settings.edit" },
  ].filter(i => (!i.ownerOnly || isOwner) && (!i.perm || isOwner || can(i.perm)));

  const btn =
    "h-10 rounded-xl text-[13px] gap-3 px-3 transition-colors hover:bg-sidebar-accent data-[active=true]:bg-primary/12 data-[active=true]:text-primary data-[active=true]:font-medium";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-4 pt-5 pb-3">
        <NavLink to="/app" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-[0_8px_24px_-6px_hsl(22_100%_50%_/_0.55)]">
            <Sparkles className="h-[18px] w-[18px] text-white" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Optimio</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Premium ERP</div>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-2 gap-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/app"} className={btn}>
                  <NavLink to="/app" end>
                    <LayoutDashboard className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {GROUPS.map(g => {
          const items = g.items.filter(filt);
          if (!items.length) return null;
          return (
            <SidebarGroup key={g.label}>
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 px-3 mt-2">
                  {g.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {items.map(item => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive(item)} className={btn}>
                        <NavLink to={item.url}>
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
                          {!collapsed && <span className="truncate">{label(item.title)}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 px-3 mt-2">
              Sistema
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/admin")} className={btn}>
                    <NavLink to="/admin">
                      <Shield className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span>Super Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {systemItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)} className={btn}>
                    <NavLink to={item.url}>
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Button variant="ghost" onClick={signOut} className="w-full justify-start gap-3 rounded-xl h-10 text-[13px] px-3 hover:bg-sidebar-accent">
          <LogOut className="h-[18px] w-[18px]" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
