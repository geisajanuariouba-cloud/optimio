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
import { Plus, Factory, Beaker, ListChecks, AlertTriangle, Package as PackageIcon, Search } from "lucide-react";

type RM = {
  id: string; name: string; unit: string; stock: number; min_stock: number;
  current_cost: number; average_cost: number; last_cost: number; supplier_id: string | null;
};
type Product = { id: string; name: string; stock: number | null };
type Recipe = { id: string; product_id: string; raw_material_id: string; quantity: number; yield_quantity?: number };
type Order = { id: string; product_id: string; quantity: number; status: string; estimated_cost: number; actual_cost: number; produced_at: string | null; created_at: string; assignee_user_id?: string | null; due_date?: string | null; notes?: string | null; department?: string | null; priority?: string | null; checklist?: { text: string; done: boolean }[] };

const PRIORITIES: { value: string; label: string; cls: string }[] = [
  { value: "low", label: "Baixa", cls: "bg-slate-500/15 text-slate-600" },
  { value: "medium", label: "Média", cls: "bg-blue-500/15 text-blue-600" },
  { value: "high", label: "Alta", cls: "bg-amber-500/15 text-amber-700" },
  { value: "urgent", label: "Urgente", cls: "bg-rose-500/15 text-rose-600" },
];
type Member = { member_user_id: string; email: string; role: string };

