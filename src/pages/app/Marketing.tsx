import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Megaphone, Trash2, ArrowRight, ListTodo, Plus, Calendar as CalIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTenant } from "@/hooks/useTenant";

type Task = { id: string; title: string; due_date: string | null; status: string };

type Post = { id: string; title: string; content: string | null; channel: string; scheduled_for: string | null; status: string };

const COLS: { key: string; label: string }[] = [
  { key: "idea", label: "Ideias" },
  { key: "scheduled", label: "Agendado" },
  { key: "published", label: "Publicado" },
];
const CHANNELS = ["instagram", "tiktok", "facebook", "whatsapp", "email"];

export default function Marketing() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", channel: "instagram", scheduled_for: "", status: "idea" });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");

  const load = async () => {
    const [{ data: posts, error }, { data: ts }] = await Promise.all([
      supabase.from("marketing_posts").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("tasks").select("id, title, due_date, status").is("deleted_at", null).order("due_date", { ascending: true, nullsFirst: false }),
    ]);
    if (error) toast.error(error.message); else setPosts((posts ?? []) as Post[]);
    setTasks((ts ?? []) as Task[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const save = async () => {
    if (!user || !form.title.trim()) return toast.error("Título obrigatório");
    const { error } = await supabase.from("marketing_posts").insert({
      user_id: user.id, title: form.title, content: form.content || null, channel: form.channel,
      scheduled_for: form.scheduled_for || null, status: form.status,
    });
    if (error) return toast.error(error.message);
    toast.success("Post criado"); setOpen(false);
    setForm({ title: "", content: "", channel: "instagram", scheduled_for: "", status: "idea" });
    load();
  };

  const move = async (id: string, status: string) => { await supabase.from("marketing_posts").update({ status }).eq("id", id); load(); };
  const remove = async (id: string) => { await supabase.from("marketing_posts").update({ deleted_at: new Date().toISOString() }).eq("id", id); load(); };

  const next = (s: string) => s === "idea" ? "scheduled" : s === "scheduled" ? "published" : null;

  const addTask = async () => {
    if (!user || !taskTitle.trim()) return;
    await supabase.from("tasks").insert({ user_id: user.id, title: taskTitle, due_date: taskDate || null });
    setTaskTitle(""); setTaskDate(""); load();
  };
  const toggleTask = async (t: Task) => {
    await supabase.from("tasks").update({ status: t.status === "done" ? "todo" : "done" }).eq("id", t.id);
    load();
  };
  const taskToPost = async (t: Task) => {
    if (!user) return;
    await supabase.from("marketing_posts").insert({
      user_id: user.id, title: t.title, channel: "instagram", scheduled_for: t.due_date, status: "scheduled",
    });
    await supabase.from("tasks").update({ status: "scheduled" }).eq("id", t.id);
    toast.success("Tarefa virou post agendado");
    load();
  };

  // Build calendar grid (current month)
  const today = new Date();
  const year = today.getFullYear(); const month = today.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const eventsOn = (day: number) => {
    const ds = new Date(year, month, day).toISOString().slice(0, 10);
    return [
      ...posts.filter(p => p.scheduled_for === ds).map(p => ({ kind: "post", title: p.title })),
      ...tasks.filter(t => t.due_date === ds).map(t => ({ kind: "task", title: t.title })),
    ];
  };

  return (
    <div>
      <PageHeader title="Marketing Hub" description="Kanban de ideias, agendados e publicados — multi-canal." actionLabel="Post" onAction={() => setOpen(true)} />
      <MetricsRow items={[
        { label: "Ideias", value: String(posts.filter(p => p.status === "idea").length) },
        { label: "Agendados", value: String(posts.filter(p => p.status === "scheduled").length) },
        { label: "Publicados", value: String(posts.filter(p => p.status === "published").length) },
        { label: "Esta semana", value: String(posts.filter(p => p.scheduled_for && new Date(p.scheduled_for).getTime() < Date.now() + 7 * 86400000 && new Date(p.scheduled_for).getTime() > Date.now()).length) },
      ]} />

      {/* Calendar + To-Do */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-4 mb-6">
        <Card className="rounded-3xl border-0 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4 font-semibold"><CalIcon className="h-4 w-4 text-primary" />{today.toLocaleString("pt-BR", { month: "long", year: "numeric" })}</div>
          <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-2">{["D","S","T","Q","Q","S","S"].map((d, i) => <div key={i} className="text-center">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => (
              <div key={i} className={`min-h-[70px] rounded-xl p-1 text-xs ${d ? "bg-secondary/40" : ""}`}>
                {d && <div className="font-medium">{d}</div>}
                {d && eventsOn(d).slice(0, 2).map((e, k) => (
                  <div key={k} className={`mt-0.5 px-1.5 py-0.5 rounded truncate ${e.kind === "post" ? "bg-primary/20 text-primary" : "bg-cyan-500/20 text-cyan-700"}`}>{e.title}</div>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4 font-semibold"><ListTodo className="h-4 w-4 text-primary" />To-Do List</div>
          <div className="flex gap-2 mb-3">
            <Input placeholder="Nova tarefa…" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} />
            <Input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} className="w-36" />
            <Button size="icon" onClick={addTask}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-auto">
            {tasks.length === 0 && <div className="text-xs text-muted-foreground">Sem tarefas. Adicione e arraste para virar post.</div>}
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-2 p-2 rounded-xl bg-secondary/40 text-sm">
                <Switch checked={t.status === "done"} onCheckedChange={() => toggleTask(t)} />
                <div className="flex-1">
                  <div className={t.status === "done" ? "line-through text-muted-foreground" : ""}>{t.title}</div>
                  {t.due_date && <div className="text-[10px] text-muted-foreground">{new Date(t.due_date).toLocaleDateString("pt-BR")}</div>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => taskToPost(t)}>→ Post</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>


        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={Megaphone} title="Sem posts ainda" description="Crie ideias, agende publicações e organize seu calendário editorial." actionLabel="Post" onAction={() => setOpen(true)} />
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {COLS.map(col => (
            <Card key={col.key} className="p-4 rounded-3xl border-0 shadow-sm">
              <div className="font-semibold mb-3 flex items-center justify-between">
                {col.label}
                <span className="text-xs text-muted-foreground">{posts.filter(p => p.status === col.key).length}</span>
              </div>
              <div className="space-y-2">
                {posts.filter(p => p.status === col.key).map(p => (
                  <div key={p.id} className="p-3 rounded-2xl bg-secondary/50 group">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium text-sm">{p.title}</div>
                      <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                    {p.content && <div className="text-xs text-muted-foreground line-clamp-2 mb-2">{p.content}</div>}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">{p.channel}</span>
                      {next(p.status) && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => move(p.id, next(p.status)!)}>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Novo post</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Conteúdo / legenda</Label><Textarea rows={3} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Canal</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COLS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Data agendada</Label><Input type="date" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} /></div>
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
