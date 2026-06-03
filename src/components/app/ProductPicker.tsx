import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, X, ImageIcon, Trash2, Wrench } from "lucide-react";

export type SaleItem = {
  kind: "product" | "variation" | "service";
  ref_id: string;
  product_id?: string | null;
  name: string;
  image_url?: string | null;
  quantity: number;
  cost: number;
  margin_percent: number;
  markup_percent: number;
  fee_percent: number;
  unit_price: number; // final
  supplier_id?: string | null;
};

type Row = {
  id: string;
  kind: "product" | "variation" | "service";
  product_id?: string | null;
  name: string;
  image_url?: string | null;
  cost: number;
  sale_price: number;
  stock?: number;
  supplier_id?: string | null;
};

function computePrice(cost: number, margin: number, markup: number, fee: number) {
  const final_cost = cost * (1 + (fee || 0) / 100);
  const price = final_cost * (1 + (margin || 0) / 100) * (1 + (markup || 0) / 100);
  return Math.round(price * 100) / 100;
}

export function recomputeItem(it: SaleItem): SaleItem {
  return { ...it, unit_price: computePrice(it.cost, it.margin_percent, it.markup_percent, it.fee_percent) };
}

export default function ProductPicker({
  items,
  onChange,
  includeServices = true,
}: {
  items: SaleItem[];
  onChange: (items: SaleItem[]) => void;
  includeServices?: boolean;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, { cost_fee_percent: number; default_margin_percent: number; default_markup_percent: number }>>({});

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [p, v, s, sup] = await Promise.all([
        supabase.from("products").select("id,name,image_url,cost,sale_price,stock,supplier_id,has_variations,margin_percent,markup_percent")
          .eq("status", "active").is("deleted_at", null).limit(200),
        supabase.from("product_variations").select("id,product_id,name,image_url,cost,sale_price,stock,supplier_id")
          .eq("status", "active").limit(200),
        includeServices
          ? supabase.from("services").select("id,name,starting_price,cost").is("deleted_at", null).limit(200)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("suppliers").select("id,cost_fee_percent,default_margin_percent,default_markup_percent"),
      ]);
      const supMap: any = {};
      (sup.data ?? []).forEach((x: any) => { supMap[x.id] = x; });
      setSuppliers(supMap);
      const list: Row[] = [];
      (p.data ?? []).forEach((x: any) => {
        if (x.has_variations) return; // só variações entram
        list.push({ id: x.id, kind: "product", name: x.name, image_url: x.image_url, cost: Number(x.cost ?? 0), sale_price: Number(x.sale_price ?? 0), stock: x.stock, supplier_id: x.supplier_id });
      });
      (v.data ?? []).forEach((x: any) => {
        list.push({ id: x.id, kind: "variation", product_id: x.product_id, name: x.name, image_url: x.image_url, cost: Number(x.cost ?? 0), sale_price: Number(x.sale_price ?? 0), stock: x.stock, supplier_id: x.supplier_id });
      });
      (s.data ?? []).forEach((x: any) => {
        list.push({ id: x.id, kind: "service", name: x.name, cost: Number(x.cost ?? 0), sale_price: Number(x.price ?? 0) });
      });
      setRows(list);
    })();
  }, [open, user, includeServices]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows.slice(0, 80);
    const s = q.toLowerCase();
    return rows.filter(r => r.name.toLowerCase().includes(s)).slice(0, 80);
  }, [rows, q]);

  const add = (r: Row) => {
    const sup = r.supplier_id ? suppliers[r.supplier_id] : null;
    const fee = sup ? Number(sup.cost_fee_percent ?? 0) : 0;
    // Try to derive margin from sale_price if available
    let margin = sup ? Number(sup.default_margin_percent ?? 100) : 100;
    const markup = sup ? Number(sup.default_markup_percent ?? 0) : 0;
    if (r.cost > 0 && r.sale_price > 0) {
      const final_cost = r.cost * (1 + fee / 100);
      const ratio = r.sale_price / (final_cost * (1 + markup / 100));
      margin = Math.max(0, Math.round((ratio - 1) * 10000) / 100);
    }
    const item: SaleItem = recomputeItem({
      kind: r.kind, ref_id: r.id, product_id: r.product_id ?? (r.kind === "product" ? r.id : null),
      name: r.name, image_url: r.image_url ?? null, quantity: 1,
      cost: r.cost, margin_percent: margin, markup_percent: markup, fee_percent: fee,
      unit_price: r.sale_price || 0, supplier_id: r.supplier_id ?? null,
    });
    onChange([...items, item]);
    setOpen(false);
  };

  const update = (idx: number, patch: Partial<SaleItem>) => {
    const next = items.slice();
    next[idx] = recomputeItem({ ...next[idx], ...patch });
    onChange(next);
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const total = items.reduce((a, it) => a + it.unit_price * it.quantity, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Itens da venda</span>
        <Button size="sm" type="button" variant="outline" className="rounded-2xl gap-1" onClick={() => setOpen(true)}>
          <Plus className="h-3 w-3" /> Adicionar produto/serviço
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-4 rounded-2xl border-dashed text-center text-xs text-muted-foreground">
          Nenhum item. Adicione pelo menos 1 produto ou serviço.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <Card key={idx} className="p-3 rounded-2xl">
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                  {it.image_url ? <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                    : it.kind === "service" ? <Wrench className="h-5 w-5 text-muted-foreground" />
                    : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{it.name}</div>
                      <Badge variant="secondary" className="text-[10px] mt-0.5">{it.kind === "service" ? "Serviço" : it.kind === "variation" ? "Variação" : "Produto"}</Badge>
                    </div>
                    <button type="button" onClick={() => remove(idx)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                    <label className="space-y-1"><span className="text-muted-foreground">Qtd</span>
                      <Input type="number" min={1} value={it.quantity} onChange={(e) => update(idx, { quantity: Math.max(1, +e.target.value) })} className="h-8" /></label>
                    <label className="space-y-1"><span className="text-muted-foreground">Custo</span>
                      <Input type="number" step="0.01" value={it.cost} onChange={(e) => update(idx, { cost: +e.target.value })} className="h-8" /></label>
                    <label className="space-y-1"><span className="text-muted-foreground">Margem %</span>
                      <Input type="number" step="0.01" value={it.margin_percent} onChange={(e) => update(idx, { margin_percent: +e.target.value })} className="h-8" /></label>
                    <label className="space-y-1"><span className="text-muted-foreground">Markup %</span>
                      <Input type="number" step="0.01" value={it.markup_percent} onChange={(e) => update(idx, { markup_percent: +e.target.value })} className="h-8" /></label>
                    <label className="space-y-1"><span className="text-muted-foreground">Taxa custo %</span>
                      <Input type="number" step="0.01" value={it.fee_percent} onChange={(e) => update(idx, { fee_percent: +e.target.value })} className="h-8" /></label>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Preço unit.: <strong className="text-foreground">R$ {it.unit_price.toFixed(2)}</strong></span>
                    <span>Subtotal: <strong className="text-primary">R$ {(it.unit_price * it.quantity).toFixed(2)}</strong></span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          <div className="flex items-center justify-end text-sm pt-1">
            <span>Total dos itens: <strong className="text-primary text-base ml-1">R$ {total.toFixed(2)}</strong></span>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>Escolher item</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome…" className="pl-9 rounded-2xl" />
          </div>
          <div className="overflow-y-auto -mx-2 px-2 space-y-1.5">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum item encontrado.</p>
            ) : filtered.map(r => (
              <button key={`${r.kind}-${r.id}`} type="button" onClick={() => add(r)}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-secondary text-left">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                  {r.image_url ? <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" />
                    : r.kind === "service" ? <Wrench className="h-4 w-4 text-muted-foreground" />
                    : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground flex gap-2">
                    <Badge variant="outline" className="text-[10px]">{r.kind === "service" ? "Serviço" : r.kind === "variation" ? "Variação" : "Produto"}</Badge>
                    {typeof r.stock === "number" && <span>Estoque: {r.stock}</span>}
                  </div>
                </div>
                <div className="text-sm font-semibold text-primary">R$ {r.sale_price.toFixed(2)}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
