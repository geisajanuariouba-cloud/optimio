import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Package, Trash2, Check, Sparkles, Wrench, Plus, X } from "lucide-react";

type Pkg = { id: string; name: string; client_id: string; total_price: number; status: string; start_date: string | null; recurrence_type: string };
type Sess = { id: string; package_id: string; session_number: number; status: string; treatment: string };
type Client = { id: string; full_name: string };

export default function Packages() {
  const { user } = useAuth();
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [sessions, setSessions] = useState<Sess[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; starting_price: number }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    client_id: "",
    total_price: 0,
    recurrence_type: "smart" as "smart" | "manual",
    treatments: ["Hidratação", "Reconstrução", "Nutrição", "Selagem"],
  });

  const load = async () => {
    const [{ data: p }, { data: s }, { data: c }, { data: srv }] = await Promise.all([
      supabase.from("packages").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("package_sessions").select("*").order("session_number"),
      supabase.from("clients").select("id, full_name").is("deleted_at", null).order("full_name"),
      supabase.from("services").select("id,name,starting_price").is("deleted_at", null).order("name"),
    ]);
    setPkgs((p ?? []) as Pkg[]); setSessions((s ?? []) as Sess[]);
    setClients((c ?? []) as Client[]); setServices((srv ?? []) as any[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const create = async () => {
    if (!user || !form.client_id) return toast.error("Selecione um cliente");
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    if (form.treatments.length === 0) return toast.error("Adicione pelo menos um procedimento");
    const { data: pkg, error } = await supabase.from("packages").insert({
      user_id: user.id, client_id: form.client_id, name: form.name,
      total_price: form.total_price, status: "in_progress",
      recurrence_type: form.recurrence_type,
      sessions_total: form.treatments.length,
      start_date: new Date().toISOString().slice(0, 10),
    }).select().single();
    if (error || !pkg) return toast.error(error?.message ?? "Erro");
    const sessRows = form.treatments.map((t, i) => ({ user_id: user.id, package_id: pkg.id, session_number: i + 1, treatment: t, status: "pending" }));
    await supabase.from("package_sessions").insert(sessRows);
    toast.success(`Recorrência criada com ${form.treatments.length} sessões`);
    setOpen(false);
    setForm({ name: "", client_id: "", total_price: 0, recurrence_type: "smart", treatments: ["Hidratação", "Reconstrução", "Nutrição", "Selagem"] });
    load();
  };

  const completeSession = async (id: string) => {
    await supabase.from("package_sessions").update({ status: "completed" }).eq("id", id);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Mover para a lixeira?")) return;
    await supabase.from("packages").update({ deleted_at: new Date().toISOString() }).eq("id", id); load();
  };

  const sessOf = (pid: string) => sessions.filter(s => s.package_id === pid);
  const clientName = (id: string) => clients.find(c => c.id === id)?.full_name ?? "—";

  const updateTreatment = (i: number, v: string) => {
    const tt = [...form.treatments]; tt[i] = v; setForm({ ...form, treatments: tt });
  };
  const removeTreatment = (i: number) => {
    const tt = form.treatments.filter((_, k) => k !== i); setForm({ ...form, treatments: tt });
  };
  const addTreatment = () => setForm({ ...form, treatments: [...form.treatments, ""] });
  const addService = (sid: string) => {
    const s = services.find(x => x.id === sid); if (!s) return;
    setForm({ ...form, treatments: [...form.treatments, s.name], total_price: form.total_price + Number(s.starting_price ?? 0) });
  };

  return (
    <div>
      <PageHeader title="Recorrência" description="Pacotes inteligentes (anamnese) ou manuais (montar do zero)." actionLabel="Nova recorrência" onAction={() => setOpen(true)} />
      <MetricsRow items={[
        { label: "Em andamento", value: String(pkgs.filter(p => p.status === "in_progress").length) },
        { label: "Concluídos", value: String(pkgs.filter(p => p.status === "completed").length) },
        { label: "Faturamento", value: `R$ ${pkgs.reduce((a, p) => a + Number(p.total_price), 0).toFixed(0)}` },
        { label: "Sessões pendentes", value: String(sessions.filter(s => s.status === "pending").length) },
      ]} />

      {pkgs.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={Package} title="Nenhuma recorrência" description="Crie uma recorrência inteligente (IA + anamnese) ou monte uma manual." actionLabel="Nova recorrência" onAction={() => setOpen(true)} />
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {pkgs.map(p => {
            const ss = sessOf(p.id);
            const done = ss.filter(s => s.status === "completed").length;
            return (
              <Card key={p.id} className="p-6 rounded-3xl border-0 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{p.name}</div>
                      <Badge variant="outline" className="text-[10px]">
                        {p.recurrence_type === "manual" ? <><Wrench className="h-3 w-3 mr-1" />Manual</> : <><Sparkles className="h-3 w-3 mr-1" />Inteligente</>}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{clientName(p.client_id)} • R$ {Number(p.total_price).toFixed(2)}</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{done} de {ss.length} sessões</span>
                    <span>{Math.round((done / Math.max(ss.length, 1)) * 100)}%</span>
                  </div>
                  <Progress value={(done / Math.max(ss.length, 1)) * 100} />
                </div>
                <div className="space-y-2">
                  {ss.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-2 rounded-xl bg-secondary/40">
                      <div className="text-xs font-mono text-primary w-8">#{s.session_number}</div>
                      <div className="flex-1 text-sm">{s.treatment}</div>
                      {s.status === "completed" ? (
                        <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="h-3 w-3" /> feito</span>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 rounded-lg" onClick={() => completeSession(s.id)}>Concluir</Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Nova recorrência</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={form.recurrence_type === "smart" ? "default" : "outline"} onClick={() => setForm({ ...form, recurrence_type: "smart" })} className="rounded-2xl gap-2"><Sparkles className="h-4 w-4" />Inteligente</Button>
              <Button type="button" variant={form.recurrence_type === "manual" ? "default" : "outline"} onClick={() => setForm({ ...form, recurrence_type: "manual", treatments: [] })} className="rounded-2xl gap-2"><Wrench className="h-4 w-4" />Manual</Button>
            </div>
            <p className="text-xs text-muted-foreground bg-secondary/40 rounded-2xl p-2">
              {form.recurrence_type === "smart"
                ? "IA usa a anamnese do cliente para definir a ordem dos tratamentos."
                : "Monte do zero: escolha procedimentos e defina um valor padrão."}
            </p>
            <div><Label>Cliente *</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pacote 4 sessões" /></div>
              <div><Label>Valor total (R$)</Label><Input type="number" step="0.01" value={form.total_price} onChange={(e) => setForm({ ...form, total_price: +e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Procedimentos ({form.treatments.length})</Label>
              {form.treatments.map((t, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={t} onChange={(e) => updateTreatment(i, e.target.value)} placeholder={`Sessão ${i + 1}`} />
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeTreatment(i)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={addTreatment} className="rounded-xl gap-1"><Plus className="h-3 w-3" />Procedimento livre</Button>
                {services.length > 0 && (
                  <Select value="" onValueChange={addService}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="+ adicionar serviço cadastrado" /></SelectTrigger>
                    <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — R$ {Number(s.starting_price).toFixed(2)}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={create} className="rounded-2xl">Criar recorrência</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
