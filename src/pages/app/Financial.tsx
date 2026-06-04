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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Wallet, ArrowDownRight, ArrowUpRight, Banknote } from "lucide-react";
import PromoChat from "@/components/app/PromoChat";
import { CategorySelect } from "@/components/app/CategorySelect";
import { PromissoriaFields, PromissoriaData, createPromissoria } from "@/components/app/PromissoriaFields";
import { AddressFields, fullAddress } from "@/components/app/AddressFields";
import ProductPicker, { SaleItem } from "@/components/app/ProductPicker";

type Tx = { id: string; type: string; gross_amount: number; net_amount: number; fee_percent: number | null; description: string | null; payment_method: string | null; category: string | null; transaction_date: string; client_id: string | null; needs_delivery: boolean | null };
type Client = any;
type PM = { id: string; code: string; label: string; installments: number; fee_percent: number; fee_fixed: number; active: boolean };

export default function Financial() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pms, setPms] = useState<PM[]>([]);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<any>({
    type: "income", gross_amount: 0, payment_method_id: "", category: "", description: "",
    transaction_date: today, client_id: "", cash_received: 0, needs_delivery: false,
    delivery_address: null, edit_address: false,
    interest_type: "none", interest_percent: 0, interest_amount: 0,
    total_manual: false, total_override: 0,
  });
  const [items, setItems] = useState<SaleItem[]>([]);
  const [promo, setPromo] = useState<PromissoriaData>({ total_amount: 0, installments_count: 1, first_due: today });

  const load = async () => {
    const [a, b, c] = await Promise.all([
      supabase.from("financial").select("*").order("transaction_date", { ascending: false }).limit(200),
      supabase.from("clients").select("*").is("deleted_at", null).order("full_name"),
      supabase.from("payment_methods").select("*").eq("active", true).order("code").order("installments"),
    ]);
    setTxs((a.data ?? []) as Tx[]);
    setClients(b.data ?? []);
    setPms((c.data ?? []) as PM[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const selectedPM = pms.find(p => p.id === form.payment_method_id);
  const isIncome = form.type === "income";
  const isVendaServico = isIncome && (form.category === "Venda" || form.category === "Serviço");
  const isPromissoria = form.payment_method_id === "promissoria";
  const isCash = selectedPM?.code === "dinheiro";
  const change = isCash && form.cash_received ? Math.max(0, Number(form.cash_received) - Number(form.gross_amount)) : 0;

  const pickerMode: "product" | "service" | "both" =
    form.category === "Serviço" ? "service"
    : form.category === "Venda" ? "product"
    : "both";

  // Juros / Acréscimos
  const interestAmount = useMemo(() => {
    if (!isIncome) return 0;
    if (form.interest_type === "percent") return Math.round((Number(form.gross_amount) * Number(form.interest_percent || 0)) / 100 * 100) / 100;
    if (form.interest_type === "fixed") return Math.round(Number(form.interest_amount || 0) * 100) / 100;
    return 0;
  }, [isIncome, form.interest_type, form.interest_percent, form.interest_amount, form.gross_amount]);

  const totalWithInterest = useMemo(() => Math.round((Number(form.gross_amount) + interestAmount) * 100) / 100, [form.gross_amount, interestAmount]);
  const effectiveTotal = form.total_manual ? Number(form.total_override || 0) : totalWithInterest;

  const calcNet = () => {
    if (isPromissoria) return effectiveTotal;
    if (!isIncome || !selectedPM) return effectiveTotal;
    const fee = (effectiveTotal * Number(selectedPM.fee_percent)) / 100 + Number(selectedPM.fee_fixed);
    return Math.max(0, effectiveTotal - fee);
  };

  const selectedClient = clients.find(c => c.id === form.client_id);

  // Sincroniza gross_amount com soma dos itens (quando há itens)
  const itemsTotal = useMemo(() => items.reduce((a, it) => a + it.unit_price * it.quantity, 0), [items]);
  useEffect(() => {
    if (isVendaServico && items.length > 0 && !form.total_manual) {
      const total = Math.round(itemsTotal * 100) / 100;
      if (Math.abs(Number(form.gross_amount) - total) > 0.005) {
        setForm((f: any) => ({ ...f, gross_amount: total }));
      }
    }
  }, [itemsTotal, isVendaServico, items.length, form.total_manual]);

  const save = async () => {
    if (!user || !form.gross_amount) return toast.error("Informe o valor do lançamento.");
    if (isVendaServico && !form.client_id) return toast.error("Selecione um cliente para Venda/Serviço.");
    if (isVendaServico && items.length === 0) return toast.error("Adicione pelo menos 1 produto ou serviço à venda.");
    if (isPromissoria && !form.client_id) return toast.error("Promissória requer cliente cadastrado.");
    if (isCash && form.cash_received < effectiveTotal) return toast.error("Valor recebido é menor que o total da venda.");

    const baseTotal = effectiveTotal;
    const fee_percent = isPromissoria ? 0 : (selectedPM ? Number(selectedPM.fee_percent) : 0);
    const fee_amount = isIncome ? (baseTotal * fee_percent) / 100 + (selectedPM ? Number(selectedPM.fee_fixed) : 0) : 0;
    const net_amount = isIncome ? Math.max(0, baseTotal - fee_amount) : baseTotal;

    if (isVendaServico && form.edit_address && form.client_id && form.delivery_address) {
      await supabase.from("clients").update(form.delivery_address).eq("id", form.client_id);
    }

    const snapshotItems = isVendaServico ? items.map(it => ({
      kind: it.kind, ref_id: it.ref_id, product_id: it.product_id ?? null,
      name: it.name, image_url: it.image_url ?? null,
      quantity: it.quantity, cost: it.cost,
      margin_percent: it.margin_percent, markup_percent: it.markup_percent, fee_percent: it.fee_percent,
      unit_price: it.unit_price, subtotal: Math.round(it.unit_price * it.quantity * 100) / 100,
      supplier_id: it.supplier_id ?? null,
    })) : [];

    const { data: tx, error } = await supabase.from("financial").insert({
      user_id: user.id, type: form.type,
      gross_amount: baseTotal, net_amount, fee_percent, fee_amount,
      interest_type: isIncome ? form.interest_type : "none",
      interest_percent: isIncome && form.interest_type === "percent" ? Number(form.interest_percent || 0) : 0,
      interest_amount: isIncome ? interestAmount : 0,
      total_with_interest: isIncome ? totalWithInterest : baseTotal,
      total_manual: !!form.total_manual,
      payment_method: isPromissoria ? "promissoria" : (selectedPM?.code ?? null), payment_method_id: isPromissoria ? null : (form.payment_method_id || null),
      installments: isPromissoria ? promo.installments_count : (selectedPM?.installments ?? 1),
      cash_received: isCash ? form.cash_received : null,
      change_amount: isCash ? change : 0,
      category: form.category || null, description: form.description || null,
      transaction_date: form.transaction_date,
      client_id: form.client_id || null,
      needs_delivery: !!form.needs_delivery,
      items: snapshotItems,
    }).select().single();
    if (error) return toast.error(friendlyError(error));

    // Baixa de estoque (produtos e variações)
    if (isVendaServico && tx) {
      for (const it of items) {
        if (it.kind === "service") continue;
        const table = it.kind === "variation" ? "product_variations" : "products";
        const { data: cur } = await supabase.from(table).select("stock").eq("id", it.ref_id).maybeSingle();
        if (cur && typeof (cur as any).stock === "number") {
          const newStock = Math.max(0, Number((cur as any).stock) - it.quantity);
          await supabase.from(table).update({ stock: newStock }).eq("id", it.ref_id);
        }
      }
    }

    if (isPromissoria && tx) {
      try {
        await createPromissoria({ supabase, user_id: user.id, client_id: form.client_id, original_amount: effectiveTotal, data: promo, appointment_id: null, notes: form.description });
      } catch (e: any) { return toast.error(friendlyError(e, "Falha ao criar promissória.")); }
    }

    if (isIncome && isCash && tx) {
      const cashRows = [
        { user_id: user.id, type: "in", amount: Number(effectiveTotal), reason: "venda_dinheiro", description: form.description || null, financial_id: tx.id },
      ];
      if (change > 0) cashRows.push({ user_id: user.id, type: "out", amount: change, reason: "troco", description: `Troco venda ${tx.id.slice(0, 8)}`, financial_id: tx.id });
      await supabase.from("cash_drawer_transactions").insert(cashRows);
    }

    if (isVendaServico && form.needs_delivery && tx) {
      const cli = selectedClient;
      const addr = form.edit_address && form.delivery_address ? form.delivery_address : cli;
      const dest = fullAddress(addr);
      if (dest) {
        await supabase.from("deliveries").insert({
          user_id: user.id, financial_id: tx.id, client_id: form.client_id,
          destination_address: dest, status: "ready", stock_available_at_sale: true,
        });
      }
    }

    toast.success("Lançamento salvo"); setOpen(false);
    setForm({ ...form, gross_amount: 0, description: "", category: "", client_id: "", cash_received: 0, needs_delivery: false });
    setItems([]);
    load();
  };

  const month = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7);
    return txs.filter(t => t.transaction_date.startsWith(m));
  }, [txs]);
  const income = month.filter(t => t.type === "income").reduce((a, t) => a + Number(t.net_amount), 0);
  const expense = month.filter(t => t.type === "expense").reduce((a, t) => a + Number(t.gross_amount), 0);
  const fees = month.filter(t => t.type === "income").reduce((a, t) => a + (t.fee_percent ? (Number(t.gross_amount) * Number(t.fee_percent) / 100) : 0), 0);
  const realProfit = income - expense - fees;

  return (
    <div>
      <PageHeader title="Financeiro" description="Lançamentos com cálculo automático de taxas, troco e logística." actionLabel="Lançamento" onAction={() => setOpen(true)}>
        <Link to="/app/cash-drawer"><Button variant="outline" className="gap-2"><Banknote className="h-4 w-4" />Caixa em Dinheiro</Button></Link>
      </PageHeader>
      <MetricsRow items={[
        { label: "Receita (mês)", value: `R$ ${income.toFixed(2)}`, tone: "success" },
        { label: "Despesas", value: `R$ ${expense.toFixed(2)}`, tone: "warning" },
        { label: "Taxas maquininha", value: `R$ ${fees.toFixed(2)}`, tone: "primary" },
        { label: "Lucro real", value: `R$ ${realProfit.toFixed(2)}`, tone: realProfit >= 0 ? "success" : "danger", hint: "receita − despesas − taxas" },
      ]} />

      <div className="grid lg:grid-cols-[1fr_400px] gap-6 mb-6">
        <div />
        <PromoChat />
      </div>

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        {txs.length === 0 ? (
          <EmptyState icon={Wallet} title="Sem lançamentos" description="Registre uma entrada ou despesa para começar." actionLabel="Lançamento" onAction={() => setOpen(true)} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Método</TableHead><TableHead>Bruto</TableHead>
                <TableHead className="hidden md:table-cell">Taxa</TableHead><TableHead>Líquido</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {txs.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{new Date(t.transaction_date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      {t.type === "income"
                        ? <span className="text-emerald-500 flex items-center gap-1 text-sm font-medium"><ArrowUpRight className="h-3 w-3" />Entrada</span>
                        : <span className="text-rose-500 flex items-center gap-1 text-sm font-medium"><ArrowDownRight className="h-3 w-3" />Saída</span>}
                    </TableCell>
                    <TableCell className="text-sm">{t.description ?? t.category ?? "—"}</TableCell>
                    <TableCell className="text-xs uppercase text-muted-foreground hidden md:table-cell">{t.payment_method ?? "—"}</TableCell>
                    <TableCell className="font-medium">R$ {Number(t.gross_amount).toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs hidden md:table-cell">{t.fee_percent ? `${t.fee_percent}%` : "—"}</TableCell>
                    <TableCell className="font-bold text-primary">R$ {Number(t.net_amount).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category: "" })}>
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
              <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.gross_amount} onChange={(e) => setForm({ ...form, gross_amount: +e.target.value })} disabled={isVendaServico && items.length > 0} /></div>
              <div><Label>Método de pagamento</Label>
                <Select value={form.payment_method_id} onValueChange={(v) => { setForm({ ...form, payment_method_id: v, cash_received: 0 }); if (v === "promissoria") setPromo(p => ({ ...p, total_amount: form.gross_amount })); }}>
                  <SelectTrigger><SelectValue placeholder={pms.length === 0 ? "Cadastre em Métodos" : "Selecione…"} /></SelectTrigger>
                  <SelectContent>
                    {pms.map(p => <SelectItem key={p.id} value={p.id}>{p.label} {p.fee_percent > 0 ? `(${p.fee_percent}%)` : ""}</SelectItem>)}
                    {isIncome && <SelectItem value="promissoria">Promissória</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isPromissoria && isIncome && <PromissoriaFields value={promo} onChange={setPromo} originalAmount={form.gross_amount} />}

            <div>
              <Label>Categoria</Label>
              <CategorySelect kind={isIncome ? "income" : "expense"} value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
            </div>

            {isVendaServico && (
              <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3 space-y-3">
                <ProductPicker items={items} onChange={setItems} mode={pickerMode} includeServices={pickerMode !== "product"} />
                <div>
                  <Label>Cliente *</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>Necessita entrega?</span>
                  <Switch checked={!!form.needs_delivery} onCheckedChange={(v) => setForm({ ...form, needs_delivery: v, delivery_address: selectedClient })} />
                </label>
                {form.needs_delivery && selectedClient && (
                  <div className="text-xs space-y-2">
                    <div className="text-muted-foreground">Endereço atual: <span className="text-foreground">{fullAddress(selectedClient) || "Não cadastrado"}</span></div>
                    <label className="flex items-center gap-2">
                      <Switch checked={!!form.edit_address} onCheckedChange={(v) => setForm({ ...form, edit_address: v, delivery_address: selectedClient })} />
                      Editar endereço (atualiza no cadastro)
                    </label>
                    {form.edit_address && (
                      <AddressFields value={form.delivery_address ?? {}} onChange={(v) => setForm({ ...form, delivery_address: v })} />
                    )}
                  </div>
                )}
              </div>
            )}

            {isCash && isIncome && (
              <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor recebido (R$)</Label><Input type="number" step="0.01" value={form.cash_received} onChange={(e) => setForm({ ...form, cash_received: +e.target.value })} /></div>
                  <div className="flex items-end">
                    <div className="text-sm">Troco: <strong className="text-primary">R$ {change.toFixed(2)}</strong></div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">O troco é descontado automaticamente do Caixa em Dinheiro.</p>
              </div>
            )}

            {(selectedPM || isPromissoria) && isIncome && (
              <div className="text-xs text-muted-foreground bg-secondary/50 rounded-xl p-2">
                Líquido: <strong className="text-primary text-sm">R$ {calcNet().toFixed(2)}</strong>{isPromissoria ? ` · Promissória ${promo.installments_count}×` : ` · Taxa ${selectedPM?.fee_percent}% ${selectedPM && selectedPM.installments > 1 ? `· ${selectedPM.installments}×` : ""}`}
              </div>
            )}

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
