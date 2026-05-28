import { useEffect, useMemo, useState } from "react";
import { friendlyError } from "@/lib/errors";
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

type Tx = { id: string; type: "in" | "out"; amount: number; reason: string; description: string | null; created_at: string; payment_method: string | null };

const METHODS = [
  { v: "dinheiro", label: "Dinheiro" },
  { v: "pix", label: "Pix" },
  { v: "cartao", label: "Cartão" },
  { v: "transferencia", label: "Transferência" },
  { v: "outro", label: "Outro" },
];
const METHOD_LABEL = (m?: string | null) => METHODS.find(x => x.v === (m ?? "dinheiro"))?.label ?? (m ?? "—");

const REASONS_IN = [
  { v: "venda", label: "Venda recebida" },
  { v: "promissoria", label: "Baixa de promissória" },
  { v: "suprimento", label: "Suprimento" },
  { v: "ajuste_in", label: "Ajuste — entrada" },
];
const REASONS_OUT = [
  { v: "troco", label: "Troco devolvido" },
  { v: "sangria", label: "Sangria" },
  { v: "ajuste_out", label: "Ajuste — saída" },
];

export default function CashDrawer() {
  const { user } = useAuth();
  const [list, setList] = useState<Tx[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "in" as "in" | "out", amount: 0, reason: "suprimento", description: "", payment_method: "dinheiro" });

  const load = async () => {
    const { data } = await supabase.from("cash_drawer_transactions").select("*").order("created_at", { ascending: false }).limit(300);
    setList((data ?? []) as Tx[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const today = new Date().toISOString().slice(0, 10);
  const dayTx = list.filter(t => t.created_at.startsWith(today));
  const dayIn = dayTx.filter(t => t.type === "in").reduce((a, t) => a + Number(t.amount), 0);
  const dayOut = dayTx.filter(t => t.type === "out").reduce((a, t) => a + Number(t.amount), 0);
  const byMethod = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const t of dayTx) {
      const m = t.payment_method ?? "dinheiro";
      acc[m] = (acc[m] ?? 0) + (t.type === "in" ? Number(t.amount) : -Number(t.amount));
    }
    return acc;
  }, [dayTx]);

  const save = async () => {
    if (!user || form.amount <= 0) return toast.error("Valor obrigatório");
    const { error } = await supabase.from("cash_drawer_transactions").insert({
      user_id: user.id, type: form.type, amount: form.amount, reason: form.reason,
      description: form.description || null, payment_method: form.payment_method,
    });
    if (error) return toast.error(friendlyError(error));
    toast.success("Movimentação registrada"); setOpen(false);
    setForm({ type: "in", amount: 0, reason: "suprimento", description: "", payment_method: "dinheiro" });
    load();
  };

  return (
    <div>
      <PageHeader title="Caixa do Dia" description="Tudo que entrou e saiu hoje — por forma de pagamento." actionLabel="Movimentar" onAction={() => setOpen(true)} />
      <MetricsRow items={[
        { label: "Entradas hoje", value: `R$ ${dayIn.toFixed(2)}`, tone: "success" },
        { label: "Saídas hoje", value: `R$ ${dayOut.toFixed(2)}`, tone: "warning" },
        { label: "Líquido do dia", value: `R$ ${(dayIn - dayOut).toFixed(2)}`, tone: (dayIn - dayOut) >= 0 ? "primary" : "danger" },
        { label: "Movimentações", value: String(dayTx.length), tone: "primary" },
      ]} />

      <Card className="p-4 rounded-3xl border-0 shadow-sm mb-4">
        <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Total recebido hoje por forma de pagamento</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {METHODS.map(m => (
            <div key={m.v} className="p-3 rounded-2xl bg-secondary/40">
              <div className="text-xs text-muted-foreground">{m.label}</div>
              <div className="font-bold">R$ {(byMethod[m.v] ?? 0).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </Card>

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
                <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")} · {t.reason} · {METHOD_LABEL(t.payment_method)}</div>
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
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Forma de pagamento</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map(m => <SelectItem key={m.v} value={m.v}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Motivo</Label>
                <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(form.type === "in" ? REASONS_IN : REASONS_OUT).map(r => <SelectItem key={r.v} value={r.v}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
