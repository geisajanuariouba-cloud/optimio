import { useEffect, useMemo, useState } from "react";
import { friendlyError } from "@/lib/errors";
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
import { Shield, Check, X, Users, DollarSign, AlertTriangle, Upload, Ban, Power, Receipt, Plus, Trash2, ArrowLeft, Settings as SettingsIcon, Save, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Tenant = { id: string; full_name: string|null; company_name: string|null; phone_number: string|null; plan: string; account_status: string; created_at: string; niche: string };
type Plan = { id: string; slug: string; name: string; price: number; description: string|null; modules: string[]; active: boolean; sort_order: number };
type Sub = { id: string; user_id: string; plan_slug: string; status: string; current_period_end: string; last_paid_at: string|null };

export default function SuperAdmin() {
  // Painel interno da Optimio: exclusivo do Super Admin (papel `admin`).
  // Admin Master da empresa NÃO tem acesso, mesmo com plano unlimited.
  const { isSuperAdmin, loading } = useTenant();
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
  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background bg-mesh"><div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!isSuperAdmin) return <Navigate to="/app" replace />;

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ account_status: status }).eq("id", id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Status atualizado"); load();
  };

  const subByUser = useMemo(() => Object.fromEntries(subs.map(s => [s.user_id, s])), [subs]);
  const expiringSoon = subs.filter(s => {
    const days = (new Date(s.current_period_end).getTime() - Date.now())/86400000;
    return days >= 0 && days <= 7 && s.status === "active";
  });
  const overdue = subs.filter(s => new Date(s.current_period_end).getTime() < Date.now() && s.status !== "canceled");

  const active = tenants.filter(t => t.account_status === "active");
  const pending = tenants.filter(t => t.account_status === "waiting_approval" || t.account_status === "pending_payment");
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
            <TabsTrigger value="billing"><CreditCard className="h-4 w-4 mr-1" />Billing</TabsTrigger>
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
                        {sub && <ProofDialog tenant={t} sub={sub} adminId={user!.id} plans={plans} onDone={load} />}
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
                      <ProofDialog tenant={t} sub={s} adminId={user!.id} plans={plans} onDone={load} />
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
                    <div key={t.id} className="p-4 flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[200px]"><div className="font-medium">{t.company_name}</div><div className="text-xs text-muted-foreground">{t.full_name} · plano {t.plan} · {t.niche} · {t.phone_number}</div></div>
                      <Button size="sm" onClick={() => setStatus(t.id,"active")} className="bg-emerald-600 hover:bg-emerald-700"><Check className="h-4 w-4 mr-1" />Aprovar</Button>
                      <Button size="sm" variant="destructive" onClick={() => setStatus(t.id,"rejected")}><X className="h-4 w-4 mr-1" />Rejeitar</Button>
                    </div>
                  ))}</div>}
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <BillingPanel />
          </TabsContent>

          <TabsContent value="settings">
            <GlobalSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ProofDialog({ tenant, sub, adminId, plans, onDone }: { tenant: Tenant; sub: Sub; adminId: string; plans: Plan[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("pix");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [planSlug, setPlanSlug] = useState<string>(sub.plan_slug || tenant.plan || "");
  const [cycleMonths, setCycleMonths] = useState<number>(1);
  const [busy, setBusy] = useState(false);

  const selectedPlan = plans.find(p => p.slug === planSlug);
  const suggested = selectedPlan ? (Number(selectedPlan.price) * cycleMonths).toFixed(2) : "";

  const submit = async () => {
    if (!file) return toast.error("Anexe o comprovante (PDF ou imagem).");
    if (!amount) return toast.error("Informe o valor pago.");
    if (!planSlug) return toast.error("Selecione o plano.");
    setBusy(true);
    try {
      const path = `${tenant.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g,"_")}`;
      const up = await supabase.storage.from("payment-proofs").upload(path, file);
      if (up.error) throw up.error;
      const { error: e1 } = await supabase.from("payment_proofs").insert({
        user_id: tenant.id, subscription_id: sub.id, amount: Number(amount), method,
        notes: `${notes ? notes + " · " : ""}Plano ${planSlug} · ${cycleMonths}m`,
        file_path: path, created_by: adminId,
      });
      if (e1) throw e1;
      const baseTs = Math.max(Date.now(), new Date(sub.current_period_end).getTime());
      const newEnd = new Date(baseTs + cycleMonths * 30 * 86400000).toISOString();
      const { error: e2 } = await supabase.from("subscriptions").update({
        status: "active", last_paid_at: new Date().toISOString(),
        current_period_end: newEnd, plan_slug: planSlug,
      }).eq("id", sub.id);
      if (e2) throw e2;
      await supabase.from("profiles").update({ account_status: "active", plan: planSlug }).eq("id", tenant.id);
      toast.success(`Pagamento registrado. Plano ${planSlug} renovado por ${cycleMonths * 30} dias.`);
      setOpen(false); onDone();
    } catch (e: any) { toast.error(friendlyError(e)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Receipt className="h-4 w-4 mr-1" />Pagamento</Button></DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-auto">
        <DialogHeader><DialogTitle>Registrar pagamento — {tenant.company_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Plano</Label>
              <select className="w-full h-10 rounded-md bg-secondary/40 border border-border px-3" value={planSlug} onChange={e => setPlanSlug(e.target.value)}>
                <option value="">Selecionar…</option>
                {plans.filter(p => p.active).map(p => <option key={p.id} value={p.slug}>{p.name} — R$ {Number(p.price).toFixed(2)}/mês</option>)}
              </select>
            </div>
            <div><Label>Ciclo (meses)</Label>
              <select className="w-full h-10 rounded-md bg-secondary/40 border border-border px-3" value={cycleMonths} onChange={e => setCycleMonths(Number(e.target.value))}>
                {[1, 3, 6, 12].map(n => <option key={n} value={n}>{n}m</option>)}
              </select>
            </div>
          </div>
          <div><Label>Valor pago (R$) {suggested && <span className="text-xs text-muted-foreground">— sugerido R$ {suggested}</span>}</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={suggested} />
          </div>
          <div><Label>Método</Label>
            <select className="w-full h-10 rounded-md bg-secondary/40 border border-border px-3" value={method} onChange={e => setMethod(e.target.value)}>
              <option value="pix">PIX</option><option value="boleto">Boleto</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option>
            </select>
          </div>
          <div><Label>Comprovante (PDF ou imagem)</Label><Input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} /></div>
          <div><Label>Observações</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="opcional" /></div>
          <Button onClick={submit} disabled={busy} className="w-full bg-gradient-brand text-white border-0">
            <Upload className="h-4 w-4 mr-2" />{busy ? "Salvando…" : `Renovar +${cycleMonths * 30} dias`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlansEditor({ plans, onChange }: { plans: Plan[]; onChange: () => void }) {
  const [draft, setDraft] = useState<Record<string, Partial<Plan>>>({});
  const save = async (p: Plan) => {
    const patch = draft[p.id]; if (!patch) return;
    const clean: any = { ...patch };
    if (typeof clean.modules === "string") {
      try { clean.modules = JSON.parse(clean.modules); }
      catch { return toast.error("Módulos: JSON inválido"); }
    }
    const { error } = await supabase.from("plans").update(clean).eq("id", p.id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Plano atualizado"); setDraft(d => { const n = {...d}; delete n[p.id]; return n; }); onChange();
  };
  const add = async () => {
    const slug = prompt("Slug do novo plano (ex: pro):"); if (!slug) return;
    const { error } = await supabase.from("plans").insert({ slug, name: slug, price: 0 });
    if (error) return toast.error(friendlyError(error)); onChange();
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
          const set = (k: keyof Plan | "description" | "modules", v: any) => setDraft(s => ({ ...s, [p.id]: { ...(s[p.id]||{}), [k]: v } }));
          const modulesStr = typeof (d as any).modules === "string"
            ? (d as any).modules
            : JSON.stringify(d.modules ?? [], null, 0);
          return (
            <div key={p.id} className="p-4 space-y-3">
              <div className="grid md:grid-cols-[1fr,1fr,120px,100px,auto] gap-3 items-end">
                <div><Label className="text-xs">Nome</Label><Input value={d.name} onChange={e => set("name", e.target.value)} /></div>
                <div><Label className="text-xs">Slug</Label><Input value={d.slug} onChange={e => set("slug", e.target.value)} /></div>
                <div><Label className="text-xs">Preço (R$)</Label><Input type="number" value={d.price} onChange={e => set("price", Number(e.target.value))} /></div>
                <div><Label className="text-xs">Ordem</Label><Input type="number" value={d.sort_order ?? 0} onChange={e => set("sort_order", Number(e.target.value))} /></div>
                <label className="flex items-center gap-1 text-xs pb-2"><input type="checkbox" checked={d.active} onChange={e => set("active", e.target.checked)} />Ativo</label>
              </div>
              <div><Label className="text-xs">Descrição</Label><Input value={(d as any).description ?? ""} onChange={e => set("description", e.target.value)} placeholder="Tagline curta exibida no checkout" /></div>
              <div>
                <Label className="text-xs">Módulos (JSON array)</Label>
                <textarea className="w-full min-h-[60px] rounded-md bg-secondary/40 border border-border px-3 py-2 font-mono text-xs"
                  value={modulesStr}
                  onChange={e => set("modules", e.target.value)}
                  placeholder='["dashboard","clients","financial"]' />
              </div>
              <div className="flex gap-1 justify-end">
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

function GlobalSettings() {
  const [link, setLink] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.from("app_settings").select("whatsapp_link, support_email").eq("id", 1).maybeSingle().then(({ data }) => {
      setLink(data?.whatsapp_link ?? "");
      setSupportEmail(data?.support_email ?? "");
    });
  }, []);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("app_settings").upsert({ id: 1, whatsapp_link: link, support_email: supportEmail });
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success("Configurações salvas");
  };
  return (
    <Card className="glass border-0 rounded-3xl p-6 space-y-4 max-w-2xl">
      <div>
        <Label>Link do WhatsApp (oficial do Optimio)</Label>
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://wa.me/5511999999999" />
        <p className="text-xs text-muted-foreground mt-1">Aparece no modal de "Cadastro recebido" e nos botões de suporte da plataforma.</p>
      </div>
      <div>
        <Label>E-mail de suporte</Label>
        <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="suporte@optimio.com" />
      </div>
      <Button onClick={save} disabled={busy} className="bg-gradient-brand text-white border-0 gap-2"><Save className="h-4 w-4" />{busy ? "Salvando…" : "Salvar"}</Button>
    </Card>
  );
}

type BillingEvent = { id: string; provider: string; event_type: string; event_id: string; status: string; error_message: string|null; created_at: string; user_id: string|null; raw_payload: any };

function BillingPanel() {
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");

  const load = async () => {
    const [{ data: ev }, { data: ss }] = await Promise.all([
      supabase.from("billing_events").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("system_settings").select("key,value").eq("scope", "global"),
    ]);
    setEvents((ev ?? []) as BillingEvent[]);
    const map: Record<string, any> = {};
    for (const s of (ss ?? [])) map[(s as any).key] = (s as any).value;
    setSettings(map);
  };
  useEffect(() => { load(); }, []);

  const getStr = (k: string) => {
    const v = settings[k];
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object" && "value" in v) return String((v as any).value ?? "");
    return JSON.stringify(v);
  };
  const setStr = (k: string, val: string) => setSettings(s => ({ ...s, [k]: val }));

  const saveSetting = async (key: string, raw: string, asJson = false) => {
    let value: any = raw;
    if (asJson) { try { value = JSON.parse(raw || "{}"); } catch { return toast.error("JSON inválido em " + key); } }
    const { error } = await supabase.from("system_settings").upsert({ scope: "global", owner_user_id: null, key, value }, { onConflict: "scope,owner_user_id,key" } as any);
    if (error) return toast.error(friendlyError(error));
    toast.success("Salvo: " + key);
  };

  const saveAll = async () => {
    setBusy(true);
    await Promise.all([
      saveSetting("checkout_basic_url", getStr("checkout_basic_url")),
      saveSetting("checkout_unlimited_url", getStr("checkout_unlimited_url")),
      saveSetting("checkout_pro_url", getStr("checkout_pro_url")),
      saveSetting("kiwify_webhook_secret", getStr("kiwify_webhook_secret")),
      saveSetting("kiwify_product_map", getStr("kiwify_product_map"), true),
      saveSetting("demo_video_url", getStr("demo_video_url")),
    ]);
    setBusy(false); load();
  };

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const filtered = events.filter(e => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return e.event_type.toLowerCase().includes(q)
      || e.event_id.toLowerCase().includes(q)
      || (e.user_id ?? "").includes(filter)
      || JSON.stringify(e.raw_payload ?? {}).toLowerCase().includes(q);
  });

  const stats = {
    total: events.length,
    processed: events.filter(e => e.status === "processed").length,
    errors: events.filter(e => e.status === "error").length,
    ignored: events.filter(e => e.status === "ignored" || e.status === "rejected").length,
  };

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/kiwify-webhook?token=${encodeURIComponent(getStr("kiwify_webhook_secret") || "SEU_TOKEN")}`;

  const reprocess = async (ev: BillingEvent) => {
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/kiwify-webhook?token=${encodeURIComponent(getStr("kiwify_webhook_secret"))}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ev.raw_payload, __reprocess_of: ev.event_id, created_at: new Date().toISOString() }),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt);
      toast.success("Reenviado. Recarregando…");
      setTimeout(load, 800);
    } catch (e: any) { toast.error(friendlyError(e)); }
  };

  return (
    <div className="space-y-4">
      <Card className="glass border-0 rounded-3xl p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><SettingsIcon className="h-4 w-4" /> Configuração Kiwify & Checkout</h3>

        <div className="rounded-2xl bg-secondary/40 border border-border/40 p-4 space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">URL do Webhook (cole na Kiwify)</Label>
          <div className="flex gap-2">
            <Input readOnly value={webhookUrl} className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("URL copiada"); }}>Copiar</Button>
          </div>
          <p className="text-xs text-muted-foreground">A Kiwify pode validar via <code>?token=</code> (padrão) ou <code>x-kiwify-signature</code> HMAC-SHA1 do corpo. Ambos aceitos.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Checkout URL — Básico</Label><Input value={getStr("checkout_basic_url")} onChange={(e) => setStr("checkout_basic_url", e.target.value)} placeholder="https://pay.kiwify.com.br/..." /></div>
          <div><Label>Checkout URL — Unlimited</Label><Input value={getStr("checkout_unlimited_url")} onChange={(e) => setStr("checkout_unlimited_url", e.target.value)} placeholder="https://pay.kiwify.com.br/..." /></div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Kiwify Webhook Secret</Label><Input value={getStr("kiwify_webhook_secret")} onChange={(e) => setStr("kiwify_webhook_secret", e.target.value)} placeholder="token compartilhado" /></div>
          <div>
            <Label>Vídeo demonstração (URL embed ou upload .mp4)</Label>
            <div className="flex gap-2">
              <Input value={getStr("demo_video_url")} onChange={(e) => setStr("demo_video_url", e.target.value)} placeholder="https://youtube.com/embed/... ou link do MP4" />
              <input id="demo-video-upload" type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                if (f.size > 80 * 1024 * 1024) return toast.error("Arquivo muito grande (máx 80MB).");
                try {
                  const path = `demo/${Date.now()}-${f.name.replace(/[^\w.-]/g,"_")}`;
                  const up = await supabase.storage.from("landing-assets").upload(path, f, { upsert: true, contentType: f.type });
                  if (up.error) throw up.error;
                  const { data: pub } = supabase.storage.from("landing-assets").getPublicUrl(path);
                  setStr("demo_video_url", pub.publicUrl);
                  toast.success("Vídeo enviado. Clique em Salvar configurações.");
                } catch (err: any) { toast.error(friendlyError(err)); }
              }} />
              <Button type="button" variant="outline" onClick={() => document.getElementById("demo-video-upload")?.click()}><Upload className="h-4 w-4 mr-1" />Upload</Button>
            </div>
          </div>
        </div>
        <div>
          <Label>Mapeamento Kiwify (JSON: product_id → internal_plan)</Label>
          <textarea className="w-full min-h-[100px] rounded-md bg-secondary/40 border border-border px-3 py-2 font-mono text-xs" value={typeof settings.kiwify_product_map === "string" ? settings.kiwify_product_map : JSON.stringify(settings.kiwify_product_map ?? {}, null, 2)} onChange={(e) => setStr("kiwify_product_map", e.target.value)} placeholder='{"PROD_ID_BASIC":"basic","PROD_ID_PRO":"pro"}' />
          <p className="text-xs text-muted-foreground mt-1">Use o ID do produto Kiwify como chave e o plano interno (basic/unlimited) como valor.</p>
        </div>
        <Button onClick={saveAll} disabled={busy} className="bg-gradient-brand text-white border-0 gap-2"><Save className="h-4 w-4" />{busy ? "Salvando…" : "Salvar configurações"}</Button>
      </Card>

      <div className="grid sm:grid-cols-4 gap-3">
        {[
          { l: "Total recebidos", v: stats.total, c: "text-foreground" },
          { l: "Processados", v: stats.processed, c: "text-emerald-600" },
          { l: "Erros", v: stats.errors, c: "text-rose-600" },
          { l: "Ignorados/recusados", v: stats.ignored, c: "text-amber-600" },
        ].map(s => (
          <Card key={s.l} className="glass border-0 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">{s.l}</p>
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
          </Card>
        ))}
      </div>

      <Card className="glass border-0 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-border/40 font-semibold flex flex-wrap items-center justify-between gap-3">
          <span>Eventos de billing (últimos 200)</span>
          <div className="flex gap-2 flex-wrap">
            {["all","processed","error","ignored","rejected","received"].map(s => (
              <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)} className="capitalize h-8">{s === "all" ? "Todos" : s}</Button>
            ))}
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar…" className="max-w-xs h-9" />
          </div>
        </div>
        <div className="divide-y divide-border/40 max-h-[500px] overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhum evento. Configure a webhook no Kiwify usando a URL acima.</div>
          ) : filtered.map(e => (
            <details key={e.id} className="p-3 text-sm">
              <summary className="cursor-pointer flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">{e.provider}</Badge>
                <span className="font-medium">{e.event_type}</span>
                <Badge className={e.status === "processed" ? "bg-emerald-500/10 text-emerald-600" : e.status === "error" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}>{e.status}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">{new Date(e.created_at).toLocaleString()}</span>
              </summary>
              <div className="mt-2 space-y-2 text-xs">
                <div><span className="text-muted-foreground">event_id:</span> <code className="font-mono">{e.event_id}</code></div>
                {e.user_id && <div><span className="text-muted-foreground">user:</span> <code className="font-mono">{e.user_id}</code></div>}
                {e.error_message && <div className="text-rose-600">{e.error_message}</div>}
                <pre className="bg-secondary/40 rounded p-2 overflow-auto max-h-48 text-[10px]">{JSON.stringify(e.raw_payload, null, 2)}</pre>
                {(e.status === "error" || e.status === "ignored") && (
                  <Button size="sm" variant="outline" onClick={() => reprocess(e)}>Reprocessar</Button>
                )}
              </div>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}
