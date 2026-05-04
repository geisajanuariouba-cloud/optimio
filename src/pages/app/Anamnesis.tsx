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

const QUESTIONS = [
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

  const load = async () => {
    const [{ data: a }, { data: c }] = await Promise.all([
      supabase.from("anamnesis").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("id, full_name").is("deleted_at", null),
    ]);
    setItems(a ?? []); setClients(c ?? []);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const save = async () => {
    if (!user || !form.client_id) return toast.error("Selecione um cliente");
    const { error } = await supabase.from("anamnesis").insert({
      user_id: user.id, client_id: form.client_id,
      answers: form.answers, professional_notes: form.professional_notes,
    });
    if (error) return toast.error(error.message);
    toast.success("Anamnese registrada"); setOpen(false); load();
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
            {QUESTIONS.map(q => (
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
    </div>
  );
}
