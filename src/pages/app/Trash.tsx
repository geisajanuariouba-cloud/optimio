import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Trash2, RotateCcw, X, Search } from "lucide-react";

const TABLES = [
  { name: "clients", label: "Clientes", title: "full_name" },
  { name: "appointments", label: "Agendamentos", title: "appointment_date" },
  { name: "services", label: "Serviços", title: "name" },
  { name: "products", label: "Produtos", title: "name" },
  { name: "packages", label: "Pacotes", title: "name" },
  { name: "marketing_posts", label: "Posts", title: "title" },
] as const;

type Item = { id: string; label: string; title: string; deleted_at: string; table: string };

export default function Trash() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const load = async () => {
    const all = await Promise.all(TABLES.map(async (t) => {
      const { data } = await supabase.from(t.name as any).select(`id, ${t.title}, deleted_at`).not("deleted_at", "is", null).order("deleted_at", { ascending: false });
      return (data ?? []).map((r: any) => ({ id: r.id, title: String(r[t.title] ?? "—"), label: t.label, deleted_at: r.deleted_at, table: t.name }));
    }));
    setItems(all.flat());
    setSelected(new Set());
  };
  useEffect(() => { if (user) load(); }, [user]);

  const filtered = useMemo(() => {
    let r = items;
    if (typeFilter !== "all") r = r.filter(i => i.table === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(i => i.title.toLowerCase().includes(q) || i.label.toLowerCase().includes(q));
    }
    return r;
  }, [items, typeFilter, search]);

  const key = (i: Item) => `${i.table}|${i.id}`;
  const toggle = (i: Item) => { const s = new Set(selected); const k = key(i); s.has(k) ? s.delete(k) : s.add(k); setSelected(s); };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(key)));
  };

  const restore = async (it: Item) => {
    await supabase.from(it.table as any).update({ deleted_at: null }).eq("id", it.id);
    if (user) await supabase.from("audit_log").insert({ user_id: user.id, action: "restore", entity_table: it.table, entity_id: it.id });
    toast.success("Restaurado"); load();
  };
  const purge = async (it: Item) => {
    if (!confirm("Excluir permanentemente? Esta ação fica registrada no log de auditoria.")) return;
    if (user) await supabase.from("audit_log").insert({ user_id: user.id, action: "purge", entity_table: it.table, entity_id: it.id });
    await supabase.from(it.table as any).delete().eq("id", it.id);
    toast.success("Excluído"); load();
  };

  const bulkPurge = async () => {
    if (!selected.size) return;
    if (!confirm(`Excluir permanentemente ${selected.size} item(ns)? Esta ação não pode ser desfeita.`)) return;
    const byTable: Record<string, string[]> = {};
    for (const k of selected) { const [t, id] = k.split("|"); (byTable[t] ||= []).push(id); }
    for (const [t, ids] of Object.entries(byTable)) {
      if (user) await Promise.all(ids.map(id => supabase.from("audit_log").insert({ user_id: user.id, action: "purge", entity_table: t, entity_id: id })));
      await supabase.from(t as any).delete().in("id", ids);
    }
    toast.success(`${selected.size} item(ns) excluído(s)`); load();
  };

  const bulkRestore = async () => {
    if (!selected.size) return;
    const byTable: Record<string, string[]> = {};
    for (const k of selected) { const [t, id] = k.split("|"); (byTable[t] ||= []).push(id); }
    for (const [t, ids] of Object.entries(byTable)) {
      await supabase.from(t as any).update({ deleted_at: null }).in("id", ids);
    }
    toast.success(`${selected.size} item(ns) restaurado(s)`); load();
  };

  return (
    <div>
      <PageHeader title="Lixeira" description="Itens apagados podem ser restaurados a qualquer momento." />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar na lixeira..." className="pl-9 h-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-44 bg-primary/10 border-primary/30"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TABLES.map(t => <SelectItem key={t.name} value={t.name}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <Card className="rounded-2xl border-0 shadow-sm p-3 mb-3 bg-primary/5 flex flex-wrap items-center gap-2">
          <Badge className="bg-primary/15 text-primary">{selected.size} selecionado(s)</Badge>
          <Button size="sm" variant="outline" onClick={bulkRestore} className="rounded-xl gap-1"><RotateCcw className="h-3.5 w-3.5" />Restaurar</Button>
          <Button size="sm" variant="outline" onClick={bulkPurge} className="rounded-xl gap-1 text-rose-600 border-rose-300"><Trash2 className="h-3.5 w-3.5" />Apagar permanentemente</Button>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="text-xs">Limpar</Button>
        </Card>
      )}

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Trash2} title="Lixeira vazia" description="Nenhum item apagado por aqui." />
        ) : (
          <div className="divide-y divide-border">
            <div className="p-3 flex items-center gap-3 bg-muted/30">
              <Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} aria-label="Selecionar tudo" />
              <span className="text-xs text-muted-foreground">Selecionar tudo ({filtered.length})</span>
            </div>
            {filtered.map(it => (
              <div key={key(it)} className="p-4 flex items-center gap-4">
                <Checkbox checked={selected.has(key(it))} onCheckedChange={() => toggle(it)} />
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{it.label}</span>
                <div className="flex-1 font-medium text-sm">{it.title}</div>
                <div className="text-xs text-muted-foreground hidden sm:block">{new Date(it.deleted_at).toLocaleDateString("pt-BR")}</div>
                <Button size="sm" variant="ghost" onClick={() => restore(it)}><RotateCcw className="h-4 w-4 mr-1" />Restaurar</Button>
                <Button size="icon" variant="ghost" onClick={() => purge(it)}><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
