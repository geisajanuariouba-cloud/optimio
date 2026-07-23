import { NavLink, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Activity, BellRing, Lightbulb, Sparkles as SparkIcon,
  Users, Target, FileText, ShoppingBag, AlertTriangle, Calendar,
  Package, Boxes, Truck, ShoppingCart, FileSearch, MapPin, Wrench, Factory,
  Wallet, DollarSign, Receipt, FileSignature, CreditCard, Smartphone,
  Megaphone, Sparkles, Layers, BarChart3, Trash2,
  Briefcase, CheckSquare, BookOpen, ShieldCheck,
  Settings as SettingsIcon, Crown, LogOut, LifeBuoy, ChevronRight, ChevronLeft,
  Lightbulb as IdeaIcon, Landmark, Image, Wallet2,
} from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useModuleVisibility } from "@/hooks/useModuleVisibility";
import { useDevMode } from "@/hooks/useDevMode";
import { isComingSoon } from "@/lib/comingSoon";
import { ComingSoonModal } from "@/components/app/ComingSoonModal";
import logoAsset from "@/assets/optimio-logo.png.asset.json";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Item = {
  title: string;
  url?: string;
  icon: any;
  mod?: string;        // module key — hide if not enabled
  ownerOnly?: boolean;
  adminOnly?: boolean;
  superAdminOnly?: boolean;  // só Super Admin Optimio (painel interno)
  badge?: string;
  onClick?: () => void;
};
type Group = { label: string; items: Item[] };

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { profile, isOwner, isAdmin, isSuperAdmin } = useTenant();
  const { isModuleVisible } = useModuleVisibility();
  const { signOut } = useAuth();
  const { devMode } = useDevMode();
  const adminMaster = !!(profile as any)?.is_admin_master;
  const showSoonBadge = !(isSuperAdmin && devMode);
  const [soonModal, setSoonModal] = useState<{ open: boolean; title: string }>({ open: false, title: "" });

  const groups: Group[] = useMemo(() => [
    {
      label: "Principal",
      items: [
        { title: "Comece Aqui", url: "/app/start", icon: SparkIcon },
        { title: "Dashboard", url: "/app", icon: LayoutDashboard },
        { title: "Central Operacional", url: "/app/operations", icon: Activity },
        { title: "Alertas", url: "/app/alerts", icon: BellRing },
        { title: "Sugestões", url: "/app/suggestions", icon: Lightbulb },
      ],
    },
    {
      label: "Comercial",
      items: [
        { title: "Clientes", url: "/app/clients", icon: Users, mod: "clients" },
        { title: "Funil Comercial", url: "/app/funnel", icon: Target, mod: "funnel" },
        { title: "Orçamentos", url: "/app/quotes", icon: FileText, mod: "quotes" },
        { title: "Vendas", url: "/app/sales", icon: ShoppingBag, mod: "sales" },
        { title: "Cobrança Inteligente", url: "/app/collections", icon: AlertTriangle, mod: "financial" },
        { title: "Agenda", url: "/app/appointments", icon: Calendar, mod: "appointments" },
      ],
    },
    {
      label: "Operação",
      items: [
        { title: "Produtos", url: "/app/products", icon: Package, mod: "products" },
        { title: "Estoque", url: "/app/stock", icon: Boxes, mod: "stock" },
        { title: "Fornecedores", url: "/app/suppliers", icon: Truck, mod: "suppliers" },
        { title: "Compras", url: "/app/smart-purchases", icon: ShoppingCart, mod: "smart_purchases" },
        { title: "Revisão de Importação", url: "/app/import-review", icon: FileSearch, mod: "products" },
        { title: "Logística", url: "/app/deliveries", icon: MapPin, mod: "deliveries" },
        { title: "Montadores", url: "/app/assemblers", icon: Wrench, mod: "assemblers" },
        { title: "Produção", url: "/app/production", icon: Factory, mod: "production" },
      ],
    },
    {
      label: "Financeiro",
      items: [
        { title: "Financeiro", url: "/app/financial", icon: Wallet, mod: "financial" },
        { title: "Relatórios", url: "/app/reports", icon: BarChart3, mod: "financial" },
        { title: "Caixa do Dia", url: "/app/cash-drawer", icon: DollarSign, mod: "cash_drawer" },
        { title: "Dívidas", url: "/app/debts", icon: Receipt, mod: "financial" },
        { title: "Promissórias", url: "/app/debts", icon: FileSignature, mod: "financial" },
        { title: "Métodos de Pagamento", url: "/app/payment-methods", icon: CreditCard, mod: "payment_methods" },
        { title: "Maquininhas", url: "/app/card-machines", icon: Smartphone, mod: "card_machines" },
      ],
    },
    {
      label: "Marketing",
      items: [
        { title: "Marketing", url: "/app/marketing", icon: Megaphone, mod: "marketing" },
        { title: "Campanhas IA", url: "/app/campaigns", icon: Sparkles, mod: "campaigns", badge: "IA" },
        { title: "Combos & Pacotes", url: "/app/combos", icon: Layers, mod: "packages" },
        { title: "Ideias de Produto", url: "/app/product-ideas", icon: IdeaIcon, mod: "product_ideas" },
      ],
    },
    {
      label: "Mídia Paga",
      items: [
        { title: "Contas de Anúncio", url: "/app/ad-accounts", icon: Landmark, mod: "ad_accounts" },
        { title: "Biblioteca de Criativos", url: "/app/ad-creatives", icon: Image, mod: "ad_creatives" },
        { title: "Caixa de Anúncios", url: "/app/ad-cash", icon: Wallet2, mod: "ad_cash" },
      ],
    },
    {
      label: "Gestão",
      items: [
        { title: "Projetos", url: "/app/projects", icon: Briefcase, mod: "projects" },
        { title: "Tarefas", url: "/app/tasks", icon: CheckSquare, mod: "tasks" },
        { title: "Base de Conhecimento", url: "/app/knowledge", icon: BookOpen, mod: "knowledge" },
        { title: "Auditoria", url: "/app/audit", icon: ShieldCheck, adminOnly: true },
        { title: "RH", url: "/app/hr", icon: Users, ownerOnly: true },
        { title: "Equipe", url: "/app/team", icon: Users, mod: "team", ownerOnly: true },
      ],
    },
    {
      label: "Sistema",
      items: [
        { title: "Configurações", url: "/app/settings", icon: SettingsIcon },
        { title: "Lixeira", url: "/app/trash", icon: Trash2 },
        { title: "Super Admin", url: "/admin", icon: Crown, superAdminOnly: true },
        { title: "Sair", icon: LogOut, onClick: () => signOut() },
      ],
    },
  ], [signOut]);

  const isActive = (url?: string) => {
    if (!url) return false;
    if (url === "/app") return pathname === "/app";
    return pathname === url || pathname.startsWith(url + "/");
  };

  const visible = (it: Item) => {
    // Painel interno da Optimio: só Super Admin (verificado antes de qualquer atalho).
    if (it.superAdminOnly) return isSuperAdmin;
    // Módulos sempre respeitam o que foi configurado, mesmo para Admin Master —
    // é justamente a própria conta que customiza o que aparece.
    if (it.mod && !isModuleVisible(it.mod)) return false;
    if (adminMaster) return true;
    if (it.adminOnly && !isAdmin) return false;
    if (it.ownerOnly && !isOwner) return false;
    return true;
  };

  return (
    <>
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border/60 p-3">
        <NavLink
          to="/app"
          className={cn(
            "flex rounded-xl hover:bg-sidebar-accent/50 transition-colors",
            collapsed ? "items-center justify-center p-1" : "flex-col items-center gap-1.5 px-2 py-2"
          )}
        >
          <img
            src={logoAsset.url}
            alt="Optimio"
            className={collapsed ? "h-9 w-9 object-contain shrink-0" : "h-18 w-auto shrink-0 max-h-[72px]"}
            draggable={false}
          />
          {!collapsed && (
            <div className="min-w-0 w-full text-center">
              <div className="font-semibold text-sm leading-tight truncate text-sidebar-foreground">
                {profile?.company_name || "Sua empresa"}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 truncate">
                {adminMaster ? "Admin Master" : (profile?.full_name ?? "")}
              </div>
            </div>
          )}
        </NavLink>
        {!collapsed && profile?.logo_url && (
          <div className="mt-2 flex items-center justify-center rounded-lg bg-sidebar-accent/40 p-2">
            <img src={profile.logo_url} alt={profile.company_name ?? "Empresa"} className="max-h-12 w-auto object-contain" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 scrollbar-thin scrollbar-thumb-sidebar-border scrollbar-track-transparent">
        {groups.map((g) => {
          const items = g.items.filter(visible);
          if (!items.length) return null;
          return (
            <SidebarGroup key={g.label} className="mb-1">
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/40 px-2 mb-1">
                  {g.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((it) => {
                    const active = isActive(it.url);
                    const soon = !!it.url && isComingSoon(it.url) && showSoonBadge;
                    const Inner = (
                      <>
                        <it.icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-sidebar-primary", soon && "opacity-60")} />
                        {!collapsed && (
                          <>
                            <span className={cn("truncate flex-1", soon && "opacity-70")}>{it.title}</span>
                            {soon ? (
                              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 tracking-wide shadow-[0_0_8px_hsl(38_100%_50%/0.2)]">
                                Em breve
                              </span>
                            ) : it.badge && (
                              <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sidebar-primary/15 text-sidebar-primary">
                                {it.badge}
                              </span>
                            )}
                            {active && <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary shadow-[0_0_8px_hsl(var(--sidebar-primary))]" />}
                          </>
                        )}
                      </>
                    );
                    return (
                      <SidebarMenuItem key={it.title + (it.url ?? "")}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={collapsed ? it.title : undefined}
                          className={cn(
                            "h-9 rounded-xl gap-2.5 text-sm font-medium transition-all",
                            "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                            active && "bg-sidebar-accent text-sidebar-foreground shadow-[inset_2px_0_0_0_hsl(var(--sidebar-primary))]"
                          )}
                        >
                          {it.url && !soon ? (
                            <NavLink to={it.url}>{Inner}</NavLink>
                          ) : it.url && soon ? (
                            <button type="button" onClick={() => setSoonModal({ open: true, title: it.title })} className="w-full text-left">{Inner}</button>
                          ) : (
                            <button type="button" onClick={it.onClick} className="w-full text-left">{Inner}</button>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 p-2 space-y-1">
        {profile?.plan !== "unlimited" && (
          <NavLink
            to="/app/upgrade"
            className={cn(
              "flex items-center gap-2.5 h-10 px-3 rounded-xl text-sm font-medium transition-colors",
              "bg-gradient-to-r from-primary/90 to-primary text-primary-foreground hover:shadow-elegant"
            )}
          >
            <Crown className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">Upgrade do plano</span>}
          </NavLink>
        )}
        <NavLink
          to="/app/support"
          className="flex items-center gap-2.5 h-9 px-3 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LifeBuoy className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Suporte</span>}
        </NavLink>
      </SidebarFooter>
    </Sidebar>
    <ComingSoonModal
      open={soonModal.open}
      title={soonModal.title}
      onClose={() => setSoonModal(s => ({ ...s, open: false }))}
    />
    </>
  );
}

export default AppSidebar;
