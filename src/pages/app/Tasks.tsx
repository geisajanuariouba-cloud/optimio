import { useEffect, useMemo, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { CheckSquare, Plus, Sparkles, Calendar, Flag, Trash2 } from "lucide-react";

type Task = {
  id: string; title: string; description: string | null; status: string; priority: string;
  due_date: string | null; tags: string[]; ai_generated: boolean; completed_at: string | null;
  created_at: string; assignee_user_id: string | null;
};
type Member = { member_user_id: string; name: string | null; email: string | null };

const STATUS = [
  { key: "todo", label: "A fazer", tone: "bg-slate-500/10 text-slate-600" },
  { key: "in_progress", label: "Em andamento", tone: "bg-amber-500/10 text-amber-600" },
  { key: "done", label: "Concluído", tone: "bg-emerald-500/10 text-emerald-600" },
];

const PRIORITY: Record<string, { label: string; tone: string }> = {
  low: { label: "Baixa", tone: "bg-slate-500/10 text-slate-600" },
  medium: { label: "Média", tone: "bg-blue-500/10 text-blue-600" },
  high: { label: "Alta", tone: "bg-amber-500/10 text-amber-600" },
  urgent: { label: "Urgente", tone: "bg-rose-500/10 text-rose-600" },
};

const empty = { title: "", description: "", priority: "medium", due_date: "", tags: "", assignee_user_id: "" };

export default function Tasks() {
  const { user } = useAuth();
  const [list, setList] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const load = async () => {
    const { data } = await supabase.from("tasks").select("*").is("deleted_at", null).order("created_at", { ascending: false });
    setList((data ?? []) as Task[]);
  };
  const loadMembers = async () => {
    if (!user) return;
    const { data } = await supabase.from("team_members")
      .select("member_user_id,name,email").eq("user_id", user.id).eq("status", "active");
    setMembers((data ?? []) as Member[]);
  };
  useEffect(() => { if (user) { load(); loadMembers(); } }, [user]);

  const save = async () => {
    if (!user || !form.title.trim()) return toast.error("Título obrigatório");
    const tags = form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id, title: form.title, description: form.description || null,
      priority: form.priority, due_date: form.due_date || null, tags, status: "todo",
      assignee_user_id: form.assignee_user_id || null,
    });
    if (error) return toast.error(friendlyError(error));
    toast.success("Tarefa criada"); setOpen(false); setForm(empty); load();
  };

  const move = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "done") patch.completed_at = new Date().toISOString();
    await supabase.from("tasks").update(patch).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const generateAI = async () => {
    if (!user) return;
    const samples = [
      { title: "Revisar metas do mês", priority: "high", tags: ["estratégia"] },
      { title: "Conferir estoque baixo", priority: "medium", tags: ["estoque"] },
      { title: "Postar 3 conteúdos esta semana", priority: "medium", tags: ["marketing"] },
      { title: "Cobrar promissórias vencidas", priority: "urgent", tags: ["financeiro"] },
    ];
    await supabase.from("tasks").insert(samples.map(s => ({ ...s, user_id: user.id, ai_generated: true, status: "todo" })));
    toast.success("4 tarefas sugeridas pela IA"); load();
  };

  const byStatus = (s: string) => list.filter(t => t.status === s);
  const overdue = list.filter(t => t.status !== "done" && t.due_date && new Date(t.due_date) < new Date()).length;

  return (
    <div>
      <PageHeader title="Tarefas" description="Organize, priorize e delegue. Tudo em um lugar." actionLabel="Nova tarefa" onAction={() => setOpen(true)} />

      <div className="flex gap-2 mb-4">
        <Button variant="outline" className="rounded-2xl gap-2" onClick={generateAI}><Sparkles className="h-4 w-4" />Sugerir com IA</Button>
        <Tabs value={view} onValueChange={(v: any) => setView(v)}>
          <TabsList className="rounded-2xl">
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <MetricsRow items={[
        { label: "Total", value: String(list.length), tone: "primary" },
        { label: "Em andamento", value: String(byStatus("in_progress").length), tone: "primary" },
        { label: "Atrasadas", value: String(overdue), tone: overdue > 0 ? "danger" : "primary" },
        { label: "Concluídas", value: String(byStatus("done").length), tone: "success" },
      ]} />

      {list.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={CheckSquare} title="Sem tarefas" description="Crie sua primeira tarefa ou peça à IA para sugerir." actionLabel="Nova tarefa" onAction={() => setOpen(true)} />
        </Card>
      ) : view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS.map(col => (
            <Card key={col.key} className="rounded-3xl border-0 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${col.tone}`}>{col.label}</span>
                <span className="text-xs text-muted-foreground">{byStatus(col.key).length}</span>
              </div>
              <div className="space-y-2">
                {byStatus(col.key).map(t => (
                  <div key={t.id} className="p-3 rounded-2xl border border-border bg-background hover:shadow-sm transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm">{t.title}</div>
                      {t.ai_generated && <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </div>
                    {t.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</div>}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge variant="outline" className={`text-[10px] ${PRIORITY[t.priority]?.tone}`}>{PRIORITY[t.priority]?.label}</Badge>
                      {t.due_date && <Badge variant="outline" className="text-[10px]"><Calendar className="h-2.5 w-2.5 mr-1" />{new Date(t.due_date).toLocaleDateString("pt-BR")}</Badge>}
                      {t.assignee_user_id && (
                        <Badge variant="outline" className="text-[10px]">
                          {members.find(m => m.member_user_id === t.assignee_user_id)?.name
                            || members.find(m => m.member_user_id === t.assignee_user_id)?.email
                            || "Atribuído"}
                        </Badge>
                      )}
                      {t.tags?.map(tag => <Badge key={tag} variant="outline" className="text-[10px]">#{tag}</Badge>)}
                    </div>
                    <div className="flex gap-1 mt-2">
                      {STATUS.filter(s => s.key !== t.status).map(s => (
                        <Button key={s.key} size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => move(t.id, s.key)}>{s.label}</Button>
                      ))}
                      <Button size="sm" variant="ghost" className="h-7 text-rose-600 ml-auto" onClick={() => remove(t.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border overflow-hidden">
          {list.map(t => (
            <div key={t.id} className="p-3 flex items-center gap-3">
              <Flag className={`h-4 w-4 ${PRIORITY[t.priority]?.tone.split(" ")[1]}`} />
              <div className="flex-1">
                <div className="font-medium text-sm">{t.title}</div>
                <div className="text-xs text-muted-foreground">{STATUS.find(s=>s.key===t.status)?.label} · {PRIORITY[t.priority]?.label}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PRIORITY).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div><Label>Responsável</Label>
              <Select value={form.assignee_user_id || "none"} onValueChange={v => setForm({ ...form, assignee_user_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.member_user_id} value={m.member_user_id}>{m.name || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tags (separadas por vírgula)</Label><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="ex: marketing, urgente" /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} className="rounded-2xl">Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
