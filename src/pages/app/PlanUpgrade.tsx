import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/PageHeader";
import { Check, Sparkles, MessageCircle, Crown, Loader2 } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Plan = { id: string; slug: string; name: string; price: number; description: string | null; modules: string[]; active: boolean; sort_order: number };
type Sub = { plan_slug: string; status: string; current_period_end: string; last_paid_at: string | null };

const CHECKOUT_KEY: Record<string, string> = {
  basic: "checkout_basic_url",
  standard: "checkout_pro_url",
  pro: "checkout_pro_url",
  unlimited: "checkout_advanced_url",
  advanced: "checkout_advanced_url",
};

export default function PlanUpgrade() {
  const { profile } = useTenant();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [checkout, setCheckout] = useState<Record<string, string>>({});
  const [sub, setSub] = useState<Sub | null>(null);
  const [wpp, setWpp] = useState("https://wa.me/");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: ss }, { data: s }, { data: app }] = await Promise.all([
        supabase.from("plans").select("*").eq("active", true).order("sort_order"),
        supabase.from("system_settings").select("key,value").eq("scope", "global").in("key", ["checkout_basic_url","checkout_pro_url","checkout_advanced_url"]),
        supabase.from("subscriptions").select("plan_slug,status,current_period_end,last_paid_at").eq("user_id", profile?.id ?? "00000000-0000-0000-0000-000000000000").order("current_period_end", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("app_settings").select("whatsapp_link").eq("id", 1).maybeSingle(),
      ]);
      setPlans((p ?? []) as any);
      const map: Record<string, string> = {};
      (ss ?? []).forEach((r: any) => { map[r.key] = typeof r.value === "string" ? r.value : (r.value ?? ""); });
      setCheckout(map);
      if (s) setSub(s as any);
      if (app?.whatsapp_link) setWpp(app.whatsapp_link);
      setLoading(false);
    })();
  }, [profile?.id]);

  const goCheckout = (slug: string) => {
    const key = CHECKOUT_KEY[slug];
    const url = key ? checkout[key] : "";
    if (url) { window.open(url, "_blank"); return; }
    const fallback = `${wpp}${wpp.includes("?") ? "&" : "?"}text=${encodeURIComponent(`Olá, quero fazer upgrade para o plano ${slug}.`)}`;
    window.open(fallback, "_blank");
    toast.info("Checkout não configurado — redirecionando para o suporte.");
  };

  const currentSlug = sub?.plan_slug || profile?.plan || "";
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const daysLeft = periodEnd ? Math.ceil((periodEnd.getTime() - Date.now()) / 86400000) : null;

  return (
    <div>
      <PageHeader title="Eleve o seu Optimio" description="Escolha o plano ideal e libere mais módulos." />

      {/* Assinatura atual */}
      <Card className="rounded-3xl border-0 shadow-sm p-6 mb-6 bg-gradient-to-br from-primary/5 to-primary/0">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Crown className="h-6 w-6 text-primary" /></div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-sm text-muted-foreground">Sua assinatura</div>
            <div className="font-bold text-lg capitalize flex items-center gap-2">
              {currentSlug || "Sem plano"}
              {sub?.status && <Badge variant="outline" className="capitalize text-xs">{sub.status}</Badge>}
            </div>
            {periodEnd && (
              <div className="text-xs text-muted-foreground mt-1">
                {daysLeft! >= 0 ? `Renova em ${periodEnd.toLocaleDateString()} (${daysLeft}d)` : `Vencido há ${Math.abs(daysLeft!)}d em ${periodEnd.toLocaleDateString()}`}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="text-center mb-8 space-y-2">
        <Badge className="bg-primary/10 text-primary border-primary/20 gap-1"><Sparkles className="h-3 w-3" />Sem fidelidade. Cancele quando quiser.</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {plans.map((p, idx) => {
            const isCurrent = p.slug === currentSlug;
            const highlight = idx === 1 || plans.length === 1;
            return (
              <Card key={p.id} className={`rounded-3xl border-2 shadow-sm p-6 space-y-4 relative ${highlight ? "border-primary/50 shadow-lg shadow-primary/10" : "border-border"}`}>
                {highlight && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">Mais escolhido</Badge>}
                {isCurrent && <Badge className="absolute -top-3 right-4 bg-emerald-600 text-white">Atual</Badge>}
                <div>
                  <div className="font-bold text-lg">{p.name}</div>
                  {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                  <div className="mt-2"><span className="text-3xl font-bold">R$ {Number(p.price).toFixed(0)}</span><span className="text-sm text-muted-foreground">/mês</span></div>
                </div>
                <ul className="space-y-2 text-sm">
                  {(p.modules ?? []).slice(0, 8).map(m => (
                    <li key={m} className="flex gap-2"><Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /><span className="capitalize">{m.replace(/_/g, " ")}</span></li>
                  ))}
                </ul>
                <Button
                  className="w-full rounded-2xl"
                  variant={highlight ? "default" : "outline"}
                  disabled={isCurrent}
                  onClick={() => goCheckout(p.slug)}>
                  {isCurrent ? "Plano atual" : "Assinar / fazer upgrade"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="rounded-3xl border-0 shadow-sm p-6 bg-gradient-to-br from-primary/5 to-primary/0">
        <div className="flex items-center gap-4 flex-wrap">
          <MessageCircle className="h-8 w-8 text-primary" />
          <div className="flex-1 min-w-[200px]">
            <div className="font-bold">Prefere falar com um consultor?</div>
            <div className="text-sm text-muted-foreground">Te ajudamos a escolher o plano certo e migrar seus dados.</div>
          </div>
          <Button asChild className="rounded-2xl"><a href={wpp} target="_blank" rel="noreferrer">Falar no WhatsApp</a></Button>
        </div>
      </Card>
    </div>
  );
}
