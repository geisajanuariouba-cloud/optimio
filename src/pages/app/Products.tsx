import { useEffect, useMemo, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Boxes, Pencil, Trash2, AlertTriangle, Trophy, Settings2, Search, Wand2, Layers } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CategorySelect } from "@/components/app/CategorySelect";
import { VariationEditor, type Variation, emptyVariation } from "@/components/products/VariationEditor";
import { ImageUploader } from "@/components/products/ImageUploader";
import { generateCodname } from "@/lib/codname";

type Supplier = { id: string; name: string };
type Product = {
  id: string; name: string; codname: string | null; code: string | null; category: string | null;
  stock: number; min_stock: number; sale_price: number; cost: number | null;
  is_ingredient_residue: boolean; supplier_id: string | null; status: string;
  has_variations: boolean; description?: string | null; image_url?: string | null;
  width?: number | null; height?: number | null; depth?: number | null; length_cm?: number | null; weight?: number | null; measure_unit?: string | null;
  price_out_of_sync?: boolean | null; engine_suggested_price?: number | null; manual_price_override?: boolean | null;
  out_of_line?: boolean | null;
};

const isLowStock = (p: Product) => {
  if (p.min_stock === 0 && p.stock === 0) return false;
  return p.stock <= p.min_stock;
};

const emptyForm = {
  name: "", codname: "", code: "", category: "", description: "",
  stock: 0, min_stock: 5, sale_price: 0, cost: 0,
  is_ingredient_residue: false, supplier_id: "", status: "active",
  has_variations: false,
  image_url: null as string | null,
  width: "", height: "", depth: "", length_cm: "", weight: "", measure_unit: "cm",
};

type VarRow = { id: string; product_id: string; name: string; codname: string|null; color: string|null; size: string|null; model: string|null; finish: string|null; fabric: string|null; material: string|null; sku: string|null; sale_price: number; stock: number };

