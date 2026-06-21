import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Gift, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

type Combo = { id: string; name: string; description: string | null; original_price: number; combo_price: number; status: string; starts_at: string | null; ends_at: string | null; color: string | null };
type Item = { id: string; combo_id: string; item_type: string; product_id: string | null; service_id: string | null; quantity: number; unit_price: number };
type Sale = { id: string; combo_id: string; amount: number; sold_at: string };

export default function Combos() {
  const { user } = useAuth();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", description: "", combo_price: 0, starts_at: "", ends_at: "", items: [] as any[] });

  const load = async () => {
    if (!user) return;
    const [{ data: c }, { data: i }, { data: s }, { data: p }, { data: sv }] = await Promise.all([
      supabase.from("combos").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("combo_items").select("*"),
      supabase.from("combo_sales").select("*"),
      supabase.from("products").select("id,name,sale_price").is("deleted_at", null).eq("status", "active").eq("out_of_line", false),
      supabase.from("services").select("id,name,starting_price").is("deleted_at", null),
    ]);
    setCombos((c ?? []) as any); setItems((i ?? []) as any); setSales((s ?? []) as any);
    setProducts(p ?? []); setServices(sv ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const addLine = () => setForm((f: any) => ({ ...f, items: [...f.items, { item_type: "product", ref_id: "", quantity: 1, unit_price: 0 }] }));
  const updLine = (idx: number, patch: any) => setForm((f: any) => ({ ...f, items: f.items.map((x: any, i: number) => i === idx ? { ...x, ...patch } : x) }));
  const rmLine = (idx: number) => setForm((f: any) => ({ ...f, items: f.items.filter((_: any, i: number) => i !== idx) }));

  const original = form.items.reduce((a: number, x: any) => a + (Number(x.unit_price) || 0) * (Number(x.quantity) || 0), 0);

  const save = async () => {
    if (!user || !form.name) return toast.error("Nome obrigatório");
    const { data: combo, error } = await supabase.from("combos").insert({
      user_id: user.id, name: form.name, description: form.description || null,
      original_price: original, combo_price: Number(form.combo_price) || 0,
      starts_at: form.starts_at || null, ends_at: form.ends_at || null,
    }).select().single();
    if (error || !combo) return toast.error(friendlyError(error, "Erro"));
    if (form.items.length) {
      const rows = form.items.map((x: any) => ({
        combo_id: combo.id, user_id: user.id, item_type: x.item_type,
        product_id: x.item_type === "product" ? x.ref_id : null,
        service_id: x.item_type === "service" ? x.ref_id : null,
        quantity: x.quantity, unit_price: x.unit_price,
      }));
      await supabase.from("combo_items").insert(rows);
    }
    toast.success("Combo criado");
    setOpen(false); setForm({ name: "", description: "", combo_price: 0, starts_at: "", ends_at: "", items: [] });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir combo?")) return;
    await supabase.from("combos").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const itemsOf = (cid: string) => items.filter(x => x.combo_id === cid);
  const salesOf = (cid: string) => sales.filter(x => x.combo_id === cid);
  const itemLabel = (it: Item) => {
    if (it.item_type === "product") return products.find(p => p.id === it.product_id)?.name ?? "Produto";
    return services.find(s => s.id === it.service_id)?.name ?? "Serviço";
  };

  const totalSold = sales.length;
  const totalRevenue = sales.reduce((a, s) => a + Number(s.amount), 0);

  return (
    <div>
      <PageHeader title="Combos" description="Crie ofertas combinadas (produtos + serviços) e mensure ROI." actionLabel="Novo combo" onAction={() => setOpen(true)} />
      <MetricsRow items={[
        { label: "Combos ativos", value: String(combos.filter(c => c.status === "active").length) },
        { label: "Vendidos", value: String(totalSold) },
        { label: "Faturamento", value: `R$ ${totalRevenue.toFixed(2)}` },
      ]} />

      {combos.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={Gift} title="Sem combos" description="Crie seu primeiro combo promocional." actionLabel="Novo combo" onAction={() => setOpen(true)} />
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {combos.map(c => {
            const cs = salesOf(c.id);
            const discount = c.original_price > 0 ? Math.round((1 - c.combo_price / c.original_price) * 100) : 0;
            return (
              <Card key={c.id} className="p-6 rounded-3xl border-0 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-lg">{c.name}</div>
                    {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-muted-foreground line-through">R$ {c.original_price.toFixed(2)}</span>
                  <span className="text-2xl font-bold text-primary">R$ {c.combo_price.toFixed(2)}</span>
                  {discount > 0 && <Badge variant="secondary">-{discount}%</Badge>}
                </div>
                <div className="space-y-1 mb-3">
                  {itemsOf(c.id).map(it => (
                    <div key={it.id} className="text-sm flex justify-between">
                      <span>{it.quantity}× {itemLabel(it)}</span>
                      <span className="text-muted-foreground">R$ {(it.quantity * it.unit_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-3 border-t text-sm">
                  <div><span className="text-muted-foreground">Vendidos:</span> <strong>{cs.length}</strong></div>
                  <div><span className="text-muted-foreground">Receita:</span> <strong>R$ {cs.reduce((a, s) => a + Number(s.amount), 0).toFixed(2)}</strong></div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo combo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início</Label><Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Itens do combo</Label>
                <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>
              </div>
              <div className="space-y-2">
                {form.items.map((it: any, i: number) => (
                  <div key={i} className="grid grid-cols-[110px_1fr_80px_110px_auto] gap-2 items-end">
                    <Select value={it.item_type} onValueChange={(v) => updLine(i, { item_type: v, ref_id: "" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">Produto</SelectItem>
                        <SelectItem value="service">Serviço</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={it.ref_id} onValueChange={(v) => {
                      const list: any[] = it.item_type === "product" ? products : services;
                      const found: any = list.find((x: any) => x.id === v);
                      const price = it.item_type === "product" ? (found?.sale_price ?? 0) : (found?.starting_price ?? 0);
                      updLine(i, { ref_id: v, unit_price: price });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {(it.item_type === "product" ? products : services).map((x: any) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" min="1" value={it.quantity} onChange={(e) => updLine(i, { quantity: +e.target.value })} />
                    <Input type="number" step="0.01" value={it.unit_price} onChange={(e) => updLine(i, { unit_price: +e.target.value })} />
                    <Button size="icon" variant="ghost" onClick={() => rmLine(i)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t">
              <div>
                <Label>Preço original</Label>
                <Input value={`R$ ${original.toFixed(2)}`} disabled />
              </div>
              <div>
                <Label>Preço do combo</Label>
                <Input type="number" step="0.01" value={form.combo_price} onChange={(e) => setForm({ ...form, combo_price: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="rounded-2xl">Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
