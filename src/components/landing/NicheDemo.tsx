import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Calendar, Users, Boxes, Wallet, GraduationCap, Scissors, Sofa, Briefcase } from "lucide-react";

const NICHES = [
  { id: "beauty", label: "Beleza & Saúde", icon: Scissors, modules: ["Agenda", "Clientes", "Pacotes", "Anamnese", "Financeiro"] },
  { id: "retail", label: "Varejo & Móveis", icon: Sofa, modules: ["Clientes", "Estoque", "Vendas", "Promissórias", "Financeiro"] },
  { id: "services", label: "Consultoria/Pet", icon: Briefcase, modules: ["Agenda", "Clientes", "Projetos", "Financeiro"] },
  { id: "education", label: "Educação", icon: GraduationCap, modules: ["Aulas", "Alunos", "Pagamentos", "Materiais"] },
];

const MOCKS: Record<string, { metrics: { l: string; v: string }[]; rows: string[] }> = {
  beauty: { metrics: [{ l: "Hoje", v: "8 atend." }, { l: "Mês", v: "R$ 18.450" }, { l: "Pacotes ativos", v: "23" }], rows: ["09:00 — Maria — Mechas", "10:30 — Ana — Manicure", "13:00 — Júlia — Hidratação"] },
  retail: { metrics: [{ l: "Vendas mês", v: "127" }, { l: "Receita", v: "R$ 42.300" }, { l: "Estoque baixo", v: "5" }], rows: ["Sofá Zara — 3 un — R$ 2.100", "Mesa Loft — 1 un — R$ 1.450", "Estante — 0 un (esgotado)"] },
  services: { metrics: [{ l: "Projetos ativos", v: "12" }, { l: "Receita", v: "R$ 28.900" }, { l: "Reuniões hoje", v: "4" }], rows: ["10:00 — Cliente A — Diagnóstico", "14:00 — Cliente B — Follow-up"] },
  education: { metrics: [{ l: "Alunos", v: "84" }, { l: "Receita", v: "R$ 12.700" }, { l: "Aulas semana", v: "21" }], rows: ["Turma A — Inglês — Seg/Qua", "Turma B — Espanhol — Ter/Qui"] },
};

export default function NicheDemo() {
  const [active, setActive] = useState("beauty");
  const data = MOCKS[active];
  return (
    <section className="px-6 lg:px-12 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-4 text-xs">PLAYGROUND</div>
          <h2 className="text-4xl md:text-5xl font-bold">Veja o Optimio <span className="text-gradient-brand">no seu nicho</span></h2>
          <p className="text-muted-foreground mt-3">Selecione um nicho — a interface se adapta automaticamente.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-3 mb-6">
          {NICHES.map(n => (
            <button key={n.id} onClick={() => setActive(n.id)}
              className={`p-4 rounded-2xl border-2 text-left transition ${active === n.id ? "border-primary bg-primary/10" : "border-border/40 glass hover:border-primary/40"}`}>
              <n.icon className="h-5 w-5 text-brand-cyan mb-2" />
              <div className="font-semibold text-sm">{n.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{n.modules.length} módulos</div>
            </button>
          ))}
        </div>

        <Card className="glass border-0 rounded-3xl overflow-hidden">
          <div className="grid md:grid-cols-3 gap-0">
            <div className="md:col-span-3 grid grid-cols-3 gap-4 p-6 border-b border-border/30">
              {data.metrics.map(m => (
                <div key={m.l}>
                  <div className="text-xs text-muted-foreground">{m.l}</div>
                  <div className="text-2xl font-bold text-gradient-brand">{m.v}</div>
                </div>
              ))}
            </div>
            <div className="md:col-span-2 p-6 border-r border-border/30">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold"><Calendar className="h-4 w-4 text-brand-cyan" /> Atividade do dia</div>
              <div className="space-y-2">
                {data.rows.map(r => (
                  <div key={r} className="p-3 rounded-xl bg-secondary/40 text-sm">{r}</div>
                ))}
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-brand-cyan" /> Módulos ativos</div>
              {NICHES.find(n => n.id === active)!.modules.map(m => (
                <div key={m} className="text-sm flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{m}</div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
