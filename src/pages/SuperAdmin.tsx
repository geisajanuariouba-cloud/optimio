import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Shield, Check, X, Users, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Tenant = { id: string; full_name: string | null; company_name: string | null; plan: string; account_status: string; created_at: string; niche: string };

export default function SuperAdmin() {
  const { isAdmin, loading } = useTenant();
  const { signOut } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const load = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name, company_name, plan, account_status, created_at, niche").order("created_at", { ascending: false });
    setTenants((data ?? []) as Tenant[]);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background bg-mesh"><div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/app" replace />;

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ account_status: status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Conta ${status === "active" ? "aprovada" : "rejeitada"}`); load();
  };

  const pending = tenants.filter(t => t.account_status === "pending_payment");
  const active = tenants.filter(t => t.account_status === "active");
  const revenue = active.reduce((a, t) => a + ({ basic: 159, standard: 199, unlimited: 399 } as any)[t.plan] || 0, 0);

  return (
    <div className="min-h-screen bg-background bg-mesh">
      <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between glass">
        <div className="flex items-center gap-3"><Logo size="sm" /><Badge className="bg-gradient-brand text-white border-0 gap-1"><Shield className="h-3 w-3" /> Super Admin</Badge></div>
        <Button variant="ghost" onClick={signOut}>Sair</Button>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <h1 className="text-4xl font-bold">Painel do Optimio</h1>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { l: "Tenants ativos", v: active.length, i: Users },
            { l: "Pendentes pagamento", v: pending.length, i: Shield },
            { l: "MRR estimado", v: `R$ ${revenue.toFixed(0)}`, i: DollarSign },
          ].map(s => (
            <Card key={s.l} className="glass border-0 rounded-3xl p-6">
              <s.i className="h-5 w-5 text-brand-cyan mb-3" />
              <div className="text-3xl font-bold">{s.v}</div>
              <div className="text-sm text-muted-foreground">{s.l}</div>
            </Card>
          ))}
        </div>

        <Card className="glass border-0 rounded-3xl overflow-hidden">
          <div className="p-5 border-b border-border/40 font-semibold">Aprovação de contas ({pending.length})</div>
          {pending.length === 0
            ? <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma conta aguardando.</div>
            : <div className="divide-y divide-border/40">{pending.map(t => (
                <div key={t.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1"><div className="font-medium">{t.company_name}</div><div className="text-xs text-muted-foreground">{t.full_name} · plano {t.plan} · {t.niche}</div></div>
                  <Button size="sm" onClick={() => setStatus(t.id, "active")} className="bg-emerald-600 hover:bg-emerald-700"><Check className="h-4 w-4 mr-1" />Aprovar</Button>
                  <Button size="sm" variant="destructive" onClick={() => setStatus(t.id, "rejected")}><X className="h-4 w-4 mr-1" />Rejeitar</Button>
                </div>
              ))}</div>}
        </Card>

        <Card className="glass border-0 rounded-3xl overflow-hidden">
          <div className="p-5 border-b border-border/40 font-semibold">Todos os tenants</div>
          <div className="divide-y divide-border/40">
            {tenants.map(t => (
              <div key={t.id} className="p-4 flex items-center gap-4 text-sm">
                <div className="flex-1"><div className="font-medium">{t.company_name}</div><div className="text-xs text-muted-foreground">{t.full_name} · {t.niche}</div></div>
                <Badge variant="outline" className="capitalize">{t.plan}</Badge>
                <Badge className={t.account_status === "active" ? "bg-emerald-500/10 text-emerald-600" : t.account_status === "rejected" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}>
                  {t.account_status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
