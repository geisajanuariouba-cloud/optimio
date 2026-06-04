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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, TrendingUp, Clock, ShoppingCart } from "lucide-react";

type Product = { id: string; name: string; stock: number; min_stock: number; cost: number; sale_price: number; code: string | null; category: string | null; supplier_id?: string | null };
type Movement = { id: string; product_id: string | null; movement_type: string; quantity: number; reason: string | null; created_at: string };
type FinTx = { items: any; transaction_date: string; type: string };

const DAYS_NO_MOVE = 60;
const DAYS_SALES_WINDOW = 30;

export default function Stock() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [salesTxs, setSalesTxs] = useState<FinTx[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_id: "", movement_type: "in", quantity: 1, reason: "" });

  const load = async () => {
    const sinceSales = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
    const [p, m, f] = await Promise.all([
      supabase.from("products").select("id,name,stock,min_stock,cost,sale_price,code,category,supplier_id").is("deleted_at", null).eq("status", "active").order("name"),
      supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("financial").select("items,transaction_date,type").eq("type", "income").gte("transaction_date", sinceSales),
    ]);
    setProducts((p.data ?? []) as Product[]);
    setMovements((m.data ?? []) as Movement[]);
    setSalesTxs((f.data ?? []) as FinTx[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  // Vendas por produto (90 dias completos para faturamento; recortes locais)
  const salesAgg = useMemo(() => {
    // qty e revenue por product_id em janelas: 30d (vendas recentes) e 90d (ABC)
    const now = Date.now();
    const wnd30 = now - DAYS_SALES_WINDOW * 86_400_000;
    const agg: Record<string, { qty30: number; rev30: number; rev90: number; qty90: number }> = {};
    for (const tx of salesTxs) {
      const t = new Date(tx.transaction_date).getTime();
      const items = Array.isArray(tx.items) ? tx.items : [];
      for (const it of items) {
        const pid = it.product_id || (it.kind === "product" ? it.ref_id : null);
        if (!pid) continue;
        const qty = Number(it.quantity ?? 1);
        const sub = Number(it.subtotal ?? (it.unit_price ?? 0) * qty);
        agg[pid] ??= { qty30: 0, rev30: 0, rev90: 0, qty90: 0 };
        agg[pid].qty90 += qty;
        agg[pid].rev90 += sub;
        if (t >= wnd30) {
          agg[pid].qty30 += qty;
          agg[pid].rev30 += sub;
        }
      }
    }
    return agg;
  }, [salesTxs]);

  const lastMovementByProduct = useMemo(() => {
    const m = new Map<string, string>();
    for (const mv of movements) {
      if (!mv.product_id) continue;
      if (!m.has(mv.product_id)) m.set(mv.product_id, mv.created_at);
    }
    return m;
  }, [movements]);

  const lowStock = useMemo(() => products.filter(p => p.stock <= p.min_stock && p.min_stock > 0), [products]);
  const outOfStock = useMemo(() => products.filter(p => p.stock <= 0), [products]);
  const totalValue = products.reduce((a, p) => a + (Number(p.cost) * Number(p.stock)), 0);

  // Sem movimentação: sem stock_movements há mais de N dias E sem vendas em 90d
  const noMovement = useMemo(() => {
    const cutoff = Date.now() - DAYS_NO_MOVE * 86_400_000;
    return products.filter(p => {
      const last = lastMovementByProduct.get(p.id);
      const lastTs = last ? new Date(last).getTime() : 0;
      const sold = salesAgg[p.id]?.qty90 ?? 0;
      return lastTs < cutoff && sold === 0 && p.stock > 0;
    });
  }, [products, lastMovementByProduct, salesAgg]);

  // Mais vendidos (30d) por quantidade
  const topSellers = useMemo(() => {
    return products
      .map(p => ({ p, ...(salesAgg[p.id] ?? { qty30: 0, rev30: 0, qty90: 0, rev90: 0 }) }))
      .filter(x => x.qty30 > 0)
      .sort((a, b) => b.qty30 - a.qty30)
      .slice(0, 30);
  }, [products, salesAgg]);

  // Curva ABC por faturamento (90d). A=80%, B=15%, C=5%
  const abc = useMemo(() => {
    const list = products
      .map(p => ({ p, rev: salesAgg[p.id]?.rev90 ?? 0 }))
      .filter(x => x.rev > 0)
      .sort((a, b) => b.rev - a.rev);
    const total = list.reduce((a, x) => a + x.rev, 0);
    let acc = 0;
    return list.map(x => {
      acc += x.rev;
      const pct = total > 0 ? acc / total : 0;
      const curve = pct <= 0.8 ? "A" : pct <= 0.95 ? "B" : "C";
      const share = total > 0 ? (x.rev / total) * 100 : 0;
      return { ...x, curve, share };
    });
  }, [products, salesAgg]);

  // Sugestão de compra: produtos com (stock < min OU venda recente alta) → sugere repor para min*3 ou velocidade*30 dias
  const suggestions = useMemo(() => {
    return products
      .map(p => {
        const agg = salesAgg[p.id] ?? { qty30: 0 };
        const velocity = agg.qty30 / DAYS_SALES_WINDOW; // un/dia
        const target30 = Math.ceil(velocity * 30);
        const targetMin = (p.min_stock || 0) > 0 ? p.min_stock * 2 : 0;
        const target = Math.max(target30, targetMin);
        const suggested = Math.max(0, target - p.stock);
        return { p, agg, velocity, suggested, target };
      })
      .filter(x => x.suggested > 0)
      .sort((a, b) => b.suggested - a.suggested);
  }, [products, salesAgg]);

  const save = async () => {
    if (!user || !form.product_id) return toast.error("Selecione produto");
    const qty = form.movement_type === "out" ? -Math.abs(form.quantity) : Math.abs(form.quantity);
    const prod = products.find(p => p.id === form.product_id);
    if (!prod) return;
    await supabase.from("stock_movements").insert({
      user_id: user.id, product_id: form.product_id, movement_type: form.movement_type,
      quantity: qty, reason: form.reason || null,
    });
    await supabase.from("products").update({ stock: Math.max(0, prod.stock + qty) }).eq("id", form.product_id);
    toast.success("Movimento registrado"); setOpen(false); setForm({ product_id: "", movement_type: "in", quantity: 1, reason: "" }); load();
  };

  return (
    <div>
      <PageHeader title="Estoque Inteligente" description="Estoque mínimo, curva ABC, sem movimentação, mais vendidos e sugestão de compra." actionLabel="Nova movimentação" onAction={() => setOpen(true)} />

      <MetricsRow items={[
        { label: "Itens em estoque", value: String(products.length), tone: "primary" },
        { label: "Abaixo do mínimo", value: String(lowStock.length), tone: lowStock.length > 0 ? "warning" : "primary" },
        { label: "Ruptura (zerados)", value: String(outOfStock.length), tone: outOfStock.length > 0 ? "danger" : "primary" },
        { label: "Valor em estoque", value: `R$ ${totalValue.toFixed(2)}`, tone: "success" },
      ]} />

      <Tabs defaultValue="low">
        <TabsList className="rounded-2xl mb-4 flex-wrap h-auto">
          <TabsTrigger value="low"><AlertTriangle className="h-3.5 w-3.5 mr-1" />Abaixo do mínimo ({lowStock.length})</TabsTrigger>
          <TabsTrigger value="nomove"><Clock className="h-3.5 w-3.5 mr-1" />Sem movimentação ({noMovement.length})</TabsTrigger>
          <TabsTrigger value="top"><TrendingUp className="h-3.5 w-3.5 mr-1" />Mais vendidos ({topSellers.length})</TabsTrigger>
          <TabsTrigger value="abc">Curva ABC</TabsTrigger>
          <TabsTrigger value="suggest"><ShoppingCart className="h-3.5 w-3.5 mr-1" />Sugestão de compra ({suggestions.length})</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="low">
          <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border overflow-hidden">
            {lowStock.length === 0 && <div className="p-10 text-center text-muted-foreground text-sm">Nenhum produto abaixo do mínimo.</div>}
            {lowStock.map(p => (
              <div key={p.id} className="p-3 flex items-center gap-3 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.code ?? "—"} · mín. {p.min_stock}</div>
                </div>
                <Badge className="bg-amber-500/15 text-amber-700">{p.stock} un.</Badge>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="nomove">
          <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border overflow-hidden">
            {noMovement.length === 0 && <div className="p-10 text-center text-muted-foreground text-sm">Todos os produtos tiveram movimentação recente.</div>}
            {noMovement.map(p => {
              const last = lastMovementByProduct.get(p.id);
              return (
                <div key={p.id} className="p-3 flex items-center gap-3 text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.code ?? "—"} · última mov.: {last ? new Date(last).toLocaleDateString("pt-BR") : "nunca"}
                    </div>
                  </div>
                  <Badge variant="outline">{p.stock} un.</Badge>
                  <span className="text-xs text-muted-foreground w-24 text-right">R$ {(Number(p.cost) * p.stock).toFixed(2)}</span>
                </div>
              );
            })}
          </Card>
        </TabsContent>

        <TabsContent value="top">
          <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border overflow-hidden">
            {topSellers.length === 0 && <div className="p-10 text-center text-muted-foreground text-sm">Sem vendas registradas nos últimos {DAYS_SALES_WINDOW} dias.</div>}
            {topSellers.map(({ p, qty30, rev30 }, i) => (
              <div key={p.id} className="p-3 flex items-center gap-3 text-sm">
                <Badge className="bg-primary/15 text-primary">{i + 1}º</Badge>
                <div className="flex-1">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{qty30} un. vendidas · estoque {p.stock}</div>
                </div>
                <span className="font-semibold text-primary">R$ {rev30.toFixed(2)}</span>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="abc">
          <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
            {abc.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">Sem dados de venda para gerar a curva.</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 p-4 border-b">
                  {(["A", "B", "C"] as const).map(curve => {
                    const items = abc.filter(x => x.curve === curve);
                    const total = items.reduce((a, x) => a + x.rev, 0);
                    const color = curve === "A" ? "text-emerald-600 bg-emerald-500/10" : curve === "B" ? "text-amber-600 bg-amber-500/10" : "text-rose-600 bg-rose-500/10";
                    return (
                      <div key={curve} className={`rounded-2xl p-3 ${color}`}>
                        <div className="text-xs opacity-80">Curva {curve}</div>
                        <div className="text-2xl font-bold">{items.length}</div>
                        <div className="text-xs">R$ {total.toFixed(2)}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="divide-y divide-border">
                  {abc.map(x => (
                    <div key={x.p.id} className="p-3 flex items-center gap-3 text-sm">
                      <Badge className={
                        x.curve === "A" ? "bg-emerald-500/15 text-emerald-700" :
                        x.curve === "B" ? "bg-amber-500/15 text-amber-700" :
                        "bg-rose-500/15 text-rose-700"
                      }>{x.curve}</Badge>
                      <div className="flex-1">
                        <div className="font-medium">{x.p.name}</div>
                        <div className="text-xs text-muted-foreground">{x.share.toFixed(1)}% do faturamento</div>
                      </div>
                      <span className="font-semibold text-primary">R$ {x.rev.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="suggest">
          <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
            {suggestions.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">Sem sugestões de compra — estoque adequado para a demanda atual.</div>
            ) : (
              <>
                <div className="p-3 text-xs text-muted-foreground bg-secondary/40 border-b">
                  Cálculo: maior valor entre (velocidade média de vendas × 30 dias) e (estoque mínimo × 2), menos o estoque atual. Apenas sugestão, não gera pedido automaticamente.
                </div>
                <div className="divide-y divide-border">
                  {suggestions.map(({ p, agg, velocity, suggested, target }) => (
                    <div key={p.id} className="p-3 flex items-center gap-3 text-sm flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.code ?? "—"} · venda 30d: {agg.qty30} un. ({velocity.toFixed(2)}/dia)
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="block">Atual: <strong className="text-foreground">{p.stock}</strong></span>
                        <span className="block">Mín: <strong className="text-foreground">{p.min_stock}</strong></span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="block">Alvo: <strong className="text-foreground">{target}</strong></span>
                      </div>
                      <Badge className="bg-primary/15 text-primary text-sm">+ {suggested} un.</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border overflow-hidden">
            {movements.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">Nenhuma movimentação ainda.</div>
            ) : movements.map(m => {
              const prod = products.find(p => p.id === m.product_id);
              return (
                <div key={m.id} className="p-3 flex items-center gap-3 text-sm">
                  {m.quantity >= 0 ? <ArrowDownRight className="h-4 w-4 text-emerald-600" /> : <ArrowUpRight className="h-4 w-4 text-rose-600" />}
                  <div className="flex-1">
                    <div className="font-medium">{prod?.name ?? "Produto removido"}</div>
                    <div className="text-xs text-muted-foreground">{m.reason ?? m.movement_type} · {new Date(m.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                  <Badge variant="outline" className={m.quantity >= 0 ? "text-emerald-600" : "text-rose-600"}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</Badge>
                </div>
              );
            })}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Nova movimentação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Produto</Label>
              <Select value={form.product_id} onValueChange={v => setForm({ ...form, product_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label>
                <Select value={form.movement_type} onValueChange={v => setForm({ ...form, movement_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Entrada</SelectItem>
                    <SelectItem value="out">Saída</SelectItem>
                    <SelectItem value="adjust">Ajuste</SelectItem>
                    <SelectItem value="loss">Perda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Quantidade</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: +e.target.value })} /></div>
            </div>
            <div><Label>Motivo</Label><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} className="rounded-2xl">Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
