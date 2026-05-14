import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Receipt, Check, Search, Calendar, AlertTriangle, Trash2 } from "lucide-react";

type Client = { id: string; full_name: string };
type Debt = { id: string; client_id: string; original_amount: number; interest_amount: number; total_amount: number; installments_count: number; status: string; notes: string | null; created_at: string };
type Inst = { id: string; debt_id: string; number: number; amount: number; due_date: string; paid_at: string | null };

type Filter = "all" | "30d" | "week" | "month" | "overdue";

export default function Debts() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [insts, setInsts] = useState<Inst[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [form, setForm] = useState({ client_id: "", original_amount: 0, interest_amount: 0, installments_count: 1, first_due: new Date().toISOString().slice(0, 10), notes: "" });

  const load = async () => {
    const [c, d, i] = await Promise.all([
      supabase.from("clients").select("id, full_name").is("deleted_at", null).order("full_name"),
      supabase.from("debts").select("*").order("created_at", { ascending: false }),
      supabase.from("debt_installments").select("*").order("number"),
    ]);
    setClients((c.data ?? []) as Client[]);
    setDebts((d.data ?? []) as Debt[]);
    setInsts((i.data ?? []) as Inst[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const total = form.original_amount + form.interest_amount;
  const perInstallment = form.installments_count > 0 ? total / form.installments_count : 0;

  const save = async () => {
    if (!user || !form.client_id) return toast.error("Selecione um cliente");
    if (form.original_amount <= 0) return toast.error("Valor obrigatório");
    const { data: debt, error } = await supabase.from("debts").insert({
      user_id: user.id, client_id: form.client_id, origin: "manual",
      original_amount: form.original_amount, interest_amount: form.interest_amount,
      total_amount: total, installments_count: form.installments_count, notes: form.notes || null,
    }).select().single();
    if (error || !debt) return toast.error(error?.message ?? "Erro");
    const rows = Array.from({ length: form.installments_count }, (_, k) => {
      const d = new Date(form.first_due); d.setMonth(d.getMonth() + k);
      return { user_id: user.id, debt_id: debt.id, number: k + 1, amount: perInstallment, due_date: d.toISOString().slice(0, 10) };
    });
    await supabase.from("debt_installments").insert(rows);
    toast.success("Promissória registrada");
    setOpen(false);
    setForm({ client_id: "", original_amount: 0, interest_amount: 0, installments_count: 1, first_due: new Date().toISOString().slice(0, 10), notes: "" });
    load();
  };

  const payInst = async (inst: Inst) => {
    await supabase.from("debt_installments").update({ paid_at: new Date().toISOString(), payment_method: "pix" }).eq("id", inst.id);
    await supabase.from("financial").insert({
      user_id: user!.id, type: "income", gross_amount: inst.amount, net_amount: inst.amount,
      payment_method: "promissoria", category: "Promissória", description: `Parcela ${inst.number}`,
      transaction_date: new Date().toISOString().slice(0, 10),
    });
    const remaining = insts.filter(i => i.debt_id === inst.debt_id && i.id !== inst.id && !i.paid_at).length;
    if (remaining === 0) await supabase.from("debts").update({ status: "paid" }).eq("id", inst.debt_id);
    toast.success("Parcela paga");
    load();
  };

  const removeDebt = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta promissória? Todas as parcelas serão removidas.")) return;
    const { error: e1 } = await supabase.from("debt_installments").delete().eq("debt_id", id);
    if (e1) return toast.error(e1.message);
    const { error: e2 } = await supabase.from("debts").delete().eq("id", id);
    if (e2) return toast.error(e2.message);
    toast.success("Promissória excluída");
    load();
  };

  const matchesFilter = (d: Debt) => {
    if (filter === "all") return true;
    const dInsts = insts.filter(i => i.debt_id === d.id && !i.paid_at);
    if (dInsts.length === 0) return false;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const in7 = new Date(now); in7.setDate(in7.getDate() + 7);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
    return dInsts.some(i => {
      const dd = new Date(i.due_date);
      if (filter === "overdue") return dd < now;
      if (filter === "week") return dd >= now && dd <= in7;
      if (filter === "month") return dd >= now && dd <= monthEnd;
      if (filter === "30d") return dd >= now && dd <= in30;
      return true;
    });
  };

  const visible = useMemo(() => {
    const term = search.toLowerCase().trim();
    return debts.filter(d => {
      if (!matchesFilter(d)) return false;
      if (!term) return true;
      const c = clients.find(x => x.id === d.client_id);
      return (c?.full_name ?? "").toLowerCase().includes(term);
    });
  }, [debts, insts, clients, search, filter]);

  const open_debts = debts.filter(d => d.status !== "paid");
  const totalOpen = useMemo(() => insts.filter(i => !i.paid_at).reduce((a, i) => a + Number(i.amount), 0), [insts]);
  const overdue = insts.filter(i => !i.paid_at && new Date(i.due_date) < new Date()).length;

  return (
    <div>
      <PageHeader title="Dívidas & Promissórias" description="Quem deve, quanto e quando vence." actionLabel="Nova promissória" onAction={() => setOpen(true)} />
      <MetricsRow items={[
        { label: "Em aberto", value: String(open_debts.length), tone: "primary" },
        { label: "Total devido", value: `R$ ${totalOpen.toFixed(2)}`, tone: "primary" },
        { label: "Parcelas vencidas", value: String(overdue), tone: overdue > 0 ? "danger" : "primary" },
        { label: "Quitadas", value: String(debts.filter(d => d.status === "paid").length), tone: "success" },
      ]} />

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden mb-4">
        <div className="p-3 md:p-4 border-b border-border flex flex-col md:flex-row gap-2 md:items-center">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente…" className="border-0 bg-transparent focus-visible:ring-0 h-9" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { k: "all" as Filter, label: "Todos" },
              { k: "overdue" as Filter, label: "Vencidos" },
              { k: "week" as Filter, label: "Esta semana" },
              { k: "30d" as Filter, label: "30 dias" },
              { k: "month" as Filter, label: "Este mês" },
            ].map(t => (
              <Button key={t.k} size="sm" variant={filter === t.k ? "default" : "outline"} onClick={() => setFilter(t.k)} className="rounded-full h-8 text-xs">
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={Receipt} title={search || filter !== "all" ? "Nada encontrado com esses filtros" : "Sem dívidas registradas"} description={search ? "Tente outro termo." : "Cadastre uma promissória manual ou crie pelo Financeiro."} actionLabel="Nova promissória" onAction={() => setOpen(true)} />
        ) : (
          <Accordion type="multiple" className="divide-y divide-border">
            {visible.map(d => {
              const cli = clients.find(c => c.id === d.client_id);
              const dInsts = insts.filter(i => i.debt_id === d.id);
              const paid = dInsts.filter(i => i.paid_at).length;
              const pending = dInsts.filter(i => !i.paid_at).length;
              const overdueCount = dInsts.filter(i => !i.paid_at && new Date(i.due_date) < new Date()).length;
              return (
                <AccordionItem key={d.id} value={d.id} className="border-0">
                  <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/30">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 w-full text-left text-sm">
                      <div className="font-semibold col-span-2 md:col-span-1 truncate">{cli?.full_name ?? "—"}</div>
                      <div className="text-muted-foreground text-xs md:text-sm">Original<br/><span className="text-foreground">R$ {Number(d.original_amount).toFixed(2)}</span></div>
                      <div className="text-muted-foreground text-xs md:text-sm">Total<br/><span className="font-bold text-primary">R$ {Number(d.total_amount).toFixed(2)}</span></div>
                      <div className="text-muted-foreground text-xs md:text-sm">Parcelas<br/><span className="text-foreground">{paid}/{d.installments_count}</span></div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {overdueCount > 0 && <Badge className="bg-rose-500/15 text-rose-600 gap-1"><AlertTriangle className="h-3 w-3" />{overdueCount} venc.</Badge>}
                        <Badge className={d.status === "paid" ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}>{d.status === "paid" ? "quitado" : `${pending} aberta(s)`}</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3">
                    <div className="rounded-2xl bg-secondary/30 divide-y divide-border/50">
                      {dInsts.map(i => {
                        const isOverdue = !i.paid_at && new Date(i.due_date) < new Date();
                        return (
                          <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-medium">Parcela {i.number}</span>
                              <span className={`text-xs ${isOverdue ? "text-rose-600 font-medium" : "text-muted-foreground"}`}>vence {new Date(i.due_date).toLocaleDateString("pt-BR")}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold">R$ {Number(i.amount).toFixed(2)}</span>
                              {i.paid_at
                                ? <Badge className="bg-emerald-500/15 text-emerald-600 gap-1"><Check className="h-3 w-3" />pago</Badge>
                                : <Button size="sm" variant="outline" onClick={() => payInst(i)} className="rounded-full h-8">Marcar pago</Button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Nova promissória</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Cliente *</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor original (R$) *</Label><Input type="number" step="0.01" value={form.original_amount} onChange={(e) => setForm({ ...form, original_amount: +e.target.value })} /></div>
              <div><Label>Juros totais (R$)</Label><Input type="number" step="0.01" value={form.interest_amount} onChange={(e) => setForm({ ...form, interest_amount: +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nº de parcelas</Label><Input type="number" min={1} value={form.installments_count} onChange={(e) => setForm({ ...form, installments_count: +e.target.value })} /></div>
              <div><Label>1ª vence em</Label><Input type="date" value={form.first_due} onChange={(e) => setForm({ ...form, first_due: e.target.value })} /></div>
            </div>
            <Card className="p-4 bg-secondary/40 border-0 rounded-2xl text-sm space-y-1">
              <div>Total: <strong>R$ {total.toFixed(2)}</strong></div>
              <div>{form.installments_count}× de <strong>R$ {perInstallment.toFixed(2)}</strong></div>
            </Card>
            <div><Label>Notas</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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
