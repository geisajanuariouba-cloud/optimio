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
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { ArrowDownRight, ArrowUpRight, Banknote } from "lucide-react";

type Tx = { id: string; type: "in" | "out"; amount: number; reason: string; description: string | null; created_at: string };

const REASONS_IN = [
  { v: "venda_dinheiro", label: "Venda em dinheiro" },
  { v: "suprimento", label: "Suprimento (entrou dinheiro no caixa)" },
  { v: "ajuste_in", label: "Ajuste — entrada" },
];
const REASONS_OUT = [
  { v: "troco", label: "Troco devolvido" },
  { v: "sangria", label: "Sangria (saiu do caixa)" },
  { v: "ajuste_out", label: "Ajuste — saída" },
];

export default function CashDrawer() {
  const { user } = useAuth();
  const [list, setList] = useState<Tx[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "in" as "in" | "out", amount: 0, reason: "suprimento", description: "" });

  const load = async () => {
    const { data } = await supabase.from("cash_drawer_transactions").select("*").order("created_at", { ascending: false }).limit(200);
    setList((data ?? []) as Tx[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const balance = useMemo(() => list.reduce((a, t) => a + (t.type === "in" ? Number(t.amount) : -Number(t.amount)), 0), [list]);
  const today = new Date().toISOString().slice(0, 10);
  const dayTx = list.filter(t => t.created_at.startsWith(today));
  const dayIn = dayTx.filter(t => t.type === "in").reduce((a, t) => a + Number(t.amount), 0);
  const dayOut = dayTx.filter(t => t.type === "out").reduce((a, t) => a + Number(t.amount), 0);

  const save = async () => {
    if (!user || form.amount <= 0) return toast.error("Valor obrigatório");
    const { error } = await supabase.from("cash_drawer_transactions").insert({
      user_id: user.id, type: form.type, amount: form.amount, reason: form.reason,
      description: form.description || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Movimentação registrada"); setOpen(false);
    setForm({ type: "in", amount: 0, reason: "suprimento", description: "" });
    load();
  };

  return (
    <div>
      <PageHeader title="Caixa em Dinheiro" description="Gaveta física: vendas em espécie, trocos, sangria e suprimento." actionLabel="Movimentar" onAction={() => setOpen(true)} />
      <MetricsRow items={[
        { label: "Saldo no caixa", value: `R$ ${balance.toFixed(2)}`, tone: balance >= 0 ? "success" : "danger" },
        { label: "Entradas hoje", value: `R$ ${dayIn.toFixed(2)}`, tone: "primary" },
        { label: "Saídas hoje", value: `R$ ${dayOut.toFixed(2)}`, tone: "warning" },
        { label: "Movimentações (dia)", value: String(dayTx.length), tone: "primary" },
      ]} />

      <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border">
        {list.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground"><Banknote className="h-10 w-10 mx-auto mb-3" />Nenhuma movimentação.</div>
        ) : list.map(t => (
          <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3">
              {t.type === "in"
                ? <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                : <ArrowDownRight className="h-4 w-4 text-rose-500" />}
              <div>
                <div className="font-medium">{t.description || t.reason}</div>
                <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")} · {t.reason}</div>
              </div>
            </div>
            <div className={`font-bold ${t.type === "in" ? "text-emerald-500" : "text-rose-500"}`}>
              {t.type === "in" ? "+" : "−"}R$ {Number(t.amount).toFixed(2)}
            </div>
          </div>
        ))}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Movimentar caixa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v, reason: v === "in" ? "suprimento" : "sangria" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Entrada</SelectItem>
                    <SelectItem value="out">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
            </div>
            <div><Label>Motivo</Label>
              <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(form.type === "in" ? REASONS_IN : REASONS_OUT).map(r => <SelectItem key={r.v} value={r.v}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
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
