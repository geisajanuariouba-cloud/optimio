import { useEffect, useMemo, useState } from "react";
import { friendlyError } from "@/lib/errors";
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
import { Calendar, ChevronLeft, ChevronRight, Trash2, Check, Clock, Undo2, Zap, Plus, X } from "lucide-react";
import { PromissoriaFields, createPromissoria, type PromissoriaData } from "@/components/app/PromissoriaFields";

type Appt = { id: string; appointment_date: string; appointment_time: string; client_id: string | null; service_id: string | null; status: string; amount: number; is_walk_in: boolean; notes: string | null; package_id: string | null; professional: string | null; payment_method: string | null };
type Mini = { id: string; name?: string; full_name?: string; starting_price?: number };
type PayMethod = { v: string; l: string };
type Item = { service_id: string; name: string; price: number; qty: number };
type View = "day" | "week" | "month";

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const STATUS = ["confirmed", "pending", "completed", "no_show", "cancelled"];
const STATUS_LABEL: Record<string, string> = { confirmed: "Confirmado", pending: "Pendente", completed: "Concluído", no_show: "Faltou", cancelled: "Cancelado" };
const STATUS_COLOR: Record<string, string> = { confirmed: "bg-emerald-500/10 text-emerald-600", pending: "bg-amber-500/10 text-amber-600", completed: "bg-primary/10 text-primary", no_show: "bg-rose-500/10 text-rose-600", cancelled: "bg-muted text-muted-foreground" };
const DEFAULT_PAY: PayMethod[] = [
  { v: "nao_escolhido", l: "Não escolhido" },
  { v: "dinheiro", l: "Dinheiro" },
  { v: "pix", l: "PIX" },
  { v: "debito", l: "Débito" },
  { v: "credito", l: "Crédito" },
  { v: "parcelado", l: "Parcelado" },
  { v: "promissoria", l: "Promissória" },
];

const startOfWeek = (d: Date) => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const emptyForm = (date?: Date, walkIn = false) => ({
  appointment_time: "09:00",
  appointment_date: fmt(date ?? new Date()),
  client_id: "",
  service_id: "",
  status: "confirmed",
  amount: 0,
  is_walk_in: walkIn,
  notes: walkIn ? "Venda Sem Agendamento" : "",
  professional: "",
  payment_method: "nao_escolhido",
});

