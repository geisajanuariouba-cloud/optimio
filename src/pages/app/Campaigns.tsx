import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Megaphone, Sparkles, Calendar, DollarSign, Trash2 } from "lucide-react";

type Campaign = { id: string; name: string; channel: string; status: string; budget: number; starts_at: string | null; ends_at: string | null; objective: string | null; audience: string | null; ai_generated: boolean; ad_account_id: string | null; daily_spend: number | null };
type AdAccount = { id: string; platform: string; business_manager_name: string | null; page_name: string | null };

const CHANNELS = ["instagram", "facebook", "google", "tiktok", "whatsapp", "email"];
const STATUS: Record<string, string> = { draft: "Rascunho", active: "Ativa", paused: "Pausada", finished: "Encerrada" };

const empty = { name: "", channel: "instagram", budget: 0, starts_at: "", ends_at: "", objective: "", audience: "", ad_account_id: "", daily_spend: "" };

export default function Campaigns() {
  const { user } = useAuth();
  const [list, setList] = useState<Campaign[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    const [{ data }, { data: accs }] = await Promise.all([
      supabase.from("marketing_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("ad_accounts" as any).select("id,platform,business_manager_name,page_name").is("deleted_at", null),
    ]);
    setList((data ?? []) as Campaign[]);
    setAdAccounts((accs ?? []) as AdAccount[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const accountLabel = (id?: string | null) => {
    const a = adAccounts.find(x => x.id === id);
    return a ? (a.business_manager_name || a.page_name || a.platform) : null;
  };

  const save = async () => {
    if (!user || !form.name) return toast.error("Nome obrigatório");
    const { error } = await supabase.from("marketing_campaigns").insert({
      user_id: user.id, name: form.name, channel: form.channel, budget: form.budget,
      starts_at: form.starts_at || null, ends_at: form.ends_at || null,
      objective: form.objective, audience: form.audience, status: "draft",
      ad_account_id: form.ad_account_id || null,
      daily_spend: form.daily_spend ? Number(form.daily_spend) : null,
    });
    if (error) return toast.error(friendlyError(error));
    toast.success("Campanha criada"); setOpen(false); setForm(empty); load();
  };

  const generateAI = async () => {
    if (!user) return;
    const samples = [
      { name: "Black Friday — Reels diários", channel: "instagram", budget: 200, objective: "conversão", audience: "Clientes ativos", ai_generated: true, status: "draft" },
      { name: "Reativação inativos — WhatsApp", channel: "whatsapp", budget: 0, objective: "retenção", audience: "Inativos 60+ dias", ai_generated: true, status: "draft" },
      { name: "Lançamento novo produto", channel: "facebook", budget: 500, objective: "alcance", audience: "Lookalike", ai_generated: true, status: "draft" },
    ];
    await supabase.from("marketing_campaigns").insert(samples.map(s => ({ ...s, user_id: user.id })));
    toast.success("3 campanhas sugeridas pela IA"); load();
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("marketing_campaigns").update({ status }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir campanha permanentemente?")) return;
    await supabase.from("marketing_campaigns").delete().eq("id", id);
    toast.success("Campanha excluída");
    load();
  };

  const activeCount = list.filter(c => c.status === "active").length;
  const totalBudget = list.reduce((a, c) => a + Number(c.budget), 0);

  return (
    <div>
      <PageHeader title="Campanhas de Marketing" description="Crie campanhas multi-canal com sugestões da IA." actionLabel="Nova campanha" onAction={() => setOpen(true)} />

      <div className="flex gap-2 mb-4">
        <Button variant="outline" className="rounded-2xl gap-2" onClick={generateAI}><Sparkles className="h-4 w-4" />Sugerir com IA</Button>
      </div>

      <MetricsRow items={[
        { label: "Total", value: String(list.length), tone: "primary" },
        { label: "Ativas", value: String(activeCount), tone: "success" },
        { label: "Investimento", value: `R$ ${totalBudget.toFixed(0)}`, tone: "primary" },
        { label: "Canais", value: String(new Set(list.map(c => c.channel)).size), tone: "primary" },
      ]} />

      {list.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={Megaphone} title="Sem campanhas" description="Crie a primeira ou peça sugestões para a IA." actionLabel="Nova campanha" onAction={() => setOpen(true)} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map(c => (
            <Card key={c.id} className="rounded-3xl border-0 shadow-sm p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold flex items-center gap-2">{c.name} {c.ai_generated && <Sparkles className="h-3.5 w-3.5 text-primary" />}</div>
                  <div className="text-xs text-muted-foreground capitalize">{c.channel}{c.objective ? ` · ${c.objective}` : ""}</div>
                </div>
                <Badge variant="outline">{STATUS[c.status]}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {c.budget > 0 && <Badge variant="outline" className="gap-1"><DollarSign className="h-3 w-3" />R$ {Number(c.budget).toFixed(0)}</Badge>}
                {c.daily_spend != null && <Badge variant="outline" className="gap-1">R$ {Number(c.daily_spend).toFixed(0)}/dia</Badge>}
                {c.starts_at && <Badge variant="outline" className="gap-1"><Calendar className="h-3 w-3" />{new Date(c.starts_at).toLocaleDateString("pt-BR")}</Badge>}
                {c.audience && <Badge variant="outline">{c.audience}</Badge>}
                {accountLabel(c.ad_account_id) && <Badge variant="outline">{accountLabel(c.ad_account_id)}</Badge>}
              </div>
              <div className="flex gap-2 pt-1 flex-wrap">
                {c.status !== "active" && <Button size="sm" onClick={() => setStatus(c.id, "active")} className="rounded-2xl">Ativar</Button>}
                {c.status === "active" && <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "paused")} className="rounded-2xl">Pausar</Button>}
                <Button size="sm" variant="ghost" onClick={() => setStatus(c.id, "finished")}>Encerrar</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(c.id)} className="text-destructive hover:text-destructive ml-auto"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Nova campanha</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Canal</Label>
                <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Orçamento (R$)</Label><Input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Conta de anúncio</Label>
                <Select value={form.ad_account_id} onValueChange={v => setForm({ ...form, ad_account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                  <SelectContent>
                    {adAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.business_manager_name || a.page_name || a.platform}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Gasto diário (R$)</Label><Input type="number" value={form.daily_spend} onChange={e => setForm({ ...form, daily_spend: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início</Label><Input type="date" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="date" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} /></div>
            </div>
            <div><Label>Objetivo</Label><Input value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} placeholder="alcance, conversão, retenção..." /></div>
            <div><Label>Público</Label><Textarea rows={2} value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} className="rounded-2xl">Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
