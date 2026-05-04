import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background bg-mesh">
      <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="theme-skillset">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-16 border-b border-border bg-card/50 backdrop-blur flex items-center gap-4 px-4 lg:px-6">
              <SidebarTrigger />
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar clientes, agendamentos…" className="pl-9 bg-secondary/50 border-0 h-10" />
              </div>
              <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
            </header>
            <main className="flex-1 p-4 lg:p-8 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
