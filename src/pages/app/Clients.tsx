import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Users, Search, Pencil, Trash2, Phone, Mail } from "lucide-react";

type Client = { id: string; full_name: string; email: string | null; phone: string | null; notes: string | null; created_at: string };

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", notes: "" });

  const load = async () => {
    const { data, error } = await supabase.from("clients").select("*").is("deleted_at", null).order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setClients(data as Client[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const openNew = () => { setEditing(null); setForm({ full_name: "", email: "", phone: "", notes: "" }); setOpen(true); };
  const openEdit = (c: Client) => { setEditing(c); setForm({ full_name: c.full_name, email: c.email ?? "", phone: c.phone ?? "", notes: c.notes ?? "" }); setOpen(true); };

  const save = async () => {
    if (!user || !form.full_name.trim()) { toast.error("Nome obrigatório"); return; }
    const payload = { ...form, user_id: user.id, email: form.email || null, phone: form.phone || null, notes: form.notes || null };
    const { error } = editing
      ? await supabase.from("clients").update(payload).eq("id", editing.id)
      : await supabase.from("clients").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Cliente atualizado" : "Cliente criado");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Mover para a lixeira?")) return;
    const { error } = await supabase.from("clients").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Movido para lixeira"); load();
  };

  const filtered = clients.filter(c => c.full_name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? "").includes(search));
  const last30 = clients.filter(c => new Date(c.created_at).getTime() > Date.now() - 30 * 86400000).length;

  return (
    <div>
      <PageHeader title="Clientes" description="CRM com histórico, anamnese e métricas individuais." actionLabel="Cliente" onAction={openNew} />
      <MetricsRow items={[
        { label: "Total de clientes", value: String(clients.length) },
        { label: "Novos (30d)", value: String(last30) },
        { label: "Com telefone", value: String(clients.filter(c => c.phone).length) },
        { label: "Com e-mail", value: String(clients.filter(c => c.email).length) },
      ]} />

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone…" className="border-0 bg-transparent focus-visible:ring-0 h-9" />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum cliente ainda" description="Cadastre seu primeiro cliente para começar a montar o histórico." actionLabel="Cliente" onAction={openNew} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground space-y-1">
                    {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</div>}
                    {c.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{c.notes ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome completo *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
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
