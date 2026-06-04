import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";

type Log = {
  id: string;
  user_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  before: any;
  after: any;
  created_at: string;
};

export default function Audit() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [user, setUser] = useState("");
  const [action, setAction] = useState("all");
  const [entity, setEntity] = useState("all");
  const [days, setDays] = useState("7");

  const load = async () => {
    const since = new Date(Date.now() - Number(days) * 24 * 3600 * 1000).toISOString();
    const { data } = await supabase.from("audit_logs")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);
    setLogs((data as any) ?? []);
  };
  useEffect(() => { load(); }, [days]);

  const actions = useMemo(() => Array.from(new Set(logs.map(l => l.action))).sort(), [logs]);
  const entities = useMemo(() => Array.from(new Set(logs.map(l => l.entity).filter(Boolean) as string[])).sort(), [logs]);

  const filtered = logs.filter(l => {
    if (action !== "all" && l.action !== action) return false;
    if (entity !== "all" && l.entity !== entity) return false;
    if (user && !(l.user_id ?? "").toLowerCase().includes(user.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Auditoria" description="Histórico de ações do sistema (somente leitura)" />

      <Card className="p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
        <Input placeholder="ID do usuário…" value={user} onChange={e => setUser(e.target.value)} />
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger><SelectValue placeholder="Módulo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os módulos</SelectItem>
            {entities.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Últimas 24h</SelectItem>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="divide-y">
        {filtered.map(l => (
          <div key={l.id} className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 text-sm">
            <div className="md:col-span-2 text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</div>
            <div className="md:col-span-2"><Badge variant="secondary">{l.action}</Badge></div>
            <div className="md:col-span-2">{l.entity ?? "—"}</div>
            <div className="md:col-span-3 truncate text-muted-foreground">{l.entity_id ?? "—"}</div>
            <div className="md:col-span-3 truncate text-muted-foreground">{l.user_id ?? "—"}</div>
            {(l.before || l.after) && (
              <details className="md:col-span-12">
                <summary className="cursor-pointer text-xs text-muted-foreground">Antes / Depois</summary>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">{JSON.stringify(l.before, null, 2)}</pre>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">{JSON.stringify(l.after, null, 2)}</pre>
                </div>
              </details>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">Nenhum registro encontrado.</div>
        )}
      </Card>
    </div>
  );
}
