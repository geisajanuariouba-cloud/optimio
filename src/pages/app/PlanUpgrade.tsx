import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/PageHeader";
import { Check, Sparkles, MessageCircle, Rocket, Crown, Zap } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

const PLANS = [
  {
    key: "starter", name: "Starter", price: "R$ 47", period: "/mês",
    icon: Zap, tone: "border-blue-500/30",
    features: ["1 usuário", "Até 100 clientes", "Agenda básica", "Financeiro simples", "Suporte por email"],
  },
  {
    key: "pro", name: "Pro", price: "R$ 97", period: "/mês", highlight: true,
    icon: Rocket, tone: "border-primary/50 shadow-lg shadow-primary/10",
    features: ["Até 5 usuários", "Clientes ilimitados", "Catálogo IA", "Marketing IA", "Estoque inteligente", "Promissórias avançadas", "Suporte prioritário"],
  },
  {
    key: "enterprise", name: "Enterprise", price: "Sob consulta", period: "",
    icon: Crown, tone: "border-amber-500/30",
    features: ["Usuários ilimitados", "Multi-loja / multi-empresa", "Automações Make ilimitadas", "API dedicada", "SLA 99.9%", "Onboarding com consultor", "Gestor de conta"],
  },
];

const FAQ = [
  { q: "Posso trocar de plano quando quiser?", a: "Sim. O upgrade é imediato e o downgrade na próxima cobrança." },
  { q: "Como funciona o pagamento?", a: "Cartão, Pix ou boleto. Renovação automática mensal ou anual." },
  { q: "Tem fidelidade?", a: "Não. Cancele quando quiser, sem multa." },
  { q: "Os dados ficam comigo?", a: "Sempre. Você exporta tudo a qualquer momento." },
];

export default function PlanUpgrade() {
  const { profile } = useTenant();
  const wpp = "https://wa.me/5500000000000?text=Quero%20fazer%20upgrade%20do%20Optimio";

  return (
    <div>
      <PageHeader title="Eleve o seu Optimio" description="Mais módulos, mais IA, mais automação." />

      <div className="text-center mb-8 space-y-2">
        <Badge className="bg-primary/10 text-primary border-primary/20 gap-1"><Sparkles className="h-3 w-3" />Você está no plano {profile?.plan ?? "Basic"}</Badge>
        <h2 className="text-2xl font-bold">Escolha o plano ideal para escalar</h2>
        <p className="text-muted-foreground text-sm">Sem fidelidade. Cancele quando quiser.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {PLANS.map(p => (
          <Card key={p.key} className={`rounded-3xl border-2 shadow-sm p-6 space-y-4 relative ${p.tone}`}>
            {p.highlight && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">Mais escolhido</Badge>}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><p.icon className="h-6 w-6 text-primary" /></div>
              <div>
                <div className="font-bold text-lg">{p.name}</div>
                <div><span className="text-2xl font-bold">{p.price}</span><span className="text-sm text-muted-foreground">{p.period}</span></div>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              {p.features.map(f => <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /><span>{f}</span></li>)}
            </ul>
            <Button className="w-full rounded-2xl" variant={p.highlight ? "default" : "outline"} asChild>
              <a href={wpp} target="_blank" rel="noreferrer">Fazer upgrade</a>
            </Button>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-0 shadow-sm p-6 mb-8 bg-gradient-to-br from-primary/5 to-primary/0">
        <div className="flex items-center gap-4">
          <MessageCircle className="h-8 w-8 text-primary" />
          <div className="flex-1">
            <div className="font-bold">Prefere falar com um consultor?</div>
            <div className="text-sm text-muted-foreground">Te ajudamos a escolher o plano certo e migrar seus dados.</div>
          </div>
          <Button asChild className="rounded-2xl"><a href={wpp} target="_blank" rel="noreferrer">Falar no WhatsApp</a></Button>
        </div>
      </Card>

      <h3 className="text-xl font-bold mb-4">Perguntas frequentes</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FAQ.map(f => (
          <Card key={f.q} className="rounded-3xl border-0 shadow-sm p-4">
            <div className="font-medium text-sm">{f.q}</div>
            <div className="text-sm text-muted-foreground mt-1">{f.a}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
