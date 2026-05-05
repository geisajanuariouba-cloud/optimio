import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Navigate, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Shield, Check, X, Users, DollarSign, AlertTriangle, Upload, Ban, Power, Receipt, Plus, Trash2, ArrowLeft, Settings as SettingsIcon, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Tenant = { id: string; full_name: string|null; company_name: string|null; phone_number: string|null; plan: string; account_status: string; created_at: string; niche: string };
type Plan = { id: string; slug: string; name: string; price: number; description: string|null; modules: string[]; active: boolean; sort_order: number };
type Sub = { id: string; user_id: string; plan_slug: string; status: string; current_period_end: string; last_paid_at: string|null };

export default function SuperAdmin() {
  const { isAdmin, loading } = useTenant();
  const { user } = useAuth();
  const nav = useNavigate();
  const backToApp = () => nav("/app");

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);

  const load = async () => {
    const [{ data: t }, { data: p }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,company_name,phone_number,plan,account_status,created_at,niche").order("created_at",{ascending:false}),
      supabase.from("plans").select("*").order("sort_order"),
      supabase.from("subscriptions").select("*").order("current_period_end"),
    ]);
    setTenants((t??[]) as Tenant[]); setPlans((p??[]) as any); setSubs((s??[]) as Sub[]);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background bg-mesh"><div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/app" replace />;

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ account_status: status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado"); load();
  };

  const subByUser = useMemo(() => Object.fromEntries(subs.map(s => [s.user_id, s])), [subs]);
  const expiringSoon = subs.filter(s => {
    const days = (new Date(s.current_period_end).getTime() - Date.now())/86400000;
    return days >= 0 && days <= 7 && s.status === "active";
  });
  const overdue = subs.filter(s => new Date(s.current_period_end).getTime() < Date.now() && s.status !== "canceled");

  const active = tenants.filter(t => t.account_status === "active");
  const pending = tenants.filter(t => t.account_status === "pending_payment");
  const revenue = active.reduce((a,t) => a + (plans.find(p => p.slug === t.plan)?.price ?? 0), 0);

  return (
    <div className="min-h-screen bg-background bg-mesh">
      <header className="border-b border-border/50 px-4 sm:px-6 py-4 flex items-center justify-between glass">
        <div className="flex items-center gap-3"><Logo size="sm" /><Badge className="bg-gradient-brand text-white border-0 gap-1"><Shield className="h-3 w-3" /> Super Admin</Badge></div>
        <Button variant="outline" onClick={backToApp} className="gap-2"><ArrowLeft className="h-4 w-4" />Sair do painel</Button>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <h1 className="text-4xl font-bold">Painel do Optimio</h1>

        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { l: "Tenants ativos", v: active.length, i: Users },
            { l: "Pendentes pagamento", v: pending.length, i: Shield },
            { l: "Vencendo em 7 dias", v: expiringSoon.length, i: AlertTriangle },
            { l: "MRR estimado", v: `R$ ${revenue.toFixed(0)}`, i: DollarSign },
          ].map(s => (
            <Card key={s.l} className="glass border-0 rounded-3xl p-6">
              <s.i className="h-5 w-5 text-brand-cyan mb-3" />
              <div className="text-3xl font-bold">{s.v}</div>
              <div className="text-sm text-muted-foreground">{s.l}</div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="tenants">
          <TabsList className="bg-secondary/40 flex flex-wrap h-auto">
            <TabsTrigger value="tenants">Clientes</TabsTrigger>
            <TabsTrigger value="expiring">A Vencer ({expiringSoon.length + overdue.length})</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="approval">Aprovações ({pending.length})</TabsTrigger>
            <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-1" />Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="tenants">
            <Card className="glass border-0 rounded-3xl overflow-hidden">
              <div className="p-5 border-b border-border/40 font-semibold">Todos os clientes</div>
              <div className="divide-y divide-border/40">
                {tenants.map(t => {
                  const sub = subByUser[t.id];
                  return (
                    <div key={t.id} className="p-4 flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex-1 min-w-[200px]">
                        <div className="font-medium">{t.company_name}</div>
                        <div className="text-xs text-muted-foreground">{t.full_name} · {t.niche} {t.phone_number ? `· ${t.phone_number}` : ""}</div>
                      </div>
                      <Badge variant="outline" className="capitalize">{t.plan}</Badge>
                      <Badge className={t.account_status === "active" ? "bg-emerald-500/10 text-emerald-600" : t.account_status === "banned" ? "bg-rose-600/10 text-rose-600" : t.account_status === "rejected" || t.account_status === "disabled" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}>
                        {t.account_status}
                      </Badge>
                      {sub && <Badge variant="outline" className="text-xs">vence {new Date(sub.current_period_end).toLocaleDateString()}</Badge>}
                      <div className="flex gap-1">
                        {t.account_status !== "active" && <Button size="sm" variant="ghost" onClick={() => setStatus(t.id,"active")}><Power className="h-4 w-4 text-emerald-600" /></Button>}
                        {t.account_status === "active" && <Button size="sm" variant="ghost" onClick={() => setStatus(t.id,"disabled")}><Power className="h-4 w-4 text-amber-600" /></Button>}
                        <Button size="sm" variant="ghost" onClick={() => setStatus(t.id,"banned")}><Ban className="h-4 w-4 text-rose-600" /></Button>
                        {sub && <ProofDialog tenant={t} sub={sub} adminId={user!.id} onDone={load} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="expiring">
            <Card className="glass border-0 rounded-3xl overflow-hidden">
              <div className="p-5 border-b border-border/40 font-semibold">Vencimentos próximos / Em atraso</div>
              <div className="divide-y divide-border/40">
                {[...overdue, ...expiringSoon].map(s => {
                  const t = tenants.find(x => x.id === s.user_id);
                  if (!t) return null;
                  const days = Math.ceil((new Date(s.current_period_end).getTime() - Date.now())/86400000);
                  return (
                    <div key={s.id} className="p-4 flex items-center gap-3 text-sm">
                      <div className="flex-1">
                        <div className="font-medium">{t.company_name}</div>
                        <div className="text-xs text-muted-foreground">{t.full_name} · {t.phone_number}</div>
                      </div>
                      <Badge className={days < 0 ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}>
                        {days < 0 ? `${Math.abs(days)}d em atraso` : `vence em ${days}d`}
                      </Badge>
                      {t.phone_number && <a href={`https://wa.me/${t.phone_number.replace(/\D/g,"")}`} target="_blank" rel="noopener"><Button size="sm" variant="outline">WhatsApp</Button></a>}
                      <ProofDialog tenant={t} sub={s} adminId={user!.id} onDone={load} />
                    </div>
                  );
                })}
                {overdue.length + expiringSoon.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">Nada vencendo nos próximos 7 dias.</div>}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="plans">
            <PlansEditor plans={plans} onChange={load} />
          </TabsContent>

          <TabsContent value="approval">
            <Card className="glass border-0 rounded-3xl overflow-hidden">
              <div className="p-5 border-b border-border/40 font-semibold">Aprovação de contas</div>
              {pending.length === 0
                ? <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma conta aguardando.</div>
                : <div className="divide-y divide-border/40">{pending.map(t => (
                    <div key={t.id} className="p-4 flex items-center gap-4">
                      <div className="flex-1"><div className="font-medium">{t.company_name}</div><div className="text-xs text-muted-foreground">{t.full_name} · plano {t.plan} · {t.niche} · {t.phone_number}</div></div>
                      <Button size="sm" onClick={() => setStatus(t.id,"active")} className="bg-emerald-600 hover:bg-emerald-700"><Check className="h-4 w-4 mr-1" />Aprovar</Button>
                      <Button size="sm" variant="destructive" onClick={() => setStatus(t.id,"rejected")}><X className="h-4 w-4 mr-1" />Rejeitar</Button>
                    </div>
                  ))}</div>}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ProofDialog({ tenant, sub, adminId, onDone }: { tenant: Tenant; sub: Sub; adminId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("pix");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!file) return toast.error("Anexe o comprovante (PDF/Imagem).");
    if (!amount) return toast.error("Informe o valor.");
    setBusy(true);
    try {
      const path = `${tenant.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g,"_")}`;
      const up = await supabase.storage.from("payment-proofs").upload(path, file);
      if (up.error) throw up.error;
      const { error: e1 } = await supabase.from("payment_proofs").insert({
        user_id: tenant.id, subscription_id: sub.id, amount: Number(amount), method, notes, file_path: path, created_by: adminId,
      });
      if (e1) throw e1;
      const newEnd = new Date(Math.max(Date.now(), new Date(sub.current_period_end).getTime()) + 30*86400000).toISOString();
      const { error: e2 } = await supabase.from("subscriptions").update({
        status: "active", last_paid_at: new Date().toISOString(), current_period_end: newEnd,
      }).eq("id", sub.id);
      if (e2) throw e2;
      await supabase.from("profiles").update({ account_status: "active" }).eq("id", tenant.id);
      toast.success("Pagamento registrado. Assinatura renovada por 30 dias.");
      setOpen(false); onDone();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Receipt className="h-4 w-4 mr-1" />Pagamento</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Registrar pagamento — {tenant.company_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Valor (R$)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div><Label>Método</Label>
            <select className="w-full h-10 rounded-md bg-secondary/40 border border-border px-3" value={method} onChange={e => setMethod(e.target.value)}>
              <option value="pix">PIX</option><option value="boleto">Boleto</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option>
            </select>
          </div>
          <div><Label>Comprovante (PDF/Imagem)</Label><Input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} /></div>
          <div><Label>Observações</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="opcional" /></div>
          <Button onClick={submit} disabled={busy} className="w-full bg-gradient-brand text-white border-0"><Upload className="h-4 w-4 mr-2" />{busy ? "Salvando..." : "Salvar e renovar +30d"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlansEditor({ plans, onChange }: { plans: Plan[]; onChange: () => void }) {
  const [draft, setDraft] = useState<Record<string, Partial<Plan>>>({});
  const save = async (p: Plan) => {
    const patch = draft[p.id]; if (!patch) return;
    const { error } = await supabase.from("plans").update(patch as any).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Plano atualizado"); setDraft(d => { const n = {...d}; delete n[p.id]; return n; }); onChange();
  };
  const add = async () => {
    const slug = prompt("Slug do novo plano (ex: pro):"); if (!slug) return;
    const { error } = await supabase.from("plans").insert({ slug, name: slug, price: 0 });
    if (error) return toast.error(error.message); onChange();
  };
  const del = async (id: string) => {
    if (!confirm("Excluir este plano?")) return;
    await supabase.from("plans").delete().eq("id", id); onChange();
  };
  return (
    <Card className="glass border-0 rounded-3xl overflow-hidden">
      <div className="p-5 border-b border-border/40 font-semibold flex items-center justify-between">
        <span>Planos</span>
        <Button size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" />Novo plano</Button>
      </div>
      <div className="divide-y divide-border/40">
        {plans.map(p => {
          const d = { ...p, ...draft[p.id] } as Plan;
          const dirty = !!draft[p.id];
          const set = (k: keyof Plan, v: any) => setDraft(s => ({ ...s, [p.id]: { ...(s[p.id]||{}), [k]: v } }));
          return (
            <div key={p.id} className="p-4 grid md:grid-cols-[1fr,1fr,120px,auto] gap-3 items-end">
              <div><Label className="text-xs">Nome</Label><Input value={d.name} onChange={e => set("name", e.target.value)} /></div>
              <div><Label className="text-xs">Slug</Label><Input value={d.slug} onChange={e => set("slug", e.target.value)} /></div>
              <div><Label className="text-xs">Preço (R$)</Label><Input type="number" value={d.price} onChange={e => set("price", Number(e.target.value))} /></div>
              <div className="flex gap-1">
                {dirty && <Button size="sm" onClick={() => save(p)} className="bg-emerald-600 hover:bg-emerald-700">Salvar</Button>}
                <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
