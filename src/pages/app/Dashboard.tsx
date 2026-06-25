import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useModuleVisibility } from "@/hooks/useModuleVisibility";
import { isLowStock } from "@/lib/stock";
import { isComingSoon } from "@/lib/comingSoon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { getCycleRange, getCycleLabel } from "@/lib/operationalCycle";
import {
  ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Banknote, Receipt, AlertTriangle,
  Plus, Check, StickyNote, Boxes, Bell, Sparkles, ChevronRight, ArrowRight, Users, Package, CalendarRange, Percent, LineChart,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type RangeKey = "today" | "yesterday" | "7d" | "30d" | "cycle" | "ytd" | "custom";
const RANGES: { k: RangeKey; label: string }[] = [
  { k: "today", label: "Hoje" },
  { k: "yesterday", label: "Ontem" },
  { k: "7d", label: "7 dias" },
  { k: "30d", label: "30 dias" },
  { k: "cycle", label: "Mês operacional" },
  { k: "ytd", label: "Ano" },
  { k: "custom", label: "Personalizado" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function rangeFor(k: RangeKey, cycleStart: number, custom?: { from: string; to: string }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (k === "today") return { start: today, end: today };
  if (k === "yesterday") { const y = new Date(today); y.setDate(y.getDate() - 1); return { start: y, end: y }; }
  if (k === "7d") { const s = new Date(today); s.setDate(s.getDate() - 6); return { start: s, end: today }; }
  if (k === "30d") { const s = new Date(today); s.setDate(s.getDate() - 29); return { start: s, end: today }; }
  if (k === "cycle") { const r = getCycleRange(cycleStart, today); return { start: r.start, end: r.end }; }
  if (k === "ytd") return { start: new Date(today.getFullYear(), 0, 1), end: today };
  if (k === "custom" && custom?.from && custom?.to) return { start: new Date(custom.from + "T00:00:00"), end: new Date(custom.to + "T00:00:00") };
  return { start: today, end: today };
}

function prevRange(start: Date, end: Date) {
  const span = Math.max(1, Math.round((+end - +start) / 86400000) + 1);
  const pEnd = new Date(start); pEnd.setDate(pEnd.getDate() - 1);
  const pStart = new Date(pEnd); pStart.setDate(pStart.getDate() - (span - 1));
  return { start: pStart, end: pEnd };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { profile } = useTenant();
  const { isModuleVisible } = useModuleVisibility();
  // Widgets do dashboard respeitam a visibilidade de módulos do tenant.
  const showProducts = isModuleVisible("products");
  const showServices = isModuleVisible("services");
  const showAppointments = isModuleVisible("appointments");
  const showAlerts = !isComingSoon("/app/alerts");
  const cycleStart = Number((profile as any)?.operational_cycle_start_day ?? 1);

  const [range, setRange] = useState<RangeKey>("30d");
  const [custom, setCustom] = useState<{ from: string; to: string }>({ from: iso(new Date()), to: iso(new Date()) });

  const { start, end } = useMemo(() => rangeFor(range, cycleStart, custom), [range, cycleStart, custom]);
  const startIso = iso(start), endIso = iso(end);
  const prev = useMemo(() => prevRange(start, end), [start, end]);

  const [series, setSeries] = useState<{ d: string; receita: number; despesa: number }[]>([]);
  const [kpi, setKpi] = useState({ receita: 0, despesa: 0, lucro: 0, recebimentos: 0, saldo: 0, ticketMedio: 0, margem: 0, vendas: 0, novos: 0, recorrentes: 0, forecast: 0, growth: 0 });
  const [topProducts, setTopProducts] = useState<{ name: string; qty: number; total: number }[]>([]);
  const [topServices, setTopServices] = useState<{ name: string; qty: number; total: number }[]>([]);
  const [alerts, setAlerts] = useState<{ id: string; title: string; severity: string }[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [noteInput, setNoteInput] = useState("");

  const load = async () => {
    if (!user) return;

    const [fin, finPrev, appts, clients, al, db, ls, qn] = await Promise.all([
      supabase.from("financial").select("net_amount,gross_amount,type,transaction_date,origin,client_id,items").gte("transaction_date", startIso).lte("transaction_date", endIso),
      supabase.from("financial").select("net_amount,gross_amount,type,origin").gte("transaction_date", iso(prev.start)).lte("transaction_date", iso(prev.end)),
      // Agenda/serviços só quando o módulo está visível.
      showAppointments
        ? supabase.from("appointments").select("service_id,amount,status").gte("appointment_date", startIso).lte("appointment_date", endIso).is("deleted_at", null).neq("status", "cancelled")
        : Promise.resolve({ data: [] }),
      supabase.from("clients").select("id,created_at").is("deleted_at", null),
      showAlerts
        ? supabase.from("alerts").select("id,title,severity,status").eq("status", "open").order("created_at", { ascending: false }).limit(6)
        : Promise.resolve({ data: [] }),
      supabase.from("debts").select("id,total_amount,client_id,status,due_date").eq("status", "open").order("due_date", { ascending: true }).limit(6),
      // Estoque baixo só quando o módulo de produtos está visível.
      showProducts
        ? supabase.from("products").select("id,name,stock,min_stock").is("deleted_at", null).eq("status", "active")
        : Promise.resolve({ data: [] }),
      supabase.from("quick_notes").select("*").eq("resolved", false).order("created_at", { ascending: false }).limit(8),
    ]);

    // Build series across days
    const spanDays = Math.max(1, Math.round((+end - +start) / 86400000) + 1);
    const map = new Map<string, { receita: number; despesa: number }>();
    for (let i = 0; i < spanDays; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      map.set(iso(d), { receita: 0, despesa: 0 });
    }

    let receita = 0, despesa = 0, recebimentos = 0, vendas = 0;
    const clientIdsInPeriod = new Set<string>();
    const productAgg = new Map<string, { name: string; qty: number; total: number }>();

    for (const f of (fin.data ?? []) as any[]) {
      const day = f.transaction_date as string;
      const v = Number(f.net_amount ?? f.gross_amount ?? 0);
      const bucket = map.get(day);
      if (f.type === "income") {
        if (f.origin !== "promissoria") receita += v;
        recebimentos += v;
        if (bucket) bucket.receita += v;
        if (f.origin === "sale" || f.origin === "appointment" || f.origin === "quote") vendas += 1;
        if (f.client_id) clientIdsInPeriod.add(f.client_id);
        if (Array.isArray(f.items)) {
          for (const it of f.items) {
            const key = it.product_id || it.variation_id || it.name || "_";
            const cur = productAgg.get(key) || { name: it.name || "Produto", qty: 0, total: 0 };
            cur.qty += Number(it.qty || it.quantity || 1);
            cur.total += Number(it.subtotal || it.total || (Number(it.price || 0) * Number(it.qty || 1)));
            productAgg.set(key, cur);
          }
        }
      } else {
        despesa += v;
        if (bucket) bucket.despesa += v;
      }
    }

    // Top serviços (via appointments)
    const svcAgg = new Map<string, { qty: number; total: number }>();
    for (const a of (appts.data ?? []) as any[]) {
      if (!a.service_id) continue;
      const cur = svcAgg.get(a.service_id) || { qty: 0, total: 0 };
      cur.qty += 1; cur.total += Number(a.amount || 0);
      svcAgg.set(a.service_id, cur);
    }
    const svcNames: Record<string, string> = {};
    if (svcAgg.size > 0) {
      const { data: svs } = await supabase.from("services").select("id,name").in("id", Array.from(svcAgg.keys()));
      (svs ?? []).forEach((s: any) => { svcNames[s.id] = s.name; });
    }
    const topSv = Array.from(svcAgg.entries()).map(([id, v]) => ({ name: svcNames[id] ?? "Serviço", qty: v.qty, total: v.total }))
      .sort((a, b) => b.total - a.total).slice(0, 5);

    // Novos × Recorrentes (com base em clients criados no período vs já existentes que compraram)
    let novos = 0, recorrentes = 0;
    for (const cId of clientIdsInPeriod) {
      const c = (clients.data ?? []).find((x: any) => x.id === cId);
      if (!c) continue;
      const created = new Date(c.created_at);
      if (created >= start && created <= end) novos++; else recorrentes++;
    }

    // Período anterior
    let receitaPrev = 0;
    for (const f of (finPrev.data ?? []) as any[]) {
      if (f.type === "income" && f.origin !== "promissoria") receitaPrev += Number(f.net_amount ?? f.gross_amount ?? 0);
    }
    const growth = receitaPrev > 0 ? ((receita - receitaPrev) / receitaPrev) * 100 : (receita > 0 ? 100 : 0);

    // Previsão: extrapola receita média/dia para 30d
    const daysWithData = Math.max(1, spanDays);
    const forecast = (receita / daysWithData) * 30;

    const lucro = receita - despesa;
    const margem = receita > 0 ? (lucro / receita) * 100 : 0;
    const ticketMedio = vendas > 0 ? receita / vendas : 0;

    const ser = Array.from(map.entries()).map(([d, v]) => ({
      d: new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      receita: v.receita,
      despesa: v.despesa,
    }));

    setSeries(ser);
    setKpi({ receita, despesa, lucro, recebimentos, saldo: lucro, ticketMedio, margem, vendas, novos, recorrentes, forecast, growth });
    setTopProducts(Array.from(productAgg.values()).sort((a, b) => b.total - a.total).slice(0, 5));
    setTopServices(topSv);
    setAlerts((al.data ?? []) as any);
    setDebts(db.data ?? []);
    const alertOnExact = (profile as any)?.alert_on_min_stock_exact ?? true;
    setLowStock((ls.data ?? []).filter((p: any) => isLowStock(p.stock, p.min_stock, alertOnExact)).slice(0, 6));
    setNotes(qn.data ?? []);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [user, range, custom.from, custom.to, cycleStart, showProducts, showServices, showAppointments, showAlerts]);

  const addNote = async () => {
    if (!noteInput.trim() || !user) return;
    await supabase.from("quick_notes").insert({ user_id: user.id, content: noteInput.trim() });
    setNoteInput(""); load();
  };
  const resolveNote = async (id: string) => {
    await supabase.from("quick_notes").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  }, []);

  const name = (profile as any)?.full_name?.split(" ")[0] ?? (profile as any)?.company_name ?? "";

  const rangeLabel = range === "cycle"
    ? `Mês operacional · ${getCycleLabel(cycleStart)}`
    : range === "custom"
      ? `${new Date(custom.from + "T00:00:00").toLocaleDateString("pt-BR")} → ${new Date(custom.to + "T00:00:00").toLocaleDateString("pt-BR")}`
      : RANGES.find(r => r.k === range)?.label ?? "";

  const growthUp = kpi.growth >= 0;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Hero header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Visão geral
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            {greeting}{name ? `, ${name}` : ""}.
          </h1>
          <p className="text-muted-foreground mt-1">Desempenho do período: <span className="text-foreground">{rangeLabel}</span></p>
        </div>
        <Link to="/app/sales">
          <Button className="rounded-xl bg-gradient-brand text-white border-0 h-11 px-5 shadow-[0_10px_30px_-10px_hsl(22_100%_50%_/_0.6)]">
            Nova venda <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Global filter bar */}
      <div className="premium-card p-3 flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex pill p-1 flex-wrap">
          {RANGES.map(r => (
            <button
              key={r.k}
              onClick={() => setRange(r.k)}
              className={`px-3 h-8 text-xs rounded-full transition ${
                range === r.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl gap-2"><CalendarRange className="h-4 w-4" />{custom.from} → {custom.to}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-3">
              <div><label className="text-xs text-muted-foreground">De</label><Input type="date" value={custom.from} onChange={(e) => setCustom(c => ({ ...c, from: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Até</label><Input type="date" value={custom.to} onChange={(e) => setCustom(c => ({ ...c, to: e.target.value }))} /></div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Receita" value={fmtBRL(kpi.receita)} delta={`${growthUp ? "+" : ""}${kpi.growth.toFixed(1)}%`} up={growthUp} icon={TrendingUp} feature />
        <Kpi label="Lucro líquido" value={fmtBRL(kpi.lucro)} delta={`${kpi.margem.toFixed(1)}% margem`} up={kpi.lucro >= 0} icon={Wallet} />
        <Kpi label="Despesas" value={fmtBRL(kpi.despesa)} icon={ArrowDownRight} />
        <Kpi label="Ticket médio" value={fmtBRL(kpi.ticketMedio)} delta={`${kpi.vendas} vendas`} up icon={Receipt} />
        <Kpi label="Previsão 30d" value={fmtBRL(kpi.forecast)} delta="projeção" up icon={LineChart} />
        <Kpi label="Fluxo de caixa" value={fmtBRL(kpi.saldo)} up={kpi.saldo >= 0} icon={Banknote} />
      </div>

      {/* Main chart + side rail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="premium-card p-6 xl:col-span-2">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">Performance</div>
              <div className="flex items-baseline gap-3">
                <div className="text-3xl font-semibold number-display">{fmtBRL(kpi.receita)}</div>
                <span className={`text-xs font-medium inline-flex items-center gap-1 ${growthUp ? "text-emerald-400" : "text-red-400"}`}>
                  {growthUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />} {Math.abs(kpi.growth).toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Receita vs. despesas — {rangeLabel}</div>
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(22 100% 55%)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(22 100% 55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
                       tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: any) => fmtBRL(Number(v))}
                />
                <Area type="monotone" dataKey="receita" stroke="hsl(22 100% 55%)" strokeWidth={2.5} fill="url(#gRev)" />
                <Area type="monotone" dataKey="despesa" stroke="hsl(0 84% 60%)" strokeWidth={2} fill="url(#gExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <div className="premium-card p-5">
            <div className="flex items-center gap-2 mb-3"><Users className="h-4 w-4 text-primary" /><div className="text-sm font-semibold">Clientes no período</div></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 dark:bg-white/[0.04] p-3"><div className="text-[11px] uppercase text-muted-foreground">Novos</div><div className="text-2xl font-semibold number-display">{kpi.novos}</div></div>
              <div className="rounded-xl bg-muted/50 dark:bg-white/[0.04] p-3"><div className="text-[11px] uppercase text-muted-foreground">Recorrentes</div><div className="text-2xl font-semibold number-display">{kpi.recorrentes}</div></div>
            </div>
          </div>
          {showAlerts && (
            <SideList
              title="Alertas importantes"
              to="/app/alerts"
              empty="Sem alertas no momento."
              items={alerts.map(a => ({
                id: a.id,
                icon: AlertTriangle,
                tint: a.severity === "high" ? "text-red-400" : a.severity === "medium" ? "text-amber-400" : "text-muted-foreground",
                title: a.title,
                sub: a.severity?.toUpperCase(),
              }))}
            />
          )}
          <SideList
            title="Cobranças pendentes"
            to="/app/collections"
            empty="Nenhuma cobrança aberta."
            items={debts.map(d => ({
              id: d.id,
              icon: Receipt,
              tint: "text-primary",
              title: fmtBRL(Number(d.total_amount ?? 0)),
              sub: d.due_date ? `Vence ${new Date(d.due_date).toLocaleDateString("pt-BR")}` : "Em aberto",
            }))}
          />
        </div>
      </div>

      {/* Top produtos / Top serviços — só os módulos visíveis */}
      {(showProducts || showServices) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {showProducts && <TopList title="Top produtos" icon={Package} items={topProducts} empty="Sem vendas de produtos no período." />}
          {showServices && <TopList title="Top serviços" icon={Percent} items={topServices} empty="Sem atendimentos no período." />}
        </div>
      )}

      {/* Second row: low stock + notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {showProducts && (
        <div className="premium-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">Estoque</div>
              <div className="text-lg font-semibold">Produtos em alerta</div>
            </div>
            <Link to="/app/stock" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
              Ver tudo <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Tudo abastecido. ✨</div>
          ) : (
            <div className="divide-y divide-border/60">
              {lowStock.map(p => (
                <div key={p.id} className="py-3 flex items-center gap-4">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Boxes className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">Mín. {p.min_stock}</div>
                  </div>
                  <div className="text-sm number-display font-semibold text-amber-400">{p.stock}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        <div className={`premium-card premium-feature p-6 ${showProducts ? "" : "lg:col-span-3"}`}>
          <div className="flex items-center gap-2 mb-4">
            <StickyNote className="h-4 w-4 text-primary" />
            <div className="text-sm font-semibold">Anotações rápidas</div>
          </div>
          <div className="flex gap-2 mb-3">
            <Input
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNote()}
              placeholder="Anote uma pendência…"
              className="h-10 rounded-xl bg-background/40 border-border/60"
            />
            <Button size="icon" onClick={addNote} className="rounded-xl h-10 w-10 bg-primary text-primary-foreground"><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2 max-h-60 overflow-auto pr-1">
            {notes.length === 0 ? (
              <div className="text-xs text-muted-foreground py-6 text-center">Nenhuma pendência.</div>
            ) : notes.map(n => (
              <div key={n.id} className="flex items-center gap-2 text-sm p-2.5 rounded-xl bg-background/40 border border-border/40">
                <Bell className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="flex-1 truncate">{n.content}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => resolveNote(n.id)}>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label, value, delta, up, icon: Icon, feature,
}: { label: string; value: string; delta?: string; up?: boolean; icon: any; feature?: boolean }) {
  return (
    <div className={`premium-card p-5 ${feature ? "premium-feature" : ""}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${feature ? "bg-primary/20 text-primary" : "bg-muted/50 dark:bg-white/5 text-muted-foreground"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-semibold number-display">{value}</div>
      {delta && (
        <div className={`mt-1 inline-flex items-center gap-1 text-xs ${up ? "text-emerald-400" : "text-red-400"}`}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </div>
      )}
    </div>
  );
}

function TopList({ title, icon: Icon, items, empty }: { title: string; icon: any; items: { name: string; qty: number; total: number }[]; empty: string }) {
  const max = Math.max(1, ...items.map(i => i.total));
  return (
    <div className="premium-card p-5">
      <div className="flex items-center gap-2 mb-3"><Icon className="h-4 w-4 text-primary" /><div className="text-sm font-semibold">{title}</div></div>
      {items.length === 0 ? (
        <div className="py-8 text-xs text-muted-foreground text-center">{empty}</div>
      ) : (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="truncate pr-2">{it.name}</span>
                <span className="text-xs text-muted-foreground">{it.qty} · <strong className="text-foreground">{fmtBRL(it.total)}</strong></span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/50 dark:bg-white/[0.05] overflow-hidden">
                <div className="h-full bg-gradient-brand" style={{ width: `${(it.total / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SideList({
  title, to, items, empty,
}: { title: string; to: string; empty: string;
     items: { id: string; icon: any; tint: string; title: string; sub?: string }[] }) {
  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">{title}</div>
        <Link to={to} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          Ver tudo <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="py-6 text-xs text-muted-foreground text-center">{empty}</div>
      ) : (
        <div className="space-y-1">
          {items.map(it => (
            <Link key={it.id} to={to} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 dark:hover:bg-white/[0.03] transition">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center bg-muted/50 dark:bg-white/[0.04] ${it.tint}`}>
                <it.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{it.title}</div>
                {it.sub && <div className="text-[11px] text-muted-foreground truncate">{it.sub}</div>}
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
