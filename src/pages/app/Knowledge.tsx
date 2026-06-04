import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/app/PageHeader";

const CATEGORIES = [
  "Primeiros passos", "Financeiro", "Comercial",
  "Operacional", "Estoque", "Marketing", "Suporte",
];

type Article = {
  id: string;
  title: string;
  category: string;
  content: string;
  status: string;
  author_name: string | null;
  created_at: string;
  updated_at: string;
};

export default function Knowledge() {
  const { user } = useAuth();
  const { isOwner, profile } = useTenant();
  const [items, setItems] = useState<Article[]>([]);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [form, setForm] = useState({ title: "", category: CATEGORIES[0], content: "", status: "published" });

  const load = async () => {
    const { data } = await supabase
      .from("knowledge_articles")
      .select("*")
      .order("updated_at", { ascending: false });
    setItems((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i => {
    if (cat !== "all" && i.category !== cat) return false;
    if (search && !`${i.title} ${i.content}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", category: CATEGORIES[0], content: "", status: "published" });
    setOpen(true);
  };
  const openEdit = (a: Article) => {
    setEditing(a);
    setForm({ title: a.title, category: a.category, content: a.content, status: a.status });
    setOpen(true);
  };

  const save = async () => {
    if (!user) return;
    if (!form.title.trim()) { toast.error("Informe o título"); return; }
    if (editing) {
      const { error } = await supabase.from("knowledge_articles").update({
        title: form.title, category: form.category, content: form.content, status: form.status,
      }).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Artigo atualizado");
    } else {
      const { error } = await supabase.from("knowledge_articles").insert({
        user_id: user.id,
        title: form.title, category: form.category, content: form.content, status: form.status,
        author_name: (profile?.full_name as string) ?? null,
      });
      if (error) return toast.error(error.message);
      toast.success("Artigo criado");
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir artigo?")) return;
    const { error } = await supabase.from("knowledge_articles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    load();
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Base de Conhecimento" icon={BookOpen}
        actions={isOwner ? <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo artigo</Button> : null}
      />

      <Card className="p-3 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar artigos…" className="pl-9" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(a => (
          <Card key={a.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary">{a.category}</Badge>
                  <Badge variant={a.status === "published" ? "default" : "outline"}>{a.status === "published" ? "Publicado" : "Rascunho"}</Badge>
                </div>
              </div>
              {isOwner && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{a.content}</p>
            <div className="text-xs text-muted-foreground">
              {a.author_name ?? "—"} · {new Date(a.updated_at).toLocaleDateString("pt-BR")}
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground md:col-span-2">Nenhum artigo encontrado.</Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar artigo" : "Novo artigo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Publicado</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea rows={10} placeholder="Conteúdo do artigo…" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
