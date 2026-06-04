import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/app/PageHeader";

type Suggestion = {
  id: string;
  problem: string;
  impact: string;
  action: string;
  to: string;
  severity: "low" | "medium" | "high";
};

export default function Suggestions() {
  const { user } = useAuth();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
      const [prodNoCost, prodNoImage, lowStock, openDebts, idleLeads, pendingQuotes] = await Promise.all([
        supabase.from("products").select("id,name").is("deleted_at", null).or("cost.is.null,cost.eq.0").limit(50),
        supabase.from("products").select("id,name").is("deleted_at", null).is("image_url", null).limit(50),
        supabase.from("products").select("id,name,stock,min_stock").is("deleted_at", null).not("min_stock", "is", null).limit(200),
        supabase.from("debts").select("id,client_id,total_amount").eq("status", "open").limit(50),
        supabase.from("leads").select("id,name,updated_at").lt("updated_at", since).neq("status", "won").neq("status", "lost").limit(50),
        supabase.from("quotes").select("id,client_id,status").eq("status", "draft").limit(50),
      ]);
      const out: Suggestion[] = [];
      (prodNoCost.data ?? []).slice(0, 10).forEach((p: any) => out.push({
        id: `cost-${p.id}`, severity: "medium",
        problem: `Produto sem custo: ${p.name}`,
        impact: "Sem custo não é possível calcular margem ou lucro real.",
        action: "Cadastre o custo", to: `/app/products`,
      }));
      (prodNoImage.data ?? []).slice(0, 10).forEach((p: any) => out.push({
        id: `img-${p.id}`, severity: "low",
        problem: `Produto sem imagem: ${p.name}`,
        impact: "Imagens melhoram orçamentos e a percepção do cliente.",
        action: "Adicionar imagem", to: `/app/products`,
      }));
      (lowStock.data ?? []).filter((p: any) => Number(p.stock ?? 0) <= Number(p.min_stock ?? 0)).slice(0, 10).forEach((p: any) => out.push({
        id: `stock-${p.id}`, severity: "high",
        problem: `Estoque baixo: ${p.name} (${p.stock}/${p.min_stock})`,
        impact: "Risco de ruptura e perda de vendas.",
        action: "Repor estoque", to: `/app/stock`,
      }));
      (openDebts.data ?? []).slice(0, 10).forEach((d: any) => out.push({
        id: `debt-${d.id}`, severity: "high",
        problem: `Promissória em aberto`,
        impact: "Inadimplência impacta fluxo de caixa.",
        action: "Enviar cobrança", to: `/app/collections`,
      }));
      (idleLeads.data ?? []).slice(0, 10).forEach((l: any) => out.push({
        id: `lead-${l.id}`, severity: "medium",
        problem: `Lead parado: ${l.name}`,
        impact: "Leads sem follow-up esfriam e são perdidos.",
        action: "Criar tarefa de follow-up", to: `/app/funnel`,
      }));
      (pendingQuotes.data ?? []).slice(0, 10).forEach((q: any) => out.push({
        id: `quote-${q.id}`, severity: "medium",
        problem: `Orçamento pendente`,
        impact: "Orçamentos parados não viram venda.",
        action: "Entrar em contato com cliente", to: `/app/quotes`,
      }));
      setItems(out);
      setLoading(false);
    })();
  }, [user]);

  const sevColor = (s: string) => s === "high" ? "destructive" : s === "medium" ? "default" : "secondary";

  return (
    <div className="space-y-4">
      <PageHeader title="Sugestões" icon={Lightbulb} description="Recomendações automáticas baseadas nos seus dados" />

      {loading && <Card className="p-8 text-center text-muted-foreground">Analisando…</Card>}
      {!loading && items.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">Nenhuma sugestão no momento. Tudo em ordem! 🎉</Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(s => (
          <Card key={s.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{s.problem}</h3>
              <Badge variant={sevColor(s.severity) as any}>
                {s.severity === "high" ? "Alta" : s.severity === "medium" ? "Média" : "Baixa"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{s.impact}</p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium">{s.action}</span>
              <Button size="sm" variant="outline" asChild>
                <Link to={s.to}>Abrir <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
