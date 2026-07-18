import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Megaphone, Trash2, ArrowRight, ListTodo, Plus, Calendar as CalIcon, Sparkles, Loader2, Instagram, BarChart3, Clock } from "lucide-react";
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
  const { profile } = useTenant();
  const [posts, setPosts] = useState<Post[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", channel: "instagram", scheduled_for: "", status: "idea" });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ analysis?: string; instagram_insights?: string[]; ideas?: any[] } | null>(null);
  const [instagramHandle, setInstagramHandle] = useState("");
  const [instagramId, setInstagramId] = useState<string | null>(null);

  const load = async () => {
    const [{ data: posts, error }, { data: ts }, { data: ig }] = await Promise.all([
      supabase.from("marketing_posts").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("tasks").select("id, title, due_date, status").is("deleted_at", null).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("tenant_integrations").select("id,metadata,status").eq("provider", "instagram").maybeSingle(),
    ]);
    if (error) toast.error(friendlyError(error)); else setPosts((posts ?? []) as Post[]);
    setTasks((ts ?? []) as Task[]);
    setInstagramHandle(((ig?.metadata as any)?.handle ?? "") as string);
    setInstagramId((ig as any)?.id ?? null);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const save = async () => {
    if (!user || !form.title.trim()) return toast.error("Título obrigatório");
    const { error } = await supabase.from("marketing_posts").insert({
      user_id: user.id, title: form.title, content: form.content || null, channel: form.channel,
      scheduled_for: form.scheduled_for || null, status: form.status,
    });
    if (error) return toast.error(friendlyError(error));
    toast.success("Post criado"); setOpen(false);
    setForm({ title: "", content: "", channel: "instagram", scheduled_for: "", status: "idea" });
    load();
  };

  const move = async (id: string, status: string) => { await supabase.from("marketing_posts").update({ status }).eq("id", id); load(); };
  const remove = async (id: string) => { await supabase.from("marketing_posts").update({ deleted_at: new Date().toISOString() }).eq("id", id); load(); };

  const next = (s: string) => s === "idea" ? "scheduled" : s === "scheduled" ? "published" : null;

  const addTask = async () => {
    if (!user || !taskTitle.trim()) return;
    await supabase.from("tasks").insert({ user_id: user.id, title: taskTitle, due_date: taskDate || null, status: "todo" });
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

  const saveInstagram = async () => {
    if (!user || !instagramHandle.trim()) return toast.error("Informe o @ do Instagram");
    const payload = { user_id: user.id, provider: "instagram", status: "connected", config: { handle: instagramHandle.trim().replace(/^@/, "") } };
    const { error } = instagramId
      ? await supabase.from("integrations").update(payload).eq("id", instagramId)
      : await supabase.from("integrations").insert(payload);
    if (error) return toast.error(friendlyError(error));
    toast.success("Instagram conectado para análise");
    load();
  };

  // Build calendar grid (current month)
  const runAI = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data: prods } = await supabase.from("products").select("name,sale_price").is("deleted_at", null).eq("status", "active").limit(20);
      const { data, error } = await supabase.functions.invoke("marketing-ai", {
        body: {
          niche: (profile as any)?.niche ?? "geral",
          recent_posts: posts.slice(0, 10).map(p => ({ title: p.title, channel: p.channel, status: p.status })),
          top_products: prods ?? [],
          instagram: { handle: instagramHandle, local_posts: posts.filter(p => p.channel === "instagram").slice(0, 20) },
          goal: "engajamento e conversão de vendas",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiResult(data);
    } catch (e: any) {
      toast.error(friendlyError(e, "Erro ao gerar sugestões"));
    } finally {
      setAiLoading(false);
    }
  };
  const useIdea = async (idea: any) => {
    if (!user) return;
    await supabase.from("marketing_posts").insert({
      user_id: user.id, title: idea.title, content: idea.caption || idea.hook,
      channel: idea.channel || "instagram", status: "idea",
    });
    toast.success("Ideia adicionada ao Kanban");
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

  const igPosts = posts.filter(p => p.channel === "instagram");
  const igScheduled = igPosts.filter(p => p.status === "scheduled").length;
  const igPublished = igPosts.filter(p => p.status === "published").length;
  const igFrequency = igPosts.length ? Math.max(1, Math.round(igPosts.length / 4)) : 0;
  const bestFormats = ["Antes/depois", "Bastidores", "Prova social", "Catálogo em vídeo"];

  return (
    <div>
      <PageHeader title="Marketing Hub" description="Kanban de ideias, agendados e publicados — multi-canal." actionLabel="Post" onAction={() => setOpen(true)} />
      <MetricsRow items={[
        { label: "Ideias", value: String(posts.filter(p => p.status === "idea").length) },
        { label: "Agendados", value: String(posts.filter(p => p.status === "scheduled").length) },
        { label: "Publicados", value: String(posts.filter(p => p.status === "published").length) },
        { label: "Esta semana", value: String(posts.filter(p => p.scheduled_for && new Date(p.scheduled_for).getTime() < Date.now() + 7 * 86400000 && new Date(p.scheduled_for).getTime() > Date.now()).length) },
      ]} />

      <Card className="rounded-3xl border-0 shadow-sm p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 font-semibold"><Instagram className="h-5 w-5 text-primary" />Dashboard Instagram</div>
          <div className="flex gap-2 w-full md:w-auto">
            <Input value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} placeholder="@seuperfil" className="md:w-48" />
            <Button onClick={saveInstagram} variant="secondary">Conectar</Button>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-3 mb-4">
          {[
            { icon: BarChart3, label: "Posts Instagram", value: igPosts.length },
            { icon: Clock, label: "Frequência/mês", value: igFrequency },
            { icon: CalIcon, label: "Agendados", value: igScheduled },
            { icon: Sparkles, label: "Publicados", value: igPublished },
          ].map((m) => <div key={m.label} className="rounded-2xl bg-secondary/40 p-3 text-sm"><m.icon className="h-4 w-4 text-primary mb-2" /><div className="text-muted-foreground text-xs">{m.label}</div><div className="text-xl font-bold">{m.value}</div></div>)}
        </div>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-primary/5 p-3"><div className="font-medium mb-2">Formatos prioritários</div><div className="flex flex-wrap gap-1.5">{bestFormats.map(f => <Badge key={f} variant="secondary">{f}</Badge>)}</div></div>
          <div className="rounded-2xl bg-secondary/40 p-3"><div className="font-medium mb-1">Próxima análise da IA</div><p className="text-muted-foreground text-xs">A IA usa o nicho, posts do Kanban e o perfil conectado para sugerir bio, destaques, frequência, stories, horários e ideias específicas.</p></div>
        </div>
      </Card>

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

      <Card className="rounded-3xl border-0 shadow-sm p-5 mb-6 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            Análise + IA de Marketing
          </div>
          <Button size="sm" onClick={runAI} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {aiLoading ? "Analisando…" : "Gerar sugestões"}
          </Button>
        </div>
        {!aiResult && !aiLoading && (
          <p className="text-sm text-muted-foreground">Clique em "Gerar sugestões" para que a IA analise seu nicho, posts recentes e top produtos, e proponha 5 ideias prontas para publicar.</p>
        )}
        {aiResult?.analysis && (
          <div className="text-sm text-muted-foreground mb-3 p-3 rounded-2xl bg-secondary/40">{aiResult.analysis}</div>
        )}
        {aiResult?.ideas && aiResult.ideas.length > 0 && (
          <div className="grid md:grid-cols-2 gap-3">
            {aiResult.ideas.map((idea: any, i: number) => (
              <div key={i} className="p-3 rounded-2xl bg-background border">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-medium text-sm">{idea.title}</div>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">{idea.channel}</span>
                </div>
                {idea.hook && <div className="text-xs text-muted-foreground italic mb-1">"{idea.hook}"</div>}
                {idea.caption && <div className="text-xs text-muted-foreground line-clamp-3 mb-2">{idea.caption}</div>}
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => useIdea(idea)}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar ao Kanban
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>


      {posts.length === 0 ? (
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
