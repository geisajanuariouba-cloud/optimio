import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Image, Trash2, Pencil, Star } from "lucide-react";

type Creative = {
  id: string; name: string; platform: string; format: string; file_url: string | null;
  thumbnail_url: string | null; status: string; hook_notes: string | null; performance_notes: string | null;
};

const PLATFORM_LABEL: Record<string, string> = { meta: "Meta", tiktok: "TikTok", google: "Google Ads" };
const FORMAT_LABEL: Record<string, string> = { video: "Vídeo", imagem: "Imagem", carrossel: "Carrossel" };
const STATUS_LABEL: Record<string, string> = { draft: "Rascunho", testing: "Testando", validated: "Validado", paused: "Pausado", killed: "Descartado" };
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  testing: "bg-amber-500/10 text-amber-600",
  validated: "bg-emerald-500/10 text-emerald-600",
  paused: "bg-secondary text-muted-foreground",
  killed: "bg-rose-500/10 text-rose-600",
};

const empty = { name: "", platform: "meta", format: "video", file_url: "", thumbnail_url: "", status: "draft", hook_notes: "", performance_notes: "" };

export default function AdCreatives() {
  const { user } = useAuth();
  const [list, setList] = useState<Creative[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Creative | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const load = async () => {
    const { data, error } = await supabase.from("ad_creatives" as any).select("*").is("deleted_at", null).order("created_at", { ascending: false });
    if (error) toast.error(friendlyError(error)); else setList((data ?? []) as Creative[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Creative) => {
    setEditing(c);
    setForm({
      name: c.name, platform: c.platform, format: c.format, file_url: c.file_url ?? "",
      thumbnail_url: c.thumbnail_url ?? "", status: c.status, hook_notes: c.hook_notes ?? "", performance_notes: c.performance_notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!user || !form.name.trim()) return toast.error("Nome obrigatório");
    const payload: any = { ...form, user_id: user.id };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    const { error } = editing
      ? await supabase.from("ad_creatives" as any).update(payload).eq("id", editing.id)
      : await supabase.from("ad_creatives" as any).insert(payload);
    if (error) return toast.error(friendlyError(error));
    toast.success(editing ? "Criativo atualizado" : "Criativo criado");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Mover para a lixeira?")) return;
    const { error } = await supabase.from("ad_creatives" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Movido para lixeira"); load();
  };

  const filtered = list.filter(c =>
    (statusFilter === "all" || c.status === statusFilter) &&
    (platformFilter === "all" || c.platform === platformFilter)
  );
  const validatedCount = list.filter(c => c.status === "validated").length;

  return (
    <div>
      <PageHeader title="Biblioteca de Criativos" description="Guarde e classifique os criativos testados para replicar o que já validou." actionLabel="Novo criativo" onAction={openNew} />

      <MetricsRow items={[
        { label: "Total", value: String(list.length), tone: "primary" },
        { label: "Validados", value: String(validatedCount), tone: "success" },
        { label: "Em teste", value: String(list.filter(c => c.status === "testing").length), tone: "warning" },
      ]} />

      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as plataformas</SelectItem>
            {Object.entries(PLATFORM_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={Image} title="Nenhum criativo encontrado" description="Cadastre criativos e marque como 'Validado' os que performam bem para replicar depois." actionLabel="Novo criativo" onAction={openNew} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => (
            <Card key={c.id} className={`rounded-3xl border-0 shadow-sm p-4 space-y-2 ${c.status === "validated" ? "ring-2 ring-amber-400/60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold flex items-center gap-1.5">
                    {c.status === "validated" && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                    {c.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{PLATFORM_LABEL[c.platform]} · {FORMAT_LABEL[c.format]}</div>
                </div>
                <Badge className={STATUS_COLOR[c.status]}>{STATUS_LABEL[c.status]}</Badge>
              </div>
              {c.hook_notes && <p className="text-xs text-muted-foreground"><strong>Gancho:</strong> {c.hook_notes}</p>}
              {c.performance_notes && <p className="text-xs text-muted-foreground"><strong>Performance:</strong> {c.performance_notes}</p>}
              {c.file_url && <a href={c.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Ver arquivo →</a>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="rounded-2xl gap-1" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" />Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(c.id)} className="text-destructive hover:text-destructive ml-auto"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{editing ? "Editar criativo" : "Novo criativo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Plataforma</Label>
                <Select value={form.platform} onValueChange={v => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PLATFORM_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Formato</Label>
                <Select value={form.format} onValueChange={v => setForm({ ...form, format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(FORMAT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>URL do arquivo</Label><Input value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Gancho / hook</Label><Textarea rows={2} value={form.hook_notes} onChange={e => setForm({ ...form, hook_notes: e.target.value })} /></div>
            <div><Label>Notas de performance</Label><Textarea rows={2} value={form.performance_notes} onChange={e => setForm({ ...form, performance_notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} className="rounded-2xl">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
