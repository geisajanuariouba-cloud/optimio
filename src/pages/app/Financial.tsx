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
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react";
import PromoChat from "@/components/app/PromoChat";

type Tx = { id: string; type: string; gross_amount: number; net_amount: number; fee_percent: number | null; description: string | null; payment_method: string | null; category: string | null; transaction_date: string };

const METHODS = ["pix", "dinheiro", "credito", "debito", "promissoria"];
const FEES: Record<string, number> = { pix: 0, dinheiro: 0, credito: 3.5, debito: 1.5, promissoria: 0 };

export default function Financial() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "income", gross_amount: 0, payment_method: "pix", category: "", description: "", transaction_date: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    const { data, error } = await supabase.from("financial").select("*").order("transaction_date", { ascending: false }).limit(200);
    if (error) toast.error(error.message); else setTxs(data as Tx[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const save = async () => {
    if (!user || !form.gross_amount) return toast.error("Valor obrigatório");
    const fee_percent = form.type === "income" ? FEES[form.payment_method] ?? 0 : 0;
    const fee_amount = (form.gross_amount * fee_percent) / 100;
    const net_amount = form.type === "income" ? form.gross_amount - fee_amount : form.gross_amount;
    const { error } = await supabase.from("financial").insert({
      user_id: user.id, type: form.type, gross_amount: form.gross_amount, net_amount, fee_percent, fee_amount,
      payment_method: form.payment_method, category: form.category || null, description: form.description || null,
      transaction_date: form.transaction_date,
    });
    if (error) return toast.error(error.message);
    toast.success("Lançamento salvo"); setOpen(false);
    setForm({ ...form, gross_amount: 0, description: "", category: "" });
    load();
  };

  const month = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7);
    return txs.filter(t => t.transaction_date.startsWith(m));
  }, [txs]);
  const income = month.filter(t => t.type === "income").reduce((a, t) => a + t.net_amount, 0);
  const expense = month.filter(t => t.type === "expense").reduce((a, t) => a + t.gross_amount, 0);
  const fees = month.filter(t => t.type === "income").reduce((a, t) => a + (t.fee_percent ? (t.gross_amount * t.fee_percent / 100) : 0), 0);
  const realProfit = income - expense - fees;

  return (
    <div>
      <PageHeader title="Financeiro" description="Entradas, saídas, taxas (snapshot) e promissórias." actionLabel="Lançamento" onAction={() => setOpen(true)} />
      <MetricsRow items={[
        { label: "Receita (mês)", value: `R$ ${income.toFixed(2)}` },
        { label: "Despesas", value: `R$ ${expense.toFixed(2)}` },
        { label: "Taxas maquininha", value: `R$ ${fees.toFixed(2)}` },
        { label: "Lucro real", value: `R$ ${realProfit.toFixed(2)}`, hint: "receita − despesas − taxas" },
      ]} />

      <div className="grid lg:grid-cols-[1fr_400px] gap-6 mb-6">
        <div /> 
        <PromoChat />
      </div>

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        {txs.length === 0 ? (
          <EmptyState icon={Wallet} title="Sem lançamentos" description="Registre uma entrada ou despesa para começar." actionLabel="Lançamento" onAction={() => setOpen(true)} />
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead>
              <TableHead>Método</TableHead><TableHead>Bruto</TableHead><TableHead>Taxa</TableHead><TableHead>Líquido</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {txs.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">{new Date(t.transaction_date).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    {t.type === "income"
                      ? <span className="text-emerald-600 flex items-center gap-1 text-sm"><ArrowUpRight className="h-3 w-3" />Entrada</span>
                      : <span className="text-rose-600 flex items-center gap-1 text-sm"><ArrowDownRight className="h-3 w-3" />Saída</span>}
                  </TableCell>
                  <TableCell className="text-sm">{t.description ?? t.category ?? "—"}</TableCell>
                  <TableCell className="text-xs uppercase text-muted-foreground">{t.payment_method ?? "—"}</TableCell>
                  <TableCell className="font-medium">R$ {t.gross_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{t.fee_percent ? `${t.fee_percent}%` : "—"}</TableCell>
                  <TableCell className="font-semibold">R$ {t.net_amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Entrada</SelectItem>
                    <SelectItem value="expense">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Data</Label><Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.gross_amount} onChange={(e) => setForm({ ...form, gross_amount: +e.target.value })} /></div>
              <div><Label>Método</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m} {FEES[m] ? `(${FEES[m]}%)` : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Serviços, Aluguel, Insumos…" /></div>
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
