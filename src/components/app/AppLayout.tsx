import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";

export default function AppLayout() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading } = useTenant();

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background bg-mesh">
      <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  if (profile?.account_status === "pending_payment") {
    return (
      <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-4">
        <Card className="glass border-0 rounded-3xl p-10 max-w-md text-center">
          <Logo size="sm" />
          <h1 className="text-3xl font-bold mt-6 mb-3">Conta aguardando aprovação</h1>
          <p className="text-muted-foreground mb-6">Seu pagamento está sendo confirmado. Você receberá um e-mail assim que sua conta for liberada.</p>
          <Button onClick={signOut} variant="outline" className="rounded-2xl">Sair</Button>
        </Card>
      </div>
    );
  }
  if (profile?.account_status === "rejected") {
    return (
      <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-4">
        <Card className="glass border-0 rounded-3xl p-10 max-w-md text-center">
          <h1 className="text-3xl font-bold mb-3">Conta indisponível</h1>
          <p className="text-muted-foreground mb-6">Entre em contato com o suporte para mais informações.</p>
          <Button onClick={signOut} variant="outline" className="rounded-2xl">Sair</Button>
        </Card>
      </div>
    );
  }

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
                <Input placeholder="Buscar…" className="pl-9 bg-secondary/50 border-0 h-10" />
              </div>
              <div className="text-sm text-muted-foreground hidden md:block">{profile?.company_name}</div>
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
