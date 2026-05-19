import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { FileText, Plus, X, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Quotes() {
  const { user } = useAuth();
  const { isAdmin } = useTenant();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [variations, setVariations] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [pms, setPms] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<any>({ client_id: "", payment_method: "pix", items: [] as any[] });

  const load = async () => {
    if (!user) return;
    const [{ data: q }, { data: qi }, { data: p }, { data: v }, { data: c }, { data: m }] = await Promise.all([
      supabase.from("quotes").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("quote_items").select("*"),
      supabase.from("products").select("id,name,code,sale_price,cost,image_url,supplier_id").is("deleted_at", null),
      supabase.from("product_variations").select("*"),
      supabase.from("clients").select("id,full_name").is("deleted_at", null),
      supabase.from("payment_methods").select("*").eq("active", true),
    ]);
    setQuotes(q ?? []); setItems(qi ?? []); setProducts(p ?? []); setVariations(v ?? []);
    setClients(c ?? []); setPms(m ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const filteredProducts = products.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.code?.toLowerCase().includes(search.toLowerCase())
  );

  const addProduct = (p: any) => {
    const vars = variations.filter(v => v.product_id === p.id);
    const variation_id = vars[0]?.id ?? null;
    const cost = Number(variation_id ? vars[0].cost : (p.cost ?? 0));
    const unit_price = Number(variation_id ? vars[0].sale_price : p.sale_price);
    const margin_percent = cost > 0 ? +(((unit_price / cost) - 1) * 100).toFixed(1) : 100;
    setForm((f: any) => ({
      ...f,
      items: [...f.items, {
        product_id: p.id, variation_id, quantity: 1,
        unit_cost: cost, margin_percent,
        unit_price, name: p.name, image_url: p.image_url, has_variations: vars.length > 0,
      }],
    }));
  };
  const updItem = (i: number, patch: any) => setForm((f: any) => ({ ...f, items: f.items.map((x: any, idx: number) => idx === i ? { ...x, ...patch } : x) }));
  const rmItem = (i: number) => setForm((f: any) => ({ ...f, items: f.items.filter((_: any, idx: number) => idx !== i) }));

  const total = form.items.reduce((a: number, x: any) => a + (x.unit_price * x.quantity), 0);

  const save = async () => {
    if (!user) return;
    if (!form.items.length) return toast.error("Adicione ao menos um item");
    for (const it of form.items) {
      if (it.has_variations && !it.variation_id) return toast.error("Selecione a variação de todos os itens");
    }
    const { data: quote, error } = await supabase.from("quotes").insert({
      user_id: user.id, client_id: form.client_id || null,
      payment_method: form.payment_method, total, status: "open",
    }).select().single();
    if (error || !quote) return toast.error(error?.message ?? "Erro");
    const rows = form.items.map((x: any) => ({
      quote_id: quote.id, user_id: user.id, product_id: x.product_id,
      variation_id: x.variation_id, quantity: x.quantity, unit_cost: x.unit_cost,
      margin_percent: x.margin_percent, unit_price: x.unit_price,
    }));
    await supabase.from("quote_items").insert(rows);
    toast.success("Orçamento salvo");
    setOpen(false); setForm({ client_id: "", payment_method: "pix", items: [] }); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir orçamento?")) return;
    await supabase.from("quotes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  return (
    <div>
      <PageHeader title="Orçamentos" description="Monte orçamentos com variações, custo, margem e total automático." actionLabel="Novo orçamento" onAction={() => setOpen(true)} />
      <MetricsRow items={[
        { label: "Abertos", value: String(quotes.filter(q => q.status === "open").length) },
        { label: "Total cotado", value: `R$ ${quotes.reduce((a, q) => a + Number(q.total), 0).toFixed(2)}` },
      ]} />

      {quotes.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={FileText} title="Sem orçamentos" description="Crie seu primeiro orçamento." actionLabel="Novo orçamento" onAction={() => setOpen(true)} />
        </Card>
      ) : (
        <Card className="rounded-3xl border-0 shadow-sm divide-y">
          {quotes.map(q => {
            const cli = clients.find(c => c.id === q.client_id)?.full_name ?? "Sem cliente";
            const qi = items.filter(i => i.quote_id === q.id);
            return (
              <div key={q.id} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium">{cli} — {qi.length} itens</div>
                  <div className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString("pt-BR")} · {q.payment_method}</div>
                </div>
                <Badge variant={q.status === "open" ? "default" : "secondary"}>{q.status}</Badge>
                <span className="font-bold text-primary">R$ {Number(q.total).toFixed(2)}</span>
                <Button size="icon" variant="ghost" onClick={() => remove(q.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            );
          })}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo orçamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cliente</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Forma de pagamento</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {pms.length === 0 && <>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="credito">Cartão crédito</SelectItem>
                    </>}
                    {pms.map(m => <SelectItem key={m.id} value={m.code}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2"><Search className="h-4 w-4" /> Buscar produto (nome ou código)</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Digite para buscar" />
              {search && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-2xl divide-y">
                  {filteredProducts.slice(0, 8).map(p => (
                    <button key={p.id} onClick={() => { addProduct(p); setSearch(""); }} className="w-full text-left p-2 hover:bg-secondary/50 flex items-center gap-2">
                      {p.image_url && <img src={p.image_url} className="h-8 w-8 rounded object-cover" alt="" />}
                      <div className="flex-1">
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">R$ {Number(p.sale_price).toFixed(2)}</div>
                      </div>
                      <Plus className="h-4 w-4 text-primary" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {form.items.map((it: any, i: number) => {
                const vars = variations.filter(v => v.product_id === it.product_id);
                return (
                  <Card key={i} className="p-3 rounded-2xl">
                    <div className="flex items-start gap-2">
                      {it.image_url && <img src={it.image_url} className="h-12 w-12 rounded object-cover" alt="" />}
                      <div className="flex-1 space-y-2">
                        <div className="font-medium text-sm">{it.name}</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {vars.length > 0 && (
                            <div className="col-span-2"><Label className="text-xs">Variação *</Label>
                              <Select value={it.variation_id ?? ""} onValueChange={(v) => {
                                const found = vars.find(x => x.id === v);
                                updItem(i, { variation_id: v, unit_cost: found?.cost ?? it.unit_cost, unit_price: found?.sale_price ?? it.unit_price });
                              }}>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>{vars.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          )}
                          <div><Label className="text-xs">Qtd</Label><Input type="number" min="1" value={it.quantity} onChange={(e) => updItem(i, { quantity: +e.target.value })} /></div>
                          {isAdmin && <div><Label className="text-xs">Custo</Label><Input type="number" step="0.01" value={it.unit_cost} onChange={(e) => updItem(i, { unit_cost: +e.target.value })} /></div>}
                          <div><Label className="text-xs">Margem %</Label><Input type="number" value={it.margin_percent} onChange={(e) => updItem(i, { margin_percent: +e.target.value, unit_price: +(it.unit_cost * (1 + +e.target.value / 100)).toFixed(2) })} /></div>
                          <div><Label className="text-xs">Preço</Label><Input type="number" step="0.01" value={it.unit_price} onChange={(e) => updItem(i, { unit_price: +e.target.value })} /></div>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => rmItem(i)}><X className="h-4 w-4" /></Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">R$ {total.toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar orçamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
