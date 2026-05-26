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
import { Boxes, TrendingDown, TrendingUp, AlertTriangle, Sparkles, Plus, ArrowDownRight, ArrowUpRight } from "lucide-react";

type Product = { id: string; name: string; stock: number; min_stock: number; cost: number; sale_price: number; code: string | null; category: string | null };
type Movement = { id: string; product_id: string | null; movement_type: string; quantity: number; reason: string | null; created_at: string };

export default function Stock() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_id: "", movement_type: "in", quantity: 1, reason: "" });

  const load = async () => {
    const [p, m] = await Promise.all([
      supabase.from("products").select("id,name,stock,min_stock,cost,sale_price,code,category").is("deleted_at", null).order("name"),
      supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setProducts((p.data ?? []) as Product[]);
    setMovements((m.data ?? []) as Movement[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const lowStock = products.filter(p => p.stock <= p.min_stock && p.min_stock > 0);
  const outOfStock = products.filter(p => p.stock <= 0);
  const overStock = products.filter(p => p.min_stock > 0 && p.stock > p.min_stock * 5);
  const totalValue = products.reduce((a, p) => a + (Number(p.cost) * Number(p.stock)), 0);

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

  const suggestRestock = (p: Product) => {
    const target = (p.min_stock || 5) * 3;
    const need = Math.max(0, target - p.stock);
    return need;
  };

  return (
    <div>
      <PageHeader title="Estoque Inteligente" description="Giro, ruptura, ressuprimento e análise por IA." actionLabel="Nova movimentação" onAction={() => setOpen(true)} />

      <MetricsRow items={[
        { label: "Itens em estoque", value: String(products.length), tone: "primary" },
        { label: "Estoque baixo", value: String(lowStock.length), tone: lowStock.length > 0 ? "warning" : "primary" },
        { label: "Ruptura (zerados)", value: String(outOfStock.length), tone: outOfStock.length > 0 ? "danger" : "primary" },
        { label: "Valor em estoque", value: `R$ ${totalValue.toFixed(2)}`, tone: "success" },
      ]} />

      <Tabs defaultValue="alerts">
        <TabsList className="rounded-2xl mb-4">
          <TabsTrigger value="alerts">Alertas IA</TabsTrigger>
          <TabsTrigger value="all">Todos ({products.length})</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {outOfStock.length > 0 && (
            <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
              <div className="p-4 bg-rose-500/5 border-b border-rose-500/20 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span className="font-medium">Ruptura — produtos zerados</span>
              </div>
              <div className="divide-y divide-border">
                {outOfStock.slice(0, 10).map(p => (
                  <div key={p.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.code ?? "—"} · {p.category ?? "Sem categoria"}</div>
                    </div>
                    <Badge className="bg-primary/10 text-primary"><Sparkles className="h-3 w-3 mr-1" />Comprar {suggestRestock(p)} un.</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {lowStock.length > 0 && (
            <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
              <div className="p-4 bg-amber-500/5 border-b border-amber-500/20 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-600" />
                <span className="font-medium">Estoque baixo</span>
              </div>
              <div className="divide-y divide-border">
                {lowStock.slice(0, 15).map(p => (
                  <div key={p.id} className="p-3 flex items-center gap-3 text-sm">
                    <div className="flex-1 font-medium">{p.name}</div>
                    <span className="text-xs text-muted-foreground">Atual {p.stock} / mín {p.min_stock}</span>
                    <Badge variant="outline">Sugerido: comprar {suggestRestock(p)}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {overStock.length > 0 && (
            <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
              <div className="p-4 bg-blue-500/5 border-b border-blue-500/20 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Excesso de estoque (parado)</span>
              </div>
              <div className="divide-y divide-border">
                {overStock.slice(0, 10).map(p => (
                  <div key={p.id} className="p-3 flex items-center gap-3 text-sm">
                    <div className="flex-1 font-medium">{p.name}</div>
                    <span className="text-xs text-muted-foreground">Em estoque {p.stock}</span>
                    <Badge variant="outline" className="text-blue-600 border-blue-500/30">Promover</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {outOfStock.length === 0 && lowStock.length === 0 && overStock.length === 0 && (
            <Card className="rounded-3xl border-0 shadow-sm p-10 text-center text-muted-foreground text-sm">
              ✨ Tudo em equilíbrio. Sem alertas no momento.
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all">
          <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border overflow-hidden">
            {products.map(p => (
              <div key={p.id} className="p-3 flex items-center gap-3 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.code ?? "—"}</div>
                </div>
                <Badge variant="outline">{p.stock} un.</Badge>
                <span className="text-xs text-muted-foreground w-20 text-right">R$ {Number(p.cost).toFixed(2)}</span>
              </div>
            ))}
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
