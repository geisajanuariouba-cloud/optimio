import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Calendar, Users, Wallet, Package, ArrowUpRight, ShoppingBag, Truck, Receipt,
  Boxes, FileText, AlertCircle, Settings2, StickyNote, Plus, Check, Store, HeartPulse,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Link } from "react-router-dom";
import { toast } from "sonner";

type Widgets = {
  sales_month: boolean; stock: boolean; deliveries_pending: boolean; pickups_pending: boolean;
  tables: boolean; catalog: boolean; overdue_debts: boolean; quick_notes: boolean; anamnesis_due: boolean;
};
const DEFAULT_WIDGETS: Widgets = {
  sales_month: true, stock: true, deliveries_pending: true, pickups_pending: true,
  tables: true, catalog: true, overdue_debts: true, quick_notes: true, anamnesis_due: true,
};

// Nicho determina quais widgets aparecem por padrão (usuário ainda pode ligar/desligar)
const NICHE_WIDGETS: Record<string, Partial<Widgets>> = {
  beauty:    { stock: false, deliveries_pending: false, pickups_pending: false },
  retail:    { anamnesis_due: false, tables: false },
  services:  { stock: false, deliveries_pending: false, pickups_pending: false, anamnesis_due: false },
  education: { stock: false, deliveries_pending: false, pickups_pending: false, anamnesis_due: false },
};

const LABELS: Record<keyof Widgets, string> = {
  sales_month: "Venda do Mês", stock: "Estoque Depósito",
  deliveries_pending: "Entregas Pendentes", pickups_pending: "Retiradas Pendentes",
  tables: "Tabelas", catalog: "Catálogo", overdue_debts: "Promissórias Vencidas",
  quick_notes: "Anotações Rápidas", anamnesis_due: "Anamneses a Refazer",
};

