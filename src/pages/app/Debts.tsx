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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Receipt, Check } from "lucide-react";

type Client = { id: string; full_name: string };
type Debt = { id: string; client_id: string; original_amount: number; interest_amount: number; total_amount: number; installments_count: number; status: string; notes: string | null; created_at: string };
type Inst = { id: string; debt_id: string; number: number; amount: number; due_date: string; paid_at: string | null };

export default function Debts() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [insts, setInsts] = useState<Inst[]>([]);
  const [open, setOpen] = useState(false);
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
    // mark debt paid if all paid
    const remaining = insts.filter(i => i.debt_id === inst.debt_id && i.id !== inst.id && !i.paid_at).length;
    if (remaining === 0) await supabase.from("debts").update({ status: "paid" }).eq("id", inst.debt_id);
    toast.success("Parcela paga");
    load();
  };

  const open_debts = debts.filter(d => d.status !== "paid");
  const totalOpen = useMemo(() => insts.filter(i => !i.paid_at).reduce((a, i) => a + Number(i.amount), 0), [insts]);
  const overdue = insts.filter(i => !i.paid_at && new Date(i.due_date) < new Date()).length;

  return (
    <div>
      <PageHeader title="Dívidas & Promissórias" description="Quem deve, quanto e quando vence." actionLabel="Nova promissória" onAction={() => setOpen(true)} />
      <MetricsRow items={[
        { label: "Em aberto", value: String(open_debts.length) },
        { label: "Total devido", value: `R$ ${totalOpen.toFixed(2)}` },
        { label: "Parcelas vencidas", value: String(overdue) },
        { label: "Quitadas", value: String(debts.filter(d => d.status === "paid").length) },
      ]} />

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        {debts.length === 0 ? (
          <EmptyState icon={Receipt} title="Sem dívidas registradas" description="Cadastre uma promissória manual ou use a opção 'Promissória' em uma venda." actionLabel="Nova promissória" onAction={() => setOpen(true)} />
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Cliente</TableHead><TableHead>Original</TableHead><TableHead>Juros</TableHead>
              <TableHead>Total</TableHead><TableHead>Parcelas</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {debts.map(d => {
                const cli = clients.find(c => c.id === d.client_id);
                const dInsts = insts.filter(i => i.debt_id === d.id);
                const paid = dInsts.filter(i => i.paid_at).length;
                return (
                  <>
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{cli?.full_name ?? "—"}</TableCell>
                      <TableCell>R$ {Number(d.original_amount).toFixed(2)}</TableCell>
                      <TableCell>R$ {Number(d.interest_amount).toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">R$ {Number(d.total_amount).toFixed(2)}</TableCell>
                      <TableCell>{paid}/{d.installments_count}</TableCell>
                      <TableCell><Badge className={d.status === "paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}>{d.status}</Badge></TableCell>
                    </TableRow>
                    {dInsts.map(i => (
                      <TableRow key={i.id} className="bg-secondary/20">
                        <TableCell colSpan={2} className="pl-10 text-xs">Parcela {i.number} · vence {new Date(i.due_date).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell colSpan={2} className="text-xs">R$ {Number(i.amount).toFixed(2)}</TableCell>
                        <TableCell colSpan={2} className="text-right">
                          {i.paid_at
                            ? <Badge className="bg-emerald-500/10 text-emerald-600 gap-1"><Check className="h-3 w-3" />pago</Badge>
                            : <Button size="sm" variant="outline" onClick={() => payInst(i)}>Marcar pago</Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                );
              })}
            </TableBody>
          </Table>
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
              <div><Label>1ª venceu em</Label><Input type="date" value={form.first_due} onChange={(e) => setForm({ ...form, first_due: e.target.value })} /></div>
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
