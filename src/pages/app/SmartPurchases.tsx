import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, AlertTriangle, Beaker, Factory } from "lucide-react";
import { Link } from "react-router-dom";

type Product = { id: string; name: string; stock: number | null; min_stock: number | null; cost: number | null; supplier_id: string | null };
type Mov = { product_id: string; quantity: number; type: string; created_at: string };
type Recipe = { product_id: string; raw_material_id: string; quantity: number; yield_quantity?: number };
type RM = { id: string; name: string; unit: string; stock: number; min_stock: number; average_cost: number; last_cost: number };

export default function SmartPurchases() {
  const { tenantOwnerId, hasModule } = useTenant();
  const productionOn = hasModule("production");
  const [products, setProducts] = useState<Product[]>([]);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [materials, setMaterials] = useState<RM[]>([]);
  const [target, setTarget] = useState(45);

  const load = async () => {
    if (!tenantOwnerId) return;
    const since = new Date(Date.now() - 90 * 86400e3).toISOString();
    const [p, m, r, rm] = await Promise.all([
      supabase.from("products").select("id,name,stock,min_stock,cost,supplier_id").eq("user_id", tenantOwnerId).is("deleted_at", null).eq("status", "active").limit(1000),
      supabase.from("stock_movements").select("product_id,quantity,type,created_at").eq("user_id", tenantOwnerId).gte("created_at", since),
      productionOn ? supabase.from("product_recipes" as any).select("product_id,raw_material_id,quantity,yield_quantity").eq("user_id", tenantOwnerId) : Promise.resolve({ data: [] }),
      productionOn ? supabase.from("raw_materials" as any).select("id,name,unit,stock,min_stock,average_cost,last_cost").eq("user_id", tenantOwnerId).order("name") : Promise.resolve({ data: [] }),
    ]);
    setProducts((p.data as any) ?? []);
    setMovs((m.data as any) ?? []);
    setRecipes((r.data as any) ?? []);
    setMaterials((rm.data as any) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantOwnerId, productionOn]);

  const manufacturedIds = useMemo(() => new Set(recipes.map(r => r.product_id)), [recipes]);

  const baseSuggestions = useMemo(() => {
    return products.map(p => {
      const outflow = movs
        .filter(m => m.product_id === p.id && (m.type === "out" || m.type === "sale"))
        .reduce((a, b) => a + Math.abs(Number(b.quantity || 0)), 0);
      const dailyAvg = outflow / 90;
      const stock = Number(p.stock || 0);
      const daysLeft = dailyAvg > 0 ? stock / dailyAvg : Infinity;
      const targetStock = Math.ceil(dailyAvg * target);
      const buyQty = Math.max(0, targetStock - stock);
      const isManufactured = manufacturedIds.has(p.id);
      return { p, dailyAvg, daysLeft, buyQty, totalCost: buyQty * Number(p.cost || 0), isManufactured };
    })
      .filter(x => x.buyQty > 0 || (x.p.min_stock && Number(x.p.stock || 0) <= Number(x.p.min_stock)))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [products, movs, target, manufacturedIds]);

  const resaleSuggestions = baseSuggestions.filter(s => !s.isManufactured);
  const produceSuggestions = baseSuggestions.filter(s => s.isManufactured);
  const lowMaterials = materials.filter(m => m.stock <= m.min_stock && (m.min_stock > 0 || m.stock <= 0));

  // Calcula matérias-primas necessárias para atender as sugestões de produção
  const rmNeeds = useMemo(() => {
    const needs = new Map<string, { rm: RM; needed: number; short: number }>();
    for (const s of produceSuggestions) {
      const rs = recipes.filter(r => r.product_id === s.p.id);
      const batchYield = Number(rs[0]?.yield_quantity ?? 1) || 1;
      const batches = Math.ceil(s.buyQty / batchYield);
      for (const r of rs) {
        const rm = materials.find(m => m.id === r.raw_material_id);
        if (!rm) continue;
        const totalNeeded = Number(r.quantity) * batches;
        const existing = needs.get(rm.id);
        if (existing) existing.needed += totalNeeded;
        else needs.set(rm.id, { rm, needed: totalNeeded, short: 0 });
      }
    }
    return Array.from(needs.values()).map(n => ({
      ...n,
      short: Math.max(0, n.needed - n.rm.stock),
      estCost: Math.max(0, n.needed - n.rm.stock) * Number(n.rm.average_cost || n.rm.last_cost || 0),
    })).filter(n => n.short > 0);
  }, [produceSuggestions, recipes, materials]);

  const totalResaleCost = resaleSuggestions.reduce((a, b) => a + b.totalCost, 0);
  const critical = resaleSuggestions.filter(s => Number.isFinite(s.daysLeft) && s.daysLeft < 7);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6 text-primary" /> Compras Inteligentes</h1>
        <p className="text-sm text-muted-foreground">Sugestões baseadas no consumo dos últimos 90 dias.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Para reabastecer (revenda)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{resaleSuggestions.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Em ruptura iminente (&lt; 7 dias)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{critical.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Custo total de revenda</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {totalResaleCost.toFixed(2)}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="resale">
        <TabsList>
          <TabsTrigger value="resale"><ShoppingCart className="h-4 w-4 mr-1" />Revenda</TabsTrigger>
          {productionOn && <TabsTrigger value="produce"><Factory className="h-4 w-4 mr-1" />Produzir ({produceSuggestions.length})</TabsTrigger>}
          {productionOn && <TabsTrigger value="materials"><Beaker className="h-4 w-4 mr-1" />Matérias-primas ({lowMaterials.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="resale">
          <Card>
            <CardHeader className="flex flex-row items-end gap-3 justify-between flex-wrap">
              <CardTitle className="text-base">Comprar do fornecedor</CardTitle>
              <div className="flex gap-3 items-end">
                <div><Label className="text-xs">Cobertura desejada (dias)</Label><Input type="number" className="w-24" value={target} onChange={e => setTarget(Number(e.target.value) || 30)} /></div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="p-3">Produto</th>
                    <th className="p-3 text-right">Estoque</th>
                    <th className="p-3 text-right">Venda/dia</th>
                    <th className="p-3 text-right">Dias até ruptura</th>
                    <th className="p-3 text-right">Comprar</th>
                    <th className="p-3 text-right">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {resaleSuggestions.map(s => (
                    <tr key={s.p.id} className="border-t">
                      <td className="p-3 font-medium">{s.p.name}</td>
                      <td className="p-3 text-right">{s.p.stock || 0}</td>
                      <td className="p-3 text-right">{s.dailyAvg.toFixed(2)}</td>
                      <td className="p-3 text-right">
                        {Number.isFinite(s.daysLeft) ? (
                          <span className="flex items-center justify-end gap-1">
                            {s.daysLeft < 7 && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                            {Math.floor(s.daysLeft)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="p-3 text-right"><Badge>{s.buyQty}</Badge></td>
                      <td className="p-3 text-right">R$ {s.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                  {!resaleSuggestions.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nada para comprar agora — estoque de revenda saudável.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {productionOn && (
          <TabsContent value="produce">
            <Card>
              <CardHeader><CardTitle className="text-base">Produzir internamente</CardTitle></CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="p-3">Produto</th>
                      <th className="p-3 text-right">Estoque</th>
                      <th className="p-3 text-right">Venda/dia</th>
                      <th className="p-3 text-right">Dias até ruptura</th>
                      <th className="p-3 text-right">Produzir</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {produceSuggestions.map(s => (
                      <tr key={s.p.id} className="border-t">
                        <td className="p-3 font-medium">{s.p.name}</td>
                        <td className="p-3 text-right">{s.p.stock || 0}</td>
                        <td className="p-3 text-right">{s.dailyAvg.toFixed(2)}</td>
                        <td className="p-3 text-right">{Number.isFinite(s.daysLeft) ? Math.floor(s.daysLeft) : "—"}</td>
                        <td className="p-3 text-right"><Badge variant="secondary">{s.buyQty}</Badge></td>
                        <td className="p-3 text-right"><Link to="/app/production" className="text-primary hover:underline text-xs">Abrir Produção →</Link></td>
                      </tr>
                    ))}
                    {!produceSuggestions.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum produto fabricado precisa de produção agora.</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            {rmNeeds.length > 0 && (
              <Card className="border-amber-500/30">
                <CardHeader><CardTitle className="text-base text-amber-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Matérias-primas a comprar para produzir</CardTitle></CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-amber-500/10 text-left">
                      <tr><th className="p-3">Matéria-prima</th><th className="p-3">Unidade</th><th className="p-3 text-right">Em estoque</th><th className="p-3 text-right">Necessário</th><th className="p-3 text-right">Comprar</th><th className="p-3 text-right">Custo est.</th></tr>
                    </thead>
                    <tbody>
                      {rmNeeds.map(n => (
                        <tr key={n.rm.id} className="border-t">
                          <td className="p-3 font-medium">{n.rm.name}</td>
                          <td className="p-3">{n.rm.unit}</td>
                          <td className="p-3 text-right">{n.rm.stock}</td>
                          <td className="p-3 text-right">{n.needed.toFixed(2)}</td>
                          <td className="p-3 text-right"><Badge variant="outline">{n.short.toFixed(2)} {n.rm.unit}</Badge></td>
                          <td className="p-3 text-right">R$ {n.estCost.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {productionOn && (
          <TabsContent value="materials">
            <Card>
              <CardHeader><CardTitle className="text-base">Matérias-primas abaixo do mínimo</CardTitle></CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="p-3">Matéria-prima</th>
                      <th className="p-3">Unidade</th>
                      <th className="p-3 text-right">Estoque</th>
                      <th className="p-3 text-right">Mínimo</th>
                      <th className="p-3 text-right">Último custo</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowMaterials.map(m => (
                      <tr key={m.id} className="border-t">
                        <td className="p-3 font-medium">{m.name}</td>
                        <td className="p-3">{m.unit}</td>
                        <td className="p-3 text-right">{m.stock}</td>
                        <td className="p-3 text-right">{m.min_stock}</td>
                        <td className="p-3 text-right">R$ {Number(m.last_cost || m.average_cost).toFixed(2)}</td>
                        <td className="p-3 text-right"><Link to="/app/production" className="text-primary hover:underline text-xs">Registrar compra →</Link></td>
                      </tr>
                    ))}
                    {!lowMaterials.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Todas as matérias-primas estão acima do mínimo.</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