export default function Dashboard() {
  const { user } = useAuth();
  const { profile, refresh } = useTenant();
  const nicheDefaults = NICHE_WIDGETS[(profile?.niche as string) ?? "beauty"] ?? {};
  const widgets: Widgets = { ...DEFAULT_WIDGETS, ...nicheDefaults, ...((profile?.dashboard_widgets as any) ?? {}) };

  const [stats, setStats] = useState({
    salesMonth: 0, salesCount: 0, stock: 0, lowStock: 0,
    deliveriesPending: 0, pickupsPending: 0, products: 0, services: 0,
    overdueDebts: [] as any[], anamnesisDue: [] as any[], anamnesisPending: [] as any[],
  });
  const [notes, setNotes] = useState<any[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [search, setSearch] = useState("");
  const [searchHits, setSearchHits] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const monthStart = new Date(); monthStart.setDate(1);
    const ms = monthStart.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const [fin, prod, svc, deliv, debts, anam, qn] = await Promise.all([
      supabase.from("financial").select("net_amount,type,transaction_date,origin").eq("type", "income").gte("transaction_date", ms),
      supabase.from("products").select("stock,min_stock").is("deleted_at", null).eq("status", "active"),
      supabase.from("services").select("id").is("deleted_at", null),
      supabase.from("deliveries").select("id,status,is_pickup").neq("status", "delivered"),
      supabase.from("debts").select("id,total_amount,client_id,status").eq("status", "open"),
      supabase.from("anamnesis").select("id,client_id,next_due_date,updated_at"),
      supabase.from("quick_notes").select("*").eq("resolved", false).order("created_at", { ascending: false }),
    ]);
    const products = prod.data ?? [];
    const dlist = deliv.data ?? [];
    const dueAnam = (anam.data ?? []).filter((a: any) => a.next_due_date && a.next_due_date < today);
    // Vendas reais = exclui baixas de promissória (apenas controlam recebimento de venda anterior)
    const realSales = (fin.data ?? []).filter((f: any) => f.origin !== "promissoria");
    setStats({
      salesMonth: realSales.reduce((a: number, f: any) => a + Number(f.net_amount), 0),
      salesCount: realSales.length,
      stock: products.reduce((a: number, p: any) => a + Number(p.stock ?? 0), 0),
      lowStock: products.filter((p: any) => !(p.min_stock === 0 && p.stock === 0) && p.stock <= p.min_stock).length,
      deliveriesPending: dlist.filter((d: any) => !d.is_pickup).length,
      pickupsPending: dlist.filter((d: any) => d.is_pickup).length,
      products: products.length,
      services: (svc.data ?? []).length,
      overdueDebts: debts.data ?? [],
      anamnesisDue: dueAnam,
      anamnesisPending: anam.data ?? [],
    });
    setNotes(qn.data ?? []);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!search.trim() || !user) { setSearchHits([]); return; }
    const t = setTimeout(async () => {
      const like = `%${search}%`;
      const { data } = await supabase.from("products").select("id,name,sale_price,image_url,category")
        .is("deleted_at", null).ilike("name", like).limit(8);
      setSearchHits(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [search, user]);

  const addNote = async () => {
    if (!noteInput.trim() || !user) return;
    await supabase.from("quick_notes").insert({ user_id: user.id, content: noteInput.trim() });
    setNoteInput(""); load();
  };
  const resolveNote = async (id: string) => {
    await supabase.from("quick_notes").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const toggleWidget = async (k: keyof Widgets) => {
    if (!user) return;
    const next = { ...widgets, [k]: !widgets[k] };
    await supabase.from("profiles").update({ dashboard_widgets: next }).eq("id", user.id);
    refresh();
  };

  const W = ({ k, children }: { k: keyof Widgets; children: React.ReactNode }) =>
    widgets[k] ? <>{children}</> : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio.</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"><Settings2 className="h-4 w-4 mr-2" />Personalizar</Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 rounded-2xl">
            <div className="text-sm font-semibold mb-2">Widgets visíveis</div>
            <div className="space-y-2">
              {(Object.keys(LABELS) as (keyof Widgets)[]).map(k => (
                <label key={k} className="flex items-center justify-between text-sm cursor-pointer">
                  <span>{LABELS[k]}</span>
                  <Switch checked={widgets[k]} onCheckedChange={() => toggleWidget(k)} />
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Quick Notes flutuante */}
      <W k="quick_notes">
        <Card className="p-4 rounded-3xl border-0 shadow-sm bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="h-5 w-5 text-amber-600" />
            <h2 className="text-sm font-semibold">Anotações rápidas — pendências</h2>
            {notes.length > 0 && <Badge className="bg-amber-500 text-white">{notes.length}</Badge>}
          </div>
          <div className="flex gap-2 mb-3">
            <Input value={noteInput} onChange={(e) => setNoteInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()}
                   placeholder="Ex.: Venda Maria, falta endereço…" className="h-9 rounded-xl" />
            <Button size="sm" onClick={addNote} className="rounded-xl"><Plus className="h-4 w-4" /></Button>
          </div>
          {notes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem pendências. ✨</p>
          ) : (
            <div className="space-y-1.5">
              {notes.map(n => (
                <div key={n.id} className="flex items-center gap-2 text-sm p-2 rounded-xl bg-background/70">
                  <AlertCircle className="h-3 w-3 text-amber-600 shrink-0" />
                  <span className="flex-1">{n.content}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => resolveNote(n.id)}><Check className="h-3.5 w-3.5 text-emerald-600" /></Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </W>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <W k="sales_month">
          <StatCard to="/app/financial" label="Venda do mês" value={`R$ ${stats.salesMonth.toFixed(2)}`} hint={`${stats.salesCount} lançamento(s)`} icon={Wallet} color="from-violet-500 to-purple-500" />
        </W>
        <W k="stock">
          <StatCard to="/app/products" label="Estoque depósito" value={String(stats.stock)} hint={stats.lowStock > 0 ? `${stats.lowStock} em alerta` : "OK"} icon={Boxes} color="from-cyan-500 to-blue-500" warn={stats.lowStock > 0} />
        </W>
        <W k="deliveries_pending">
          <StatCard to="/app/deliveries" label="Entregas pendentes" value={String(stats.deliveriesPending)} icon={Truck} color="from-amber-500 to-orange-500" warn={stats.deliveriesPending > 0} />
        </W>
        <W k="pickups_pending">
          <StatCard to="/app/deliveries" label="Retiradas pendentes" value={String(stats.pickupsPending)} icon={Store} color="from-emerald-500 to-teal-500" />
        </W>
        <W k="tables">
          <StatCard to="/app/services" label="Tabelas (Serviços)" value={String(stats.services)} icon={Package} color="from-pink-500 to-rose-500" />
        </W>
        <W k="catalog">
          <StatCard to="/app/products" label="Catálogo" value={String(stats.products)} hint="produtos cadastrados" icon={ShoppingBag} color="from-indigo-500 to-blue-500" />
        </W>
        <W k="overdue_debts">
          <StatCard to="/app/debts" label="Promissórias vencidas" value={String(stats.overdueDebts.length)} icon={Receipt} color="from-red-500 to-rose-600" warn={stats.overdueDebts.length > 0} />
        </W>
        <W k="anamnesis_due">
          <StatCard to="/app/anamnesis" label="Anamneses a refazer" value={String(stats.anamnesisDue.length)} hint="ciclo 90 dias" icon={HeartPulse} color="from-fuchsia-500 to-pink-500" warn={stats.anamnesisDue.length > 0} />
        </W>
      </div>
    </div>
  );
}

function StatCard({ to, label, value, hint, icon: Icon, color, warn }: any) {
  return (
    <Link to={to}>
      <Card className={`p-6 border-0 shadow-sm rounded-3xl hover:shadow-md transition cursor-pointer ${warn ? "ring-2 ring-amber-400/40" : ""}`}>
        <div className="flex items-start justify-between mb-4">
          <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-3xl font-bold mb-1">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </Card>
    </Link>
  );
}
