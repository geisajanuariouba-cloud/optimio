import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Lightbulb, Sparkles, Check, X, TrendingUp, Trash2, Plus, Star } from "lucide-react";
import { Link } from "react-router-dom";

type Idea = {
  id: string; name: string; category: string | null; reason: string | null; estimated_margin: number | null;
  potential_score: number; status: string; source: string;
  persona: { nome?: string; dor?: string; desejo?: string; faixa_etaria?: string; objecoes?: string } | null;
  landing_page_url: string | null; landing_page_notes: string | null;
};
type Deliverable = { id: string; product_idea_id: string; name: string; file_url: string | null; kind: string };
type Creative = { id: string; product_idea_id: string | null; name: string; status: string; platform: string };

const SEEDS = [
  { name: "Kit Higiene Premium", category: "Combos", reason: "Margem alta + recorrência mensal", estimated_margin: 45, potential_score: 92 },
  { name: "Variação cor Preto Fosco", category: "Variações", reason: "Tendência alta no nicho", estimated_margin: 38, potential_score: 85 },
  { name: "Acessório complementar", category: "Cross-sell", reason: "Carrinhos com este produto vendem 2x mais", estimated_margin: 60, potential_score: 88 },
  { name: "Edição limitada sazonal", category: "Sazonal", reason: "Janela de Black Friday se aproxima", estimated_margin: 30, potential_score: 78 },
];

const DELIVERABLE_KINDS: Record<string, string> = { ebook: "E-book", video: "Vídeo", curso: "Curso", bonus: "Bônus", outro: "Outro" };

