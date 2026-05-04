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
import { Calendar, ChevronLeft, ChevronRight, Trash2, Check, Clock } from "lucide-react";

type Appt = { id: string; appointment_date: string; appointment_time: string; client_id: string | null; service_id: string | null; status: string; amount: number; is_walk_in: boolean; notes: string | null };
type Mini = { id: string; name?: string; full_name?: string; starting_price?: number };

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const STATUS = ["confirmed", "pending", "completed", "no_show", "cancelled"];
const STATUS_LABEL: Record<string, string> = { confirmed: "Confirmado", pending: "Pendente", completed: "Concluído", no_show: "Faltou", cancelled: "Cancelado" };
const STATUS_COLOR: Record<string, string> = { confirmed: "bg-emerald-500/10 text-emerald-600", pending: "bg-amber-500/10 text-amber-600", completed: "bg-primary/10 text-primary", no_show: "bg-rose-500/10 text-rose-600", cancelled: "bg-muted text-muted-foreground" };

export default function Appointments() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [appts, setAppts] = useState<Appt[]>([]);
  const [clients, setClients] = useState<Mini[]>([]);
  const [services, setServices] = useState<Mini[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ appointment_time: "09:00", client_id: "", service_id: "", status: "confirmed", amount: 0, is_walk_in: false, notes: "" });

  const load = async () => {
    const day = fmt(date);
    const [{ data: a }, { data: c }, { data: s }] = await Promise.all([
      supabase.from("appointments").select("*").eq("appointment_date", day).is("deleted_at", null).order("appointment_time"),
      supabase.from("clients").select("id, full_name").is("deleted_at", null).order("full_name"),
      supabase.from("services").select("id, name, starting_price").is("deleted_at", null).order("name"),
    ]);
    setAppts((a ?? []) as Appt[]); setClients((c ?? []) as Mini[]); setServices((s ?? []) as Mini[]);
  };
  useEffect(() => { if (user) load(); }, [user, date]);

  const openNew = () => { setForm({ appointment_time: "09:00", client_id: "", service_id: "", status: "confirmed", amount: 0, is_walk_in: false, notes: "" }); setOpen(true); };

  const save = async () => {
    if (!user) return;
    const svc = services.find(s => s.id === form.service_id);
    const payload = {
      user_id: user.id,
      appointment_date: fmt(date),
      appointment_time: form.appointment_time,
      client_id: form.client_id || null,
      service_id: form.service_id || null,
      status: form.status,
      amount: form.amount || svc?.starting_price || 0,
      is_walk_in: form.is_walk_in,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("appointments").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Agendamento criado"); setOpen(false); load();
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("appointments").update({ status }).eq("id", id); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Mover para a lixeira?")) return;
    await supabase.from("appointments").update({ deleted_at: new Date().toISOString() }).eq("id", id); load();
  };

  const clientName = (id: string | null) => id ? (clients.find(c => c.id === id)?.full_name ?? "Cliente") : "Walk-in";
  const serviceName = (id: string | null) => services.find(s => s.id === id)?.name ?? "—";

  const totalDay = useMemo(() => appts.reduce((a, x) => a + (x.amount ?? 0), 0), [appts]);

  return (
    <div>
      <PageHeader title="Agenda" description="Calendário diário com venda rápida (balcão)." actionLabel="Agendamento" onAction={openNew} />
      <MetricsRow items={[
        { label: "Hoje", value: String(appts.length), hint: `${appts.filter(a => a.status === "confirmed").length} confirmados` },
        { label: "Concluídos", value: String(appts.filter(a => a.status === "completed").length) },
        { label: "Walk-in", value: String(appts.filter(a => a.is_walk_in).length) },
        { label: "Faturamento dia", value: `R$ ${totalDay.toFixed(2)}` },
      ]} />

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => setDate(new Date(date.getTime() - 86400000))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="font-semibold min-w-[180px] text-center">{date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</div>
            <Button size="icon" variant="ghost" onClick={() => setDate(new Date(date.getTime() + 86400000))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDate(new Date())} className="rounded-xl">Hoje</Button>
        </div>

        {appts.length === 0 ? (
          <EmptyState icon={Calendar} title="Nada agendado para este dia" description="Crie um agendamento ou registre uma venda de balcão." actionLabel="Agendamento" onAction={openNew} />
        ) : (
          <div className="divide-y divide-border">
            {appts.map(a => (
              <div key={a.id} className="p-4 flex items-center gap-4 hover:bg-secondary/40 transition">
                <div className="flex items-center gap-2 w-24 font-mono font-semibold text-primary">
                  <Clock className="h-3.5 w-3.5" /> {a.appointment_time.slice(0, 5)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{clientName(a.client_id)} {a.is_walk_in && <span className="text-xs text-muted-foreground">(balcão)</span>}</div>
                  <div className="text-xs text-muted-foreground truncate">{serviceName(a.service_id)} • R$ {a.amount.toFixed(2)}</div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLOR[a.status] ?? ""}`}>{STATUS_LABEL[a.status] ?? a.status}</span>
                {a.status !== "completed" && (
                  <Button size="icon" variant="ghost" onClick={() => setStatus(a.id, "completed")} title="Concluir"><Check className="h-4 w-4" /></Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Novo agendamento — {date.toLocaleDateString("pt-BR")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Horário</Label><Input type="time" value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
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
