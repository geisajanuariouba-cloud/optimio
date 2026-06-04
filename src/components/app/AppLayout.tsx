import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Bell, Search, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import AIChat from "@/components/AIChat";

type Hit = { kind: string; id: string; label: string; sub?: string };

export default function AppLayout() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading } = useTenant();
  const { mode, toggle } = useTheme();
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

  return (
    <div className="theme-skillset">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-16 border-b border-border bg-card/50 backdrop-blur flex items-center gap-4 px-4 lg:px-6">
              <SidebarTrigger className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 shrink-0" />
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar clientes, produtos, serviços…" className="pl-9 bg-secondary/50 border-0 h-10" />
                {hits.length > 0 && (
                  <Card className="absolute top-12 left-0 right-0 z-50 rounded-2xl border-0 shadow-lg max-h-80 overflow-auto">
                    {hits.map(h => (
                      <button key={h.kind + h.id} onClick={() => goTo(h)} className="w-full text-left p-3 hover:bg-secondary/60 flex items-center justify-between">
                        <div><div className="font-medium text-sm">{h.label}</div><div className="text-xs text-muted-foreground">{h.sub ?? "—"}</div></div>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">{h.kind}</span>
                      </button>
                    ))}
                  </Card>
                )}
              </div>
              <div className="text-sm text-muted-foreground hidden md:block">{profile?.company_name}</div>
              <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
            </header>
            <main className="flex-1 p-3 sm:p-4 lg:p-8 overflow-x-hidden">
              <Outlet />
            </main>
          </div>
          <AIChat context="app" visible={(profile as any)?.support_button_visible !== false} position={((profile as any)?.support_button_position ?? "bottom-right") as any} />
        </div>
      </SidebarProvider>
    </div>
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
