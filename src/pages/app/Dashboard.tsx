import { Card } from "@/components/ui/card";
import { Calendar, Users, Wallet, TrendingUp, Package, AlertTriangle, ArrowUpRight } from "lucide-react";

const stats = [
  { label: "Faturamento do mês", value: "R$ 24.870", change: "+18%", icon: Wallet, color: "from-violet-500 to-purple-500" },
  { label: "Agendamentos hoje", value: "12", change: "3 pendentes", icon: Calendar, color: "from-cyan-500 to-blue-500" },
  { label: "Clientes ativos", value: "184", change: "+12 este mês", icon: Users, color: "from-pink-500 to-rose-500" },
  { label: "Pacotes ativos", value: "27", change: "8 a concluir", icon: Package, color: "from-amber-500 to-orange-500" },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-6 border-0 shadow-sm rounded-3xl">
            <div className="flex items-start justify-between mb-4">
              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg`}>
                <s.icon className="h-6 w-6 text-white" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold mb-1">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className="text-xs text-emerald-600 font-medium mt-2">{s.change}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6 rounded-3xl border-0 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Próximos agendamentos</h2>
            <button className="text-sm text-primary font-medium">Ver todos</button>
          </div>
          <div className="space-y-3">
            {[
              { time: "09:00", client: "Marina Silva", service: "Hidratação Premium", status: "Confirmado" },
              { time: "10:30", client: "Júlia Costa", service: "Pacote Sessão 3/4", status: "Pacote" },
              { time: "14:00", client: "Ana Beatriz", service: "Reconstrução + Ozônio", status: "Confirmado" },
              { time: "16:00", client: "Walk-in", service: "Venda Rápida", status: "Sem agendamento" },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 hover:bg-secondary transition">
                <div className="text-sm font-mono font-semibold text-primary">{a.time}</div>
                <div className="flex-1">
                  <div className="font-medium">{a.client}</div>
                  <div className="text-xs text-muted-foreground">{a.service}</div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">{a.status}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 rounded-3xl border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold">Alertas</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
              3 produtos com estoque baixo
            </div>
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-400">
              R$ 850 em promissórias atrasadas
            </div>
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-400">
              5 anamneses pendentes de revisão
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
