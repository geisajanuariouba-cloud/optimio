import { useEffect, useMemo, useState } from "react";
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
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Boxes, Pencil, Trash2, AlertTriangle, Trophy } from "lucide-react";
import { CategorySelect } from "@/components/app/CategorySelect";

type Supplier = { id: string; name: string };
type Product = { id: string; name: string; category: string | null; stock: number; min_stock: number; sale_price: number; cost: number | null; is_ingredient_residue: boolean; supplier_id: string | null; status: string };

const isLowStock = (p: Product) => {
  // anti-spam: if min_stock = 0 AND stock = 0 => no alarm
  if (p.min_stock === 0 && p.stock === 0) return false;
  return p.stock <= p.min_stock;
};

const emptyForm = { name: "", category: "", stock: 0, min_stock: 5, sale_price: 0, cost: 0, is_ingredient_residue: false, supplier_id: "", status: "active" };

export default function Products() {
  const { user } = useAuth();
  const [list, setList] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const [filter, setFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [period, setPeriod] = useState<string>("30");
  const [bestSeller, setBestSeller] = useState<{ name: string; count: number } | null>(null);

  const load = async () => {
    const [a, b] = await Promise.all([
      supabase.from("products").select("*").is("deleted_at", null).order("name"),
      supabase.from("suppliers").select("id,name").is("deleted_at", null).order("name"),
    ]);
    setList((a.data ?? []) as Product[]);
    setSuppliers((b.data ?? []) as Supplier[]);
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

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, category: p.category ?? "", stock: p.stock, min_stock: p.min_stock, sale_price: p.sale_price, cost: p.cost ?? 0, is_ingredient_residue: p.is_ingredient_residue, supplier_id: p.supplier_id ?? "", status: p.status ?? "active" });
    setOpen(true);
  };

  const save = async () => {
    if (!user || !form.name.trim()) return toast.error("Nome obrigatório");
    const payload: any = { ...form, user_id: user.id, category: form.category || null, supplier_id: form.supplier_id || null };
    const { error } = editing ? await supabase.from("products").update(payload).eq("id", editing.id) : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Mover para a lixeira?")) return;
    await supabase.from("products").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const filtered = useMemo(() => {
    let r = list;
    if (statusFilter !== "all") r = r.filter(p => p.status === statusFilter);
    if (filter !== "all") r = r.filter(p => (p.category ?? "") === filter);
    return r;
  }, [list, filter, statusFilter]);
  const lowStock = filtered.filter(isLowStock).length;
  const allCats = Array.from(new Set(list.map(p => p.category).filter(Boolean) as string[]));

  return (
    <div>
      <PageHeader title="Produtos & Estoque" description="Estoque, fornecedores e produtos fora de linha." actionLabel="Produto" onAction={openNew} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="discontinued">Fora de linha</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {allCats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
            <SelectItem value="365">1 ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <MetricsRow items={[
        { label: "Cadastrados", value: String(filtered.length), tone: "primary" },
        { label: "Estoque baixo", value: String(lowStock), tone: lowStock > 0 ? "warning" : "primary", hint: "abaixo do mínimo" },
        { label: "Valor estoque", value: `R$ ${filtered.reduce((a, p) => a + p.stock * Number(p.cost ?? 0), 0).toFixed(0)}`, tone: "primary" },
        { label: `Mais vendido (${period}d)`, value: bestSeller?.name ?? "—", tone: "primary", hint: bestSeller ? `${bestSeller.count} vendas` : "sem dados" },
      ]} />

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Boxes} title="Estoque vazio" description="Cadastre seus produtos para controlar entradas e saídas." actionLabel="Produto" onAction={openNew} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Produto</TableHead><TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Fornecedor</TableHead>
                <TableHead>Estoque</TableHead><TableHead>Preço</TableHead>
                <TableHead className="w-24" />
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(p => {
                  const sup = suppliers.find(s => s.id === p.supplier_id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          {p.name}
                          {bestSeller?.name === p.name && <Trophy className="h-3 w-3 text-amber-500" />}
                          {p.status === "discontinued" && <Badge className="bg-amber-500/15 text-amber-600 text-[10px]">fora de linha</Badge>}
                          {p.is_ingredient_residue && <Badge className="bg-cyan-500/10 text-cyan-600 text-[10px]">ingrediente</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">{p.category ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{sup?.name ?? "—"}</TableCell>
                      <TableCell>
                        <span className={isLowStock(p) ? "text-amber-500 font-medium flex items-center gap-1" : ""}>
                          {isLowStock(p) && <AlertTriangle className="h-3 w-3" />}
                          {p.stock} <span className="text-muted-foreground text-xs">/ min {p.min_stock}</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-primary">R$ {Number(p.sale_price).toFixed(2)}</TableCell>
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
        <DialogContent className="rounded-3xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Categoria</Label>
                <CategorySelect kind="product" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
              </div>
              <div><Label>Fornecedor / Fábrica</Label>
                <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem fornecedor</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Estoque atual</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} /></div>
              <div><Label>Estoque mínimo</Label><Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Preço de venda (R$)</Label><Input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: +e.target.value })} /></div>
              <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: +e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">💡 Estoque mínimo = 0 e estoque atual = 0 não dispara alarme.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="rounded-2xl">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
