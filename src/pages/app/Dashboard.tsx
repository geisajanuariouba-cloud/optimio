import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Calendar, Users, Wallet, Package, ArrowUpRight, AlertTriangle, ShoppingBag, Truck, Plug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const { profile, hasModule } = useTenant();
  const isRetail = profile?.niche === "retail";
  const [data, setData] = useState({ income: 0, today: [] as any[], clients: 0, packages: 0, lowStock: 0, services: [] as any[], pendingOrders: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date(); monthStart.setDate(1);
      const [{ data: appts }, { data: cli }, { data: pkgs }, { data: prod }, { data: fin }, { data: svcs }, { data: orders }] = await Promise.all([
        supabase.from("appointments").select("appointment_time, amount, client_id, service_id, status, is_walk_in").eq("appointment_date", today).is("deleted_at", null).order("appointment_time"),
        supabase.from("clients").select("id", { count: "exact" }).is("deleted_at", null),
        supabase.from("packages").select("id, status").is("deleted_at", null),
        supabase.from("products").select("stock, min_stock").is("deleted_at", null),
        supabase.from("financial").select("net_amount, type, transaction_date").gte("transaction_date", monthStart.toISOString().slice(0, 10)),
        supabase.from("services").select("id, name").is("deleted_at", null),
        supabase.from("site_orders").select("id, status").eq("status", "review"),
      ]);
      setData({
        today: appts ?? [],
        clients: cli?.length ?? 0,
        packages: (pkgs ?? []).filter(p => p.status === "active").length,
        lowStock: (prod ?? []).filter(p => p.stock <= p.min_stock).length,
        income: (fin ?? []).filter(f => f.type === "income").reduce((a, f) => a + Number(f.net_amount), 0),
        services: svcs ?? [],
        pendingOrders: (orders ?? []).length,
      });
    })();
  }, [user]);

  const sname = (id: string | null) => data.services.find(s => s.id === id)?.name ?? "Atendimento";

  const baseStats = [
    { label: "Receita do mês", value: `R$ ${data.income.toFixed(2)}`, icon: Wallet, color: "from-violet-500 to-purple-500", to: "/app/financial" },
    { label: "Clientes ativos", value: String(data.clients), icon: Users, color: "from-pink-500 to-rose-500", to: "/app/clients" },
  ];
  const retailStats = [
    ...baseStats,
    { label: "Pedidos pendentes", value: String(data.pendingOrders), icon: ShoppingBag, color: "from-cyan-500 to-blue-500", to: "/app/site" },
    { label: "Estoque baixo", value: String(data.lowStock), icon: Truck, color: "from-amber-500 to-orange-500", to: "/app/products" },
  ];
  const beautyStats = [
    ...baseStats,
    { label: "Agendamentos hoje", value: String(data.today.length), icon: Calendar, color: "from-cyan-500 to-blue-500", to: "/app/appointments" },
    { label: "Pacotes em curso", value: String(data.packages), icon: Package, color: "from-amber-500 to-orange-500", to: "/app/packages" },
  ];
  const stats = isRetail ? retailStats : beautyStats;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to}>
            <Card className="p-6 border-0 shadow-sm rounded-3xl hover:shadow-md transition cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg`}>
                  <s.icon className="h-6 w-6 text-white" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold mb-1">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6 rounded-3xl border-0 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Agenda de hoje</h2>
            <Link to="/app/appointments" className="text-sm text-primary font-medium">Ver agenda</Link>
          </div>
          {data.today.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nada agendado para hoje.</p>
          ) : (
            <div className="space-y-3">
              {data.today.slice(0, 6).map((a, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/50">
                  <div className="text-sm font-mono font-semibold text-primary">{a.appointment_time?.slice(0, 5)}</div>
                  <div className="flex-1">
                    <div className="font-medium">{a.is_walk_in ? "Walk-in" : sname(a.service_id)}</div>
                    <div className="text-xs text-muted-foreground">R$ {Number(a.amount).toFixed(2)}</div>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium capitalize">{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 rounded-3xl border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold">Alertas</h2>
          </div>
          <div className="space-y-3 text-sm">
            {data.lowStock > 0 && (
              <Link to="/app/products" className="block p-3 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {data.lowStock} produto(s) com estoque baixo
              </Link>
            )}
            {data.lowStock === 0 && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                Tudo certo por aqui ✨
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
