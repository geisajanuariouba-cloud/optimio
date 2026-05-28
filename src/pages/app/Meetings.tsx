import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Users2, Sparkles, Calendar } from "lucide-react";

type Meeting = { id: string; title: string; scheduled_for: string | null; duration_minutes: number; agenda: string | null; summary: string | null; scope: string };

const SCOPE: Record<string, string> = { general: "Geral", leaders: "Líderes", sector: "Setor", private: "Privada" };

const empty = { title: "", scheduled_for: "", duration_minutes: 30, agenda: "", scope: "general" };

export default function Meetings() {
  const { user } = useAuth();
  const [list, setList] = useState<Meeting[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [summary, setSummary] = useState("");

  const load = async () => {
    const { data } = await supabase.from("team_meetings").select("*").order("scheduled_for", { ascending: false });
    setList((data ?? []) as Meeting[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const save = async () => {
    if (!user || !form.title) return toast.error("Título obrigatório");
    const { error } = await supabase.from("team_meetings").insert({
      user_id: user.id, title: form.title, scheduled_for: form.scheduled_for || null,
      duration_minutes: form.duration_minutes, agenda: form.agenda || null, scope: form.scope,
    });
    if (error) return toast.error(friendlyError(error));
    toast.success("Reunião criada"); setOpen(false); setForm(empty); load();
  };

  const saveSummary = async () => {
    if (!selected) return;
    await supabase.from("team_meetings").update({ summary }).eq("id", selected.id);
    toast.success("Resumo salvo"); setSelected(null); setSummary(""); load();
  };

  const aiSummary = () => {
    setSummary("Resumo IA: principais decisões, próximos passos, responsáveis e prazos. (Conecte transcrição para geração real.)");
  };

  return (
    <div>
      <PageHeader title="Reuniões" description="Atas, resumos com IA e acompanhamento de decisões." actionLabel="Nova reunião" onAction={() => setOpen(true)} />

      <MetricsRow items={[
        { label: "Total", value: String(list.length), tone: "primary" },
        { label: "Agendadas", value: String(list.filter(m => m.scheduled_for && new Date(m.scheduled_for) >= new Date()).length), tone: "primary" },
        { label: "Com resumo", value: String(list.filter(m => m.summary).length), tone: "success" },
      ]} />

      {list.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={Users2} title="Sem reuniões" description="Agende reuniões com a equipe e mantenha o histórico." actionLabel="Nova reunião" onAction={() => setOpen(true)} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map(m => (
            <Card key={m.id} className="rounded-3xl border-0 shadow-sm p-4 space-y-2 cursor-pointer hover:shadow-md transition" onClick={() => { setSelected(m); setSummary(m.summary ?? ""); }}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{m.title}</div>
                <Badge variant="outline">{SCOPE[m.scope]}</Badge>
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                {m.scheduled_for && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(m.scheduled_for).toLocaleString("pt-BR")}</span>}
                <span>· {m.duration_minutes}min</span>
              </div>
              {m.agenda && <div className="text-xs text-muted-foreground line-clamp-2">{m.agenda}</div>}
              {m.summary && <Badge className="bg-emerald-500/15 text-emerald-600 w-fit">Com resumo</Badge>}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Nova reunião</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data e hora</Label><Input type="datetime-local" value={form.scheduled_for} onChange={e => setForm({ ...form, scheduled_for: e.target.value })} /></div>
              <div><Label>Duração (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: +e.target.value })} /></div>
            </div>
            <div><Label>Escopo</Label>
              <Select value={form.scope} onValueChange={v => setForm({ ...form, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(SCOPE).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Pauta</Label><Textarea rows={4} value={form.agenda} onChange={e => setForm({ ...form, agenda: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} className="rounded-2xl">Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="rounded-3xl max-w-2xl">
          <DialogHeader><DialogTitle>{selected?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {selected?.agenda && <div className="text-sm bg-muted/40 p-3 rounded-2xl"><strong>Pauta:</strong> {selected.agenda}</div>}
            <div><Label>Resumo / Ata</Label><Textarea rows={8} value={summary} onChange={e => setSummary(e.target.value)} placeholder="O que foi decidido, próximos passos…" /></div>
            <Button variant="outline" size="sm" className="rounded-2xl gap-2" onClick={aiSummary}><Sparkles className="h-4 w-4" />Resumir com IA</Button>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setSelected(null)}>Fechar</Button><Button onClick={saveSummary} className="rounded-2xl">Salvar resumo</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
