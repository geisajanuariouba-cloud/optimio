import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { ClipboardCheck, Check, X, Eye, ImagePlus, ImageOff, ZoomIn, AlertTriangle } from "lucide-react";

type Item = {
  id: string; catalog_id: string | null; supplier_id: string | null; source_page: number | null;
  proposed_name: string | null; proposed_code: string | null; proposed_category: string | null;
  proposed_image_url: string | null; review_status: string; match_status: string; dedup_hash: string | null;
  match_product_id: string | null;
  proposed_measurements: any; proposed_variations: any; raw_data: any;
  image_flagged?: boolean; rejection_reason?: string | null;
};

async function ensureCategoryId(userId: string, name?: string | null): Promise<string | null> {
  if (!name) return null;
  const n = name.trim();
  if (!n) return null;
  const { data: existing } = await supabase.from("product_categories")
    .select("id").eq("user_id", userId).ilike("name", n).maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created } = await supabase.from("product_categories")
    .insert({ user_id: userId, name: n }).select("id").single();
  return created?.id ?? null;
}

function codnameOf(name: string, size?: string | null, color?: string | null): string {
  if (!name) return "";
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const base = norm(name).trim().split(/\s+/)[0]?.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() ?? "";
  const sz = size ? (String(size).match(/[0-9]+/g)?.join("") ?? "").slice(0, 4) : "";
  const co = color ? norm(color).replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() : "";
  return `${base}${sz}${co}`;
}

