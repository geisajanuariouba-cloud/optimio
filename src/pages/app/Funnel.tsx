import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/PageHeader";
import { Phone, Trash2, Pencil, Plus } from "lucide-react";

type Lead = {
  id: string; name: string; company: string | null; phone: string | null; email: string | null;
  potential_value: number; responsible_user_id: string | null; notes: string | null;
  stage: string; position: number; client_id: string | null;
};

const STAGES: { key: Lead["stage"]; label: string; tone: string }[] = [
  { key: "novo", label: "Novo Lead", tone: "bg-slate-500/10 text-slate-600" },
  { key: "contato", label: "Contato Realizado", tone: "bg-blue-500/10 text-blue-600" },
  { key: "proposta", label: "Proposta Enviada", tone: "bg-amber-500/10 text-amber-600" },
  { key: "negociacao", label: "Negociação", tone: "bg-purple-500/10 text-purple-600" },
  { key: "fechado", label: "Fechado", tone: "bg-emerald-500/10 text-emerald-600" },
  { key: "perdido", label: "Perdido", tone: "bg-rose-500/10 text-rose-600" },
];

const empty = { name: "", company: "", phone: "", email: "", potential_value: 0, notes: "", stage: "novo" as Lead["stage"] };

export default function Funnel() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("leads").select("*").is("deleted_at", null)
      .order("stage").order("position");
    if (error) return toast.error(friendlyError(error));
    setLeads((data ?? []) as Lead[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const byStage = useMemo(() => {
    const m: Record<string, Lead[]> = {};
    STAGES.forEach(s => m[s.key] = []);
    leads.forEach(l => { (m[l.stage] ??= []).push(l); });
    return m;
  }, [leads]);

  const openNew = (stage: Lead["stage"] = "novo") => { setEditing(null); setForm({ ...empty, stage }); setOpen(true); };
  const openEdit = (l: Lead) => {
    setEditing(l);
    setForm({
      name: l.name, company: l.company ?? "", phone: l.phone ?? "", email: l.email ?? "",
      potential_value: l.potential_value, notes: l.notes ?? "", stage: l.stage,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!user || !form.name.trim()) return toast.error("Nome é obrigatório.");
    const payload: any = {
      user_id: user.id,
      name: form.name.trim(),
      company: form.company || null,
      phone: form.phone || null,
      email: form.email || null,
      potential_value: Number(form.potential_value) || 0,
      notes: form.notes || null,
      stage: form.stage,
    };
    if (editing) {
      const { error } = await supabase.from("leads").update(payload).eq("id", editing.id);
      if (error) return toast.error(friendlyError(error));
    } else {
      const pos = (byStage[form.stage]?.length ?? 0);
      const { error } = await supabase.from("leads").insert({ ...payload, position: pos });
      if (error) return toast.error(friendlyError(error));
    }
    toast.success("Lead salvo");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir lead?")) return;
    await supabase.from("leads").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const moveTo = async (id: string, stage: Lead["stage"]) => {
    const target = byStage[stage] ?? [];
    const newPos = target.length;
    const { error } = await supabase.from("leads").update({ stage, position: newPos }).eq("id", id);
    if (error) return toast.error(friendlyError(error));
    load();
  };

  const onDrop = (stage: Lead["stage"]) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragId) return;
    const lead = leads.find(l => l.id === dragId);
    setDragId(null);
    if (!lead || lead.stage === stage) return;
    moveTo(lead.id, stage);
  };

  const totalOpen = leads.filter(l => l.stage !== "fechado" && l.stage !== "perdido")
    .reduce((a, l) => a + Number(l.potential_value || 0), 0);

  return (
    <div>
      <PageHeader
        title="Funil Comercial"
        description="Acompanhe leads em todas as etapas do pipeline."
        actionLabel="Novo lead"
        onAction={() => openNew("novo")}
      />

      <div className="mb-4 text-sm text-muted-foreground">
        Valor em aberto: <strong className="text-primary text-base">R$ {totalOpen.toFixed(2)}</strong> · {leads.length} leads
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map(s => {
          const col = byStage[s.key] ?? [];
          const colTotal = col.reduce((a, l) => a + Number(l.potential_value || 0), 0);
          return (
            <div
              key={s.key}
              className="w-72 shrink-0"
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop(s.key)}
            >
              <div className="flex items-center justify-between px-2 mb-2">
                <Badge className={`${s.tone} font-medium`}>{s.label} · {col.length}</Badge>
                <button onClick={() => openNew(s.key)} className="text-muted-foreground hover:text-primary" title="Adicionar nesta coluna">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="text-[10px] text-muted-foreground px-2 mb-2">R$ {colTotal.toFixed(2)}</div>
              <div className="space-y-2 min-h-[200px] p-2 rounded-2xl bg-muted/30">
                {col.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6">Solte um lead aqui</div>
                )}
                {col.map(l => (
                  <Card
                    key={l.id}
                    draggable
                    onDragStart={() => setDragId(l.id)}
                    onDragEnd={() => setDragId(null)}
                    className={`p-3 rounded-2xl cursor-grab active:cursor-grabbing ${dragId === l.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{l.name}</div>
                        {l.company && <div className="text-xs text-muted-foreground truncate">{l.company}</div>}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => openEdit(l)} className="text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => remove(l.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    {l.phone && (
                      <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
                        <Phone className="h-3 w-3" /> {l.phone}
                      </a>
                    )}
                    {Number(l.potential_value) > 0 && (
                      <div className="mt-2 text-xs font-semibold text-primary">R$ {Number(l.potential_value).toFixed(2)}</div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {STAGES.filter(x => x.key !== l.stage).slice(0, 3).map(x => (
                        <button key={x.key} onClick={() => moveTo(l.id, x.key)} className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary hover:bg-primary/10">→ {x.label}</button>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar lead" : "Novo lead"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Empresa</Label><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Valor potencial (R$)</Label><Input type="number" step="0.01" value={form.potential_value} onChange={e => setForm({ ...form, potential_value: +e.target.value })} /></div>
            </div>
            <div><Label>Etapa</Label>
              <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
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
