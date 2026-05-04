import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Calendar, Users, Package, Scissors, Wallet, Megaphone, Boxes, Trash2, Settings, LogOut, Globe, Plug, Shield, ClipboardList } from "lucide-react";
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
  { mod: "packages", title: "Pacotes", url: "/app/packages", icon: Package },
  { mod: "anamnesis", title: "Anamnese", url: "/app/anamnesis", icon: ClipboardList },
  { mod: "services", title: "termServices", url: "/app/services", icon: Scissors },
  { mod: "products", title: "Produtos & Estoque", url: "/app/products", icon: Boxes },
  { mod: "financial", title: "Financeiro", url: "/app/financial", icon: Wallet },
  { mod: "marketing", title: "Marketing", url: "/app/marketing", icon: Megaphone },
  { mod: "site", title: "Site Builder", url: "/app/site", icon: Globe },
  { mod: "integrations", title: "Integrações", url: "/app/integrations", icon: Plug },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const { hasModule, t, isAdmin } = useTenant();

  const items = ALL.filter(i => hasModule(i.mod)).map(i => ({
    ...i,
    title: i.title === "termClients" ? t("clients") : i.title === "termServices" ? t("services") : i.title,
  }));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        {collapsed ? <Logo size="sm" showWordmark={false} /> : <Logo size="sm" />}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = item.end ? pathname === item.url : pathname.startsWith(item.url);
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
              {[{ title: "Lixeira", url: "/app/trash", icon: Trash2 }, { title: "Configurações", url: "/app/settings", icon: Settings }].map(item => (
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
