import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Banknote, Receipt, AlertTriangle,
  Plus, Check, StickyNote, Boxes, Bell, Sparkles, ChevronRight, ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type RangeKey = "1d" | "7d" | "30d" | "90d" | "ytd";
const RANGES: { k: RangeKey; label: string }[] = [
  { k: "1d", label: "Hoje" },
  { k: "7d", label: "7 dias" },
  { k: "30d", label: "30 dias" },
  { k: "90d", label: "90 dias" },
  { k: "ytd", label: "Ano" },
];

function daysFor(k: RangeKey) {
  if (k === "1d") return 1;
  if (k === "7d") return 7;
  if (k === "30d") return 30;
  if (k === "90d") return 90;
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.max(1, Math.ceil((+now - +start) / 86400000));
}

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function Dashboard() {
  const { user } = useAuth();
  const { profile } = useTenant();
  const [range, setRange] = useState<RangeKey>("30d");
  const [series, setSeries] = useState<{ d: string; receita: number; despesa: number }[]>([]);
  const [kpi, setKpi] = useState({ receita: 0, despesa: 0, lucro: 0, recebimentos: 0, saldo: 0 });
  const [alerts, setAlerts] = useState<{ id: string; title: string; severity: string }[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [noteInput, setNoteInput] = useState("");

  const load = async () => {
    if (!user) return;
    const days = daysFor(range);
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    const sinceIso = since.toISOString().slice(0, 10);

    const [fin, al, db, ls, qn] = await Promise.all([
      supabase.from("financial")
        .select("net_amount,gross_amount,type,transaction_date,origin")
        .gte("transaction_date", sinceIso),
      supabase.from("alerts").select("id,title,severity,status").eq("status", "open").order("created_at", { ascending: false }).limit(6),
      supabase.from("debts").select("id,total_amount,client_id,status,due_date").eq("status", "open").order("due_date", { ascending: true }).limit(6),
      supabase.from("products").select("id,name,stock,min_stock").is("deleted_at", null).eq("status", "active"),
      supabase.from("quick_notes").select("*").eq("resolved", false).order("created_at", { ascending: false }).limit(8),
    ]);

    // build series
    const map = new Map<string, { receita: number; despesa: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
      map.set(d.toISOString().slice(0, 10), { receita: 0, despesa: 0 });
    }
    let receita = 0, despesa = 0, recebimentos = 0;
    for (const f of fin.data ?? []) {
      const day = (f as any).transaction_date as string;
      const v = Number((f as any).net_amount ?? (f as any).gross_amount ?? 0);
      const bucket = map.get(day);
      if ((f as any).type === "income") {
        if ((f as any).origin !== "promissoria") receita += v;
        recebimentos += v;
        if (bucket) bucket.receita += v;
      } else {
        despesa += v;
        if (bucket) bucket.despesa += v;
      }
    }
    const ser = Array.from(map.entries()).map(([d, v]) => ({
      d: new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      receita: v.receita,
      despesa: v.despesa,
    }));
    setSeries(ser);
    setKpi({ receita, despesa, lucro: receita - despesa, recebimentos, saldo: receita - despesa });
    setAlerts((al.data ?? []) as any);
    setDebts(db.data ?? []);
    setLowStock((ls.data ?? []).filter((p: any) => !(p.min_stock === 0 && p.stock === 0) && p.stock <= p.min_stock).slice(0, 6));
    setNotes(qn.data ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, range]);

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
          <p className="text-muted-foreground mt-1">Aqui está o desempenho do seu negócio agora.</p>
        </div>
        <Link to="/app/sales">
          <Button className="rounded-xl bg-gradient-brand text-white border-0 h-11 px-5 shadow-[0_10px_30px_-10px_hsl(22_100%_50%_/_0.6)]">
            Nova venda <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Receita" value={fmtBRL(kpi.receita)} delta="+9.3%" up icon={TrendingUp} feature />
        <Kpi label="Lucro" value={fmtBRL(kpi.lucro)} delta={kpi.lucro >= 0 ? "+4.1%" : "-"} up={kpi.lucro >= 0} icon={Wallet} />
        <Kpi label="Fluxo de caixa" value={fmtBRL(kpi.saldo)} delta="+2.0%" up={kpi.saldo >= 0} icon={Banknote} />
        <Kpi label="Recebimentos" value={fmtBRL(kpi.recebimentos)} delta="" up icon={Receipt} />
        <Kpi label="Despesas" value={fmtBRL(kpi.despesa)} delta="-1.2%" up={false} icon={ArrowDownRight} />
      </div>

      {/* Main chart + side rail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="premium-card p-6 xl:col-span-2">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">Performance</div>
              <div className="flex items-baseline gap-3">
                <div className="text-3xl font-semibold number-display">{fmtBRL(kpi.receita)}</div>
                <span className="text-xs font-medium text-emerald-400 inline-flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> 9.3%
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Receita vs. despesas — {RANGES.find(r => r.k === range)?.label}</div>
            </div>
            <div className="inline-flex pill p-1">
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

      {/* Second row: low stock + notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

        <div className="premium-card premium-feature p-6">
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
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${feature ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"}`}>
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
            <Link key={it.id} to={to} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center bg-white/[0.04] ${it.tint}`}>
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
