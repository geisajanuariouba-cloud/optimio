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
import { Scissors, Pencil, Trash2 } from "lucide-react";

type Service = { id: string; name: string; category: string | null; duration_minutes: number; starting_price: number; cost: number | null };

export default function Services() {
  const { user } = useAuth();
  const [list, setList] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: "", category: "", duration_minutes: 60, starting_price: 0, cost: 0 });

  const load = async () => {
    const { data, error } = await supabase.from("services").select("*").is("deleted_at", null).order("name");
    if (error) toast.error(error.message); else setList(data as Service[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const openNew = () => { setEditing(null); setForm({ name: "", category: "", duration_minutes: 60, starting_price: 0, cost: 0 }); setOpen(true); };
  const openEdit = (s: Service) => { setEditing(s); setForm({ name: s.name, category: s.category ?? "", duration_minutes: s.duration_minutes, starting_price: s.starting_price, cost: s.cost ?? 0 }); setOpen(true); };

  const save = async () => {
    if (!user || !form.name.trim()) return toast.error("Nome obrigatório");
    const payload = { ...form, user_id: user.id, category: form.category || null };
    const { error } = editing ? await supabase.from("services").update(payload).eq("id", editing.id) : await supabase.from("services").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Mover para a lixeira?")) return;
    await supabase.from("services").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const profitPerMin = (s: Service) => s.duration_minutes > 0 ? ((s.starting_price - (s.cost ?? 0)) / s.duration_minutes) : 0;

  return (
    <div>
      <PageHeader title="Serviços" description="Catálogo com lucro por minuto e duração." actionLabel="Serviço" onAction={openNew} />
      <MetricsRow items={[
        { label: "Cadastrados", value: String(list.length) },
        { label: "Preço médio", value: `R$ ${(list.reduce((a, s) => a + s.starting_price, 0) / Math.max(list.length, 1)).toFixed(0)}` },
        { label: "Duração média", value: `${Math.round(list.reduce((a, s) => a + s.duration_minutes, 0) / Math.max(list.length, 1))}min` },
        { label: "Categorias", value: String(new Set(list.map(s => s.category).filter(Boolean)).size) },
      ]} />

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon={Scissors} title="Nenhum serviço" description="Cadastre seus serviços para usar nos agendamentos." actionLabel="Serviço" onAction={openNew} />
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Duração</TableHead>
              <TableHead>Preço</TableHead><TableHead>Custo</TableHead><TableHead>R$/min</TableHead><TableHead className="w-24" />
            </TableRow></TableHeader>
            <TableBody>
              {list.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.category ?? "—"}</TableCell>
                  <TableCell>{s.duration_minutes}min</TableCell>
                  <TableCell>R$ {s.starting_price.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">R$ {(s.cost ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="font-medium text-emerald-600">R$ {profitPerMin(s).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{editing ? "Editar serviço" : "Novo serviço"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Cabelo, Estética…" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Duração (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: +e.target.value })} /></div>
              <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={form.starting_price} onChange={(e) => setForm({ ...form, starting_price: +e.target.value })} /></div>
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
