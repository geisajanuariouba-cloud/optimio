import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { Truck, MapPin, Check, Factory, Store, Wrench, PackageSearch, ClipboardList, Send } from "lucide-react";

type Delivery = {
  id: string; financial_id: string | null; client_id: string | null; supplier_id: string | null;
  needs_pickup: boolean; needs_assembly: boolean; is_pickup: boolean;
  assembler_id: string | null; destination_address: string; pickup_address: string | null;
  status: string; scheduled_for: string | null; max_delivery_date: string | null;
  notes: string | null;
  supplier_order_date: string | null; supplier_manufacturing_days: number | null;
  supplier_delivery_days: number | null; supplier_expected_date: string | null;
  supplier_received_date: string | null; sent_to_assembler_at: string | null;
  mounted_at: string | null; supplier_notes: string | null; items: any[];
};

// Fluxo oficial Retail/Furniture
const COLUMNS: { key: string; label: string; icon: any; tone: string }[] = [
  { key: "needs_supplier",     label: "Fazer Pedido ao Fornecedor", icon: PackageSearch, tone: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
  { key: "awaiting_supplier",  label: "Aguardando Fornecedor",      icon: ClipboardList, tone: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  { key: "ready",              label: "Pronto para Entrega",        icon: Factory,       tone: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30" },
  { key: "with_assembler",     label: "Com Montador",               icon: Wrench,        tone: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  { key: "delivered",          label: "Entregue / Montado",         icon: Check,         tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
];

export default function Deliveries() {
  const { user } = useAuth();
  const [list, setList] = useState<Delivery[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [assemblers, setAssemblers] = useState<any[]>([]);

  // Modais
  const [supplierFor, setSupplierFor] = useState<Delivery | null>(null);
  const [supplierForm, setSupplierForm] = useState({ manufacturing_days: 0, delivery_days: 0, expected_date: "", notes: "" });

  const [assemblerFor, setAssemblerFor] = useState<Delivery | null>(null);
  const [assemblerForm, setAssemblerForm] = useState({ assembler_id: "", scheduled_for: "", notes: "" });

  const [doneFor, setDoneFor] = useState<Delivery | null>(null);
  const [doneForm, setDoneForm] = useState({ mounted_at: "", notes: "", percent: 5, mode: "percent" as "percent" | "fixed" | "pending", fixed: 0 });

  const load = async () => {
    const [d, c, s, a] = await Promise.all([
      supabase.from("deliveries").select("*").order("scheduled_for", { ascending: true }).order("created_at"),
      supabase.from("clients").select("id,full_name,phone").is("deleted_at", null),
      supabase.from("suppliers").select("id,name,full_address").is("deleted_at", null),
      supabase.from("assemblers").select("id,name,default_commission_percent").is("deleted_at", null).eq("status", "active"),
    ]);
    setList((d.data ?? []) as Delivery[]);
    setClients(c.data ?? []); setSuppliers(s.data ?? []); setAssemblers(a.data ?? []);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const clientName = (id: string | null) => id ? (clients.find(c => c.id === id)?.full_name ?? "Cliente") : "—";
  const clientPhone = (id: string | null) => id ? (clients.find(c => c.id === id)?.phone ?? "") : "";
  const supplierName = (id: string | null) => id ? (suppliers.find(s => s.id === id)?.name ?? "—") : "—";
  const assemblerName = (id: string | null) => id ? (assemblers.find(a => a.id === id)?.name ?? "—") : "—";

  // ---- Ações ----
  const moveToSupplierNeeded = async (d: Delivery) => {
    await supabase.from("deliveries").update({ status: "needs_supplier" }).eq("id", d.id);
    toast.success("Movido para 'Fazer Pedido ao Fornecedor'");
    load();
  };

  const openSupplierOrder = (d: Delivery) => {
    setSupplierForm({ manufacturing_days: 0, delivery_days: 0, expected_date: "", notes: d.supplier_notes ?? "" });
    setSupplierFor(d);
  };
  const confirmSupplierOrder = async () => {
    if (!supplierFor) return;
    const exp = supplierForm.expected_date || (() => {
      const days = (Number(supplierForm.manufacturing_days) || 0) + (Number(supplierForm.delivery_days) || 0);
      if (!days) return null;
      const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10);
    })();
    await supabase.from("deliveries").update({
      status: "awaiting_supplier",
      supplier_order_date: new Date().toISOString(),
      supplier_manufacturing_days: supplierForm.manufacturing_days || null,
      supplier_delivery_days: supplierForm.delivery_days || null,
      supplier_expected_date: exp,
      supplier_notes: supplierForm.notes || null,
    }).eq("id", supplierFor.id);
    toast.success("Pedido enviado ao fornecedor");
    setSupplierFor(null); load();
  };

  const markReceived = async (d: Delivery) => {
    await supabase.from("deliveries").update({
      status: "ready",
      supplier_received_date: new Date().toISOString(),
    }).eq("id", d.id);
    toast.success("Recebido do fornecedor — pronto para entrega");
    load();
  };

  const openAssemblerSend = (d: Delivery) => {
    setAssemblerForm({ assembler_id: d.assembler_id ?? "", scheduled_for: new Date().toISOString().slice(0, 10), notes: "" });
    setAssemblerFor(d);
  };
  const confirmAssemblerSend = async () => {
    if (!assemblerFor) return;
    if (!assemblerForm.assembler_id) return toast.error("Selecione o montador");
    await supabase.from("deliveries").update({
      status: "with_assembler",
      assembler_id: assemblerForm.assembler_id,
      sent_to_assembler_at: new Date().toISOString(),
      scheduled_for: assemblerForm.scheduled_for || null,
      needs_assembly: true,
      notes: assemblerForm.notes ? [assemblerFor.notes, assemblerForm.notes].filter(Boolean).join("\n") : assemblerFor.notes,
    }).eq("id", assemblerFor.id);
    toast.success("Enviado com o montador");
    setAssemblerFor(null); load();
  };

  const openComplete = (d: Delivery) => {
    const ass = assemblers.find(a => a.id === d.assembler_id);
    setDoneForm({
      mounted_at: new Date().toISOString().slice(0, 10),
      notes: "",
      percent: Number(ass?.default_commission_percent ?? 5),
      mode: d.assembler_id ? "percent" : "pending",
      fixed: 0,
    });
    setDoneFor(d);
  };

  const confirmComplete = async () => {
    if (!doneFor || !user) return;
    const d = doneFor;
    let costBase = 0;
    if (d.financial_id) {
      const { data: fin } = await supabase.from("financial").select("items").eq("id", d.financial_id).maybeSingle();
      const items: any[] = (fin?.items as any[]) ?? [];
      costBase = items.reduce((a, it) => a + Number(it.unit_cost ?? 0) * Number(it.quantity ?? 1), 0);
    }
    const completedAt = doneForm.mounted_at ? new Date(doneForm.mounted_at).toISOString() : new Date().toISOString();

    await supabase.from("deliveries").update({
      status: "delivered",
      delivered_at: completedAt,
      mounted_at: d.needs_assembly ? completedAt : null,
      notes: doneForm.notes ? [d.notes, doneForm.notes].filter(Boolean).join("\n") : d.notes,
      commission_status: d.assembler_id ? (doneForm.mode === "pending" ? "pending" : "calculated") : null,
      commission_value: d.assembler_id ? (doneForm.mode === "percent" ? costBase * (doneForm.percent / 100) : doneForm.mode === "fixed" ? doneForm.fixed : 0) : null,
      commission_percent: d.assembler_id && doneForm.mode === "percent" ? doneForm.percent : null,
    }).eq("id", d.id);

    if (d.assembler_id) {
      const status = doneForm.mode === "pending" ? "pending" : "calculated";
      const amount = doneForm.mode === "percent" ? costBase * (doneForm.percent / 100) : doneForm.mode === "fixed" ? doneForm.fixed : 0;
      await supabase.from("assembler_commissions").insert({
        user_id: user.id, assembler_id: d.assembler_id, delivery_id: d.id, financial_id: d.financial_id,
        cost_base: costBase, percent: doneForm.mode === "percent" ? doneForm.percent : null,
        amount, status,
      });
    }

    toast.success("Entrega/Montagem concluída");
    setDoneFor(null); load();
  };

  const cancel = async (d: Delivery) => {
    if (!confirm("Cancelar este pedido?")) return;
    await supabase.from("deliveries").update({ status: "cancelled" }).eq("id", d.id);
    toast.success("Cancelado"); load();
  };

  const totals = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of list) c[d.status] = (c[d.status] ?? 0) + 1;
    return c;
  }, [list]);
  const today = useMemo(() => list.filter(d => d.scheduled_for === new Date().toISOString().slice(0, 10)).length, [list]);

  return (
    <div>
      <PageHeader title="Pedidos & Logística" description="Fluxo oficial Retail: estoque → fornecedor → pronto → montador → entregue." />
      <MetricsRow items={[
        { label: "Pedir ao fornecedor", value: String(totals.needs_supplier ?? 0), tone: (totals.needs_supplier ?? 0) > 0 ? "warning" : "primary" },
        { label: "Aguardando", value: String(totals.awaiting_supplier ?? 0), tone: "primary" },
        { label: "Prontos", value: String(totals.ready ?? 0), tone: "primary" },
        { label: "Com montador", value: String(totals.with_assembler ?? 0), tone: "primary" },
        { label: "Para hoje", value: String(today), tone: "primary" },
      ]} />

      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
        {COLUMNS.map(col => {
          const items = list.filter(d => d.status === col.key && !d.is_pickup);
          return (
            <Card key={col.key} className="rounded-3xl border-0 shadow-sm overflow-hidden">
              <div className={`p-3 border-b border-border flex items-center gap-2 ${col.tone}`}>
                <col.icon className="h-4 w-4" />
                <div className="font-semibold text-xs flex-1">{col.label}</div>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="divide-y divide-border max-h-[65vh] overflow-auto">
                {items.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">Vazio</div>}
                {items.map(d => (
                  <div key={d.id} className="p-3 text-sm space-y-2">
                    <div className="font-medium truncate">{clientName(d.client_id)}</div>
                    {clientPhone(d.client_id) && <div className="text-[11px] text-muted-foreground">{clientPhone(d.client_id)}</div>}
                    <div className="text-xs text-muted-foreground flex items-start gap-1">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{d.destination_address}</span>
                    </div>

                    {d.supplier_id && (
                      <div className="text-[11px] text-muted-foreground">Fornecedor: {supplierName(d.supplier_id)}</div>
                    )}
                    {d.supplier_expected_date && col.key === "awaiting_supplier" && (
                      <div className="text-[11px] text-amber-600 font-medium">Previsão: {new Date(d.supplier_expected_date).toLocaleDateString("pt-BR")}</div>
                    )}
                    {d.assembler_id && (col.key === "with_assembler" || col.key === "delivered") && (
                      <div className="text-[11px] text-purple-600">🔧 {assemblerName(d.assembler_id)}</div>
                    )}
                    {d.max_delivery_date && col.key !== "delivered" && (
                      <div className="text-[11px] text-amber-600">Prazo cliente: {new Date(d.max_delivery_date).toLocaleDateString("pt-BR")}</div>
                    )}

                    {/* Botões por coluna */}
                    {col.key === "needs_supplier" && (
                      <Button size="sm" onClick={() => openSupplierOrder(d)} className="w-full rounded-2xl h-8 text-xs gap-1">
                        <Send className="h-3 w-3" /> Marcar pedido feito
                      </Button>
                    )}
                    {col.key === "awaiting_supplier" && (
                      <Button size="sm" onClick={() => markReceived(d)} className="w-full rounded-2xl h-8 text-xs gap-1">
                        <Check className="h-3 w-3" /> Marcar recebido
                      </Button>
                    )}
                    {col.key === "ready" && (
                      <>
                        <Button size="sm" onClick={() => openAssemblerSend(d)} className="w-full rounded-2xl h-8 text-xs gap-1">
                          <Wrench className="h-3 w-3" /> Enviar com Montador
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openComplete(d)} className="w-full rounded-2xl h-8 text-xs">
                          Entregar sem montagem
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => moveToSupplierNeeded(d)} className="w-full rounded-2xl h-7 text-[11px] text-muted-foreground">
                          Falta no estoque — pedir ao fornecedor
                        </Button>
                      </>
                    )}
                    {col.key === "with_assembler" && (
                      <Button size="sm" onClick={() => openComplete(d)} className="w-full rounded-2xl h-8 text-xs gap-1">
                        <Check className="h-3 w-3" /> Marcar Entregue/Montado
                      </Button>
                    )}
                    {col.key !== "delivered" && (
                      <Button size="sm" variant="ghost" onClick={() => cancel(d)} className="w-full h-7 text-[11px] text-rose-500">Cancelar</Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

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
                <Button size="sm" variant="outline" onClick={() => openComplete(d)} className="rounded-2xl">Marcar entregue</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal: Pedido ao fornecedor */}
      <Dialog open={!!supplierFor} onOpenChange={(o) => !o && setSupplierFor(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Pedido ao Fornecedor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prazo de fabricação (dias)</Label>
                <Input type="number" min="0" value={supplierForm.manufacturing_days} onChange={(e) => setSupplierForm({ ...supplierForm, manufacturing_days: +e.target.value })} />
              </div>
              <div>
                <Label>Prazo de entrega (dias)</Label>
                <Input type="number" min="0" value={supplierForm.delivery_days} onChange={(e) => setSupplierForm({ ...supplierForm, delivery_days: +e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Data prevista de recebimento</Label>
              <Input type="date" value={supplierForm.expected_date} onChange={(e) => setSupplierForm({ ...supplierForm, expected_date: e.target.value })} />
              <p className="text-[11px] text-muted-foreground mt-1">Se vazio, é calculada a partir dos prazos acima.</p>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={supplierForm.notes} onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSupplierFor(null)}>Cancelar</Button>
            <Button onClick={confirmSupplierOrder} className="rounded-2xl">Confirmar pedido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Enviar com montador */}
      <Dialog open={!!assemblerFor} onOpenChange={(o) => !o && setAssemblerFor(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Enviar com Montador</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Montador *</Label>
              <Select value={assemblerForm.assembler_id} onValueChange={(v) => setAssemblerForm({ ...assemblerForm, assembler_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {assemblers.length === 0 && <div className="p-2 text-xs text-muted-foreground">Cadastre montadores em "Montadores"</div>}
                  {assemblers.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de saída</Label>
              <Input type="date" value={assemblerForm.scheduled_for} onChange={(e) => setAssemblerForm({ ...assemblerForm, scheduled_for: e.target.value })} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={assemblerForm.notes} onChange={(e) => setAssemblerForm({ ...assemblerForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssemblerFor(null)}>Cancelar</Button>
            <Button onClick={confirmAssemblerSend} className="rounded-2xl">Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Concluir entrega/montagem + comissão */}
      <Dialog open={!!doneFor} onOpenChange={(o) => !o && setDoneFor(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{doneFor?.assembler_id ? "Entrega/Montagem concluída" : "Entrega concluída"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Data da entrega/montagem</Label>
              <Input type="date" value={doneForm.mounted_at} onChange={(e) => setDoneForm({ ...doneForm, mounted_at: e.target.value })} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={doneForm.notes} onChange={(e) => setDoneForm({ ...doneForm, notes: e.target.value })} />
            </div>
            {doneFor?.assembler_id && (
              <>
                <div className="border-t pt-3">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Comissão do montador (sobre o custo)</Label>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" type="button" variant={doneForm.mode === "percent" ? "default" : "outline"} onClick={() => setDoneForm({ ...doneForm, mode: "percent" })} className="flex-1 rounded-2xl">% sobre custo</Button>
                    <Button size="sm" type="button" variant={doneForm.mode === "fixed" ? "default" : "outline"} onClick={() => setDoneForm({ ...doneForm, mode: "fixed" })} className="flex-1 rounded-2xl">Valor fixo</Button>
                    <Button size="sm" type="button" variant={doneForm.mode === "pending" ? "default" : "outline"} onClick={() => setDoneForm({ ...doneForm, mode: "pending" })} className="flex-1 rounded-2xl">Pendente</Button>
                  </div>
                </div>
                {doneForm.mode === "percent" && (
                  <div>
                    <Label>Porcentagem (%) — padrão 5%</Label>
                    <Input type="number" step="0.1" value={doneForm.percent} onChange={(e) => setDoneForm({ ...doneForm, percent: +e.target.value })} />
                  </div>
                )}
                {doneForm.mode === "fixed" && (
                  <div><Label>Valor fixo (R$)</Label><Input type="number" step="0.01" value={doneForm.fixed} onChange={(e) => setDoneForm({ ...doneForm, fixed: +e.target.value })} /></div>
                )}
                {doneForm.mode === "pending" && (
                  <p className="text-sm text-muted-foreground bg-secondary/40 p-3 rounded-2xl">Vai para "Pendentes" do montador — você define a porcentagem em lote depois.</p>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDoneFor(null)}>Cancelar</Button>
            <Button onClick={confirmComplete} className="rounded-2xl">Confirmar conclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
