import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Trash2, RotateCcw, X } from "lucide-react";

const TABLES = [
  { name: "clients", label: "Clientes", title: "full_name" },
  { name: "appointments", label: "Agendamentos", title: "appointment_date" },
  { name: "services", label: "Serviços", title: "name" },
  { name: "products", label: "Produtos", title: "name" },
  { name: "packages", label: "Pacotes", title: "name" },
  { name: "marketing_posts", label: "Posts", title: "title" },
] as const;

type Item = { id: string; label: string; title: string; deleted_at: string };

export default function Trash() {
  const { user } = useAuth();
  const [items, setItems] = useState<{ table: string; rows: Item[] }[]>([]);

  const load = async () => {
    const all = await Promise.all(TABLES.map(async (t) => {
      const { data } = await supabase.from(t.name as any).select(`id, ${t.title}, deleted_at`).not("deleted_at", "is", null).order("deleted_at", { ascending: false });
      return { table: t.name, rows: (data ?? []).map((r: any) => ({ id: r.id, title: String(r[t.title] ?? "—"), label: t.label, deleted_at: r.deleted_at })) };
    }));
    setItems(all);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const restore = async (table: string, id: string) => {
    await supabase.from(table as any).update({ deleted_at: null }).eq("id", id);
    toast.success("Restaurado"); load();
  };
  const purge = async (table: string, id: string) => {
    if (!confirm("Excluir permanentemente?")) return;
    await supabase.from(table as any).delete().eq("id", id);
    toast.success("Excluído"); load();
  };

  const all = items.flatMap(g => g.rows.map(r => ({ ...r, table: g.table })));

  return (
    <div>
      <PageHeader title="Lixeira" description="Itens apagados podem ser restaurados a qualquer momento." />
      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        {all.length === 0 ? (
          <EmptyState icon={Trash2} title="Lixeira vazia" description="Nenhum item apagado por aqui." />
        ) : (
          <div className="divide-y divide-border">
            {all.map(it => (
              <div key={`${it.table}-${it.id}`} className="p-4 flex items-center gap-4">
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{it.label}</span>
                <div className="flex-1 font-medium text-sm">{it.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(it.deleted_at).toLocaleDateString("pt-BR")}</div>
                <Button size="sm" variant="ghost" onClick={() => restore(it.table, it.id)}><RotateCcw className="h-4 w-4 mr-1" />Restaurar</Button>
                <Button size="icon" variant="ghost" onClick={() => purge(it.table, it.id)}><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
