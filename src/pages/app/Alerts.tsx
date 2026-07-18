import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Bell, Check, EyeOff, Archive, RefreshCw, AlertTriangle } from "lucide-react";

type Alert = {
  id: string; kind: string; severity: string; title: string;
  description: string | null; status: string;
  entity_table: string | null; entity_id: string | null; created_at: string;
};

const SEV: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-700",
  warn: "bg-amber-500/10 text-amber-700",
  danger: "bg-rose-500/10 text-rose-700",
  high: "bg-rose-500/10 text-rose-700",
};

export default function Alerts() {
  const { user } = useAuth();
  const { tenantOwnerId, profile } = useTenant();
  const alertExact = !!(profile as any)?.alert_on_min_stock_exact;
  const [list, setList] = useState<Alert[]>([]);
  const [tab, setTab] = useState<"open" | "resolved" | "ignored" | "archived">("open");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!tenantOwnerId) return;
    const { data, error } = await supabase
      .from("alerts").select("*")
      .eq("user_id", tenantOwnerId)
      .order("created_at", { ascending: false });
    if (error) return toast.error(friendlyError(error));
    setList((data ?? []) as Alert[]);
  };
  useEffect(() => { load(); }, [tenantOwnerId]);

  const audit = async (action: string, alert: Alert) => {
    if (!user || !tenantOwnerId) return;
    await supabase.from("audit_logs").insert({
      owner_user_id: tenantOwnerId, actor_user_id: user.id,
      action: `alert_${action}`, module: "alerts",
      metadata: { alert_id: alert.id, kind: alert.kind, title: alert.title },
    } as any);
  };

  const update = async (alert: Alert, status: string) => {
    const patch: any = { status };
    if (status === "resolved") {
      patch.resolved_at = new Date().toISOString();
      patch.resolved_by = user?.id ?? null;
    }
    const { error } = await supabase.from("alerts").update(patch).eq("id", alert.id);
    if (error) return toast.error(friendlyError(error));
    await audit(status, alert);
    toast.success("Alerta atualizado");
    load();
  };

  const regenerate = async () => {
    if (!user || !tenantOwnerId) return;
    setBusy(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const newAlerts: any[] = [];

      // Estoque abaixo (ou igual) ao mínimo — exclui o caso degenerado de min=0/stock=0
      const { data: lowStockProducts } = await supabase
        .from("products").select("id,name,stock,min_stock")
        .eq("user_id", tenantOwnerId).eq("status", "active").eq("out_of_line", false)
        .is("deleted_at", null).limit(500);
      for (const p of (lowStockProducts ?? []) as any[]) {
        const stock = Number(p.stock ?? 0);
        const min = Number(p.min_stock ?? 0);
        const trigger = alertExact ? (stock <= min) : (stock < min);
        if (trigger && !(stock === 0 && min === 0)) {
          newAlerts.push({
            user_id: tenantOwnerId, kind: "low_stock", severity: stock <= 0 ? "high" : "warn",
            title: `Estoque baixo: ${p.name}`,
            description: `Atual: ${stock} • Mínimo: ${min}`,
            entity_table: "products", entity_id: p.id, status: "open",
          });
        }
      }


      // Produto sem custo
      const { data: noCost } = await supabase
        .from("products").select("id,name")
        .eq("user_id", tenantOwnerId).eq("status", "active").is("deleted_at", null)
        .or("cost.is.null,cost.eq.0").limit(100);
      for (const p of noCost ?? []) {
        newAlerts.push({
          user_id: tenantOwnerId, kind: "no_cost", severity: "warn",
          title: `Produto sem custo: ${p.name}`,
          entity_table: "products", entity_id: p.id, status: "open",
        });
      }

      // Produto sem imagem
      const { data: noImage } = await supabase
        .from("products").select("id,name")
        .eq("user_id", tenantOwnerId).eq("status", "active").is("deleted_at", null)
        .is("image_url", null).limit(100);
      for (const p of noImage ?? []) {
        newAlerts.push({
          user_id: tenantOwnerId, kind: "no_image", severity: "info",
          title: `Sem imagem: ${p.name}`,
          entity_table: "products", entity_id: p.id, status: "open",
        });
      }

      // Produto aguardando revisão de imagem
      const { data: pendingImg } = await supabase
        .from("products").select("id,name")
        .eq("user_id", tenantOwnerId).eq("image_review_required", true)
        .is("deleted_at", null).limit(100);
      for (const p of pendingImg ?? []) {
        newAlerts.push({
          user_id: tenantOwnerId, kind: "image_review", severity: "info",
          title: `Aguardando revisão de imagem: ${p.name}`,
          entity_table: "products", entity_id: p.id, status: "open",
        });
      }

      // Inadimplentes
      const { data: overdue } = await supabase
        .from("debt_installments").select("id,debt_id,amount,due_date")
        .eq("user_id", tenantOwnerId).eq("status", "pending").lt("due_date", today).limit(200);
      for (const d of overdue ?? []) {
        newAlerts.push({
          user_id: tenantOwnerId, kind: "overdue_installment", severity: "danger",
          title: `Parcela vencida em ${new Date(d.due_date).toLocaleDateString("pt-BR")}`,
          description: `Valor: R$ ${Number(d.amount).toFixed(2)}`,
          entity_table: "debt_installments", entity_id: d.id, status: "open",
        });
      }

      // Lead parado (>7 dias sem update)
      const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: idleLeads } = await supabase
        .from("leads").select("id,name,stage")
        .eq("user_id", tenantOwnerId).is("deleted_at", null)
        .not("stage", "in", "(fechado,perdido)").lt("updated_at", cutoff).limit(100);
      for (const l of idleLeads ?? []) {
        newAlerts.push({
          user_id: tenantOwnerId, kind: "idle_lead", severity: "warn",
          title: `Lead parado: ${l.name}`,
          description: `Estágio: ${l.stage}`,
          entity_table: "leads", entity_id: l.id, status: "open",
        });
      }

      if (newAlerts.length > 0) {
        const { error } = await supabase.from("alerts")
          .upsert(newAlerts, { onConflict: "user_id,kind,entity_table,entity_id", ignoreDuplicates: true });
        if (error) throw error;
      }
      toast.success(`${newAlerts.length} verificações realizadas`);
      load();
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => list.filter(a => a.status === tab), [list, tab]);
  const counts = useMemo(() => ({
    open: list.filter(a => a.status === "open").length,
    resolved: list.filter(a => a.status === "resolved").length,
    ignored: list.filter(a => a.status === "ignored").length,
    archived: list.filter(a => a.status === "archived").length,
  }), [list]);

  return (
    <div>
      <PageHeader
        title="Painel de Alertas"
        description="Avisos automáticos do que precisa de ação."
        actionLabel={busy ? "Verificando..." : "Verificar agora"}
        onAction={regenerate}
      />

      <MetricsRow items={[
        { label: "Abertos", value: String(counts.open), tone: counts.open ? "warning" : "primary" },
        { label: "Resolvidos", value: String(counts.resolved), tone: "success" },
        { label: "Ignorados", value: String(counts.ignored), tone: "primary" },
        { label: "Arquivados", value: String(counts.archived), tone: "primary" },
      ]} />

      <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="mb-4">
        <TabsList className="rounded-2xl">
          <TabsTrigger value="open">Abertos</TabsTrigger>
          <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
          <TabsTrigger value="ignored">Ignorados</TabsTrigger>
          <TabsTrigger value="archived">Arquivados</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState
            icon={Bell}
            title="Nenhum alerta nesta aba"
            description="Clique em 'Verificar agora' para rodar uma nova varredura."
            actionLabel="Verificar agora"
            onAction={regenerate}
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <Card key={a.id} className="p-4 rounded-2xl border-0 shadow-sm flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-[10px] ${SEV[a.severity] ?? SEV.info}`}>{a.severity}</Badge>
                  <Badge variant="outline" className="text-[10px]">{a.kind}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="font-medium text-sm mt-1">{a.title}</div>
                {a.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>
                )}
              </div>
              {a.status === "open" && (
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => update(a, "resolved")}>
                    <Check className="h-3.5 w-3.5 mr-1" />Resolver
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => update(a, "ignored")}>
                    <EyeOff className="h-3.5 w-3.5 mr-1" />Ignorar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => update(a, "archived")}>
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              {a.status !== "open" && (
                <Button size="sm" variant="ghost" onClick={() => update(a, "open")}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />Reabrir
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
