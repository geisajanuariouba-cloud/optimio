import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { KanbanSquare, Plus, Trash2, Calendar, User, MessageSquare, CheckSquare } from "lucide-react";

type Checklist = { id: string; text: string; done: boolean };
type Comment = { id: string; author_id: string; author_name: string; text: string; at: string };
type Project = {
  id: string; name: string; description: string | null; status: string;
  progress: number; due_date: string | null; responsible_user_id: string | null;
  checklist: Checklist[]; comments: Comment[]; created_at: string;
};
type Member = { member_user_id: string; name: string | null; email: string | null };

const STATUS: Record<string, { label: string; tone: string }> = {
  planned:   { label: "Planejado",   tone: "bg-slate-500/10 text-slate-600" },
  active:    { label: "Ativo",       tone: "bg-blue-500/10 text-blue-600" },
  delayed:   { label: "Atrasado",    tone: "bg-rose-500/10 text-rose-600" },
  done:      { label: "Concluído",   tone: "bg-emerald-500/10 text-emerald-600" },
};

const emptyForm = {
  id: "" as string,
  name: "", description: "", status: "active",
  progress: 0, due_date: "", responsible_user_id: "",
};

export default function Projects() {
  const { user } = useAuth();
  const { tenantOwnerId } = useTenant();
  const [list, setList] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [detail, setDetail] = useState<Project | null>(null);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newComment, setNewComment] = useState("");

  const load = async () => {
    if (!tenantOwnerId) return;
    const { data, error } = await supabase
      .from("projects").select("*")
      .eq("user_id", tenantOwnerId).is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) return toast.error(friendlyError(error));
    setList((data ?? []).map((p: any) => ({
      ...p,
      checklist: Array.isArray(p.checklist) ? p.checklist : [],
      comments: Array.isArray(p.comments) ? p.comments : [],
    })) as Project[]);
  };
  const loadMembers = async () => {
    if (!tenantOwnerId) return;
    const { data } = await supabase.from("team_members")
      .select("member_user_id,name,email")
      .eq("owner_user_id", tenantOwnerId).eq("status", "active");
    setMembers((data ?? []) as Member[]);
  };
  useEffect(() => { load(); loadMembers(); }, [tenantOwnerId]);

  const save = async () => {
    if (!user || !form.name.trim()) return toast.error("Nome obrigatório");
    const payload: any = {
      user_id: user.id,
      name: form.name, description: form.description || null,
      status: form.status, progress: Number(form.progress) || 0,
      due_date: form.due_date || null,
      responsible_user_id: form.responsible_user_id || null,
    };
    if (form.id) {
      const { error } = await supabase.from("projects").update(payload).eq("id", form.id);
      if (error) return toast.error(friendlyError(error));
    } else {
      const { error } = await supabase.from("projects").insert(payload);
      if (error) return toast.error(friendlyError(error));
    }
    toast.success("Projeto salvo");
    setOpen(false); setForm(emptyForm); load();
  };

  const remove = async (id: string) => {
    await supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    setDetail(null); load();
  };

  const openEdit = (p: Project) => {
    setForm({
      id: p.id, name: p.name, description: p.description ?? "",
      status: p.status, progress: p.progress,
      due_date: p.due_date ?? "", responsible_user_id: p.responsible_user_id ?? "",
    });
    setOpen(true);
  };

  const persistDetail = async (next: Project) => {
    setDetail(next);
    await supabase.from("projects").update({
      checklist: next.checklist, comments: next.comments, progress: next.progress,
    } as any).eq("id", next.id);
    load();
  };

  const addChecklist = () => {
    if (!detail || !newChecklistItem.trim()) return;
    const next = {
      ...detail,
      checklist: [...detail.checklist, { id: crypto.randomUUID(), text: newChecklistItem.trim(), done: false }],
    };
    setNewChecklistItem("");
    persistDetail(next);
  };
  const toggleChecklist = (id: string) => {
    if (!detail) return;
    const cl = detail.checklist.map(c => c.id === id ? { ...c, done: !c.done } : c);
    const progress = cl.length ? Math.round(cl.filter(c => c.done).length * 100 / cl.length) : detail.progress;
    persistDetail({ ...detail, checklist: cl, progress });
  };
  const removeChecklist = (id: string) => {
    if (!detail) return;
    const cl = detail.checklist.filter(c => c.id !== id);
    const progress = cl.length ? Math.round(cl.filter(c => c.done).length * 100 / cl.length) : 0;
    persistDetail({ ...detail, checklist: cl, progress });
  };
  const addComment = () => {
    if (!detail || !user || !newComment.trim()) return;
    const me = members.find(m => m.member_user_id === user.id);
    const authorName = me?.name || me?.email || "Você";
    const next = {
      ...detail,
      comments: [...detail.comments, {
        id: crypto.randomUUID(), author_id: user.id, author_name: authorName,
        text: newComment.trim(), at: new Date().toISOString(),
      }],
    };
    setNewComment("");
    persistDetail(next);
  };

  const memberName = (id: string | null) =>
    members.find(m => m.member_user_id === id)?.name
    ?? members.find(m => m.member_user_id === id)?.email
    ?? "—";

  const today = new Date().toISOString().slice(0, 10);
  const stats = useMemo(() => ({
    active: list.filter(p => p.status === "active").length,
    delayed: list.filter(p => p.status !== "done" && p.due_date && p.due_date < today).length,
    done: list.filter(p => p.status === "done").length,
  }), [list]);

  return (
    <div>
      <PageHeader
        title="Projetos"
        description="Acompanhe progresso, prazo e responsável de cada projeto."
        actionLabel="Novo projeto"
        onAction={() => { setForm(emptyForm); setOpen(true); }}
      />

      <MetricsRow items={[
        { label: "Ativos", value: String(stats.active), tone: "primary" },
        { label: "Atrasados", value: String(stats.delayed), tone: stats.delayed ? "danger" : "primary" },
        { label: "Concluídos", value: String(stats.done), tone: "success" },
      ]} />

      {list.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={KanbanSquare} title="Sem projetos" description="Crie seu primeiro projeto." actionLabel="Novo projeto" onAction={() => setOpen(true)} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map(p => {
            const isLate = p.status !== "done" && p.due_date && p.due_date < today;
            const st = STATUS[p.status] ?? STATUS.active;
            return (
              <Card key={p.id} className="p-4 rounded-3xl border-0 shadow-sm hover:shadow-md transition cursor-pointer"
                onClick={() => setDetail(p)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    {p.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.description}</div>}
                  </div>
                  <Badge className={`text-[10px] ${st.tone}`}>{st.label}</Badge>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">{p.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
                  {p.due_date && (
                    <span className={`flex items-center gap-1 ${isLate ? "text-rose-600" : ""}`}>
                      <Calendar className="h-3 w-3" />{new Date(p.due_date).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                  {p.responsible_user_id && (
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{memberName(p.responsible_user_id)}</span>
                  )}
                  <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" />{p.checklist.filter(c => c.done).length}/{p.checklist.length}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{p.comments.length}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Editar projeto" : "Novo projeto"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Progresso (%)</Label>
                <Input type="number" min={0} max={100} value={form.progress} onChange={e => setForm({ ...form, progress: e.target.value })} />
              </div>
              <div><Label>Prazo</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div><Label>Responsável</Label>
                <Select value={form.responsible_user_id || "none"} onValueChange={v => setForm({ ...form, responsible_user_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhum —</SelectItem>
                    {members.map(m => (
                      <SelectItem key={m.member_user_id} value={m.member_user_id}>{m.name || m.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="rounded-3xl max-w-2xl max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detail.name}
                  <Badge className={`text-[10px] ${(STATUS[detail.status] ?? STATUS.active).tone}`}>
                    {(STATUS[detail.status] ?? STATUS.active).label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {detail.description && <p className="text-sm text-muted-foreground">{detail.description}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(detail)}>Editar</Button>
                  <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => remove(detail.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" />Excluir
                  </Button>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Checklist</div>
                  <div className="space-y-1">
                    {detail.checklist.map(c => (
                      <div key={c.id} className="flex items-center gap-2">
                        <Checkbox checked={c.done} onCheckedChange={() => toggleChecklist(c.id)} />
                        <span className={`flex-1 text-sm ${c.done ? "line-through text-muted-foreground" : ""}`}>{c.text}</span>
                        <button onClick={() => removeChecklist(c.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input placeholder="Novo item" value={newChecklistItem}
                      onChange={e => setNewChecklistItem(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addChecklist(); }} />
                    <Button size="sm" onClick={addChecklist}><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Comentários</div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {detail.comments.map(c => (
                      <div key={c.id} className="p-2 rounded-xl bg-muted/40">
                        <div className="text-xs text-muted-foreground">{c.author_name} · {new Date(c.at).toLocaleString("pt-BR")}</div>
                        <div className="text-sm">{c.text}</div>
                      </div>
                    ))}
                    {detail.comments.length === 0 && <div className="text-xs text-muted-foreground">Sem comentários ainda.</div>}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Textarea rows={2} placeholder="Escrever..." value={newComment}
                      onChange={e => setNewComment(e.target.value)} />
                    <Button size="sm" onClick={addComment}>Enviar</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
