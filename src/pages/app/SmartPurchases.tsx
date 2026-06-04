import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, AlertTriangle } from "lucide-react";

type Product = { id: string; name: string; stock: number | null; min_stock: number | null; cost: number | null; supplier_id: string | null };
type Mov = { product_id: string; quantity: number; type: string; created_at: string };

export default function SmartPurchases() {
  const { tenantOwnerId } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [days, setDays] = useState(30);
  const [target, setTarget] = useState(45);

  const load = async () => {
    if (!tenantOwnerId) return;
    const since = new Date(Date.now() - 90 * 86400e3).toISOString();
    const [p, m] = await Promise.all([
      supabase.from("products").select("id,name,stock,min_stock,cost,supplier_id").eq("user_id", tenantOwnerId).is("deleted_at", null).eq("status", "active"),
      supabase.from("stock_movements").select("product_id,quantity,type,created_at").eq("user_id", tenantOwnerId).gte("created_at", since),
    ]);
    setProducts((p.data as any) ?? []);
    setMovs((m.data as any) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantOwnerId]);

  const suggestions = useMemo(() => {
    return products.map(p => {
      const outflow = movs
        .filter(m => m.product_id === p.id && (m.type === "out" || m.type === "sale"))
        .reduce((a, b) => a + Math.abs(Number(b.quantity || 0)), 0);
      const dailyAvg = outflow / 90;
      const stock = Number(p.stock || 0);
      const daysLeft = dailyAvg > 0 ? stock / dailyAvg : Infinity;
      const targetStock = Math.ceil(dailyAvg * target);
      const buyQty = Math.max(0, targetStock - stock);
      return { p, dailyAvg, daysLeft, buyQty, totalCost: buyQty * Number(p.cost || 0) };
    })
      .filter(x => x.buyQty > 0 || (x.p.min_stock && Number(x.p.stock || 0) <= Number(x.p.min_stock)))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [products, movs, target]);

  const totalToBuy = suggestions.reduce((a, b) => a + b.totalCost, 0);
  const critical = suggestions.filter(s => Number.isFinite(s.daysLeft) && s.daysLeft < 7);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6 text-primary" /> Compras Inteligentes</h1>
        <p className="text-sm text-muted-foreground">Sugestão baseada no consumo dos últimos 90 dias.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Produtos para reabastecer</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{suggestions.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Em ruptura iminente (&lt; 7 dias)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{critical.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Custo total estimado</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {totalToBuy.toFixed(2)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-end gap-3 justify-between flex-wrap">
          <CardTitle className="text-base">Sugestões de compra</CardTitle>
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
              {suggestions.map(s => (
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
              {!suggestions.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nada a comprar agora — estoque saudável.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
