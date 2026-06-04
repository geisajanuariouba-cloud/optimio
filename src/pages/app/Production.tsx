import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Factory, Beaker, ListChecks, AlertTriangle, Package as PackageIcon } from "lucide-react";

type RM = {
  id: string; name: string; unit: string; stock: number; min_stock: number;
  current_cost: number; average_cost: number; last_cost: number; supplier_id: string | null;
};
type Product = { id: string; name: string; stock: number | null };
type Recipe = { id: string; product_id: string; raw_material_id: string; quantity: number };
type Order = { id: string; product_id: string; quantity: number; status: string; estimated_cost: number; actual_cost: number; produced_at: string | null; created_at: string };

export default function Production() {
  const { tenantOwnerId } = useTenant();
  const [tab, setTab] = useState("materials");
  const [materials, setMaterials] = useState<RM[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // dialogs
  const [rmOpen, setRmOpen] = useState(false);
  const [rmForm, setRmForm] = useState<Partial<RM>>({ name: "", unit: "un", stock: 0, min_stock: 0, current_cost: 0 });
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyForm, setBuyForm] = useState<{ raw_material_id?: string; quantity: number; unit_cost: number }>({ quantity: 0, unit_cost: 0 });
  const [recOpen, setRecOpen] = useState(false);
  const [recProduct, setRecProduct] = useState<string>("");
  const [recItems, setRecItems] = useState<{ raw_material_id: string; quantity: number }[]>([]);
  const [ordOpen, setOrdOpen] = useState(false);
  const [ordForm, setOrdForm] = useState<{ product_id?: string; quantity: number }>({ quantity: 1 });

  const load = async () => {
    if (!tenantOwnerId) return;
    setLoading(true);
    const [m, p, r, o] = await Promise.all([
      supabase.from("raw_materials" as any).select("*").order("name"),
      supabase.from("products").select("id,name,stock").eq("user_id", tenantOwnerId).is("deleted_at", null).order("name"),
      supabase.from("product_recipes" as any).select("*"),
      supabase.from("production_orders" as any).select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setMaterials((m.data as any) ?? []);
    setProducts((p.data as any) ?? []);
    setRecipes((r.data as any) ?? []);
    setOrders((o.data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantOwnerId]);

  const productById = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);
  const rmById = useMemo(() => Object.fromEntries(materials.map(m => [m.id, m])), [materials]);

  const lowStock = materials.filter(m => m.stock <= m.min_stock && m.min_stock > 0);

  const saveRm = async () => {
    if (!rmForm.name || !tenantOwnerId) return;
    const { error } = await supabase.from("raw_materials" as any).insert({
      user_id: tenantOwnerId,
      name: rmForm.name,
      unit: rmForm.unit || "un",
      stock: Number(rmForm.stock) || 0,
      min_stock: Number(rmForm.min_stock) || 0,
      current_cost: Number(rmForm.current_cost) || 0,
      average_cost: Number(rmForm.current_cost) || 0,
      last_cost: Number(rmForm.current_cost) || 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Matéria-prima criada");
    setRmOpen(false);
    setRmForm({ name: "", unit: "un", stock: 0, min_stock: 0, current_cost: 0 });
    load();
  };

  const savePurchase = async () => {
    if (!buyForm.raw_material_id || !tenantOwnerId) return;
    const { error } = await supabase.from("raw_material_purchases" as any).insert({
      user_id: tenantOwnerId,
      raw_material_id: buyForm.raw_material_id,
      quantity: Number(buyForm.quantity),
      unit_cost: Number(buyForm.unit_cost),
    });
    if (error) return toast.error(error.message);
    toast.success("Compra registrada");
    setBuyOpen(false);
    setBuyForm({ quantity: 0, unit_cost: 0 });
    load();
  };

  const openRecipe = (productId: string) => {
    setRecProduct(productId);
    const current = recipes.filter(r => r.product_id === productId).map(r => ({ raw_material_id: r.raw_material_id, quantity: r.quantity }));
    setRecItems(current.length ? current : [{ raw_material_id: "", quantity: 0 }]);
    setRecOpen(true);
  };

  const saveRecipe = async () => {
    if (!recProduct || !tenantOwnerId) return;
    // wipe and reinsert
    await supabase.from("product_recipes" as any).delete().eq("product_id", recProduct);
    const valid = recItems.filter(i => i.raw_material_id && Number(i.quantity) > 0);
    if (valid.length) {
      const { error } = await supabase.from("product_recipes" as any).insert(
        valid.map(i => ({ user_id: tenantOwnerId, product_id: recProduct, raw_material_id: i.raw_material_id, quantity: Number(i.quantity) }))
      );
      if (error) return toast.error(error.message);
    }
    toast.success("Receita salva");
    setRecOpen(false);
    load();
  };

  const estimateCost = (productId: string, qty: number) => {
    const rs = recipes.filter(r => r.product_id === productId);
    return rs.reduce((sum, r) => sum + (rmById[r.raw_material_id]?.average_cost || 0) * r.quantity * qty, 0);
  };

  const checkAvailability = (productId: string, qty: number) => {
    const rs = recipes.filter(r => r.product_id === productId);
    const missing: { name: string; need: number; have: number }[] = [];
    for (const r of rs) {
      const rm = rmById[r.raw_material_id];
      const need = r.quantity * qty;
      if (!rm || rm.stock < need) missing.push({ name: rm?.name || "?", need, have: rm?.stock || 0 });
    }
    return missing;
  };

  const createOrder = async () => {
    if (!ordForm.product_id || !tenantOwnerId) return;
    const estimated = estimateCost(ordForm.product_id, ordForm.quantity);
    const { error } = await supabase.from("production_orders" as any).insert({
      user_id: tenantOwnerId,
      product_id: ordForm.product_id,
      quantity: Number(ordForm.quantity),
      estimated_cost: estimated,
      status: "draft",
    });
    if (error) return toast.error(error.message);
    toast.success("Ordem criada");
    setOrdOpen(false);
    setOrdForm({ quantity: 1 });
    load();
  };

  const executeOrder = async (id: string) => {
    const { data, error } = await supabase.rpc("execute_production_order" as any, { _order_id: id });
    if (error) return toast.error(error.message);
    const res = data as any;
    if (res?.ok === false) {
      const list = (res.shortage as any[]).map(s => `${s.name}: precisa ${s.need}, tem ${s.have}`).join(" • ");
      toast.error(`Estoque insuficiente — ${list}`);
      return;
    }
    toast.success(`Produzido. Custo: R$ ${Number(res?.total_cost || 0).toFixed(2)}`);
    load();
  };

  // Planejamento: quantos podem ser produzidos por produto
  const planning = useMemo(() => {
    const byProduct: { product: Product; max: number; bottleneck?: string; recipeCount: number }[] = [];
    for (const p of products) {
      const rs = recipes.filter(r => r.product_id === p.id);
      if (!rs.length) continue;
      let max = Infinity;
      let bottleneck = "";
      for (const r of rs) {
        const rm = rmById[r.raw_material_id];
        if (!rm || r.quantity <= 0) { max = 0; bottleneck = rm?.name || "?"; break; }
        const can = Math.floor(rm.stock / r.quantity);
        if (can < max) { max = can; bottleneck = rm.name; }
      }
      byProduct.push({ product: p, max: Number.isFinite(max) ? max : 0, bottleneck, recipeCount: rs.length });
    }
    return byProduct.sort((a, b) => a.max - b.max);
  }, [products, recipes, rmById]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Factory className="h-6 w-6 text-primary" /> Produção</h1>
          <p className="text-sm text-muted-foreground">Matérias-primas, receitas técnicas, ordens e planejamento.</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-3 flex items-center gap-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>{lowStock.length} matéria(s)-prima(s) abaixo ou no mínimo: {lowStock.slice(0,3).map(m => m.name).join(", ")}{lowStock.length > 3 ? "…" : ""}</span>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="materials"><Beaker className="h-4 w-4 mr-1" />Matérias-primas</TabsTrigger>
          <TabsTrigger value="recipes"><ListChecks className="h-4 w-4 mr-1" />Receitas</TabsTrigger>
          <TabsTrigger value="orders"><PackageIcon className="h-4 w-4 mr-1" />Ordens</TabsTrigger>
          <TabsTrigger value="planning">Planejamento</TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Dialog open={rmOpen} onOpenChange={setRmOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova matéria-prima</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova matéria-prima</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome</Label><Input value={rmForm.name || ""} onChange={e => setRmForm({ ...rmForm, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Unidade</Label><Input value={rmForm.unit || ""} onChange={e => setRmForm({ ...rmForm, unit: e.target.value })} placeholder="g, ml, un" /></div>
                    <div><Label>Custo atual</Label><Input type="number" step="0.01" value={rmForm.current_cost || 0} onChange={e => setRmForm({ ...rmForm, current_cost: Number(e.target.value) })} /></div>
                    <div><Label>Estoque inicial</Label><Input type="number" value={rmForm.stock || 0} onChange={e => setRmForm({ ...rmForm, stock: Number(e.target.value) })} /></div>
                    <div><Label>Estoque mínimo</Label><Input type="number" value={rmForm.min_stock || 0} onChange={e => setRmForm({ ...rmForm, min_stock: Number(e.target.value) })} /></div>
                  </div>
                </div>
                <DialogFooter><Button onClick={saveRm}>Salvar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
              <DialogTrigger asChild><Button variant="outline">Registrar compra</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Compra de matéria-prima</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Matéria-prima</Label>
                    <Select value={buyForm.raw_material_id} onValueChange={v => setBuyForm({ ...buyForm, raw_material_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>{materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Quantidade</Label><Input type="number" step="0.01" value={buyForm.quantity} onChange={e => setBuyForm({ ...buyForm, quantity: Number(e.target.value) })} /></div>
                    <div><Label>Custo unitário</Label><Input type="number" step="0.01" value={buyForm.unit_cost} onChange={e => setBuyForm({ ...buyForm, unit_cost: Number(e.target.value) })} /></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Atualiza estoque, custo médio e último custo.</p>
                </div>
                <DialogFooter><Button onClick={savePurchase}>Registrar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr><th className="p-3">Nome</th><th className="p-3">Unidade</th><th className="p-3 text-right">Estoque</th><th className="p-3 text-right">Mínimo</th><th className="p-3 text-right">Custo médio</th><th className="p-3 text-right">Último custo</th></tr>
                </thead>
                <tbody>
                  {materials.map(m => (
                    <tr key={m.id} className="border-t">
                      <td className="p-3 font-medium">{m.name}</td>
                      <td className="p-3">{m.unit}</td>
                      <td className="p-3 text-right">
                        {m.stock}
                        {m.min_stock > 0 && m.stock <= m.min_stock && <Badge variant="destructive" className="ml-2">Baixo</Badge>}
                      </td>
                      <td className="p-3 text-right">{m.min_stock}</td>
                      <td className="p-3 text-right">R$ {Number(m.average_cost).toFixed(2)}</td>
                      <td className="p-3 text-right">R$ {Number(m.last_cost).toFixed(2)}</td>
                    </tr>
                  ))}
                  {!loading && !materials.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma matéria-prima cadastrada.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipes" className="space-y-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr><th className="p-3">Produto</th><th className="p-3 text-right">Itens</th><th className="p-3 text-right">Custo unitário estimado</th><th className="p-3"></th></tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const items = recipes.filter(r => r.product_id === p.id);
                    const cost = estimateCost(p.id, 1);
                    return (
                      <tr key={p.id} className="border-t">
                        <td className="p-3 font-medium">{p.name}</td>
                        <td className="p-3 text-right">{items.length}</td>
                        <td className="p-3 text-right">R$ {cost.toFixed(2)}</td>
                        <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => openRecipe(p.id)}>Editar receita</Button></td>
                      </tr>
                    );
                  })}
                  {!products.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum produto cadastrado.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Dialog open={recOpen} onOpenChange={setRecOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Receita técnica — {productById[recProduct]?.name}</DialogTitle></DialogHeader>
              <div className="space-y-2">
                {recItems.map((it, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>Matéria-prima</Label>
                      <Select value={it.raw_material_id} onValueChange={v => setRecItems(items => items.map((x, i) => i === idx ? { ...x, raw_material_id: v } : x))}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>{materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Label>Quantidade</Label>
                      <Input type="number" step="0.01" value={it.quantity} onChange={e => setRecItems(items => items.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))} />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setRecItems(items => items.filter((_, i) => i !== idx))}>Remover</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setRecItems(items => [...items, { raw_material_id: "", quantity: 0 }])}>
                  <Plus className="h-4 w-4 mr-1" />Adicionar item
                </Button>
              </div>
              <DialogFooter><Button onClick={saveRecipe}>Salvar receita</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex gap-2">
            <Dialog open={ordOpen} onOpenChange={setOrdOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova ordem</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Ordem de produção</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Produto</Label>
                    <Select value={ordForm.product_id} onValueChange={v => setOrdForm({ ...ordForm, product_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>{products.filter(p => recipes.some(r => r.product_id === p.id)).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Quantidade</Label><Input type="number" value={ordForm.quantity} onChange={e => setOrdForm({ ...ordForm, quantity: Number(e.target.value) })} /></div>
                  {ordForm.product_id && ordForm.quantity > 0 && (
                    <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
                      <div>Custo estimado: <b>R$ {estimateCost(ordForm.product_id, ordForm.quantity).toFixed(2)}</b></div>
                      {(() => {
                        const miss = checkAvailability(ordForm.product_id!, ordForm.quantity);
                        if (!miss.length) return <div className="text-green-600">Estoque suficiente para produção.</div>;
                        return <div className="text-amber-600">Faltam: {miss.map(m => `${m.name} (precisa ${m.need}, tem ${m.have})`).join(" • ")}</div>;
                      })()}
                    </div>
                  )}
                </div>
                <DialogFooter><Button onClick={createOrder}>Criar ordem</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr><th className="p-3">Produto</th><th className="p-3 text-right">Qtd</th><th className="p-3">Status</th><th className="p-3 text-right">Custo est.</th><th className="p-3 text-right">Custo real</th><th className="p-3"></th></tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-t">
                      <td className="p-3 font-medium">{productById[o.product_id]?.name || "—"}</td>
                      <td className="p-3 text-right">{o.quantity}</td>
                      <td className="p-3"><Badge variant={o.status === "done" ? "default" : "secondary"}>{o.status === "done" ? "Produzido" : "Rascunho"}</Badge></td>
                      <td className="p-3 text-right">R$ {Number(o.estimated_cost).toFixed(2)}</td>
                      <td className="p-3 text-right">R$ {Number(o.actual_cost).toFixed(2)}</td>
                      <td className="p-3 text-right">
                        {o.status !== "done" && <Button size="sm" onClick={() => executeOrder(o.id)}>Executar</Button>}
                      </td>
                    </tr>
                  ))}
                  {!orders.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma ordem ainda.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Quanto posso produzir agora</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr><th className="p-3">Produto</th><th className="p-3 text-right">Itens na receita</th><th className="p-3 text-right">Produção máxima</th><th className="p-3">Gargalo</th></tr>
                </thead>
                <tbody>
                  {planning.map(p => (
                    <tr key={p.product.id} className="border-t">
                      <td className="p-3 font-medium">{p.product.name}</td>
                      <td className="p-3 text-right">{p.recipeCount}</td>
                      <td className="p-3 text-right">{p.max}</td>
                      <td className="p-3">{p.bottleneck || "—"}</td>
                    </tr>
                  ))}
                  {!planning.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Cadastre receitas técnicas em produtos para planejar.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
