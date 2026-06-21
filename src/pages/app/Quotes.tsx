import { useEffect, useMemo, useState, useRef } from "react";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { FileText, Trash2, Mic, Square, Loader2, ImageIcon, Wrench, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { PromissoriaFields, type PromissoriaData } from "@/components/app/PromissoriaFields";
import ProductPicker, { type SaleItem } from "@/components/app/ProductPicker";

type RowSnap = {
  width?: number | null; height?: number | null; depth?: number | null;
  length_cm?: number | null; weight?: number | null; measure_unit?: string | null;
  sku?: string | null; codname?: string | null; category?: string | null;
};

function measureLabel(m: RowSnap | null | undefined) {
  if (!m) return "";
  const u = m.measure_unit || "cm";
  const parts: string[] = [];
  if (m.width) parts.push(`${m.width}${u} L`);
  if (m.height) parts.push(`${m.height}${u} A`);
  if (m.depth) parts.push(`${m.depth}${u} P`);
  if (m.length_cm) parts.push(`${m.length_cm}${u} C`);
  if (m.weight) parts.push(`${m.weight}kg`);
  return parts.join(" x ");
}

export default function Quotes() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [variations, setVariations] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [pms, setPms] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ client_id: "", payment_method: "pix" });
  const [pickerItems, setPickerItems] = useState<SaleItem[]>([]);
  const [promissoria, setPromissoria] = useState<PromissoriaData>({ total_amount: 0, installments_count: 2, first_due: new Date().toISOString().slice(0, 10) });
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const load = async () => {
    if (!user) return;
    const [{ data: q }, { data: qi }, { data: p }, { data: v }, { data: s }, { data: sup }, { data: c }, { data: m }] = await Promise.all([
      supabase.from("quotes").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("quote_items").select("*"),
      supabase.from("products").select("id,name,codname,code,sale_price,cost,image_url,supplier_id,category,width,height,depth,length_cm,weight,measure_unit").is("deleted_at", null).eq("status", "active").eq("out_of_line", false),
      supabase.from("product_variations").select("id,product_id,name,codname,sku,image_url,cost,sale_price,supplier_id,width,height,depth,length_cm,weight,measure_unit").eq("status", "active"),
      supabase.from("services").select("id,name,starting_price,cost").is("deleted_at", null),
      supabase.from("suppliers").select("id,name"),
      supabase.from("clients").select("id,full_name").is("deleted_at", null),
      supabase.from("payment_methods").select("*").eq("active", true),
    ]);
    setQuotes(q ?? []); setItems(qi ?? []); setProducts(p ?? []); setVariations(v ?? []);
    setServices(s ?? []); setSuppliers(sup ?? []); setClients(c ?? []); setPms(m ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const supMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);

  const enrichItem = (it: SaleItem) => {
    let row: any = null;
    if (it.kind === "variation") row = variations.find(v => v.id === it.ref_id);
    else if (it.kind === "product") row = products.find(p => p.id === it.ref_id);
    else if (it.kind === "service") row = services.find(s => s.id === it.ref_id);
    return row || {};
  };

  const total = pickerItems.reduce((a, x) => a + x.unit_price * x.quantity, 0);
  const isPromissoria = form.payment_method === "promissoria";
  const finalTotal = isPromissoria ? Number(promissoria.total_amount || total) : total;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        await processAudio(blob, mr.mimeType);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      toast.error("Não foi possível acessar o microfone");
    }
  };
  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };
  const processAudio = async (blob: Blob, mime: string) => {
    setProcessing(true);
    try {
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = ""; for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const audio_base64 = btoa(binary);
      const { data, error } = await supabase.functions.invoke("quote-from-audio", { body: { audio_base64, mime_type: mime, products } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const newItems: SaleItem[] = [];
      for (const it of (data.items ?? [])) {
        const p = products.find(x => x.id === it.product_id);
        if (!p) continue;
        const vars = variations.filter(v => v.product_id === p.id);
        if (vars[0]) {
          newItems.push({
            kind: "variation", ref_id: vars[0].id, product_id: p.id, name: `${p.name} — ${vars[0].name}`,
            image_url: vars[0].image_url || p.image_url, quantity: it.quantity || 1,
            cost: Number(vars[0].cost ?? 0), margin_percent: 100, markup_percent: 0, fee_percent: 0,
            unit_price: Number(vars[0].sale_price ?? 0), supplier_id: vars[0].supplier_id ?? null,
          });
        } else {
          newItems.push({
            kind: "product", ref_id: p.id, product_id: p.id, name: p.name,
            image_url: p.image_url, quantity: it.quantity || 1,
            cost: Number(p.cost ?? 0), margin_percent: 100, markup_percent: 0, fee_percent: 0,
            unit_price: Number(p.sale_price ?? 0), supplier_id: p.supplier_id ?? null,
          });
        }
      }
      if (!newItems.length) toast.error("Nenhum produto identificado no áudio");
      else { setPickerItems(prev => [...prev, ...newItems]); toast.success(`${newItems.length} item(s) adicionado(s) por voz`); }
    } catch (e: any) {
      toast.error(friendlyError(e, "Erro ao processar áudio"));
    } finally {
      setProcessing(false);
    }
  };

  const save = async () => {
    if (!user) return;
    if (!pickerItems.length) return toast.error("Adicione ao menos um item");
    if (isPromissoria && !form.client_id) return toast.error("Promissória requer cliente cadastrado.");

    const { data: quote, error } = await supabase.from("quotes").insert({
      user_id: user.id, client_id: form.client_id || null,
      payment_method: form.payment_method, total: finalTotal, status: "open",
      notes: isPromissoria ? `Promissória: ${promissoria.installments_count}x, 1º vencimento ${promissoria.first_due}, valor final R$ ${finalTotal.toFixed(2)}` : null,
    }).select().single();
    if (error || !quote) return toast.error(friendlyError(error, "Erro"));

    const rows = pickerItems.map(it => {
      const src = enrichItem(it);
      const meas: RowSnap = {
        width: src.width ?? null, height: src.height ?? null, depth: src.depth ?? null,
        length_cm: src.length_cm ?? null, weight: src.weight ?? null,
        measure_unit: src.measure_unit ?? "cm",
        sku: src.sku ?? src.code ?? null, codname: src.codname ?? null, category: src.category ?? null,
      };
      return {
        quote_id: quote.id, user_id: user.id,
        product_id: it.kind === "service" ? null : (it.product_id ?? it.ref_id),
        variation_id: it.kind === "variation" ? it.ref_id : null,
        quantity: it.quantity, unit_cost: it.cost,
        margin_percent: it.margin_percent, unit_price: it.unit_price,
        item_type: it.kind, name: it.name, image_url: it.image_url ?? null,
        sku: meas.sku, category: meas.category,
        supplier_name: it.supplier_id ? (supMap.get(it.supplier_id) ?? null) : null,
        measurements_snapshot: meas,
        extra_fee_percent: it.fee_percent ?? 0,
      };
    });
    const { error: itemsErr } = await supabase.from("quote_items").insert(rows);
    if (itemsErr) return toast.error(friendlyError(itemsErr));
    toast.success("Orçamento salvo");
    setOpen(false);
    setForm({ client_id: "", payment_method: "pix" });
    setPickerItems([]);
    setPromissoria({ total_amount: 0, installments_count: 2, first_due: new Date().toISOString().slice(0, 10) });
    load();
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
                <Select value={form.payment_method} onValueChange={(v) => { setForm({ ...form, payment_method: v }); if (v === "promissoria") setPromissoria(p => ({ ...p, total_amount: total })); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {pms.length === 0 && <>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="credito">Cartão crédito</SelectItem>
                    </>}
                    {pms.map(m => <SelectItem key={m.id} value={m.code}>{m.label}</SelectItem>)}
                    <SelectItem value="promissoria">Promissória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isPromissoria && <PromissoriaFields value={promissoria} onChange={setPromissoria} originalAmount={total} />}

            <div className="flex items-center justify-end">
              {!recording ? (
                <Button type="button" size="sm" variant="outline" onClick={startRecording} disabled={processing}>
                  {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mic className="h-4 w-4 mr-1" />}
                  {processing ? "Processando…" : "Ditar orçamento"}
                </Button>
              ) : (
                <Button type="button" size="sm" variant="destructive" onClick={stopRecording}>
                  <Square className="h-4 w-4 mr-1" /> Parar gravação
                </Button>
              )}
            </div>
            {recording && <p className="text-xs text-destructive animate-pulse">🎙️ Gravando… fale os produtos e quantidades.</p>}

            <ProductPicker items={pickerItems} onChange={setPickerItems} mode="both" includeServices />

            {/* Cartões grandes para print/preview */}
            {pickerItems.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Pré-visualização dos itens</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pickerItems.map((it, idx) => {
                    const src = enrichItem(it);
                    const meas = measureLabel({
                      width: src.width, height: src.height, depth: src.depth,
                      length_cm: src.length_cm, weight: src.weight, measure_unit: src.measure_unit,
                    });
                    const supName = it.supplier_id ? supMap.get(it.supplier_id) : null;
                    return (
                      <Card key={idx} className="rounded-2xl overflow-hidden">
                        <div className="relative bg-secondary aspect-video flex items-center justify-center">
                          {it.image_url ? (
                            <>
                              <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                              <button type="button" onClick={() => setZoomUrl(it.image_url!)} className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full p-1.5">
                                <ZoomIn className="h-4 w-4" />
                              </button>
                            </>
                          ) : it.kind === "service" ? (
                            <Wrench className="h-10 w-10 text-muted-foreground" />
                          ) : (
                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
                          )}
                        </div>
                        <div className="p-3 space-y-1">
                          <div className="font-medium text-sm">{it.name}</div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-[10px]">{it.kind === "service" ? "Serviço" : it.kind === "variation" ? "Variação" : "Produto"}</Badge>
                            {src.category && <Badge variant="secondary" className="text-[10px]">{src.category}</Badge>}
                            {supName && <Badge variant="secondary" className="text-[10px]">{supName}</Badge>}
                          </div>
                          {meas && <div className="text-xs text-muted-foreground">📐 {meas}</div>}
                          <div className="flex items-center justify-between text-xs pt-1">
                            <span>{it.quantity} × R$ {it.unit_price.toFixed(2)}</span>
                            <strong className="text-primary">R$ {(it.quantity * it.unit_price).toFixed(2)}</strong>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">R$ {finalTotal.toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar orçamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!zoomUrl} onOpenChange={(o) => !o && setZoomUrl(null)}>
        <DialogContent className="rounded-3xl max-w-3xl p-2">
          {zoomUrl && <img src={zoomUrl} alt="Zoom" className="w-full h-auto rounded-2xl" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