export default function ProductIdeas() {
  const { user } = useAuth();
  const [list, setList] = useState<Idea[]>([]);
  const [detail, setDetail] = useState<Idea | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [personaForm, setPersonaForm] = useState<any>({});
  const [landingForm, setLandingForm] = useState({ landing_page_url: "", landing_page_notes: "" });
  const [newDeliverable, setNewDeliverable] = useState({ name: "", file_url: "", kind: "ebook" });

  const load = async () => {
    const { data } = await supabase.from("product_ideas").select("*").is("deleted_at", null).order("potential_score", { ascending: false });
    setList((data ?? []) as Idea[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const generate = async () => {
    if (!user) return;
    await supabase.from("product_ideas").insert(SEEDS.map(s => ({ ...s, user_id: user.id, source: "ai", status: "suggested" })));
    toast.success("Novas ideias geradas pela IA"); load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("product_ideas").update({ status }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Mover para a lixeira?")) return;
    await supabase.from("product_ideas").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    toast.success("Movido para lixeira"); load();
  };

  const openDetail = async (idea: Idea) => {
    setDetail(idea);
    setPersonaForm(idea.persona ?? {});
    setLandingForm({ landing_page_url: idea.landing_page_url ?? "", landing_page_notes: idea.landing_page_notes ?? "" });
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from("product_deliverables" as any).select("*").eq("product_idea_id", idea.id).is("deleted_at", null),
      supabase.from("ad_creatives" as any).select("id,product_idea_id,name,status,platform").eq("product_idea_id", idea.id).is("deleted_at", null),
    ]);
    setDeliverables((d ?? []) as Deliverable[]);
    setCreatives((c ?? []) as Creative[]);
  };

  const savePersona = async () => {
    if (!detail) return;
    const { error } = await supabase.from("product_ideas").update({ persona: personaForm }).eq("id", detail.id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Persona salva"); load();
  };

  const saveLanding = async () => {
    if (!detail) return;
    const { error } = await supabase.from("product_ideas").update(landingForm).eq("id", detail.id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Landing page salva"); load();
  };

  const addDeliverable = async () => {
    if (!user || !detail || !newDeliverable.name.trim()) return toast.error("Nome obrigatório");
    const { error } = await supabase.from("product_deliverables" as any).insert({
      user_id: user.id, product_idea_id: detail.id, ...newDeliverable,
    });
    if (error) return toast.error(friendlyError(error));
    setNewDeliverable({ name: "", file_url: "", kind: "ebook" });
    openDetail(detail);
  };

  const removeDeliverable = async (id: string) => {
    await supabase.from("product_deliverables" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (detail) openDetail(detail);
  };

  return (
    <div>
      <PageHeader title="Ideias de Produto (IA)" description="Sugestões baseadas em vendas, tendências e margem." actionLabel="Gerar com IA" onAction={generate} />

      <MetricsRow items={[
        { label: "Sugeridas", value: String(list.filter(i => i.status === "suggested").length), tone: "primary" },
        { label: "Aceitas", value: String(list.filter(i => i.status === "accepted").length), tone: "success" },
        { label: "Descartadas", value: String(list.filter(i => i.status === "rejected").length), tone: "warning" },
        { label: "Potencial médio", value: list.length ? `${Math.round(list.reduce((a, i) => a + i.potential_score, 0) / list.length)}%` : "—", tone: "primary" },
      ]} />

      {list.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={Lightbulb} title="Sem ideias ainda" description="Clique em 'Gerar com IA' para receber sugestões com base nos seus dados." actionLabel="Gerar com IA" onAction={generate} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map(i => (
            <Card key={i.id} className="rounded-3xl border-0 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{i.name}</div>
                  {i.category && <Badge variant="outline" className="text-[10px] mt-1">{i.category}</Badge>}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary flex items-center gap-1"><TrendingUp className="h-4 w-4" />{i.potential_score}</div>
                  <div className="text-[10px] text-muted-foreground">potencial</div>
                </div>
              </div>
              {i.reason && <div className="text-xs text-muted-foreground flex gap-1.5"><Sparkles className="h-3 w-3 shrink-0 mt-0.5 text-primary" />{i.reason}</div>}
              {i.estimated_margin != null && <Badge variant="outline" className="text-[10px]">Margem ~{i.estimated_margin}%</Badge>}
              {i.status === "suggested" && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1 rounded-2xl gap-1" onClick={() => updateStatus(i.id, "accepted")}><Check className="h-3.5 w-3.5" />Aceitar</Button>
                  <Button size="sm" variant="outline" className="flex-1 rounded-2xl gap-1" onClick={() => updateStatus(i.id, "rejected")}><X className="h-3.5 w-3.5" />Descartar</Button>
                </div>
              )}
              {i.status !== "suggested" && <Badge className={i.status === "accepted" ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"}>{i.status === "accepted" ? "Aceita" : "Descartada"}</Badge>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 rounded-2xl" onClick={() => openDetail(i)}>Detalhes</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(i.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="rounded-3xl max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>{detail?.name}</DialogTitle></DialogHeader>
          <Tabs defaultValue="persona">
            <TabsList>
              <TabsTrigger value="persona">Persona</TabsTrigger>
              <TabsTrigger value="deliverables">Entregáveis ({deliverables.length})</TabsTrigger>
              <TabsTrigger value="landing">Landing Page</TabsTrigger>
              <TabsTrigger value="creatives">Criativos ({creatives.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="persona" className="space-y-3 mt-4">
              <div><Label>Nome da persona</Label><Input value={personaForm.nome ?? ""} onChange={e => setPersonaForm({ ...personaForm, nome: e.target.value })} placeholder="Ex: Ana, 32 anos" /></div>
              <div><Label>Faixa etária</Label><Input value={personaForm.faixa_etaria ?? ""} onChange={e => setPersonaForm({ ...personaForm, faixa_etaria: e.target.value })} /></div>
              <div><Label>Dor</Label><Textarea rows={2} value={personaForm.dor ?? ""} onChange={e => setPersonaForm({ ...personaForm, dor: e.target.value })} /></div>
              <div><Label>Desejo</Label><Textarea rows={2} value={personaForm.desejo ?? ""} onChange={e => setPersonaForm({ ...personaForm, desejo: e.target.value })} /></div>
              <div><Label>Objeções</Label><Textarea rows={2} value={personaForm.objecoes ?? ""} onChange={e => setPersonaForm({ ...personaForm, objecoes: e.target.value })} /></div>
              <Button onClick={savePersona} className="rounded-2xl">Salvar persona</Button>
            </TabsContent>

            <TabsContent value="deliverables" className="space-y-3 mt-4">
              {deliverables.length === 0 && <p className="text-xs text-muted-foreground">Nenhum entregável cadastrado.</p>}
              {deliverables.map(d => (
                <div key={d.id} className="flex items-center gap-2 p-2 rounded-xl bg-secondary/40">
                  <Badge variant="outline" className="text-[10px]">{DELIVERABLE_KINDS[d.kind]}</Badge>
                  <span className="text-sm flex-1">{d.name}</span>
                  {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Abrir</a>}
                  <Button size="icon" variant="ghost" onClick={() => removeDeliverable(d.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              ))}
              <div className="grid grid-cols-[1fr_1fr_100px_auto] gap-2 items-end pt-2 border-t border-border/50">
                <div><Label className="text-xs">Nome</Label><Input value={newDeliverable.name} onChange={e => setNewDeliverable({ ...newDeliverable, name: e.target.value })} /></div>
                <div><Label className="text-xs">URL do arquivo</Label><Input value={newDeliverable.file_url} onChange={e => setNewDeliverable({ ...newDeliverable, file_url: e.target.value })} /></div>
                <div><Label className="text-xs">Tipo</Label>
                  <Select value={newDeliverable.kind} onValueChange={v => setNewDeliverable({ ...newDeliverable, kind: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(DELIVERABLE_KINDS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button size="icon" onClick={addDeliverable}><Plus className="h-4 w-4" /></Button>
              </div>
            </TabsContent>

            <TabsContent value="landing" className="space-y-3 mt-4">
              <div><Label>URL da landing page</Label><Input value={landingForm.landing_page_url} onChange={e => setLandingForm({ ...landingForm, landing_page_url: e.target.value })} placeholder="https://..." /></div>
              <div><Label>Notas</Label><Textarea rows={3} value={landingForm.landing_page_notes} onChange={e => setLandingForm({ ...landingForm, landing_page_notes: e.target.value })} /></div>
              <Button onClick={saveLanding} className="rounded-2xl">Salvar landing page</Button>
            </TabsContent>

            <TabsContent value="creatives" className="space-y-2 mt-4">
              {creatives.length === 0 && <p className="text-xs text-muted-foreground">Nenhum criativo vinculado a este produto ainda.</p>}
              {creatives.map(c => (
                <div key={c.id} className="flex items-center gap-2 p-2 rounded-xl bg-secondary/40 text-sm">
                  {c.status === "validated" && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                  <span className="flex-1">{c.name}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{c.platform}</Badge>
                </div>
              ))}
              <Link to="/app/ad-creatives"><Button variant="outline" className="rounded-2xl w-full mt-2">Ver biblioteca de criativos →</Button></Link>
            </TabsContent>
          </Tabs>
          <DialogFooter><Button variant="ghost" onClick={() => setDetail(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
