import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Calendar, Users, Package, Scissors, Wallet, Megaphone, Boxes, Trash2, Settings, LogOut, Plug, Shield, ClipboardList, Receipt, LifeBuoy, Tags, CreditCard, Factory, Truck, Gift, KanbanSquare, FileText, Zap, Wrench, Banknote, ShoppingBag } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";

const ALL = [
  { mod: "dashboard", title: "Dashboard", url: "/app", icon: LayoutDashboard, end: true },
  { mod: "appointments", title: "Agenda", url: "/app/appointments", icon: Calendar },
  { mod: "clients", title: "termClients", url: "/app/clients", icon: Users },
  { mod: "packages", title: "Recorrência", url: "/app/packages", icon: Package },
  { mod: "anamnesis", title: "Anamnese", url: "/app/anamnesis", icon: ClipboardList },
  { mod: "services", title: "termServices", url: "/app/services", icon: Scissors },
  { mod: "products", title: "Produtos & Estoque", url: "/app/products", icon: Boxes },
  { mod: "products", title: "Fornecedores", url: "/app/suppliers", icon: Factory },
  { mod: "products", title: "Categorias", url: "/app/categories", icon: Tags },
  { mod: "products", title: "Orçamentos", url: "/app/quotes", icon: FileText },
  { mod: "financial", title: "Vendas", url: "/app/sales", icon: ShoppingBag },
  { mod: "financial", title: "Financeiro", url: "/app/financial", icon: Wallet },
  { mod: "financial", title: "Caixa em Dinheiro", url: "/app/cash-drawer", icon: Banknote },
  { mod: "financial", title: "Métodos de Pagamento", url: "/app/payment-methods", icon: CreditCard },
  { mod: "financial", title: "Dívidas", url: "/app/debts", icon: Receipt },
  { mod: "financial", title: "Logística", url: "/app/deliveries", icon: Truck },
  { mod: "financial", title: "Montadores", url: "/app/assemblers", icon: Wrench },
  { mod: "marketing", title: "Marketing", url: "/app/marketing", icon: Megaphone },
  { mod: "marketing", title: "Combos", url: "/app/combos", icon: Gift },
  { mod: "marketing", title: "Projetos", url: "/app/projects", icon: KanbanSquare },
  { mod: "integrations", title: "Automações (Make)", url: "/app/automations", icon: Zap, adminOnly: true },
] as Array<{ mod: string; title: string; url: string; icon: any; end?: boolean; adminOnly?: boolean }>;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const { hasModule, t, isAdmin } = useTenant();

  const items = ALL
    .filter(i => hasModule(i.mod))
    .filter(i => !i.adminOnly || isAdmin)
    .map(i => ({
      ...i,
      title: i.title === "termClients" ? t("clients") : i.title === "termServices" ? t("services") : i.title,
    }));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        {collapsed ? <Logo size="sm" showWordmark={false} to="/app" /> : <Logo size="sm" to="/app" />}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = item.end ? pathname === item.url : pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink to={item.url} end={item.end} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Sistema</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/admin")}>
                    <NavLink to="/admin" className="flex items-center gap-3">
                      <Shield className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>Super Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {[{ title: "Suporte", url: "/app/support", icon: LifeBuoy }, { title: "Lixeira", url: "/app/trash", icon: Trash2 }, { title: "Configurações", url: "/app/settings", icon: Settings }].map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 shrink-0" />
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
        <Button variant="ghost" onClick={signOut} className="w-full justify-start gap-2">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