export default function ImportReview() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [filter, setFilter] = useState("pending");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [detailItem, setDetailItem] = useState<Item | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  const load = async () => {
    const [{ data }, { data: sup }] = await Promise.all([
      supabase.from("catalog_review_items").select("*").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id,name").is("deleted_at", null).order("name"),
    ]);
    setItems((data ?? []) as Item[]);
    setSuppliers((sup ?? []) as any);
    setSelected(new Set());
  };
  useEffect(() => { if (user) load(); }, [user]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    items.forEach(i => { if (i.proposed_category) s.add(i.proposed_category); });
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => items
    .filter(i => filter === "all" ? true : i.review_status === filter)
    .filter(i => supplierFilter === "all" ? true : i.supplier_id === supplierFilter)
    .filter(i => categoryFilter === "all" ? true : i.proposed_category === categoryFilter)
    .filter(i => !search ||
      (i.proposed_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (i.proposed_code ?? "").toLowerCase().includes(search.toLowerCase())),
    [items, filter, supplierFilter, categoryFilter, search]);

  const toggleOne = (id: string) => {
    const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s);
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(i => i.id)));
  };

  const approve = async (i: Item, opts?: { imagePending?: boolean }): Promise<boolean> => {
    if (!user) return false;
    if (i.review_status === "approved" && i.match_product_id) return true;

    const m = (i.proposed_measurements ?? {}) as any;
    const raw = (i.raw_data ?? {}) as any;
    const vars: any[] = Array.isArray(i.proposed_variations) ? i.proposed_variations : [];
    const categoryId = await ensureCategoryId(user.id, i.proposed_category);
    const codname = (raw.codname && String(raw.codname).trim()) || codnameOf(i.proposed_name ?? "", raw.size, raw.color);

    let productId: string | null = null;
    if (i.dedup_hash) {
      const { data: existing } = await supabase.from("products")
        .select("id").eq("user_id", user.id).eq("dedup_hash", i.dedup_hash).is("deleted_at", null).maybeSingle();
      if (existing?.id) productId = existing.id;
    }

    if (!productId) {
      const { data: ins, error: pErr } = await supabase.from("products").insert({
        user_id: user.id,
        name: i.proposed_name ?? "Produto sem nome",
        code: i.proposed_code,
        category: i.proposed_category,
        category_id: categoryId,
        supplier_id: i.supplier_id,
        image_url: i.proposed_image_url,
        description: raw.description ?? null,
        codname,
        has_variations: vars.length > 0,
        width: m.width ?? null, height: m.height ?? null, depth: m.depth ?? null,
        length_cm: m.length_cm ?? null, weight: m.weight ?? null,
        measurements: m.raw ? { raw: m.raw } : null,
        sale_price: 0, cost: 0, stock: 0, min_stock: 0,
        source_catalog_id: i.catalog_id,
        dedup_hash: i.dedup_hash,
        review_status: "approved",
        status: "active",
        image_review_required: !!opts?.imagePending || !i.proposed_image_url,
      }).select("id").single();
      if (pErr || !ins) { toast.error(friendlyError(pErr)); return false; }
      productId = ins.id;
    }

    if (vars.length > 0) {
      const rows = vars.map((v: any) => ({
        product_id: productId!, user_id: user.id, supplier_id: i.supplier_id,
        name: v.name || [v.size, v.color, v.fabric, v.model, v.finish].filter(Boolean).join(" ") || "Variação",
        codname: codnameOf(i.proposed_name ?? "", v.size, v.color),
        sku: v.sku || null,
        color: v.color || null, fabric: v.fabric || null, material: v.material || null,
        size: v.size || null, model: v.model || null, finish: v.finish || null,
        cost: 0, sale_price: 0, stock: 0, min_stock: 0,
        status: "active",
        width: v.width ?? null, height: v.height ?? null, depth: v.depth ?? null,
        length_cm: v.length_cm ?? null, weight: v.weight ?? null,
        attributes: { color: v.color, fabric: v.fabric, material: v.material, size: v.size, model: v.model, finish: v.finish },
      }));
      const { error: vErr } = await supabase.from("product_variations").insert(rows);
      if (vErr) toast.warning("Produto criado, mas variações falharam: " + friendlyError(vErr));
    }

    await supabase.from("catalog_review_items")
      .update({ review_status: "approved", match_product_id: productId, approve_with_image_pending: !!opts?.imagePending })
      .eq("id", i.id);

    await logAudit({
      action: "product.approve", module: "import_review", entity_id: productId,
      metadata: { review_item_id: i.id, name: i.proposed_name, image_pending: !!opts?.imagePending },
    });
    return true;
  };

  const approveOne = async (i: Item, imagePending = false) => {
    const ok = await approve(i, { imagePending });
    if (ok) { toast.success(imagePending ? "Aprovado com imagem pendente" : "Produto publicado"); load(); }
  };

  const rejectOne = async (i: Item, reason?: string) => {
    await supabase.from("catalog_review_items")
      .update({ review_status: "rejected", rejection_reason: reason ?? null }).eq("id", i.id);
    await logAudit({ action: "product.reject", module: "import_review", entity_id: i.id, metadata: { name: i.proposed_name, reason } });
    load();
  };

  const bulkApprove = async () => {
    const pend = filtered.filter(i => selected.has(i.id) && i.review_status === "pending");
    const list = pend.length ? pend : filtered.filter(i => i.review_status === "pending");
    if (list.length === 0) return;
    if (!confirm(`Aprovar ${list.length} itens em lote?`)) return;
    let ok = 0, fail = 0;
    for (const i of list.slice(0, 50)) {
      const r = await approve(i);
      if (r) ok++; else fail++;
    }
    await logAudit({ action: "product.bulk_approve", module: "import_review", metadata: { ok, fail, total: list.length } });
    toast.success(`Lote concluído: ${ok} publicados${fail ? `, ${fail} falharam` : ""}`);
    load();
  };

  const confirmBulkReject = async () => {
    const list = filtered.filter(i => selected.has(i.id) && i.review_status === "pending");
    if (list.length === 0) return;
    const ids = list.map(i => i.id);
    const reason = rejectReason.trim() || null;
    const { error } = await supabase.from("catalog_review_items")
      .update({ review_status: "rejected", rejection_reason: reason }).in("id", ids);
    if (error) return toast.error(friendlyError(error));
    await logAudit({ action: "product.reject", module: "import_review", metadata: { bulk: true, count: ids.length, reason } });
    toast.success(`${ids.length} itens rejeitados`);
    setBulkRejectOpen(false); setRejectReason(""); load();
  };

  const changeImage = async (i: Item, file: File) => {
    if (!user) return;
    const path = `${user.id}/review/${i.id}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const up = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (up.error) return toast.error(friendlyError(up.error, "Falha ao enviar imagem."));
    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    const { error } = await supabase.from("catalog_review_items")
      .update({ proposed_image_url: pub.publicUrl, image_flagged: false }).eq("id", i.id);
    if (error) return toast.error(friendlyError(error));
    await logAudit({ action: "product.status_change", module: "import_review", entity_id: i.id, metadata: { kind: "image_change", url: pub.publicUrl } });
    toast.success("Imagem atualizada"); load();
  };

  const removeImage = async (i: Item) => {
    const { error } = await supabase.from("catalog_review_items")
      .update({ proposed_image_url: null }).eq("id", i.id);
    if (error) return toast.error(friendlyError(error));
    await logAudit({ action: "product.status_change", module: "import_review", entity_id: i.id, metadata: { kind: "image_remove" } });
    toast.success("Imagem removida"); load();
  };

  const flagImage = async (i: Item) => {
    await supabase.from("catalog_review_items").update({ image_flagged: !i.image_flagged }).eq("id", i.id);
    load();
  };

  const updateDetail = async (patch: Partial<Item>) => {
    if (!detailItem) return;
    const { error } = await supabase.from("catalog_review_items").update(patch as any).eq("id", detailItem.id);
    if (error) return toast.error(friendlyError(error));
    setDetailItem({ ...detailItem, ...patch });
    toast.success("Atualizado");
    load();
  };

  const selectedPending = filtered.filter(i => selected.has(i.id) && i.review_status === "pending").length;

  return (
    <div>
      <PageHeader title="Revisão de Importação" description="Aprove ou rejeite os itens extraídos do catálogo antes de virarem produtos." />

      <MetricsRow items={[
        { label: "Aguardando", value: String(items.filter(i => i.review_status === "pending").length), tone: "warning" },
        { label: "Aprovados", value: String(items.filter(i => i.review_status === "approved").length), tone: "success" },
        { label: "Rejeitados", value: String(items.filter(i => i.review_status === "rejected").length), tone: "danger" },
        { label: "Total extraído", value: String(items.length), tone: "primary" },
      ]} />

      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48 bg-primary/10 border-primary/30"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Aguardando</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Buscar por nome ou código…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        {filter === "pending" && filtered.length > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={toggleAll} className="rounded-2xl">
              {selected.size === filtered.length ? "Limpar seleção" : "Selecionar todos"}
            </Button>
            <Button onClick={bulkApprove} className="rounded-2xl gap-2" disabled={filtered.filter(i=>i.review_status==='pending').length===0}>
              <Check className="h-4 w-4" />Aprovar {selectedPending>0?`selecionados (${selectedPending})`:"lote"}
            </Button>
            <Button onClick={() => setBulkRejectOpen(true)} variant="outline" className="rounded-2xl gap-2 text-rose-600 border-rose-300" disabled={selectedPending===0}>
              <X className="h-4 w-4" />Rejeitar selecionados {selectedPending>0?`(${selectedPending})`:""}
            </Button>
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={ClipboardCheck} title="Nada para revisar" description="Itens extraídos de catálogos aparecerão aqui para revisão." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(i => (
            <Card key={i.id} className="rounded-3xl border-0 shadow-sm overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative group">
                {i.review_status === "pending" && (
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox checked={selected.has(i.id)} onCheckedChange={() => toggleOne(i.id)} className="bg-background/80" />
                  </div>
                )}
                {i.proposed_image_url ? (
                  <>
                    <img src={i.proposed_image_url} alt={i.proposed_name ?? ""} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setZoomUrl(i.proposed_image_url!)} />
                    <button type="button" onClick={() => setZoomUrl(i.proposed_image_url!)}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background">
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground/60"><ImageOff className="h-10 w-10" /><span className="text-xs">Sem imagem</span></div>
                )}
                {i.review_status === "pending" && (
                  <div className="absolute inset-x-0 bottom-0 p-2 flex gap-1.5 bg-background/85 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="flex-1">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) changeImage(i, f); e.currentTarget.value = ""; }} />
                      <span className="inline-flex w-full items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-xl bg-primary text-primary-foreground cursor-pointer hover:opacity-90">
                        <ImagePlus className="h-3 w-3" />{i.proposed_image_url ? "Trocar" : "Enviar"}
                      </span>
                    </label>
                    {i.proposed_image_url && (
                      <>
                        <button type="button" onClick={() => removeImage(i)} title="Remover imagem"
                          className="text-xs px-2 py-1.5 rounded-xl bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 inline-flex items-center gap-1">
                          <ImageOff className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => flagImage(i)} title={i.image_flagged ? "Desmarcar imagem incorreta" : "Marcar imagem incorreta"}
                          className={`text-xs px-2 py-1.5 rounded-xl inline-flex items-center gap-1 ${i.image_flagged ? "bg-amber-500/30 text-amber-700" : "bg-amber-500/15 text-amber-600 hover:bg-amber-500/25"}`}>
                          <AlertTriangle className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <div className="font-medium text-sm line-clamp-2">{i.proposed_name ?? "Sem nome"}</div>
                <div className="text-xs text-muted-foreground">
                  {i.proposed_code && <span>{i.proposed_code} · </span>}
                  {i.proposed_category ?? "Sem categoria"}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">Pág {i.source_page ?? "?"}</Badge>
                  {i.match_status === "duplicate" && <Badge variant="outline" className="text-[10px] text-amber-600">Possível duplicado</Badge>}
                  {!i.proposed_image_url && <Badge variant="outline" className="text-[10px] text-amber-600">Sem imagem</Badge>}
                  {i.image_flagged && <Badge variant="outline" className="text-[10px] text-rose-600">Imagem incorreta</Badge>}
                </div>
                <Button size="sm" variant="ghost" className="w-full justify-start gap-1 text-xs h-7" onClick={() => setDetailItem(i)}>
                  <Eye className="h-3.5 w-3.5" />Ver detalhes
                </Button>
                {i.review_status === "pending" && (
                  <>
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => approveOne(i, false)} className="flex-1 rounded-2xl gap-1"><Check className="h-3.5 w-3.5" />Aprovar</Button>
                      <Button size="sm" variant="outline" onClick={() => rejectOne(i)} className="flex-1 rounded-2xl gap-1 text-rose-600"><X className="h-3.5 w-3.5" />Rejeitar</Button>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer pt-1">
                      <Checkbox onCheckedChange={(v) => { if (v) approveOne(i, true); }} />
                      Aprovar com imagem pendente
                    </label>
                  </>
                )}
                {i.review_status === "approved" && <Badge className="bg-emerald-500/15 text-emerald-600 w-fit">Aprovado</Badge>}
                {i.review_status === "rejected" && (
                  <div className="space-y-1">
                    <Badge className="bg-rose-500/15 text-rose-600 w-fit">Rejeitado</Badge>
                    {i.rejection_reason && <p className="text-[11px] text-muted-foreground italic">{i.rejection_reason}</p>}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de zoom da imagem */}
      <Dialog open={!!zoomUrl} onOpenChange={(o) => !o && setZoomUrl(null)}>
        <DialogContent className="rounded-3xl max-w-3xl max-h-[90vh] p-2 sm:p-4">
          {zoomUrl && <img src={zoomUrl} alt="" className="w-full max-h-[80vh] object-contain rounded-2xl" />}
        </DialogContent>
      </Dialog>

      {/* Modal de rejeição em lote */}
      <Dialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader><DialogTitle>Rejeitar {selectedPending} produto(s)</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja rejeitar os produtos selecionados? Eles não serão enviados para a área de Produtos.</p>
          <div className="space-y-2">
            <Label>Motivo da rejeição (opcional)</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Ex: imagens duplicadas, produtos descontinuados…" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmBulkReject} className="rounded-2xl">Rejeitar selecionados</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drawer de detalhes */}
      <Sheet open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>Detalhes do produto</SheetTitle></SheetHeader>
          {detailItem && (() => {
            const raw = (detailItem.raw_data ?? {}) as any;
            const m = (detailItem.proposed_measurements ?? {}) as any;
            const vars: any[] = Array.isArray(detailItem.proposed_variations) ? detailItem.proposed_variations : [];
            return (
              <div className="space-y-4 pt-4">
                {detailItem.proposed_image_url && (
                  <img src={detailItem.proposed_image_url} alt="" className="w-full max-h-72 object-contain rounded-2xl bg-muted cursor-zoom-in" onClick={() => setZoomUrl(detailItem.proposed_image_url!)} />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Nome</Label><Input value={detailItem.proposed_name ?? ""} onChange={(e) => setDetailItem({ ...detailItem, proposed_name: e.target.value })} onBlur={(e) => updateDetail({ proposed_name: e.target.value })} /></div>
                  <div><Label>Código</Label><Input value={detailItem.proposed_code ?? ""} onChange={(e) => setDetailItem({ ...detailItem, proposed_code: e.target.value })} onBlur={(e) => updateDetail({ proposed_code: e.target.value })} /></div>
                  <div><Label>SKU</Label><Input defaultValue={raw.sku ?? ""} disabled /></div>
                  <div><Label>Categoria</Label><Input value={detailItem.proposed_category ?? ""} onChange={(e) => setDetailItem({ ...detailItem, proposed_category: e.target.value })} onBlur={(e) => updateDetail({ proposed_category: e.target.value })} /></div>
                  <div><Label>Página origem</Label><Input value={String(detailItem.source_page ?? "")} disabled /></div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Custo tabela" v={raw.cost} />
                  <Info label="Desconto" v={raw.discount} />
                  <Info label="Custo final" v={raw.final_cost} />
                  <Info label="Margem" v={raw.margin_percent} />
                  <Info label="Taxa extra" v={raw.extra_fee_percent} />
                  <Info label="Preço venda" v={raw.sale_price} />
                  <Info label="Modelo" v={raw.model} />
                  <Info label="Acabamento" v={raw.finish} />
                  <Info label="Cor" v={raw.color} />
                  <Info label="Tecido" v={raw.fabric} />
                  <Info label="Material" v={raw.material} />
                  <Info label="Tipo" v={raw.type} />
                </div>
                <div>
                  <Label>Medidas</Label>
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    <Mini label="Larg." v={m.width} />
                    <Mini label="Alt." v={m.height} />
                    <Mini label="Prof." v={m.depth} />
                    <Mini label="Compr." v={m.length_cm} />
                    <Mini label="Peso" v={m.weight} />
                  </div>
                </div>
                {vars.length > 0 && (
                  <div>
                    <Label>Variações ({vars.length})</Label>
                    <div className="space-y-1 max-h-40 overflow-auto bg-muted/30 rounded-xl p-2">
                      {vars.map((v, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground">
                          • {[v.name, v.size, v.color, v.fabric, v.model, v.finish].filter(Boolean).join(" · ") || "—"}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Confiança IA" v={raw.confidence ? `${Math.round(raw.confidence*100)}%` : null} />
                  <Info label="Match" v={detailItem.match_status} />
                </div>
                <div>
                  <Label>Observações do revisor</Label>
                  <Textarea defaultValue={(detailItem as any).reviewer_notes ?? ""} onBlur={(e) => updateDetail({ reviewer_notes: e.target.value } as any)} rows={3} />
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Info({ label, v }: { label: string; v: any }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span>{v !== undefined && v !== null && v !== "" ? String(v) : "—"}</span>
    </div>
  );
}
function Mini({ label, v }: { label: string; v: any }) {
  return (
    <div className="bg-muted/40 rounded-lg p-1.5 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-medium">{v ?? "—"}</div>
    </div>
  );
}
