import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, Suspense } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Bell, Search, Sun, Moon, ShieldCheck, Sparkles, LogOut, Code2 } from "lucide-react";
import { useDevMode } from "@/hooks/useDevMode";
import { ComingSoonGuard } from "@/components/app/ComingSoonGuard";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import AIChat from "@/components/AIChat";
import { NotificationsBell } from "@/components/app/NotificationsBell";
import { NavLink } from "react-router-dom";

type Hit = { kind: string; id: string; label: string; sub?: string };

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

export default function AppLayout() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading } = useTenant();
  const { mode, toggle } = useTheme();
  const { devMode, toggleDevMode } = useDevMode();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);

  useEffect(() => {
    if (!q.trim() || !user) { setHits([]); return; }
    const t = setTimeout(async () => {
      const like = `%${q}%`;
      const [c, p, s] = await Promise.all([
        supabase.from("clients").select("id, full_name, phone").is("deleted_at", null).ilike("full_name", like).limit(5),
        supabase.from("products").select("id, name, category").is("deleted_at", null).eq("status", "active").ilike("name", like).limit(5),
        supabase.from("services").select("id, name, category").is("deleted_at", null).ilike("name", like).limit(5),
      ]);
      const h: Hit[] = [
        ...(c.data ?? []).map((x: any) => ({ kind: "Cliente", id: x.id, label: x.full_name, sub: x.phone })),
        ...(p.data ?? []).map((x: any) => ({ kind: "Produto", id: x.id, label: x.name, sub: x.category })),
        ...(s.data ?? []).map((x: any) => ({ kind: "Serviço", id: x.id, label: x.name, sub: x.category })),
      ];
      setHits(h);
    }, 250);
    return () => clearTimeout(t);
  }, [q, user]);

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background bg-mesh">
      <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  if (profile?.account_status === "waiting_approval" || profile?.account_status === "pending_payment") {
    return <PendingScreen onSignOut={signOut} />;
  }
  if (profile?.account_status === "rejected" || profile?.account_status === "disabled" || profile?.account_status === "banned") {
    return (
      <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-4">
        <Card className="glass border-0 rounded-3xl p-10 max-w-md text-center">
          <h1 className="text-3xl font-bold mb-3">Conta {profile.account_status === "banned" ? "banida" : "indisponível"}</h1>
          <p className="text-muted-foreground mb-6">Entre em contato com o suporte para mais informações.</p>
          <Button onClick={signOut} variant="outline" className="rounded-2xl">Sair</Button>
        </Card>
      </div>
    );
  }

  const goTo = (h: Hit) => {
    setQ(""); setHits([]);
    if (h.kind === "Cliente") nav("/app/clients");
    else if (h.kind === "Produto") nav("/app/products");
    else nav("/app/services");
  };

  const adminMaster = !!(profile as any)?.is_admin_master;

  return (
    <SidebarProvider>
      <div className="theme-skillset min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
            <div className="h-14 flex items-center gap-3 px-4 lg:px-6">
              <SidebarTrigger className="h-9 w-9 rounded-xl hover:bg-secondary/60" />
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar clientes, produtos, serviços…"
                  className="pl-10 bg-secondary/50 border border-border/60 h-9 rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
                />
                {hits.length > 0 && (
                  <Card className="absolute top-11 left-0 right-0 z-50 rounded-2xl border border-border/60 shadow-elegant max-h-80 overflow-auto premium-card p-1">
                    {hits.map(h => (
                      <button key={h.kind + h.id} onClick={() => goTo(h)} className="w-full text-left p-3 rounded-xl hover:bg-secondary/60 flex items-center justify-between">
                        <div><div className="font-medium text-sm">{h.label}</div><div className="text-xs text-muted-foreground">{h.sub ?? "—"}</div></div>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">{h.kind}</span>
                      </button>
                    ))}
                  </Card>
                )}
              </div>
              <div className="hidden lg:flex items-center gap-2 pill px-3 h-9 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {profile?.company_name}
              </div>
              {adminMaster && (
                <>
                  <div className="hidden md:inline-flex items-center gap-1.5 pill px-2.5 h-9 text-xs font-semibold text-primary border border-primary/30 bg-primary/10">
                    <ShieldCheck className="h-3.5 w-3.5" /> Admin · Unlimited
                  </div>
                  <Button
                    variant={devMode ? "default" : "ghost"}
                    size="icon"
                    onClick={toggleDevMode}
                    aria-label="Modo desenvolvedor"
                    title={devMode ? "Modo desenvolvedor ON (mostra módulos em breve)" : "Modo desenvolvedor OFF"}
                    className={`h-9 w-9 rounded-xl ${devMode ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-secondary/60"}`}
                  >
                    <Code2 className="h-[18px] w-[18px]" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema" className="h-9 w-9 rounded-xl hover:bg-secondary/60">
                {mode === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </Button>
              <NotificationsBell />
              <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9 rounded-xl hover:bg-secondary/60" aria-label="Sair">
                <LogOut className="h-[18px] w-[18px]" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </main>
          <AIChat context="app" visible={(profile as any)?.support_button_visible !== false} position={((profile as any)?.support_button_position ?? "bottom-right") as any} />
        </div>
      </div>
    </SidebarProvider>
  );
}


function PendingScreen({ onSignOut }: { onSignOut: () => void }) {
  const [wa, setWa] = useState("");
  useEffect(() => {
    supabase.from("app_settings").select("whatsapp_link").eq("id", 1).maybeSingle().then(({ data }) => setWa(data?.whatsapp_link ?? ""));
  }, []);
  return (
    <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-4">
      <Card className="glass border-0 rounded-3xl p-8 sm:p-10 max-w-md text-center">
        <Logo size="sm" />
        <h1 className="text-2xl sm:text-3xl font-bold mt-6 mb-3">Cadastro recebido!</h1>
        <p className="text-muted-foreground mb-6">Vamos entrar em contato com você para finalização do pedido! Caso queira mais rápido, fale conosco pelo WhatsApp.</p>
        <a href={wa || "https://wa.me/"} target="_blank" rel="noopener noreferrer">
          <Button className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white border-0 mb-3">Falar no WhatsApp</Button>
        </a>
        <Button onClick={onSignOut} variant="outline" className="rounded-2xl w-full">Sair</Button>
      </Card>
    </div>
  );
}