export default function Products() {
  const { user } = useAuth();
  const [list, setList] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allVariations, setAllVariations] = useState<VarRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [tab, setTab] = useState("geral");

  const [filter, setFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<string>("30");
  const [bestSeller, setBestSeller] = useState<{ name: string; count: number } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState<any>({ category: "__keep__", supplier_id: "__keep__", status: "__keep__", adjust_stock: "", adjust_price_pct: "", min_stock: "" });

  const load = async () => {
    const [a, b, v] = await Promise.all([
      supabase.from("products").select("*").is("deleted_at", null).order("name"),
      supabase.from("suppliers").select("id,name").is("deleted_at", null).order("name"),
      supabase.from("product_variations").select("id,product_id,name,codname,color,size,model,finish,fabric,material,sku,sale_price,stock"),
    ]);
    setList((a.data ?? []) as Product[]);
    setSuppliers((b.data ?? []) as Supplier[]);
    setAllVariations((v.data ?? []) as VarRow[]);
  };

  const loadBestSeller = async () => {
    if (!user) return;
    const days = parseInt(period, 10);
    const since = new Date(); since.setDate(since.getDate() - days);
    const { data } = await supabase.from("financial").select("description, type").eq("type", "income").gte("transaction_date", since.toISOString().slice(0, 10));
    if (!data || data.length === 0) { setBestSeller(null); return; }
    const counts: Record<string, number> = {};
    for (const p of list) {
      const n = p.name.toLowerCase();
      counts[p.name] = data.filter(d => (d.description ?? "").toLowerCase().includes(n)).length;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    setBestSeller(top && top[1] > 0 ? { name: top[0], count: top[1] } : null);
  };

  useEffect(() => { if (user) load(); }, [user]);
  useEffect(() => { if (user && list.length) loadBestSeller(); }, [user, period, list]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setVariations([]); setTab("geral"); setOpen(true); };

  const openEdit = async (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, codname: p.codname ?? "", code: p.code ?? "", category: p.category ?? "", description: p.description ?? "",
      stock: p.stock, min_stock: p.min_stock, sale_price: p.sale_price, cost: p.cost ?? 0,
      is_ingredient_residue: p.is_ingredient_residue, supplier_id: p.supplier_id ?? "", status: p.status ?? "active",
      has_variations: p.has_variations ?? false,
      image_url: p.image_url ?? null,
      width: p.width ?? "", height: p.height ?? "", depth: p.depth ?? "", length_cm: p.length_cm ?? "", weight: p.weight ?? "", measure_unit: p.measure_unit ?? "cm",
    });
    if (p.has_variations) {
      const { data } = await supabase.from("product_variations").select("*").eq("product_id", p.id).order("name");
      setVariations((data ?? []) as any);
    } else {
      setVariations([]);
    }
    setTab("geral");
    setOpen(true);
  };

  const autoGenCodname = () => {
    const cn = generateCodname(form.name, undefined, undefined, form.category);
    setForm({ ...form, codname: cn });
  };

  const numOrNull = (v: any) => (v === "" || v === null || v === undefined ? null : Number(v));

  const save = async () => {
    if (!user || !form.name.trim()) return toast.error("Nome obrigatório");
    const codname = form.codname?.trim() || generateCodname(form.name, undefined, undefined, form.category);
    const payload: any = {
      ...form,
      user_id: user.id,
      codname,
      category: form.category || null,
      code: form.code || null,
      description: form.description || null,
      supplier_id: form.supplier_id || null,
      image_url: form.image_url || null,
      width: numOrNull(form.width), height: numOrNull(form.height), depth: numOrNull(form.depth),
      length_cm: numOrNull(form.length_cm), weight: numOrNull(form.weight),
      measure_unit: form.measure_unit || "cm",
    };

    // Detecta edição manual de preço para marcar override
    if (editing && !form.has_variations && Number(form.sale_price) !== Number(editing.sale_price)) {
      payload.manual_price_override = true;
      payload.pricing_mode = "manual";
      payload.price_out_of_sync = false;
    }

    let prodId: string | undefined = editing?.id;
    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) return toast.error(friendlyError(error));
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) return toast.error(friendlyError(error));
      prodId = data?.id;
    }


    // Sync de variações se ativado
    if (form.has_variations && prodId) {
      const { data: existing } = await supabase.from("product_variations").select("id").eq("product_id", prodId);
      const existingIds = new Set((existing ?? []).map((v: any) => v.id));
      const keepIds = new Set(variations.filter(v => v.id).map(v => v.id!));
      const toDelete = [...existingIds].filter(id => !keepIds.has(id));
      if (toDelete.length) await supabase.from("product_variations").delete().in("id", toDelete);

      for (const v of variations) {
        const vCodname = v.codname?.trim() || generateCodname(form.name, v.size, v.color, form.category);
        const row: any = {
          product_id: prodId, user_id: user.id, name: v.name || "Variação",
          codname: vCodname, sku: v.sku || null,
          color: v.color || null, fabric: v.fabric || null, material: v.material || null, size: v.size || null,
          model: v.model || null, finish: v.finish || null,
          cost: v.cost ?? 0, sale_price: v.sale_price ?? 0, stock: v.stock ?? 0, min_stock: v.min_stock ?? 0,
          image_url: v.image_url || null,
          width: numOrNull(v.width), height: numOrNull(v.height), depth: numOrNull(v.depth),
          length_cm: numOrNull(v.length_cm), weight: numOrNull(v.weight),
          measure_unit: v.measure_unit || "cm",
          attributes: { color: v.color, fabric: v.fabric, material: v.material, size: v.size, model: v.model, finish: v.finish },
        };
        if (v.id) {
          await supabase.from("product_variations").update(row).eq("id", v.id);
        } else {
          await supabase.from("product_variations").insert(row);
        }
      }
    } else if (!form.has_variations && prodId) {
      // limpou variações: remove tudo
      await supabase.from("product_variations").delete().eq("product_id", prodId);
    }

    toast.success("Produto salvo"); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Mover para a lixeira?")) return;
    await supabase.from("products").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const applyEnginePrice = async (productId: string, force = false) => {
    const { data, error } = await supabase.rpc("apply_engine_price", { _kind: "product", _id: productId, _force: force });
    if (error) return toast.error(friendlyError(error));
    toast.success(`Preço do motor aplicado: R$ ${Number(data).toFixed(2)}`);
    load();
  };

  const variationsByProduct = useMemo(() => {
    const m = new Map<string, VarRow[]>();
    for (const v of allVariations) {
      if (!m.has(v.product_id)) m.set(v.product_id, []);
      m.get(v.product_id)!.push(v);
    }
    return m;
  }, [allVariations]);

  const filtered = useMemo(() => {
    let r = list;
    if (statusFilter !== "all") r = r.filter(p => p.status === statusFilter);
    if (filter !== "all") r = r.filter(p => (p.category ?? "") === filter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const supMap = new Map(suppliers.map(s => [s.id, s.name.toLowerCase()]));
      r = r.filter(p => {
        const matchProduct =
          p.name.toLowerCase().includes(q) ||
          (p.codname ?? "").toLowerCase().includes(q) ||
          (p.code ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.supplier_id && supMap.get(p.supplier_id)?.includes(q));
        if (matchProduct) return true;
        const vars = variationsByProduct.get(p.id) ?? [];
        return vars.some(v =>
          (v.name ?? "").toLowerCase().includes(q) ||
          (v.codname ?? "").toLowerCase().includes(q) ||
          (v.sku ?? "").toLowerCase().includes(q) ||
          (v.color ?? "").toLowerCase().includes(q) ||
          (v.size ?? "").toLowerCase().includes(q) ||
          (v.model ?? "").toLowerCase().includes(q) ||
          (v.finish ?? "").toLowerCase().includes(q) ||
          (v.fabric ?? "").toLowerCase().includes(q) ||
          (v.material ?? "").toLowerCase().includes(q)
        );
      });
    }
    return r;
  }, [list, filter, statusFilter, search, suppliers, variationsByProduct]);
  const lowStock = filtered.filter(isLowStock).length;
  const allCats = Array.from(new Set(list.map(p => p.category).filter(Boolean) as string[]));

  const toggleOne = (id: string) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };
  const toggleAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map(p => p.id))); };
  const clearSelection = () => setSelected(new Set());

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`Mover ${ids.length} produto(s) para a lixeira?`)) return;
    const { error } = await supabase.from("products").update({ deleted_at: new Date().toISOString() }).in("id", ids);
    if (error) return toast.error(friendlyError(error));
    toast.success(`${ids.length} produto(s) removido(s)`);
    clearSelection(); load();
  };

  const applyBulkEdit = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const updates: any = {};
    if (bulk.category !== "__keep__") updates.category = bulk.category || null;
    if (bulk.supplier_id !== "__keep__") updates.supplier_id = bulk.supplier_id || null;
    if (bulk.status !== "__keep__") updates.status = bulk.status;
    if (bulk.min_stock !== "") updates.min_stock = Number(bulk.min_stock);
    if (Object.keys(updates).length) {
      const { error } = await supabase.from("products").update(updates).in("id", ids);
      if (error) return toast.error(friendlyError(error));
    }
    const adjustStock = bulk.adjust_stock !== "" ? Number(bulk.adjust_stock) : null;
    const adjustPct = bulk.adjust_price_pct !== "" ? Number(bulk.adjust_price_pct) : null;
    if (adjustStock !== null || adjustPct !== null) {
      const targets = list.filter(p => selected.has(p.id));
      await Promise.all(targets.map(p => {
        const patch: any = {};
        if (adjustStock !== null) patch.stock = Math.max(0, p.stock + adjustStock);
        if (adjustPct !== null) patch.sale_price = +(Number(p.sale_price) * (1 + adjustPct / 100)).toFixed(2);
        return supabase.from("products").update(patch).eq("id", p.id);
      }));
    }
    toast.success(`${ids.length} produto(s) atualizado(s)`);
    setBulkOpen(false);
    setBulk({ category: "__keep__", supplier_id: "__keep__", status: "__keep__", adjust_stock: "", adjust_price_pct: "", min_stock: "" });
    clearSelection(); load();
  };

  return (
    <div>
      <PageHeader title="Produtos & Estoque" description="Estoque, fornecedores, variações e produtos fora de linha." actionLabel="Produto" onAction={openNew} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, apelido, código, cor, modelo, acabamento, fornecedor..." className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40 bg-primary/10 border-primary/30 hover:bg-primary/15"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="discontinued">Fora de linha</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-9 w-44 bg-primary/10 border-primary/30 hover:bg-primary/15"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {allCats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <MetricsRow items={[
        { label: "Cadastrados", value: String(filtered.length), tone: "primary" },
        { label: "Estoque baixo", value: String(lowStock), tone: lowStock > 0 ? "warning" : "primary", hint: "abaixo do mínimo" },
        { label: "Valor estoque", value: `R$ ${filtered.reduce((a, p) => a + p.stock * Number(p.cost ?? 0), 0).toFixed(0)}`, tone: "primary" },
        { label: `Mais vendido (${period}d)`, value: bestSeller?.name ?? "—", tone: "primary", hint: bestSeller ? `${bestSeller.count} vendas` : "sem dados" },
      ]} />

      {selected.size > 0 && (
        <Card className="rounded-2xl border-0 shadow-sm p-3 mb-3 bg-primary/5 flex flex-wrap items-center gap-2">
          <Badge className="bg-primary/15 text-primary">{selected.size} selecionado(s)</Badge>
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} className="rounded-xl gap-1"><Settings2 className="h-3.5 w-3.5" />Editar em lote</Button>
          <Button size="sm" variant="outline" onClick={bulkDelete} className="rounded-xl gap-1 text-rose-600"><Trash2 className="h-3.5 w-3.5" />Apagar selecionados</Button>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={clearSelection} className="text-xs">Limpar seleção</Button>
        </Card>
      )}

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Boxes} title="Estoque vazio" description="Cadastre seus produtos para controlar entradas e saídas." actionLabel="Produto" onAction={openNew} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} aria-label="Selecionar tudo" />
                </TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="hidden md:table-cell">Apelido curto</TableHead>
                <TableHead className="hidden lg:table-cell">Categoria</TableHead>
                <TableHead className="hidden lg:table-cell">Fornecedor</TableHead>
                <TableHead>Estoque</TableHead><TableHead>Preço</TableHead>
                <TableHead className="w-24" />
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(p => {
                  const sup = suppliers.find(s => s.id === p.supplier_id);
                  return (
                    <TableRow key={p.id} data-state={selected.has(p.id) ? "selected" : undefined}>
                      <TableCell className="w-10">
                        <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleOne(p.id)} aria-label={`Selecionar ${p.name}`} />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          {p.name}
                          {p.has_variations && <Badge className="bg-violet-500/15 text-violet-600 text-[10px] gap-1"><Layers className="h-3 w-3" />variações</Badge>}
                          {bestSeller?.name === p.name && <Trophy className="h-3 w-3 text-amber-500" />}
                          {p.status === "discontinued" && <Badge className="bg-amber-500/15 text-amber-600 text-[10px]">fora de linha</Badge>}
                          {p.is_ingredient_residue && <Badge className="bg-cyan-500/10 text-cyan-600 text-[10px]">ingrediente</Badge>}
                        </div>
                        {p.has_variations && (variationsByProduct.get(p.id) ?? []).length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap mt-1">
                            {(variationsByProduct.get(p.id) ?? []).slice(0, 6).map(v => (
                              <span key={v.id} className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
                                {[v.color, v.size, v.model && `modelo ${v.model}`, v.finish && `acab. ${v.finish}`].filter(Boolean).join(" · ") || v.name}
                              </span>
                            ))}
                            {(variationsByProduct.get(p.id) ?? []).length > 6 && (
                              <span className="text-[10px] text-muted-foreground">+{(variationsByProduct.get(p.id) ?? []).length - 6}</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {p.codname ? <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">{p.codname}</span> : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden lg:table-cell">{p.category ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">{sup?.name ?? "—"}</TableCell>
                      <TableCell>
                        <span className={isLowStock(p) ? "text-amber-500 font-medium flex items-center gap-1" : ""}>
                          {isLowStock(p) && <AlertTriangle className="h-3 w-3" />}
                          {p.stock} <span className="text-muted-foreground text-xs">/ min {p.min_stock}</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        <div className="flex flex-col gap-1">
                          <span>R$ {Number(p.sale_price).toFixed(2)}</span>
                          {p.price_out_of_sync && (
                            <div className="flex items-center gap-1">
                              <Badge className="bg-amber-500/15 text-amber-700 text-[10px] gap-1">
                                <AlertTriangle className="h-3 w-3" />fora de sync
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px] text-primary"
                                title={`Aplicar R$ ${Number(p.engine_suggested_price ?? 0).toFixed(2)} sugerido pelo motor`}
                                onClick={() => {
                                  if (confirm(`Aplicar preço do motor (R$ ${Number(p.engine_suggested_price ?? 0).toFixed(2)})? Isso vai sobrescrever seu preço manual.`)) {
                                    applyEnginePrice(p.id, true);
                                  }
                                }}
                              >Aplicar motor</Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="preco">Preço & Estoque</TabsTrigger>
              <TabsTrigger value="medidas">Medidas</TabsTrigger>
              <TabsTrigger value="variacoes">Variações</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 pt-4">
              <ImageUploader value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} folder="products" label="Foto do produto" />
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Apelido curto</Label>
                  <div className="flex gap-1">
                    <Input value={form.codname} onChange={(e) => setForm({ ...form, codname: e.target.value })} placeholder="Ex: SOFA230CZ" />
                    <Button type="button" size="icon" variant="outline" onClick={autoGenCodname} title="Gerar a partir do nome"><Wand2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div><Label>Código / SKU</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Categoria</Label>
                  <CategorySelect kind="product" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
                </div>
                <div><Label>Fornecedor / Fábrica</Label>
                  <Select value={form.supplier_id || "none"} onValueChange={(v) => setForm({ ...form, supplier_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem fornecedor</SelectItem>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="discontinued">Fora de linha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.is_ingredient_residue} onChange={(e) => setForm({ ...form, is_ingredient_residue: e.target.checked })} />
                    Ingrediente / sobra
                  </label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preco" className="space-y-4 pt-4">
              {form.has_variations && <p className="text-xs text-muted-foreground bg-violet-500/5 border border-violet-500/20 rounded-xl p-2">Este produto usa variações. Preço e estoque são gerenciados por variação.</p>}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Estoque atual</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} disabled={form.has_variations} /></div>
                <div><Label>Estoque mínimo</Label><Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: +e.target.value })} disabled={form.has_variations} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Preço de venda (R$)</Label><Input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: +e.target.value })} disabled={form.has_variations} /></div>
                <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: +e.target.value })} disabled={form.has_variations} /></div>
              </div>
              <p className="text-xs text-muted-foreground">💡 Estoque mínimo = 0 e estoque atual = 0 não dispara alarme.</p>
            </TabsContent>

            <TabsContent value="medidas" className="space-y-4 pt-4">
              <p className="text-xs text-muted-foreground">Medidas gerais do produto. Variações podem ter medidas próprias.</p>
              <div className="grid grid-cols-5 gap-2">
                <div><Label>Largura</Label><Input type="number" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} /></div>
                <div><Label>Altura</Label><Input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} /></div>
                <div><Label>Profund.</Label><Input type="number" value={form.depth} onChange={(e) => setForm({ ...form, depth: e.target.value })} /></div>
                <div><Label>Compr.</Label><Input type="number" value={form.length_cm} onChange={(e) => setForm({ ...form, length_cm: e.target.value })} /></div>
                <div><Label>Peso</Label><Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
              </div>
              <div>
                <Label>Unidade</Label>
                <Select value={form.measure_unit} onValueChange={(v) => setForm({ ...form, measure_unit: v })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cm">cm / kg</SelectItem>
                    <SelectItem value="m">m / kg</SelectItem>
                    <SelectItem value="mm">mm / g</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="variacoes" className="space-y-4 pt-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40">
                <div>
                  <Label className="text-sm font-medium">Este produto tem variações</Label>
                  <p className="text-xs text-muted-foreground">Ative para gerenciar cores, tecidos, tamanhos com preço e estoque próprios.</p>
                </div>
                <Switch checked={form.has_variations} onCheckedChange={(v) => { setForm({ ...form, has_variations: v }); if (v && variations.length === 0) setVariations([emptyVariation()]); }} />
              </div>
              {form.has_variations && (
                <VariationEditor value={variations} onChange={setVariations} parentName={form.name} parentCategory={form.category} />
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="rounded-2xl">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="rounded-3xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Editar {selected.size} produto(s) em lote</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Deixe "(manter)" nos campos que não devem ser alterados.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Categoria</Label>
                <Select value={bulk.category} onValueChange={(v) => setBulk({ ...bulk, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__keep__">(manter)</SelectItem>
                    <SelectItem value="">Sem categoria</SelectItem>
                    {allCats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Fornecedor</Label>
                <Select value={bulk.supplier_id} onValueChange={(v) => setBulk({ ...bulk, supplier_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__keep__">(manter)</SelectItem>
                    <SelectItem value="">Sem fornecedor</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Status</Label>
                <Select value={bulk.status} onValueChange={(v) => setBulk({ ...bulk, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__keep__">(manter)</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="discontinued">Fora de linha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Estoque mínimo</Label><Input type="number" value={bulk.min_stock} onChange={(e) => setBulk({ ...bulk, min_stock: e.target.value })} placeholder="(manter)" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ajustar estoque (+/−)</Label><Input type="number" value={bulk.adjust_stock} onChange={(e) => setBulk({ ...bulk, adjust_stock: e.target.value })} placeholder="Ex: -1 ou +5" /></div>
              <div><Label>Ajustar preço (%)</Label><Input type="number" value={bulk.adjust_price_pct} onChange={(e) => setBulk({ ...bulk, adjust_price_pct: e.target.value })} placeholder="Ex: 10 ou -5" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>Cancelar</Button>
            <Button onClick={applyBulkEdit} className="rounded-2xl">Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
