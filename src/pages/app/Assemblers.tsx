import { useEffect, useMemo, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Wrench, Plus, Check, Pencil, Trash2, Calculator } from "lucide-react";

type Assembler = { id: string; name: string; phone: string | null; email: string | null; default_commission_percent: number; notes: string | null; status: string };
type Commission = { id: string; assembler_id: string; delivery_id: string | null; financial_id: string | null; cost_base: number; percent: number | null; amount: number; status: string; paid_at: string | null; created_at: string };

const emptyForm = { name: "", phone: "", email: "", default_commission_percent: 5, notes: "" };

export default function Assemblers() {
  const { user } = useAuth();
  const [list, setList] = useState<Assembler[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [period, setPeriod] = useState("30");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Assembler | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [batchPercent, setBatchPercent] = useState(5);
  const [selectedPending, setSelectedPending] = useState<Set<string>>(new Set());

  const load = async () => {
    const [a, c] = await Promise.all([
      supabase.from("assemblers").select("*").is("deleted_at", null).order("name"),
      supabase.from("assembler_commissions").select("*").order("created_at", { ascending: false }),
    ]);
    setList((a.data ?? []) as Assembler[]);
    setCommissions((c.data ?? []) as Commission[]);
    if (!selected && a.data?.[0]) setSelected(a.data[0].id);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (a: Assembler) => { setEditing(a); setForm({ ...emptyForm, ...a }); setOpen(true); };

  const save = async () => {
    if (!user || !form.name.trim()) return toast.error("Nome obrigatório");
    const payload: any = { ...form, user_id: user.id, phone: form.phone || null, email: form.email || null };
    const { error } = editing
      ? await supabase.from("assemblers").update(payload).eq("id", editing.id)
      : await supabase.from("assemblers").insert(payload);
    if (error) return toast.error(friendlyError(error));
    toast.success("Salvo"); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover montador?")) return;
    await supabase.from("assemblers").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const sinceDate = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - Number(period));
    return d.toISOString();
  }, [period]);

  const filtered = useMemo(() => commissions.filter(c => c.assembler_id === selected && c.created_at >= sinceDate), [commissions, selected, sinceDate]);
  const pending = filtered.filter(c => c.status === "pending");
  const calculated = filtered.filter(c => c.status === "calculated");
  const paid = filtered.filter(c => c.status === "paid");

  const totalItems = filtered.length;
  const totalCost = filtered.reduce((a, c) => a + Number(c.cost_base), 0);
  const totalToPay = [...calculated, ...paid].reduce((a, c) => a + Number(c.amount), 0);
  const owed = calculated.reduce((a, c) => a + Number(c.amount), 0);

  const togglePending = (id: string) => {
    const s = new Set(selectedPending);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedPending(s);
  };
  const toggleAllPending = () => {
    if (selectedPending.size === pending.length) setSelectedPending(new Set());
    else setSelectedPending(new Set(pending.map(p => p.id)));
  };

  const applyBatch = async () => {
    const ids = Array.from(selectedPending);
    if (ids.length === 0) return toast.error("Selecione pelo menos uma comissão pendente");
    const selectedCs = pending.filter(p => ids.includes(p.id));
    const sumCost = selectedCs.reduce((a, c) => a + Number(c.cost_base), 0);
    const totalAmount = sumCost * (batchPercent / 100);
    // Distribute proportionally
    await Promise.all(selectedCs.map(c => {
      const amt = sumCost > 0 ? Number(c.cost_base) / sumCost * totalAmount : 0;
      return supabase.from("assembler_commissions").update({ amount: amt, percent: batchPercent, status: "calculated" }).eq("id", c.id);
    }));
    toast.success(`${selectedCs.length} comissões calculadas: R$ ${totalAmount.toFixed(2)}`);
    setSelectedPending(new Set()); load();
  };

  const markPaid = async (id: string) => {
    await supabase.from("assembler_commissions").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    load();
  };
  const undoPaid = async (id: string) => {
    await supabase.from("assembler_commissions").update({ status: "calculated", paid_at: null }).eq("id", id);
    load();
  };

  return (
    <div>
      <PageHeader title="Montadores" description="Gestão de montadores e comissões." actionLabel="Novo montador" onAction={openNew} />

      {list.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={Wrench} title="Sem montadores" description="Cadastre montadores para vincular às entregas." actionLabel="Novo montador" onAction={openNew} />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-64 h-10 bg-primary/10 border-primary/30"><SelectValue /></SelectTrigger>
              <SelectContent>{list.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40 h-10 bg-primary/10 border-primary/30"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Este mês</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="365">1 ano</SelectItem>
              </SelectContent>
            </Select>
            {selected && (
              <>
                <Button size="sm" variant="outline" onClick={() => openEdit(list.find(a => a.id === selected)!)} className="h-10 rounded-xl gap-1"><Pencil className="h-3.5 w-3.5" />Editar</Button>
                <Button size="sm" variant="outline" onClick={() => remove(selected)} className="h-10 rounded-xl gap-1 text-rose-600"><Trash2 className="h-3.5 w-3.5" />Remover</Button>
              </>
            )}
          </div>

          <MetricsRow items={[
            { label: "Itens montados", value: String(totalItems), tone: "primary" },
            { label: "Soma do custo", value: `R$ ${totalCost.toFixed(2)}`, tone: "primary" },
            { label: "A pagar (calculadas)", value: `R$ ${owed.toFixed(2)}`, tone: owed > 0 ? "warning" : "primary" },
            { label: "Total comissões", value: `R$ ${totalToPay.toFixed(2)}`, tone: "success" },
          ]} />

          <Tabs defaultValue="pending">
            <TabsList className="rounded-2xl mb-4">
              <TabsTrigger value="pending">Pendentes ({pending.length})</TabsTrigger>
              <TabsTrigger value="calculated">A Pagar ({calculated.length})</TabsTrigger>
              <TabsTrigger value="paid">Pagas ({paid.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
                {pending.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground text-sm">Sem comissões pendentes neste período.</div>
                ) : (
                  <>
                    <div className="p-3 border-b border-border bg-purple-500/5 flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={selectedPending.size === pending.length} onChange={toggleAllPending} />
                        Selecionar todas ({selectedPending.size}/{pending.length})
                      </label>
                      <div className="flex-1" />
                      <Label className="text-xs">%</Label>
                      <Input type="number" step="0.1" value={batchPercent} onChange={(e) => setBatchPercent(+e.target.value)} className="w-24 h-9" />
                      <Button size="sm" onClick={applyBatch} className="rounded-2xl gap-1"><Calculator className="h-3.5 w-3.5" />Calcular em lote</Button>
                    </div>
                    <div className="divide-y divide-border">
                      {pending.map(c => (
                        <div key={c.id} className="p-3 flex items-center gap-3 text-sm">
                          <input type="checkbox" checked={selectedPending.has(c.id)} onChange={() => togglePending(c.id)} />
                          <div className="flex-1">
                            <div className="font-medium">Custo base: R$ {Number(c.cost_base).toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</div>
                          </div>
                          <Badge className="bg-amber-500/15 text-amber-600">A calcular</Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="calculated">
              <Card className="rounded-3xl border-0 shadow-sm overflow-hidden divide-y divide-border">
                {calculated.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground text-sm">Sem comissões a pagar.</div>
                ) : calculated.map(c => (
                  <div key={c.id} className="p-3 flex items-center gap-3 text-sm">
                    <div className="flex-1">
                      <div className="font-semibold text-primary">R$ {Number(c.amount).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Custo R$ {Number(c.cost_base).toFixed(2)} {c.percent ? `· ${c.percent}%` : ""}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => markPaid(c.id)} className="rounded-2xl gap-1"><Check className="h-3.5 w-3.5" />Marcar pago</Button>
                  </div>
                ))}
              </Card>
            </TabsContent>

            <TabsContent value="paid">
              <Card className="rounded-3xl border-0 shadow-sm overflow-hidden divide-y divide-border">
                {paid.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground text-sm">Nenhuma comissão paga ainda.</div>
                ) : paid.map(c => (
                  <div key={c.id} className="p-3 flex items-center gap-3 text-sm">
                    <div className="flex-1">
                      <div className="font-semibold">R$ {Number(c.amount).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Pago {c.paid_at ? new Date(c.paid_at).toLocaleDateString("pt-BR") : ""}</div>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-600">Pago</Badge>
                    <Button size="sm" variant="ghost" onClick={() => undoPaid(c.id)}>Desfazer</Button>
                  </div>
                ))}
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{editing ? "Editar montador" : "Novo montador"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>% comissão padrão</Label><Input type="number" step="0.1" value={form.default_commission_percent} onChange={(e) => setForm({ ...form, default_commission_percent: +e.target.value })} /></div>
            <div><Label>Notas</Label><Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="rounded-2xl">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
