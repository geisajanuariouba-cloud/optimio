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

  const load = async () => {
    const { data, error } = await supabase.from("marketing_posts").select("*").is("deleted_at", null).order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setPosts(data as Post[]);
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

  return (
    <div>
      <PageHeader title="Marketing Hub" description="Kanban de ideias, agendados e publicados — multi-canal." actionLabel="Post" onAction={() => setOpen(true)} />
      <MetricsRow items={[
        { label: "Ideias", value: String(posts.filter(p => p.status === "idea").length) },
        { label: "Agendados", value: String(posts.filter(p => p.status === "scheduled").length) },
        { label: "Publicados", value: String(posts.filter(p => p.status === "published").length) },
        { label: "Esta semana", value: String(posts.filter(p => p.scheduled_for && new Date(p.scheduled_for).getTime() < Date.now() + 7 * 86400000 && new Date(p.scheduled_for).getTime() > Date.now()).length) },
      ]} />

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
