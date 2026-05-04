import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { NICHES, NicheKey } from "@/lib/niches";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { ArrowRight, Check } from "lucide-react";

const COLORS = [
  { name: "Roxo Optimio", value: "271 91% 65%" },
  { name: "Ciano", value: "174 80% 55%" },
  { name: "Rosa Jewelry", value: "322 70% 55%" },
  { name: "Azul", value: "220 90% 65%" },
  { name: "Verde", value: "142 71% 45%" },
  { name: "Laranja", value: "24 95% 58%" },
];

export default function Onboarding() {
  const { user } = useAuth();
  const { refresh, profile } = useTenant();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    company_name: "",
    niche: "beauty" as NicheKey,
    has_appointments: true,
    produces_own: "resell" as "produce" | "resell" | "none",
    estimated_volume: "low",
    primary_color: "271 91% 65%",
    border_style: "rounded",
  });

  useEffect(() => {
    if (profile?.onboarding_completed) nav("/app", { replace: true });
    if (profile?.company_name && profile.company_name !== "Studio") setData(d => ({ ...d, company_name: profile.company_name! }));
  }, [profile, nav]);

  const finish = async () => {
    if (!user) return;
    const niche = NICHES[data.niche];
    const suggested = data.estimated_volume === "high" ? "unlimited" : data.estimated_volume === "mid" ? "standard" : "basic";
    const { error } = await supabase.from("profiles").update({
      company_name: data.company_name || "Studio",
      niche: data.niche,
      enabled_modules: niche.modules,
      terms: niche.terms,
      primary_color: data.primary_color,
      border_style: data.border_style,
      estimated_volume: data.estimated_volume,
      plan: suggested,
      onboarding_completed: true,
    }).eq("id", user.id);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("Tudo pronto! Bem-vindo ao Optimio.");
    nav("/app");
  };

  const next = () => setStep(s => Math.min(5, s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));

  return (
    <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl glass border-0 rounded-3xl p-8 md:p-12">
        <div className="flex items-center justify-between mb-8">
          <Logo size="sm" />
          <div className="text-xs text-muted-foreground">Passo {step + 1} de 6</div>
        </div>
        <div className="h-1.5 bg-secondary/40 rounded-full mb-10 overflow-hidden">
          <div className="h-full bg-gradient-brand transition-all" style={{ width: `${((step + 1) / 6) * 100}%` }} />
        </div>

        {step === 0 && (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-3xl font-bold">Qual o nome da sua empresa?</h2>
            <p className="text-muted-foreground">Vamos personalizar o Optimio para você (whitelabel).</p>
            <Input autoFocus value={data.company_name} onChange={(e) => setData({ ...data, company_name: e.target.value })} placeholder="Ex.: Studio Maria" className="h-14 text-lg bg-secondary/40 border-0" />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-3xl font-bold">Qual o seu nicho principal?</h2>
            <p className="text-muted-foreground">A interface se adapta automaticamente.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {(Object.values(NICHES)).map(n => (
                <button key={n.key} onClick={() => setData({ ...data, niche: n.key })}
                  className={`text-left p-5 rounded-2xl border-2 transition ${data.niche === n.key ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                  <div className="font-semibold mb-1">{n.label}</div>
                  <div className="text-xs text-muted-foreground">{n.modules.length} módulos · {n.terms.clients}, {n.terms.services}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-3xl font-bold">Você trabalha com agendamento?</h2>
            <div className="grid grid-cols-2 gap-3">
              {[{ v: true, l: "Sim, agendo horários" }, { v: false, l: "Não, só vendas" }].map(o => (
                <button key={String(o.v)} onClick={() => setData({ ...data, has_appointments: o.v })}
                  className={`p-6 rounded-2xl border-2 ${data.has_appointments === o.v ? "border-primary bg-primary/10" : "border-border"}`}>
                  {o.l}
                </button>
              ))}
            </div>
            <h2 className="text-3xl font-bold pt-4">Trabalha com produtos?</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { v: "produce" as const, l: "Fabrico/produzo" },
                { v: "resell" as const, l: "Apenas revendo" },
                { v: "none" as const, l: "Não vendo produtos" },
              ].map(o => (
                <button key={o.v} onClick={() => setData({ ...data, produces_own: o.v })}
                  className={`p-6 rounded-2xl border-2 text-sm ${data.produces_own === o.v ? "border-primary bg-primary/10" : "border-border"}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-3xl font-bold">Quantas transações por mês?</h2>
            <p className="text-muted-foreground">Sugerimos um plano com base no volume.</p>
            {[
              { v: "low", l: "Até 30", plan: "Basic — R$ 159" },
              { v: "mid", l: "Até 100", plan: "Standard — R$ 199" },
              { v: "high", l: "Mais de 100", plan: "Unlimited — R$ 399" },
            ].map(o => (
              <button key={o.v} onClick={() => setData({ ...data, estimated_volume: o.v })}
                className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 ${data.estimated_volume === o.v ? "border-primary bg-primary/10" : "border-border"}`}>
                <span className="font-semibold">{o.l}</span>
                <span className="text-sm text-muted-foreground">{o.plan}</span>
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-3xl font-bold">Personalize o design</h2>
            <Label>Cor primária</Label>
            <div className="grid grid-cols-3 gap-3">
              {COLORS.map(c => (
                <button key={c.value} onClick={() => setData({ ...data, primary_color: c.value })}
                  className={`p-4 rounded-2xl border-2 flex items-center gap-2 ${data.primary_color === c.value ? "border-primary" : "border-border"}`}>
                  <span className="h-6 w-6 rounded-full" style={{ background: `hsl(${c.value})` }} />
                  <span className="text-sm">{c.name}</span>
                </button>
              ))}
            </div>
            <Label className="pt-4 block">Estilo de borda</Label>
            <div className="grid grid-cols-2 gap-3">
              {[{ v: "rounded", l: "Arredondado" }, { v: "sharp", l: "Reto" }].map(o => (
                <button key={o.v} onClick={() => setData({ ...data, border_style: o.v })}
                  className={`p-6 border-2 ${data.border_style === o.v ? "border-primary bg-primary/10" : "border-border"} ${o.v === "rounded" ? "rounded-3xl" : "rounded-none"}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 animate-fade-up text-center">
            <div className="h-16 w-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center"><Check className="h-8 w-8 text-primary" /></div>
            <h2 className="text-3xl font-bold">Tudo pronto, {data.company_name || "Studio"}!</h2>
            <p className="text-muted-foreground">Configuramos o Optimio para <strong>{NICHES[data.niche].label}</strong> com {NICHES[data.niche].modules.length} módulos ativos.</p>
            <p className="text-xs text-muted-foreground">Você pode reiniciar o setup a qualquer momento em Configurações.</p>
          </div>
        )}

        <div className="flex justify-between mt-10">
          <Button variant="ghost" onClick={back} disabled={step === 0}>Voltar</Button>
          {step < 5
            ? <Button onClick={next} className="bg-gradient-brand text-white border-0">Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button>
            : <Button onClick={finish} className="bg-gradient-brand text-white border-0">Entrar no Optimio</Button>}
        </div>
      </Card>
    </div>
  );
}
