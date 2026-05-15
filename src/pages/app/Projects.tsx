import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/PageHeader";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Task = { id: string; title: string; description: string | null; status: string; due_date: string | null };

const COLUMNS = [
  { key: "todo", title: "A Fazer", color: "bg-amber-500/10 border-amber-500/30" },
  { key: "in_progress", title: "Em Andamento", color: "bg-blue-500/10 border-blue-500/30" },
  { key: "done", title: "Concluído", color: "bg-emerald-500/10 border-emerald-500/30" },
];

export default function Projects() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", status: "todo" });

  const load = async () => {
    const { data } = await supabase.from("tasks").select("id,title,description,status,due_date").is("deleted_at", null).is("linked_post_id", null).order("created_at", { ascending: false });
    setTasks((data ?? []) as Task[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const create = async () => {
    if (!user || !form.title) return toast.error("Título obrigatório");
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id, title: form.title, description: form.description || null,
      due_date: form.due_date || null, status: form.status,
    });
    if (error) return toast.error(error.message);
    toast.success("Tarefa criada");
    setOpen(false); setForm({ title: "", description: "", due_date: "", status: "todo" }); load();
  };

  const move = async (id: string, status: string) => {
    await supabase.from("tasks").update({ status }).eq("id", id); load();
  };
  const remove = async (id: string) => {
    await supabase.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id); load();
  };

  const onDragStart = (e: React.DragEvent, id: string) => e.dataTransfer.setData("id", id);
  const onDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("id");
    if (id) move(id, status);
  };

  return (
    <div>
      <PageHeader title="Projetos" description="Kanban interno: organize tarefas da empresa." actionLabel="Nova tarefa" onAction={() => setOpen(true)} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {COLUMNS.map(col => (
          <div key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, col.key)}
            className={`rounded-3xl border-2 border-dashed ${col.color} p-3 min-h-[400px]`}>
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="font-semibold">{col.title}</h3>
              <span className="text-xs text-muted-foreground">{tasks.filter(t => t.status === col.key).length}</span>
            </div>
            <div className="space-y-2">
              {tasks.filter(t => t.status === col.key).map(t => (
                <Card key={t.id} draggable onDragStart={(e) => onDragStart(e, t.id)}
                  className="p-3 rounded-2xl border-0 shadow-sm cursor-move hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{t.title}</div>
                      {t.description && <div className="text-xs text-muted-foreground mt-1">{t.description}</div>}
                      {t.due_date && <div className="text-xs text-primary mt-1">📅 {new Date(t.due_date).toLocaleDateString("pt-BR")}</div>}
                    </div>
                    <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={create}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