export default function Production() {
  const { tenantOwnerId } = useTenant();
  const [tab, setTab] = useState("materials");
  const [materials, setMaterials] = useState<RM[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // dialogs
  const [rmOpen, setRmOpen] = useState(false);
  const [rmForm, setRmForm] = useState<Partial<RM>>({ name: "", unit: "un", stock: 0, min_stock: 0, current_cost: 0 });
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyForm, setBuyForm] = useState<{ raw_material_id?: string; quantity: number; unit_cost: number }>({ quantity: 0, unit_cost: 0 });
  const [recOpen, setRecOpen] = useState(false);
  const [recProduct, setRecProduct] = useState<string>("");
  const [recYield, setRecYield] = useState<number>(1);
  const [recItems, setRecItems] = useState<{ raw_material_id: string; quantity: number }[]>([]);
  const [recSearch, setRecSearch] = useState("");
  const [recFilter, setRecFilter] = useState<"all" | "with" | "without">("all");
  const [ordOpen, setOrdOpen] = useState(false);
  const [ordForm, setOrdForm] = useState<{ product_id?: string; quantity: number; assignee_user_id?: string; due_date?: string; notes?: string; department?: string; priority: string; checklist: { text: string; done: boolean }[] }>({ quantity: 1, priority: "medium", checklist: [] });
  const [newChecklistItem, setNewChecklistItem] = useState("");

  const load = async () => {
    if (!tenantOwnerId) return;
    setLoading(true);
    const [m, p, r, o, tm] = await Promise.all([
      supabase.from("raw_materials" as any).select("*").order("name"),
      supabase.from("products").select("id,name,stock").eq("user_id", tenantOwnerId).is("deleted_at", null).order("name"),
      supabase.from("product_recipes" as any).select("*"),
      supabase.from("production_orders" as any).select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("team_members").select("member_user_id,email,role").eq("owner_user_id", tenantOwnerId).eq("status", "active"),
    ]);
    setMaterials((m.data as any) ?? []);
    setProducts((p.data as any) ?? []);
    setRecipes((r.data as any) ?? []);
    setOrders((o.data as any) ?? []);
    setMembers((tm.data as any) ?? []);
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
    const rs = recipes.filter(r => r.product_id === productId);
    setRecItems(rs.length ? rs.map(r => ({ raw_material_id: r.raw_material_id, quantity: r.quantity })) : [{ raw_material_id: "", quantity: 0 }]);
    setRecYield(Number(rs[0]?.yield_quantity ?? 1) || 1);
    setRecOpen(true);
  };

  const saveRecipe = async () => {
    if (!recProduct || !tenantOwnerId) return;
    await supabase.from("product_recipes" as any).delete().eq("product_id", recProduct);
    const valid = recItems.filter(i => i.raw_material_id && Number(i.quantity) > 0);
    const safeYield = Math.max(0.0001, Number(recYield) || 1);
    if (valid.length) {
      const { error } = await supabase.from("product_recipes" as any).insert(
        valid.map(i => ({ user_id: tenantOwnerId, product_id: recProduct, raw_material_id: i.raw_material_id, quantity: Number(i.quantity), yield_quantity: safeYield }))
      );
      if (error) return toast.error(error.message);
    }
    toast.success("Receita salva");
    setRecOpen(false);
    load();
  };

  const recipeYield = (productId: string) => {
    const r = recipes.find(x => x.product_id === productId);
    const y = Number(r?.yield_quantity ?? 1);
    return y > 0 ? y : 1;
  };

  // Custo total dos insumos para produzir `qty` lotes (cada lote rende `yield_quantity` unidades).
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
      assignee_user_id: ordForm.assignee_user_id || null,
      due_date: ordForm.due_date || null,
      notes: ordForm.notes || null,
      department: ordForm.department || null,
      priority: ordForm.priority || "medium",
      checklist: ordForm.checklist ?? [],
    });
    if (error) return toast.error(error.message);
    toast.success("Ordem criada");
    setOrdOpen(false);
    setOrdForm({ quantity: 1, priority: "medium", checklist: [] });
    setNewChecklistItem("");
    load();
  };

  const toggleChecklistItem = async (order: Order, idx: number) => {
    const cl = (order.checklist ?? []).map((c, i) => i === idx ? { ...c, done: !c.done } : c);
    const { error } = await supabase.from("production_orders" as any).update({ checklist: cl }).eq("id", order.id);
    if (error) return toast.error(error.message);
    load();
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Excluir esta ordem de produção?")) return;
    const { error } = await supabase.from("production_orders" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Ordem excluída");
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

  const filteredRecipeProducts = useMemo(() => {
    const q = recSearch.toLowerCase().trim();
    return products.filter(p => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      const hasRecipe = recipes.some(r => r.product_id === p.id);
      if (recFilter === "with" && !hasRecipe) return false;
      if (recFilter === "without" && hasRecipe) return false;
      return true;
    });
  }, [products, recipes, recSearch, recFilter]);

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
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={recSearch} onChange={e => setRecSearch(e.target.value)} placeholder="Buscar produto…" className="pl-9 h-9" />
            </div>
            <Select value={recFilter} onValueChange={v => setRecFilter(v as any)}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                <SelectItem value="with">Com receita</SelectItem>
                <SelectItem value="without">Sem receita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr><th className="p-3">Produto</th><th className="p-3 text-right">Insumos</th><th className="p-3 text-right">Custo/unidade estimado</th><th className="p-3"></th></tr>
                </thead>
                <tbody>
                  {filteredRecipeProducts.map(p => {
                    const items = recipes.filter(r => r.product_id === p.id);
                    const cost = estimateCost(p.id, 1);
                    const yld = recipeYield(p.id);
                    const unitCost = items.length ? cost / yld : 0;
                    return (
                      <tr key={p.id} className="border-t">
                        <td className="p-3 font-medium">{p.name}</td>
                        <td className="p-3 text-right">
                          {items.length ? <Badge variant="outline">{items.length}</Badge> : <span className="text-muted-foreground text-xs">sem receita</span>}
                        </td>
                        <td className="p-3 text-right">{items.length ? `R$ ${unitCost.toFixed(2)}` : "—"}</td>
                        <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => openRecipe(p.id)}>Editar receita</Button></td>
                      </tr>
                    );
                  })}
                  {!filteredRecipeProducts.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum produto encontrado.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Dialog open={recOpen} onOpenChange={setRecOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Receita técnica — {productById[recProduct]?.name}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/40 p-3 flex items-end gap-3">
                  <div className="flex-1">
                    <Label>Rendimento por lote (unidades produzidas)</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Quantas unidades do produto final cada execução desta receita gera.</p>
                  </div>
                  <Input type="number" step="0.01" min={0.0001} className="w-32" value={recYield} onChange={e => setRecYield(Number(e.target.value))} />
                </div>
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
                {recProduct && (
                  <div className="text-xs text-muted-foreground">
                    Custo por unidade final: <b>R$ {(estimateCost(recProduct, 1) / Math.max(0.0001, Number(recYield) || 1)).toFixed(2)}</b>
                  </div>
                )}
              </div>
              <DialogFooter><Button onClick={saveRecipe}>Salvar receita</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex gap-2">
            <Dialog open={ordOpen} onOpenChange={setOrdOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova ordem</Button></DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Ordem de produção</DialogTitle></DialogHeader>
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                  <div>
                    <Label>Produto</Label>
                    <Select value={ordForm.product_id} onValueChange={v => setOrdForm({ ...ordForm, product_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>{products.filter(p => recipes.some(r => r.product_id === p.id)).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Lotes</Label><Input type="number" min={1} value={ordForm.quantity} onChange={e => setOrdForm({ ...ordForm, quantity: Number(e.target.value) })} /></div>
                    <div><Label>Prazo</Label><Input type="date" value={ordForm.due_date ?? ""} onChange={e => setOrdForm({ ...ordForm, due_date: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Prioridade</Label>
                      <Select value={ordForm.priority} onValueChange={v => setOrdForm({ ...ordForm, priority: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Departamento</Label><Input value={ordForm.department ?? ""} onChange={e => setOrdForm({ ...ordForm, department: e.target.value })} placeholder="Ex.: Costura, Montagem" /></div>
                  </div>
                  <div>
                    <Label>Responsável</Label>
                    <Select value={ordForm.assignee_user_id ?? "none"} onValueChange={v => setOrdForm({ ...ordForm, assignee_user_id: v === "none" ? undefined : v })}>
                      <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem responsável</SelectItem>
                        {members.map(m => <SelectItem key={m.member_user_id} value={m.member_user_id}>{m.email} ({m.role})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Input value={ordForm.notes ?? ""} onChange={e => setOrdForm({ ...ordForm, notes: e.target.value })} placeholder="Ex.: prioridade alta, embalar em caixa…" />
                  </div>
                  <div>
                    <Label>Checklist</Label>
                    <div className="space-y-1 mt-1">
                      {ordForm.checklist.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="flex-1">• {c.text}</span>
                          <Button variant="ghost" size="sm" onClick={() => setOrdForm({ ...ordForm, checklist: ordForm.checklist.filter((_, j) => j !== i) })}>×</Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} placeholder="Novo item…" onKeyDown={e => {
                          if (e.key === "Enter" && newChecklistItem.trim()) {
                            setOrdForm({ ...ordForm, checklist: [...ordForm.checklist, { text: newChecklistItem.trim(), done: false }] });
                            setNewChecklistItem("");
                          }
                        }} />
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          if (!newChecklistItem.trim()) return;
                          setOrdForm({ ...ordForm, checklist: [...ordForm.checklist, { text: newChecklistItem.trim(), done: false }] });
                          setNewChecklistItem("");
                        }}>Adicionar</Button>
                      </div>
                    </div>
                  </div>
                  {ordForm.product_id && ordForm.quantity > 0 && (
                    <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
                      <div>Custo estimado: <b>R$ {estimateCost(ordForm.product_id, ordForm.quantity).toFixed(2)}</b></div>
                      <div className="text-xs text-muted-foreground">Produz {ordForm.quantity * recipeYield(ordForm.product_id)} unidade(s) (rendimento {recipeYield(ordForm.product_id)}/lote).</div>
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
                  <tr><th className="p-3">Produto</th><th className="p-3 text-right">Lotes</th><th className="p-3">Status</th><th className="p-3">Responsável</th><th className="p-3">Prazo</th><th className="p-3">Checklist</th><th className="p-3 text-right">Custo est.</th><th className="p-3 text-right">Custo real</th><th className="p-3"></th></tr>
                </thead>
                <tbody>
                  {orders.map(o => {
                    const member = members.find(m => m.member_user_id === o.assignee_user_id);
                    const cl = o.checklist ?? [];
                    const doneCount = cl.filter(c => c.done).length;
                    const overdue = o.due_date && o.status !== "done" && new Date(o.due_date) < new Date(new Date().toDateString());
                    return (
                      <tr key={o.id} className="border-t align-top">
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            {productById[o.product_id]?.name || "—"}
                            {(() => {
                              const pr = PRIORITIES.find(x => x.value === (o.priority ?? "medium"));
                              return pr ? <Badge className={pr.cls}>{pr.label}</Badge> : null;
                            })()}
                          </div>
                          {o.department && <div className="text-xs text-muted-foreground mt-0.5">Depto: {o.department}</div>}
                          {o.notes && <div className="text-xs text-muted-foreground mt-0.5">{o.notes}</div>}
                        </td>
                        <td className="p-3 text-right">{o.quantity}</td>
                        <td className="p-3"><Badge variant={o.status === "done" ? "default" : "secondary"}>{o.status === "done" ? "Produzido" : "Rascunho"}</Badge></td>
                        <td className="p-3 text-xs">{member?.email ?? "—"}</td>
                        <td className="p-3 text-xs">
                          {o.due_date ? <span className={overdue ? "text-rose-600 font-medium" : ""}>{new Date(o.due_date).toLocaleDateString()}</span> : "—"}
                        </td>
                        <td className="p-3 text-xs">
                          {cl.length ? (
                            <div className="space-y-0.5">
                              <div className="text-muted-foreground">{doneCount}/{cl.length}</div>
                              {cl.map((c, i) => (
                                <label key={i} className="flex items-center gap-1 cursor-pointer">
                                  <input type="checkbox" checked={c.done} onChange={() => toggleChecklistItem(o, i)} disabled={o.status === "done"} />
                                  <span className={c.done ? "line-through text-muted-foreground" : ""}>{c.text}</span>
                                </label>
                              ))}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="p-3 text-right">R$ {Number(o.estimated_cost).toFixed(2)}</td>
                        <td className="p-3 text-right">R$ {Number(o.actual_cost).toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <div className="flex gap-1 justify-end">
                            {o.status !== "done" && <Button size="sm" onClick={() => executeOrder(o.id)}>Executar</Button>}
                            {o.status !== "done" && <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => deleteOrder(o.id)}>Excluir</Button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!orders.length && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Nenhuma ordem ainda.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          {/* Resumo visual */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card><CardContent className="py-3 text-center"><div className="text-xs text-muted-foreground mb-1">Produtos com receita</div><div className="text-2xl font-bold text-primary">{planning.length}</div></CardContent></Card>
            <Card><CardContent className="py-3 text-center"><div className="text-xs text-muted-foreground mb-1">Sem receita</div><div className="text-2xl font-bold text-amber-500">{products.filter(p => !recipes.some(r => r.product_id === p.id)).length}</div></CardContent></Card>
            <Card><CardContent className="py-3 text-center"><div className="text-xs text-muted-foreground mb-1">MP abaixo do mínimo</div><div className="text-2xl font-bold text-rose-500">{lowStock.length}</div></CardContent></Card>
            <Card><CardContent className="py-3 text-center"><div className="text-xs text-muted-foreground mb-1">Custo total estimado</div><div className="text-lg font-bold">R$ {planning.reduce((a, p) => a + estimateCost(p.product.id, 1) / Math.max(0.0001, recipeYield(p.product.id)), 0).toFixed(2)}</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Quanto posso produzir agora</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr><th className="p-3">Produto</th><th className="p-3 text-right">Lotes possíveis</th><th className="p-3 text-right">Unidades finais</th><th className="p-3 text-right">Custo/unidade</th><th className="p-3 text-right">Custo total</th><th className="p-3">Gargalo</th></tr>
                </thead>
                <tbody>
                  {planning.map(p => {
                    const y = recipeYield(p.product.id);
                    const units = p.max * y;
                    const costPerUnit = estimateCost(p.product.id, 1) / Math.max(0.0001, y);
                    return (
                      <tr key={p.product.id} className="border-t">
                        <td className="p-3 font-medium">{p.product.name}</td>
                        <td className="p-3 text-right">{p.max === 0 ? <Badge variant="destructive">0</Badge> : p.max}</td>
                        <td className="p-3 text-right">{units}</td>
                        <td className="p-3 text-right">R$ {costPerUnit.toFixed(2)}</td>
                        <td className="p-3 text-right">R$ {(costPerUnit * units).toFixed(2)}</td>
                        <td className="p-3">
                          {p.bottleneck ? <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{p.bottleneck}</span> : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {!planning.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Cadastre receitas técnicas em produtos para planejar.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Sugestão de compra de MP */}
          {lowStock.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader><CardTitle className="text-base text-amber-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Sugestão de compra — matérias-primas</CardTitle></CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-amber-500/10 text-left">
                    <tr><th className="p-3">Matéria-prima</th><th className="p-3">Unidade</th><th className="p-3 text-right">Estoque</th><th className="p-3 text-right">Mínimo</th><th className="p-3 text-right">Comprar</th><th className="p-3 text-right">Custo est.</th></tr>
                  </thead>
                  <tbody>
                    {lowStock.map(m => {
                      const buy = Math.max(0, m.min_stock * 2 - m.stock);
                      return (
                        <tr key={m.id} className="border-t">
                          <td className="p-3 font-medium">{m.name}</td>
                          <td className="p-3">{m.unit}</td>
                          <td className="p-3 text-right text-rose-600">{m.stock}</td>
                          <td className="p-3 text-right">{m.min_stock}</td>
                          <td className="p-3 text-right"><Badge variant="outline">{buy} {m.unit}</Badge></td>
                          <td className="p-3 text-right">R$ {(buy * Number(m.average_cost || m.current_cost || 0)).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Produtos sem receita */}
          {(() => {
            const noRecipe = products.filter(p => !recipes.some(r => r.product_id === p.id));
            if (!noRecipe.length) return null;
            return (
              <Card>
                <CardHeader><CardTitle className="text-base text-muted-foreground">Produtos sem receita técnica</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="flex flex-wrap gap-2 p-3">
                    {noRecipe.map(p => (
                      <button key={p.id} type="button" onClick={() => openRecipe(p.id)} className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition">{p.name}</button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
