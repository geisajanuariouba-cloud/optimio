import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { ClipboardList, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Question = { key: string; label: string };
const DEFAULT_QUESTIONS: Question[] = [
  { key: "objetivo", label: "Qual o objetivo principal do tratamento?" },
  { key: "alergias", label: "Possui alergias ou sensibilidades?" },
  { key: "medicacoes", label: "Faz uso de medicações contínuas?" },
  { key: "tratamentos_anteriores", label: "Realizou tratamentos similares antes?" },
  { key: "expectativas", label: "Quais suas expectativas com o resultado?" },
];

export default function Anamnesis() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ client_id: string; answers: Record<string, string>; professional_notes: string }>({ client_id: "", answers: {}, professional_notes: "" });
  const [aiLoading, setAiLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const load = async () => {
    const [{ data: a }, { data: c }, { data: t }] = await Promise.all([
      supabase.from("anamnesis").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("id, full_name").is("deleted_at", null),
      supabase.from("anamnesis_templates").select("*").maybeSingle(),
    ]);
    setItems(a ?? []); setClients(c ?? []);
    if (t?.questions && Array.isArray(t.questions) && (t.questions as any[]).length > 0) {
      setQuestions(t.questions as Question[]); setDraft(t.questions as Question[]); setTemplateId(t.id);
    }
  };
  useEffect(() => { if (user) load(); }, [user]);

  const save = async () => {
    if (!user || !form.client_id) return toast.error("Selecione um cliente");
    const next_due = new Date(); next_due.setDate(next_due.getDate() + 90);
    const { error } = await supabase.from("anamnesis").insert({
      user_id: user.id, client_id: form.client_id,
      answers: form.answers, professional_notes: form.professional_notes,
      next_due_date: next_due.toISOString().slice(0, 10),
    });
    if (error) return toast.error(error.message);
    toast.success("Anamnese registrada"); setOpen(false); load();
  };

  const saveTemplate = async () => {
    if (!user) return;
    const clean = draft.filter(q => q.key.trim() && q.label.trim());
    if (templateId) {
      await supabase.from("anamnesis_templates").update({ questions: clean as any }).eq("id", templateId);
    } else {
      await supabase.from("anamnesis_templates").insert({ user_id: user.id, questions: clean as any });
    }
    toast.success("Modelo salvo");
    setQuestions(clean); setEditorOpen(false); load();
  };

  const suggestPackage = (a: any) => {
    setAiLoading(true);
    setTimeout(() => {
      setAiLoading(false);
      toast.success("IA sugeriu um pacote de 4 sessões com base na anamnese (mock).");
    }, 800);
  };

  const clientName = (id: string) => clients.find(c => c.id === id)?.full_name ?? "—";

  return (
    <div>
      <PageHeader title="Anamnese" description="Ficha clínica integrada — IA sugere pacotes a partir das respostas." actionLabel="Nova anamnese" onAction={() => { setForm({ client_id: "", answers: {}, professional_notes: "" }); setOpen(true); }} />

      <div className="flex justify-end mb-3">
        <Button size="sm" variant="outline" onClick={() => { setDraft(questions); setEditorOpen(true); }} className="rounded-2xl">Personalizar perguntas</Button>
      </div>

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Nenhuma anamnese registrada" description="Comece preenchendo a ficha de um cliente." actionLabel="Nova anamnese" onAction={() => setOpen(true)} />
        ) : (
          <div className="divide-y divide-border">
            {items.map(a => (
              <div key={a.id} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium">{clientName(a.client_id)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("pt-BR")} · {Object.keys(a.answers ?? {}).length} respostas</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => suggestPackage(a)} disabled={aiLoading} className="rounded-xl">
                  <Sparkles className="h-3 w-3 mr-1" />Sugerir pacote
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader><DialogTitle>Nova anamnese</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            <div><Label>Cliente</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {questions.map(q => (
              <div key={q.key}>
                <Label>{q.label}</Label>
                <Textarea rows={2} value={form.answers[q.key] ?? ""} onChange={(e) => setForm({ ...form, answers: { ...form.answers, [q.key]: e.target.value } })} />
              </div>
            ))}
            <div><Label>Notas do profissional</Label><Textarea rows={2} value={form.professional_notes} onChange={(e) => setForm({ ...form, professional_notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="rounded-2xl">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader><DialogTitle>Editar perguntas da anamnese</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {draft.map((q, i) => (
              <div key={i} className="flex gap-2">
                <Input value={q.label} onChange={(e) => { const d = [...draft]; d[i] = { ...d[i], label: e.target.value, key: d[i].key || `q_${i}` }; setDraft(d); }} placeholder="Pergunta" />
                <Button size="icon" variant="ghost" onClick={() => setDraft(draft.filter((_, k) => k !== i))}>×</Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setDraft([...draft, { key: `q_${Date.now()}`, label: "" }])} className="rounded-xl">+ Adicionar pergunta</Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>Cancelar</Button>
            <Button onClick={saveTemplate} className="rounded-2xl">Salvar modelo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
