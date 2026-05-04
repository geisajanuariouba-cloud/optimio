import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Boxes, Pencil, Trash2, AlertTriangle } from "lucide-react";

type Product = { id: string; name: string; category: string | null; stock: number; min_stock: number; sale_price: number; cost: number | null; is_ingredient_residue: boolean };

export default function Products() {
  const { user } = useAuth();
  const [list, setList] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", category: "", stock: 0, min_stock: 5, sale_price: 0, cost: 0, is_ingredient_residue: false });

  const load = async () => {
    const { data, error } = await supabase.from("products").select("*").is("deleted_at", null).order("name");
    if (error) toast.error(error.message); else setList(data as Product[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const openNew = () => { setEditing(null); setForm({ name: "", category: "", stock: 0, min_stock: 5, sale_price: 0, cost: 0, is_ingredient_residue: false }); setOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, category: p.category ?? "", stock: p.stock, min_stock: p.min_stock, sale_price: p.sale_price, cost: p.cost ?? 0, is_ingredient_residue: p.is_ingredient_residue }); setOpen(true); };

  const save = async () => {
    if (!user || !form.name.trim()) return toast.error("Nome obrigatório");
    const payload = { ...form, user_id: user.id, category: form.category || null };
    const { error } = editing ? await supabase.from("products").update(payload).eq("id", editing.id) : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Mover para a lixeira?")) return;
    await supabase.from("products").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const lowStock = list.filter(p => p.stock <= p.min_stock).length;

  return (
    <div>
      <PageHeader title="Produtos & Estoque" description="Produtos, ingredientes e sobras (com alerta de estoque baixo)." actionLabel="Produto" onAction={openNew} />
      <MetricsRow items={[
        { label: "Cadastrados", value: String(list.length) },
        { label: "Estoque baixo", value: String(lowStock), hint: "abaixo do mínimo" },
        { label: "Valor estoque", value: `R$ ${list.reduce((a, p) => a + p.stock * (p.cost ?? 0), 0).toFixed(0)}` },
        { label: "Margem média", value: `${Math.round(list.reduce((a, p) => a + (p.sale_price > 0 ? (p.sale_price - (p.cost ?? 0)) / p.sale_price : 0), 0) / Math.max(list.length, 1) * 100)}%` },
      ]} />

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon={Boxes} title="Estoque vazio" description="Cadastre seus produtos e ingredientes para controlar entradas e saídas." actionLabel="Produto" onAction={openNew} />
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Produto</TableHead><TableHead>Categoria</TableHead><TableHead>Estoque</TableHead>
              <TableHead>Preço</TableHead><TableHead>Custo</TableHead><TableHead className="w-24" />
            </TableRow></TableHeader>
            <TableBody>
              {list.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    {p.name}
                    {p.is_ingredient_residue && <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600">ingrediente</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.category ?? "—"}</TableCell>
                  <TableCell>
                    <span className={p.stock <= p.min_stock ? "text-amber-600 font-medium flex items-center gap-1" : ""}>
                      {p.stock <= p.min_stock && <AlertTriangle className="h-3 w-3" />}
                      {p.stock} <span className="text-muted-foreground text-xs">/ min {p.min_stock}</span>
                    </span>
                  </TableCell>
                  <TableCell>R$ {p.sale_price.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">R$ {(p.cost ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
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
