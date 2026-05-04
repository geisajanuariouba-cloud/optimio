import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Calendar, ChevronLeft, ChevronRight, Trash2, Check, Clock, Undo2 } from "lucide-react";

type Appt = { id: string; appointment_date: string; appointment_time: string; client_id: string | null; service_id: string | null; status: string; amount: number; is_walk_in: boolean; notes: string | null; package_id: string | null };
type Mini = { id: string; name?: string; full_name?: string; starting_price?: number };
type View = "day" | "week" | "month";

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const STATUS = ["confirmed", "pending", "completed", "no_show", "cancelled"];
const STATUS_LABEL: Record<string, string> = { confirmed: "Confirmado", pending: "Pendente", completed: "Concluído", no_show: "Faltou", cancelled: "Cancelado" };
const STATUS_COLOR: Record<string, string> = { confirmed: "bg-emerald-500/10 text-emerald-600", pending: "bg-amber-500/10 text-amber-600", completed: "bg-primary/10 text-primary", no_show: "bg-rose-500/10 text-rose-600", cancelled: "bg-muted text-muted-foreground" };

const startOfWeek = (d: Date) => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export default function Appointments() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [appts, setAppts] = useState<Appt[]>([]);
  const [clients, setClients] = useState<Mini[]>([]);
  const [services, setServices] = useState<Mini[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ appointment_time: "09:00", appointment_date: fmt(new Date()), client_id: "", service_id: "", status: "confirmed", amount: 0, is_walk_in: false, notes: "" });

  const range = useMemo(() => {
    if (view === "day") return { start: fmt(date), end: fmt(date) };
    if (view === "week") { const s = startOfWeek(date); return { start: fmt(s), end: fmt(addDays(s, 6)) }; }
    const s = new Date(date.getFullYear(), date.getMonth(), 1);
    const e = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start: fmt(s), end: fmt(e) };
  }, [date, view]);

  const load = async () => {
    const [{ data: a }, { data: c }, { data: s }] = await Promise.all([
      supabase.from("appointments").select("*").gte("appointment_date", range.start).lte("appointment_date", range.end).is("deleted_at", null).order("appointment_date").order("appointment_time"),
      supabase.from("clients").select("id, full_name").is("deleted_at", null).order("full_name"),
      supabase.from("services").select("id, name, starting_price").is("deleted_at", null).order("name"),
    ]);
    setAppts((a ?? []) as Appt[]); setClients((c ?? []) as Mini[]); setServices((s ?? []) as Mini[]);
  };
  useEffect(() => { if (user) load(); }, [user, range.start, range.end]);

  const openNew = (d?: Date) => { setForm({ appointment_time: "09:00", appointment_date: fmt(d ?? date), client_id: "", service_id: "", status: "confirmed", amount: 0, is_walk_in: false, notes: "" }); setOpen(true); };

  const save = async () => {
    if (!user) return;
    const svc = services.find(s => s.id === form.service_id);
    const { error } = await supabase.from("appointments").insert({
      user_id: user.id,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time,
      client_id: form.client_id || null,
      service_id: form.service_id || null,
      status: form.status,
      amount: form.amount || svc?.starting_price || 0,
      is_walk_in: form.is_walk_in,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Agendamento criado"); setOpen(false); load();
  };

  const setStatus = async (id: string, status: string) => { await supabase.from("appointments").update({ status }).eq("id", id); load(); };

  // ESTORNO: 1) reverte caixa 2) devolve estoque (se houver), 3) reabre sessão de pacote, 4) lixeira
  const refund = async (a: Appt) => {
    if (!user) return;
    if (!confirm("Estornar este agendamento? Vai reverter caixa, devolver itens e reabrir sessão de pacote.")) return;
    // 1. Lança estorno no financeiro
    await supabase.from("financial").insert({
      user_id: user.id, type: "expense", category: "Estorno", origin: "appointment", origin_id: a.id,
      gross_amount: -a.amount, net_amount: -a.amount, description: `Estorno do agendamento ${a.id.slice(0,8)}`,
    });
    // 3. Reabre sessão de pacote
    if (a.package_id) {
      await supabase.from("package_sessions").update({ status: "pending", appointment_id: null }).eq("appointment_id", a.id);
    }
    // 4. Log
    await supabase.from("refunds").insert({ user_id: user.id, appointment_id: a.id, package_id: a.package_id, amount: a.amount, reason: "Estorno manual" });
    // 4. Lixeira
    await supabase.from("appointments").update({ deleted_at: new Date().toISOString(), status: "cancelled" }).eq("id", a.id);
    toast.success("Estorno realizado"); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Mover para a lixeira?")) return;
    await supabase.from("appointments").update({ deleted_at: new Date().toISOString() }).eq("id", id); load();
  };

  const clientName = (id: string | null) => id ? (clients.find(c => c.id === id)?.full_name ?? "Cliente") : "Walk-in";
  const serviceName = (id: string | null) => services.find(s => s.id === id)?.name ?? "—";
  const totalRange = useMemo(() => appts.reduce((a, x) => a + (x.amount ?? 0), 0), [appts]);

  // Week grid
  const weekStart = startOfWeek(date);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const apptsByDay = (d: Date) => appts.filter(a => a.appointment_date === fmt(d));

  return (
    <div>
      <PageHeader title="Agenda" description="Visão diária, semanal ou mensal — com venda rápida e estorno completo." actionLabel="Agendamento" onAction={() => openNew()} />
      <MetricsRow items={[
        { label: "Total no período", value: String(appts.length), hint: `${appts.filter(a => a.status === "confirmed").length} confirmados` },
        { label: "Concluídos", value: String(appts.filter(a => a.status === "completed").length) },
        { label: "Walk-in", value: String(appts.filter(a => a.is_walk_in).length) },
        { label: "Faturamento", value: `R$ ${totalRange.toFixed(2)}` },
      ]} />

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => setDate(addDays(date, view === "month" ? -30 : view === "week" ? -7 : -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="font-semibold min-w-[180px] text-center">
              {view === "day" && date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              {view === "week" && `${weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${addDays(weekStart, 6).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`}
              {view === "month" && date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </div>
            <Button size="icon" variant="ghost" onClick={() => setDate(addDays(date, view === "month" ? 30 : view === "week" ? 7 : 1))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setDate(new Date())} className="rounded-xl">Hoje</Button>
          </div>
          <div className="flex gap-1 bg-secondary/40 p-1 rounded-xl">
            {(["day", "week", "month"] as View[]).map(v => (
              <Button key={v} size="sm" variant={view === v ? "default" : "ghost"} className="rounded-lg h-8" onClick={() => setView(v)}>
                {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
              </Button>
            ))}
          </div>
        </div>

        {view === "week" ? (
          <div className="grid grid-cols-7 divide-x divide-border min-h-[400px]">
            {weekDays.map(d => (
              <div key={fmt(d)} className="flex flex-col">
                <div className="p-2 text-center border-b border-border">
                  <div className="text-xs text-muted-foreground uppercase">{d.toLocaleDateString("pt-BR", { weekday: "short" })}</div>
                  <div className={`text-lg font-semibold ${fmt(d) === fmt(new Date()) ? "text-primary" : ""}`}>{d.getDate()}</div>
                </div>
                <button onClick={() => openNew(d)} className="flex-1 p-2 space-y-1 text-left hover:bg-secondary/30 transition">
                  {apptsByDay(d).map(a => (
                    <div key={a.id} className={`text-xs p-2 rounded-lg ${STATUS_COLOR[a.status]}`}>
                      <div className="font-mono">{a.appointment_time.slice(0, 5)}</div>
                      <div className="truncate">{clientName(a.client_id)}</div>
                    </div>
                  ))}
                </button>
              </div>
            ))}
          </div>
        ) : appts.length === 0 ? (
          <EmptyState icon={Calendar} title="Nada agendado para este período" description="Crie um agendamento ou registre uma venda de balcão." actionLabel="Agendamento" onAction={() => openNew()} />
        ) : (
          <div className="divide-y divide-border">
            {appts.map(a => (
              <div key={a.id} className="p-4 flex items-center gap-4 hover:bg-secondary/40 transition flex-wrap">
                <div className="flex items-center gap-2 w-32 font-mono font-semibold text-primary text-xs">
                  <Clock className="h-3.5 w-3.5" />{new Date(a.appointment_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} {a.appointment_time.slice(0, 5)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{clientName(a.client_id)} {a.is_walk_in && <span className="text-xs text-muted-foreground">(balcão)</span>}</div>
                  <div className="text-xs text-muted-foreground truncate">{serviceName(a.service_id)} • R$ {a.amount.toFixed(2)}</div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLOR[a.status] ?? ""}`}>{STATUS_LABEL[a.status] ?? a.status}</span>
                {a.status !== "completed" && (
                  <Button size="icon" variant="ghost" onClick={() => setStatus(a.id, "completed")} title="Concluir"><Check className="h-4 w-4" /></Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => refund(a)} title="Estornar"><Undo2 className="h-4 w-4 text-amber-600" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Novo agendamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} /></div>
              <div><Label>Horário</Label><Input type="time" value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} /></div>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Cliente</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v, is_walk_in: false })}>
                <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-xs text-muted-foreground mt-2 cursor-pointer">
                <input type="checkbox" checked={form.is_walk_in} onChange={(e) => setForm({ ...form, is_walk_in: e.target.checked, client_id: e.target.checked ? "" : form.client_id })} />
                Venda de balcão (sem cliente cadastrado)
              </label>
            </div>
            <div><Label>Serviço</Label>
              <Select value={form.service_id} onValueChange={(v) => { const s = services.find(x => x.id === v); setForm({ ...form, service_id: v, amount: s?.starting_price ?? form.amount }); }}>
                <SelectTrigger><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
                <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — R$ {s.starting_price?.toFixed(2)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
            <div><Label>Observações</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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
