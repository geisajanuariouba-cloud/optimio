import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { Truck, MapPin, Check, Factory, Store, Wrench } from "lucide-react";

type Delivery = {
  id: string; financial_id: string | null; client_id: string | null; supplier_id: string | null;
  needs_pickup: boolean; needs_assembly: boolean; is_pickup: boolean;
  assembler_id: string | null; destination_address: string; pickup_address: string | null;
  status: string; scheduled_for: string | null; max_delivery_date: string | null;
  notes: string | null;
};

const COLUMNS = [
  { key: "pending", label: "Pendente", icon: Truck, tone: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  { key: "with_assembler", label: "Com Montador", icon: Wrench, tone: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  { key: "assembled", label: "Pronto p/ Entregar", icon: Factory, tone: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30" },
  { key: "delivered", label: "Entregue", icon: Check, tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
];

const NEXT: Record<string, string> = { pending: "with_assembler", with_assembler: "assembled", assembled: "delivered" };

export default function Deliveries() {
  const { user } = useAuth();
  const [list, setList] = useState<Delivery[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [assemblers, setAssemblers] = useState<any[]>([]);
  const [commissionFor, setCommissionFor] = useState<Delivery | null>(null);
  const [commForm, setCommForm] = useState({ mode: "percent" as "percent" | "fixed" | "pending", percent: 10, fixed: 0 });

  const load = async () => {
    const [d, c, s, a] = await Promise.all([
      supabase.from("deliveries").select("*").order("scheduled_for", { ascending: true }).order("created_at"),
      supabase.from("clients").select("id,full_name").is("deleted_at", null),
      supabase.from("suppliers").select("id,name,full_address").is("deleted_at", null),
      supabase.from("assemblers").select("id,name,default_commission_percent").is("deleted_at", null).eq("status", "active"),
    ]);
    setList((d.data ?? []) as Delivery[]);
    setClients(c.data ?? []); setSuppliers(s.data ?? []); setAssemblers(a.data ?? []);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const setAssembler = async (d: Delivery, assembler_id: string) => {
    await supabase.from("deliveries").update({ assembler_id }).eq("id", d.id);
    load();
  };

  const advance = async (d: Delivery) => {
    const next = NEXT[d.status];
    if (!next) return;
    if (next === "with_assembler" && d.needs_assembly && !d.assembler_id) {
      return toast.error("Selecione o montador antes de avançar.");
    }
    if (next === "delivered") {
      // open commission modal if has assembler
      if (d.needs_assembly && d.assembler_id) {
        const ass = assemblers.find(a => a.id === d.assembler_id);
        setCommForm({ mode: "percent", percent: Number(ass?.default_commission_percent ?? 10), fixed: 0 });
        setCommissionFor(d);
        return;
      }
      await supabase.from("deliveries").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", d.id);
    } else {
      await supabase.from("deliveries").update({ status: next }).eq("id", d.id);
    }
    toast.success("Status atualizado"); load();
  };

  const confirmCommission = async () => {
    if (!commissionFor || !user) return;
    const d = commissionFor;
    // compute cost_base from financial items
    let costBase = 0;
    if (d.financial_id) {
      const { data: fin } = await supabase.from("financial").select("items").eq("id", d.financial_id).maybeSingle();
      const items: any[] = (fin?.items as any[]) ?? [];
      costBase = items.reduce((a, it) => a + Number(it.unit_cost ?? 0) * Number(it.quantity ?? 1), 0);
    }
    const status = commForm.mode === "pending" ? "pending" : "calculated";
    const amount = commForm.mode === "percent" ? costBase * (commForm.percent / 100) : commForm.mode === "fixed" ? commForm.fixed : 0;
    await supabase.from("assembler_commissions").insert({
      user_id: user.id, assembler_id: d.assembler_id, delivery_id: d.id, financial_id: d.financial_id,
      cost_base: costBase, percent: commForm.mode === "percent" ? commForm.percent : null,
      amount, status,
    });
    await supabase.from("deliveries").update({
      status: "delivered", delivered_at: new Date().toISOString(),
      commission_status: status, commission_value: amount, commission_percent: commForm.mode === "percent" ? commForm.percent : null,
    }).eq("id", d.id);
    toast.success("Entrega concluída"); setCommissionFor(null); load();
  };

  const today = useMemo(() => list.filter(d => d.scheduled_for === new Date().toISOString().slice(0, 10)).length, [list]);
  const totals = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of list) c[d.status] = (c[d.status] ?? 0) + 1;
    return c;
  }, [list]);

  const clientName = (id: string | null) => id ? (clients.find(c => c.id === id)?.full_name ?? "Cliente") : "—";

  return (
    <div>
      <PageHeader title="Logística & Entregas" description="Funil de entregas e montagens. Sem mapa — foco no fluxo." />
      <MetricsRow items={[
        { label: "Pendentes", value: String(totals.pending ?? 0), tone: (totals.pending ?? 0) > 0 ? "warning" : "primary" },
        { label: "Com montador", value: String(totals.with_assembler ?? 0), tone: "primary" },
        { label: "Prontos", value: String(totals.assembled ?? 0), tone: "primary" },
        { label: "Para hoje", value: String(today), tone: "primary" },
      ]} />

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const items = list.filter(d => d.status === col.key && !d.is_pickup);
          return (
            <Card key={col.key} className="rounded-3xl border-0 shadow-sm overflow-hidden">
              <div className={`p-3 border-b border-border flex items-center gap-2 ${col.tone}`}>
                <col.icon className="h-4 w-4" />
                <div className="font-semibold text-sm flex-1">{col.label}</div>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="divide-y divide-border max-h-[60vh] overflow-auto">
                {items.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">Vazio</div>}
                {items.map(d => (
                  <div key={d.id} className="p-3 text-sm space-y-2">
                    <div className="font-medium truncate">{clientName(d.client_id)}</div>
                    <div className="text-xs text-muted-foreground flex items-start gap-1"><MapPin className="h-3 w-3 mt-0.5 shrink-0" /><span className="line-clamp-2">{d.destination_address}</span></div>
                    {d.max_delivery_date && <div className="text-[11px] text-amber-600">Prazo: {new Date(d.max_delivery_date).toLocaleDateString("pt-BR")}</div>}
                    {d.needs_assembly && (
                      <Select value={d.assembler_id ?? ""} onValueChange={(v) => setAssembler(d, v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar montador" /></SelectTrigger>
                        <SelectContent>
                          {assemblers.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    {d.status !== "delivered" && (
                      <Button size="sm" onClick={() => advance(d)} className="w-full rounded-2xl h-8 text-xs">
                        Avançar →
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pickup-only list (sem mapa, sem motoboy) */}
      {list.some(d => d.is_pickup && d.status !== "delivered") && (
        <Card className="rounded-3xl border-0 shadow-sm mt-4 overflow-hidden">
          <div className="p-3 border-b border-border flex items-center gap-2 bg-blue-500/10 text-blue-700 dark:text-blue-300">
            <Store className="h-4 w-4" />
            <div className="font-semibold text-sm">Retirada em Loja</div>
          </div>
          <div className="divide-y divide-border">
            {list.filter(d => d.is_pickup && d.status !== "delivered").map(d => (
              <div key={d.id} className="p-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{clientName(d.client_id)}</div>
                  <div className="text-xs text-muted-foreground">Cliente vai retirar na loja</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => advance({ ...d, status: "assembled" } as Delivery)} className="rounded-2xl">Marcar entregue</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={!!commissionFor} onOpenChange={(o) => !o && setCommissionFor(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Comissão do Montador</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant={commForm.mode === "percent" ? "default" : "outline"} onClick={() => setCommForm({ ...commForm, mode: "percent" })} className="flex-1 rounded-2xl">% sobre custo</Button>
              <Button size="sm" variant={commForm.mode === "fixed" ? "default" : "outline"} onClick={() => setCommForm({ ...commForm, mode: "fixed" })} className="flex-1 rounded-2xl">Valor fixo</Button>
              <Button size="sm" variant={commForm.mode === "pending" ? "default" : "outline"} onClick={() => setCommForm({ ...commForm, mode: "pending" })} className="flex-1 rounded-2xl">Deixar pendente</Button>
            </div>
            {commForm.mode === "percent" && (
              <div><Label>Porcentagem (%)</Label><Input type="number" step="0.1" value={commForm.percent} onChange={(e) => setCommForm({ ...commForm, percent: +e.target.value })} /></div>
            )}
            {commForm.mode === "fixed" && (
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={commForm.fixed} onChange={(e) => setCommForm({ ...commForm, fixed: +e.target.value })} /></div>
            )}
            {commForm.mode === "pending" && (
              <p className="text-sm text-muted-foreground bg-secondary/40 p-3 rounded-2xl">Vai aparecer no painel do montador como "A Calcular" para definir comissão depois em lote.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCommissionFor(null)}>Cancelar</Button>
            <Button onClick={confirmCommission} className="rounded-2xl">Confirmar entrega</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
