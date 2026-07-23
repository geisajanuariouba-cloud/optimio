import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Wallet2, AlertTriangle, Plus, Trash2 } from "lucide-react";

type CashAccount = { id: string; label: string; current_balance: number; low_balance_threshold: number; last_updated_at: string };

const emptyAccount = { label: "", current_balance: "0", low_balance_threshold: "200" };
const emptyTx = { amount: "", type: "deposit", note: "" };

export default function AdCash() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [accOpen, setAccOpen] = useState(false);
  const [accForm, setAccForm] = useState<any>(emptyAccount);

  const [txOpen, setTxOpen] = useState<CashAccount | null>(null);
  const [txForm, setTxForm] = useState<any>(emptyTx);

  const load = async () => {
    const { data, error } = await supabase.from("ad_cash_accounts" as any).select("*").is("deleted_at", null).order("created_at", { ascending: false });
    if (error) toast.error(friendlyError(error)); else setAccounts((data ?? []) as CashAccount[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const saveAccount = async () => {
    if (!user || !accForm.label.trim()) return toast.error("Nome da conta obrigatório");
    const { error } = await supabase.from("ad_cash_accounts" as any).insert({
      user_id: user.id, label: accForm.label,
      current_balance: Number(accForm.current_balance) || 0,
      low_balance_threshold: Number(accForm.low_balance_threshold) || 200,
    });
    if (error) return toast.error(friendlyError(error));
    toast.success("Conta de caixa criada");
    setAccOpen(false); setAccForm(emptyAccount); load();
  };

  const removeAccount = async (id: string) => {
    if (!confirm("Mover para a lixeira?")) return;
    const { error } = await supabase.from("ad_cash_accounts" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Movido para lixeira"); load();
  };

  const saveTx = async () => {
    if (!user || !txOpen || !txForm.amount) return toast.error("Informe o valor");
    const { error } = await supabase.from("ad_cash_transactions" as any).insert({
      user_id: user.id, ad_cash_account_id: txOpen.id,
      amount: Math.abs(Number(txForm.amount)), type: txForm.type, note: txForm.note || null, source: "manual",
    });
    if (error) return toast.error(friendlyError(error));
    toast.success("Transação registrada");
    setTxOpen(null); setTxForm(emptyTx); load();
  };

  const totalBalance = accounts.reduce((a, c) => a + Number(c.current_balance), 0);
  const lowAccounts = accounts.filter(a => Number(a.current_balance) < Number(a.low_balance_threshold));

  return (
    <div>
      <PageHeader title="Caixa de Anúncios" description="Saldo das contas usadas para pagar tráfego, com alerta de reposição." actionLabel="Nova conta" onAction={() => setAccOpen(true)} />

      <MetricsRow items={[
        { label: "Contas", value: String(accounts.length), tone: "primary" },
        { label: "Saldo total", value: `R$ ${totalBalance.toFixed(2)}`, tone: "primary" },
        { label: "Saldo baixo", value: String(lowAccounts.length), tone: lowAccounts.length > 0 ? "warning" : "success" },
      ]} />

      {lowAccounts.length > 0 && (
        <Card className="rounded-3xl border-0 shadow-sm p-4 mb-4 bg-amber-500/10 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700">
            {lowAccounts.length === 1 ? "Uma conta está" : `${lowAccounts.length} contas estão`} com saldo abaixo do limite — considere fazer depósito.
          </p>
        </Card>
      )}

      {accounts.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={Wallet2} title="Nenhuma conta de caixa" description="Cadastre a conta usada para pagar anúncios e acompanhe o saldo." actionLabel="Nova conta" onAction={() => setAccOpen(true)} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map(a => {
            const low = Number(a.current_balance) < Number(a.low_balance_threshold);
            return (
              <Card key={a.id} className="rounded-3xl border-0 shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">{a.label}</div>
                  {low && <Badge className="bg-rose-500/10 text-rose-600 gap-1"><AlertTriangle className="h-3 w-3" />Fazer depósito</Badge>}
                </div>
                <div className="text-2xl font-bold text-primary">R$ {Number(a.current_balance).toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Limite mínimo: R$ {Number(a.low_balance_threshold).toFixed(2)}</div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="rounded-2xl gap-1" onClick={() => setTxOpen(a)}><Plus className="h-3.5 w-3.5" />Registrar transação</Button>
                  <Button size="sm" variant="ghost" onClick={() => removeAccount(a.id)} className="text-destructive hover:text-destructive ml-auto"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={accOpen} onOpenChange={setAccOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Nova conta de caixa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome da conta *</Label><Input value={accForm.label} onChange={e => setAccForm({ ...accForm, label: e.target.value })} placeholder="Ex: Conta PJ - Nubank" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Saldo inicial (R$)</Label><Input type="number" value={accForm.current_balance} onChange={e => setAccForm({ ...accForm, current_balance: e.target.value })} /></div>
              <div><Label>Alerta abaixo de (R$)</Label><Input type="number" value={accForm.low_balance_threshold} onChange={e => setAccForm({ ...accForm, low_balance_threshold: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setAccOpen(false)}>Cancelar</Button><Button onClick={saveAccount} className="rounded-2xl">Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!txOpen} onOpenChange={(o) => !o && setTxOpen(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Registrar transação — {txOpen?.label}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label>
                <Select value={txForm.type} onValueChange={v => setTxForm({ ...txForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Depósito</SelectItem>
                    <SelectItem value="spend">Gasto</SelectItem>
                    <SelectItem value="adjustment">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valor (R$)</Label><Input type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} /></div>
            </div>
            <div><Label>Observação</Label><Textarea rows={2} value={txForm.note} onChange={e => setTxForm({ ...txForm, note: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setTxOpen(null)}>Cancelar</Button><Button onClick={saveTx} className="rounded-2xl">Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
