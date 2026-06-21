import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";

type Item = { key: string; label: string; to: string; check: () => Promise<boolean> };

export default function StartHere() {
  const { user } = useAuth();
  const { profile } = useTenant();
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const isBeauty = profile?.niche === "beauty";

  const items: Item[] = isBeauty ? [
    { key: "client", label: "Cadastrar primeiro cliente", to: "/app/clients", check: async () => !!(await supabase.from("clients").select("id").limit(1)).data?.length },
    { key: "service", label: "Cadastrar primeiro serviço", to: "/app/services", check: async () => !!(await supabase.from("services").select("id").limit(1)).data?.length },
    { key: "appointment", label: "Criar primeiro agendamento", to: "/app/appointments", check: async () => !!(await supabase.from("appointments").select("id").limit(1)).data?.length },
    { key: "payment", label: "Configurar formas de pagamento", to: "/app/payment-methods", check: async () => !!(await supabase.from("payment_methods").select("id").limit(1)).data?.length },
    { key: "financial", label: "Registrar primeiro lançamento", to: "/app/financial", check: async () => !!(await supabase.from("financial").select("id").limit(1)).data?.length },
  ] : [
    { key: "supplier", label: "Cadastrar fornecedor", to: "/app/suppliers", check: async () => !!(await supabase.from("suppliers" as any).select("id").limit(1)).data?.length },
    { key: "product", label: "Cadastrar produto", to: "/app/products", check: async () => !!(await supabase.from("products").select("id").limit(1)).data?.length },
    { key: "sale", label: "Criar primeira venda", to: "/app/sales", check: async () => !!(await supabase.from("financial").select("id").eq("type","income").limit(1)).data?.length },
    { key: "delivery", label: "Configurar logística", to: "/app/deliveries", check: async () => !!(await supabase.from("deliveries").select("id").limit(1)).data?.length },
    { key: "payment", label: "Configurar formas de pagamento", to: "/app/payment-methods", check: async () => !!(await supabase.from("payment_methods").select("id").limit(1)).data?.length },
  ];

  useEffect(() => {
    if (!user) return;
    (async () => {
      const r: Record<string, boolean> = {};
      for (const it of items) { try { r[it.key] = await it.check(); } catch { r[it.key] = false; } }
      setStatus(r);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isBeauty]);

  const done = Object.values(status).filter(Boolean).length;
  const total = items.length;
  const pct = Math.round((done / Math.max(total,1)) * 100);
  const allDone = done === total;

  const markCompleted = async () => {
    if (!user) return;
    await supabase.from("onboarding_status").upsert({
      user_id: user.id, completed: true, current_step: "done", niche: profile?.niche, checklist: status,
    }, { onConflict: "user_id" });
  };

  useEffect(() => { if (allDone && user) markCompleted(); // eslint-disable-next-line
  }, [allDone, user]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="glass border-0 rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Comece aqui</h1>
        </div>
        <p className="text-muted-foreground mb-6">Siga os passos abaixo para colocar seu Optimio para funcionar.</p>
        <div className="flex items-center gap-3 mb-2"><Progress value={pct} className="h-2" /><span className="text-sm font-medium">{pct}%</span></div>
        <p className="text-xs text-muted-foreground">{done} de {total} concluídos</p>
      </Card>

      <div className="space-y-3">
        {items.map((it) => {
          const ok = !!status[it.key];
          return (
            <Card key={it.key} className={`p-4 rounded-2xl border ${ok ? "bg-primary/5 border-primary/30" : ""} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center ${ok ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  {ok ? <Check className="h-5 w-5" /> : <span className="text-sm font-bold">{items.indexOf(it)+1}</span>}
                </div>
                <span className={`font-medium ${ok ? "line-through text-muted-foreground" : ""}`}>{it.label}</span>
              </div>
              <Link to={it.to}><Button size="sm" variant={ok ? "outline" : "default"}>{ok ? "Revisar" : "Ir"} <ArrowRight className="ml-2 h-4 w-4"/></Button></Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
