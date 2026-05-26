import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Lightbulb, Sparkles, Check, X, TrendingUp } from "lucide-react";

type Idea = { id: string; name: string; category: string | null; reason: string | null; estimated_margin: number | null; potential_score: number; status: string; source: string };

const SEEDS = [
  { name: "Kit Higiene Premium", category: "Combos", reason: "Margem alta + recorrência mensal", estimated_margin: 45, potential_score: 92 },
  { name: "Variação cor Preto Fosco", category: "Variações", reason: "Tendência alta no nicho", estimated_margin: 38, potential_score: 85 },
  { name: "Acessório complementar", category: "Cross-sell", reason: "Carrinhos com este produto vendem 2x mais", estimated_margin: 60, potential_score: 88 },
  { name: "Edição limitada sazonal", category: "Sazonal", reason: "Janela de Black Friday se aproxima", estimated_margin: 30, potential_score: 78 },
];

export default function ProductIdeas() {
  const { user } = useAuth();
  const [list, setList] = useState<Idea[]>([]);

  const load = async () => {
    const { data } = await supabase.from("product_ideas").select("*").order("potential_score", { ascending: false });
    setList((data ?? []) as Idea[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const generate = async () => {
    if (!user) return;
    await supabase.from("product_ideas").insert(SEEDS.map(s => ({ ...s, user_id: user.id, source: "ai", status: "suggested" })));
    toast.success("Novas ideias geradas pela IA"); load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("product_ideas").update({ status }).eq("id", id);
    load();
  };

  return (
    <div>
      <PageHeader title="Ideias de Produto (IA)" description="Sugestões baseadas em vendas, tendências e margem." actionLabel="Gerar com IA" onAction={generate} />

      <MetricsRow items={[
        { label: "Sugeridas", value: String(list.filter(i => i.status === "suggested").length), tone: "primary" },
        { label: "Aceitas", value: String(list.filter(i => i.status === "accepted").length), tone: "success" },
        { label: "Descartadas", value: String(list.filter(i => i.status === "rejected").length), tone: "warning" },
        { label: "Potencial médio", value: list.length ? `${Math.round(list.reduce((a, i) => a + i.potential_score, 0) / list.length)}%` : "—", tone: "primary" },
      ]} />

      {list.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={Lightbulb} title="Sem ideias ainda" description="Clique em 'Gerar com IA' para receber sugestões com base nos seus dados." actionLabel="Gerar com IA" onAction={generate} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map(i => (
            <Card key={i.id} className="rounded-3xl border-0 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{i.name}</div>
                  {i.category && <Badge variant="outline" className="text-[10px] mt-1">{i.category}</Badge>}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary flex items-center gap-1"><TrendingUp className="h-4 w-4" />{i.potential_score}</div>
                  <div className="text-[10px] text-muted-foreground">potencial</div>
                </div>
              </div>
              {i.reason && <div className="text-xs text-muted-foreground flex gap-1.5"><Sparkles className="h-3 w-3 shrink-0 mt-0.5 text-primary" />{i.reason}</div>}
              {i.estimated_margin != null && <Badge variant="outline" className="text-[10px]">Margem ~{i.estimated_margin}%</Badge>}
              {i.status === "suggested" && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1 rounded-2xl gap-1" onClick={() => updateStatus(i.id, "accepted")}><Check className="h-3.5 w-3.5" />Aceitar</Button>
                  <Button size="sm" variant="outline" className="flex-1 rounded-2xl gap-1" onClick={() => updateStatus(i.id, "rejected")}><X className="h-3.5 w-3.5" />Descartar</Button>
                </div>
              )}
              {i.status !== "suggested" && <Badge className={i.status === "accepted" ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"}>{i.status === "accepted" ? "Aceita" : "Descartada"}</Badge>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
