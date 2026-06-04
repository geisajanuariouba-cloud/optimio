import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app/PageHeader";
import {
  ShoppingBag, Wallet, Receipt, AlertTriangle, Boxes, FileText, Users,
} from "lucide-react";

type Metric = {
  label: string;
  value: string;
  hint?: string;
  icon: any;
  tone: "primary" | "success" | "warning" | "danger";
  to: string;
};

const TONE: Record<Metric["tone"], string> = {
  primary: "bg-primary/5 text-primary border-primary/20",
  success: "bg-emerald-500/5 text-emerald-700 border-emerald-500/20",
  warning: "bg-amber-500/5 text-amber-700 border-amber-500/20",
  danger: "bg-rose-500/5 text-rose-700 border-rose-500/20",
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Operations() {
  const { tenantOwnerId } = useTenant();
  const navigate = useNavigate();
  const [m, setM] = useState<Metric[] | null>(null);

  useEffect(() => {
    if (!tenantOwnerId) return;
    let mounted = true;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [
        salesToday,
        receiptsToday,
        overdueInst,
        overdueProm,
        lowStock,
        openQuotes,
        idleLeads,
      ] = await Promise.all([
        supabase.from("financial").select("gross_amount", { count: "exact" })
          .eq("user_id", tenantOwnerId).eq("type", "income").eq("transaction_date", today),
        supabase.from("debt_payments").select("amount_paid")
          .eq("user_id", tenantOwnerId).gte("paid_at", today + "T00:00:00"),
        supabase.from("debt_installments").select("id", { count: "exact", head: true })
          .eq("user_id", tenantOwnerId).eq("status", "pending").lt("due_date", today),
        supabase.from("financial").select("id", { count: "exact", head: true })
          .eq("user_id", tenantOwnerId).eq("origin", "promissoria").eq("production_status", "pending")
          .lt("transaction_date", today),
        supabase.from("products").select("id", { count: "exact", head: true })
          .eq("user_id", tenantOwnerId).eq("status", "active").eq("out_of_line", false)
          .is("deleted_at", null).gt("min_stock", 0),
        supabase.from("quotes").select("id", { count: "exact", head: true })
          .eq("user_id", tenantOwnerId).eq("status", "open").is("deleted_at", null),
        supabase.from("leads").select("id", { count: "exact", head: true })
          .eq("user_id", tenantOwnerId).is("deleted_at", null)
          .not("stage", "in", "(fechado,perdido)").lt("updated_at", sevenDaysAgo),
      ]);

      const salesSum = (salesToday.data ?? []).reduce(
        (s: number, r: any) => s + Number(r.gross_amount ?? 0), 0);
      const receiptsSum = (receiptsToday.data ?? []).reduce(
        (s: number, r: any) => s + Number(r.amount_paid ?? 0), 0);

      if (!mounted) return;
      setM([
        { label: "Vendas hoje", value: brl(salesSum), hint: `${salesToday.count ?? 0} lançamentos`, icon: ShoppingBag, tone: "primary", to: "/app/sales" },
        { label: "Recebimentos hoje", value: brl(receiptsSum), icon: Wallet, tone: "success", to: "/app/financial" },
        { label: "Contas vencidas", value: String(overdueInst.count ?? 0), icon: Receipt, tone: "danger", to: "/app/collections" },
        { label: "Promissórias vencidas", value: String(overdueProm.count ?? 0), icon: AlertTriangle, tone: "danger", to: "/app/financial" },
        { label: "Estoque abaixo do mínimo", value: String(lowStock.count ?? 0), icon: Boxes, tone: "warning", to: "/app/stock" },
        { label: "Orçamentos pendentes", value: String(openQuotes.count ?? 0), icon: FileText, tone: "primary", to: "/app/quotes" },
        { label: "Leads sem movimentação", value: String(idleLeads.count ?? 0), hint: "Há 7+ dias", icon: Users, tone: "warning", to: "/app/funnel" },
      ]);
    })();
    return () => { mounted = false; };
  }, [tenantOwnerId]);

  return (
    <div>
      <PageHeader
        title="Central Operacional"
        description="Tudo o que merece sua atenção hoje, num único lugar."
      />

      {!m ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-28 rounded-3xl border-0 shadow-sm animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {m.map((card) => (
            <button
              key={card.label}
              onClick={() => navigate(card.to)}
              className={`text-left rounded-3xl border ${TONE[card.tone]} p-5 hover:shadow-md transition shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide opacity-80">{card.label}</div>
                  <div className="text-2xl font-bold mt-2">{card.value}</div>
                  {card.hint && <div className="text-xs mt-1 opacity-70">{card.hint}</div>}
                </div>
                <card.icon className="h-6 w-6 opacity-70" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