export default function Appointments() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [appts, setAppts] = useState<Appt[]>([]);
  const [clients, setClients] = useState<Mini[]>([]);
  const [services, setServices] = useState<Mini[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appt | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [promissoria, setPromissoria] = useState<PromissoriaData>({ total_amount: 0, installments_count: 2, first_due: fmt(new Date()) });

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

  const openNew = (d?: Date) => { setEditing(null); setForm(emptyForm(d ?? date)); setPromissoria({ total_amount: 0, installments_count: 2, first_due: fmt(d ?? date) }); setOpen(true); };
  const openQuickSale = () => { setEditing(null); setForm(emptyForm(date, true)); setPromissoria({ total_amount: 0, installments_count: 2, first_due: fmt(date) }); setOpen(true); };
  const openEdit = (a: Appt) => {
    setEditing(a);
    setForm({
      appointment_time: a.appointment_time?.slice(0, 5) ?? "09:00",
      appointment_date: a.appointment_date,
      client_id: a.client_id ?? "",
      service_id: a.service_id ?? "",
      status: a.status,
      amount: Number(a.amount) || 0,
      is_walk_in: a.is_walk_in,
      notes: a.notes ?? "",
      professional: a.professional ?? "",
      payment_method: a.payment_method ?? "nao_escolhido",
    });
    setPromissoria({ total_amount: Number(a.amount) || 0, installments_count: 2, first_due: a.appointment_date });
    setOpen(true);
  };

  const save = async () => {
    if (!user) return;
    const svc = services.find(s => s.id === form.service_id);
    const amount = form.amount || svc?.starting_price || 0;
    const payload = {
      user_id: user.id,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time,
      client_id: form.client_id ? form.client_id : null,
      service_id: form.service_id ? form.service_id : null,
      status: form.status,
      amount,
      is_walk_in: false,
      notes: form.notes || null,
      professional: form.professional || null,
      payment_method: form.payment_method,
    };
    let apptId = editing?.id ?? null;
    if (editing) {
      const { error } = await supabase.from("appointments").update(payload).eq("id", editing.id);
      if (error) return toast.error(friendlyError(error));
    } else {
      const { data, error } = await supabase.from("appointments").insert(payload).select().single();
      if (error) return toast.error(friendlyError(error));
      apptId = data.id;
    }
    if (form.payment_method === "promissoria") {
      if (!form.client_id) return toast.error("Promissória requer cliente cadastrado.");
      try {
        await createPromissoria({ supabase, user_id: user.id, client_id: form.client_id, original_amount: amount, data: promissoria, appointment_id: apptId, notes: form.notes });
      } catch (e: any) { return toast.error(friendlyError(e, "Falha promissória: ".replace(/:\s*$/, ""))); }
    }
    toast.success(editing ? "Agendamento atualizado" : "Agendamento criado");
    setOpen(false); load();
  };

  const setStatus = async (id: string, status: string) => { await supabase.from("appointments").update({ status }).eq("id", id); load(); };

  const refund = async (a: Appt) => {
    if (!user) return;
    if (!confirm("Estornar este registro? Vai reverter caixa e reabrir sessão de pacote.")) return;
    await supabase.from("financial").insert({
      user_id: user.id, type: "expense", category: "Estorno", origin: "appointment", origin_id: a.id,
      gross_amount: -a.amount, net_amount: -a.amount, description: `Estorno do registro ${a.id.slice(0,8)}`,
    });
    if (a.package_id) await supabase.from("package_sessions").update({ status: "pending", appointment_id: null }).eq("appointment_id", a.id);
    await supabase.from("refunds").insert({ user_id: user.id, appointment_id: a.id, package_id: a.package_id, amount: a.amount, reason: "Estorno manual" });
    await supabase.from("appointments").update({ deleted_at: new Date().toISOString(), status: "cancelled" }).eq("id", a.id);
    toast.success("Estorno realizado"); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Mover para a lixeira?")) return;
    await supabase.from("appointments").update({ deleted_at: new Date().toISOString() }).eq("id", id); load();
  };

  const clientName = (id: string | null) => id ? (clients.find(c => c.id === id)?.full_name ?? "Cliente") : "Walk-in";
  const serviceName = (id: string | null) => services.find(s => s.id === id)?.name ?? "—";

  // Métricas: Ocupação (% de slots de 1h preenchidos no período útil 9h-19h), Ticket Médio, Walk-in
  const stats = useMemo(() => {
    const realScheduled = appts.filter(a => !a.is_walk_in && a.status !== "cancelled");
    const walkIns = appts.filter(a => a.is_walk_in);
    const completed = appts.filter(a => a.status === "completed");
    const days = view === "day" ? 1 : view === "week" ? 7 : new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const slotsPerDay = 10;
    const occupation = days > 0 ? Math.min(100, Math.round((realScheduled.length / (days * slotsPerDay)) * 100)) : 0;
    const ticket = completed.length > 0 ? completed.reduce((a, x) => a + Number(x.amount || 0), 0) / completed.length : 0;
    const total = appts.reduce((a, x) => a + Number(x.amount || 0), 0);
    return { occupation, ticket, walkIns: walkIns.length, total, count: appts.length };
  }, [appts, view, date]);

  const weekStart = startOfWeek(date);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const apptsByDay = (d: Date) => appts.filter(a => a.appointment_date === fmt(d));
  const showPromissoria = form.payment_method === "promissoria";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground text-sm">Métricas, fila de vendas e venda rápida no mesmo lugar.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => openNew()} className="bg-gradient-brand text-white border-0 rounded-2xl gap-2">
            <Calendar className="h-4 w-4" />Agendamento
          </Button>
        </div>
      </div>

      <MetricsRow items={[
        { label: "Taxa de ocupação", value: `${stats.occupation}%`, hint: `${stats.count} registros` },
        { label: "Ticket médio", value: `R$ ${stats.ticket.toFixed(2)}` },
        { label: "Sem agendamento", value: String(stats.walkIns), hint: "Vendas balcão" },
        { label: "Faturamento", value: `R$ ${stats.total.toFixed(2)}` },
      ]} />

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => setDate(addDays(date, view === "month" ? -30 : view === "week" ? -7 : -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="font-semibold min-w-[180px] text-center text-sm sm:text-base">
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
          <div className="grid grid-cols-7 divide-x divide-border min-h-[400px] overflow-x-auto">
            {weekDays.map(d => (
              <div key={fmt(d)} className="flex flex-col min-w-[100px]">
                <div className="p-2 text-center border-b border-border">
                  <div className="text-xs text-muted-foreground uppercase">{d.toLocaleDateString("pt-BR", { weekday: "short" })}</div>
                  <div className={`text-lg font-semibold ${fmt(d) === fmt(new Date()) ? "text-primary" : ""}`}>{d.getDate()}</div>
                </div>
                <div className="flex-1 p-2 space-y-1">
                  {apptsByDay(d).map(a => (
                    <button key={a.id} onClick={() => openEdit(a)} className={`w-full text-left text-xs p-2 rounded-lg ${STATUS_COLOR[a.status]} hover:ring-2 hover:ring-primary/30`}>
                      <div className="font-mono">{a.appointment_time.slice(0, 5)}</div>
                      <div className="truncate">{a.is_walk_in ? "Balcão" : clientName(a.client_id)}</div>
                    </button>
                  ))}
                  <button onClick={() => openNew(d)} className="w-full text-xs text-muted-foreground hover:text-primary py-1">+ adicionar</button>
                </div>
              </div>
            ))}
          </div>
        ) : appts.length === 0 ? (
          <EmptyState icon={Calendar} title="Nada no período" description="Crie um agendamento ou registre uma venda de balcão." actionLabel="Agendamento" onAction={() => openNew()} />
        ) : (
          <div className="divide-y divide-border">
            {appts.map(a => (
              <div key={a.id} className="p-4 flex items-center gap-4 hover:bg-secondary/40 transition flex-wrap cursor-pointer" onClick={() => openEdit(a)}>
                <div className="flex items-center gap-2 w-32 font-mono font-semibold text-primary text-xs">
                  <Clock className="h-3.5 w-3.5" />{new Date(a.appointment_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} {a.appointment_time.slice(0, 5)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{clientName(a.client_id)} {a.is_walk_in && <span className="text-xs text-amber-600 ml-1">[Sem Agendamento]</span>}</div>
                  <div className="text-xs text-muted-foreground truncate">{serviceName(a.service_id)} • R$ {Number(a.amount).toFixed(2)} {a.professional ? `• ${a.professional}` : ""}</div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLOR[a.status] ?? ""}`}>{STATUS_LABEL[a.status] ?? a.status}</span>
                {a.status !== "completed" && (
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setStatus(a.id, "completed"); }} title="Concluir"><Check className="h-4 w-4" /></Button>
                )}
                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); refund(a); }} title="Estornar"><Undo2 className="h-4 w-4 text-amber-600" /></Button>
                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(a.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar registro" : form.is_walk_in ? "Venda Rápida (Balcão)" : "Novo agendamento"}</DialogTitle></DialogHeader>
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
                <input type="checkbox" checked={form.is_walk_in} onChange={(e) => setForm({ ...form, is_walk_in: e.target.checked, client_id: e.target.checked ? "" : form.client_id, notes: e.target.checked ? "Venda Sem Agendamento" : "" })} />
                Venda sem agendamento (balcão)
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Serviço</Label>
                <Select value={form.service_id} onValueChange={(v) => { const s = services.find(x => x.id === v); setForm({ ...form, service_id: v, amount: s?.starting_price ?? form.amount }); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — R$ {s.starting_price?.toFixed(2)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Profissional</Label><Input value={form.professional} onChange={(e) => setForm({ ...form, professional: e.target.value })} placeholder="Nome" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
              <div><Label>Pagamento</Label>
                <Select value={form.payment_method} onValueChange={(v) => { setForm({ ...form, payment_method: v }); if (v === "promissoria") setPromissoria(p => ({ ...p, total_amount: form.amount })); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAY_METHODS.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {showPromissoria && <PromissoriaFields value={promissoria} onChange={setPromissoria} originalAmount={form.amount} />}
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
