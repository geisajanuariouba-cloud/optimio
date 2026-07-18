import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { ShoppingBag, TrendingUp, Users, Truck, Receipt, Search } from "lucide-react";

export default function Sales() {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [pms, setPms] = useState<any[]>([]);
  const [period, setPeriod] = useState<"30" | "month" | "year" | "all">("month");
  const [pmFilter, setPmFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    const [{ data: f }, { data: c }, { data: m }] = await Promise.all([
      supabase.from("financial").select("*").eq("type", "income").order("transaction_date", { ascending: false }).limit(500),
      supabase.from("clients").select("id,full_name").is("deleted_at", null).limit(1000),
      supabase.from("payment_methods").select("*").eq("active", true),
    ]);
    setSales(f ?? []); setClients(c ?? []); setPms(m ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const clientName = (id?: string | null) => id ? clients.find(c => c.id === id)?.full_name ?? "—" : "—";

  const filtered = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (period === "30") cutoff.setDate(now.getDate() - 30);
    else if (period === "month") cutoff.setDate(1);
    else if (period === "year") { cutoff.setMonth(0); cutoff.setDate(1); }
    else cutoff.setFullYear(2000);
    const c = cutoff.toISOString().slice(0, 10);
    return sales.filter(s => {
      if (s.transaction_date < c) return false;
      if (pmFilter !== "all" && s.payment_method !== pmFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!`${s.description ?? ""} ${s.category ?? ""} ${clientName(s.client_id)}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [sales, period, pmFilter, search, clients]);

  const totals = useMemo(() => {
    const gross = filtered.reduce((a, s) => a + Number(s.gross_amount), 0);
    const net = filtered.reduce((a, s) => a + Number(s.net_amount), 0);
    const fees = gross - net;
    const ticket = filtered.length ? gross / filtered.length : 0;
    const pendingDeliveries = filtered.filter(s => s.needs_delivery).length;
    return { gross, net, fees, ticket, count: filtered.length, pendingDeliveries };
  }, [filtered]);

  const byPM = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of filtered) m.set(s.payment_method ?? "—", (m.get(s.payment_method ?? "—") ?? 0) + Number(s.net_amount));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const topClients = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of filtered) if (s.client_id) m.set(s.client_id, (m.get(s.client_id) ?? 0) + Number(s.net_amount));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="Vendas"
        description="Painel operacional de vendas — separado do Financeiro geral."
      >
        <Link to="/app/financial"><Button variant="outline">Ir para Financeiro</Button></Link>
      </PageHeader>

      <MetricsRow items={[
        { label: "Faturamento bruto", value: `R$ ${totals.gross.toFixed(2)}`, tone: "primary" },
        { label: "Líquido (após taxas)", value: `R$ ${totals.net.toFixed(2)}`, tone: "success" },
        { label: "Ticket médio", value: `R$ ${totals.ticket.toFixed(2)}`, tone: "primary" },
        { label: "Vendas no período", value: String(totals.count), tone: "primary" },
      ]} />

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 rounded-3xl border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><TrendingUp className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm">Por forma de pagamento</h3></div>
          {byPM.length === 0 ? <p className="text-xs text-muted-foreground">Sem dados.</p> : (
            <div className="space-y-2">
              {byPM.map(([k, v]) => {
                const pct = totals.net > 0 ? (v / totals.net) * 100 : 0;
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between text-xs"><span className="uppercase font-medium">{k}</span><span className="text-muted-foreground">R$ {v.toFixed(2)}</span></div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden mt-1"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5 rounded-3xl border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><Users className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm">Top clientes</h3></div>
          {topClients.length === 0 ? <p className="text-xs text-muted-foreground">Sem dados.</p> : (
            <div className="space-y-2">
              {topClients.map(([id, v]) => (
                <div key={id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{clientName(id)}</span>
                  <strong className="text-primary">R$ {v.toFixed(2)}</strong>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 rounded-3xl border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><Truck className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm">Operacional</h3></div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Taxas pagas</span><strong className="text-rose-500">R$ {totals.fees.toFixed(2)}</strong></div>
            <div className="flex justify-between"><span>Entregas a fazer</span><strong className="text-amber-600">{totals.pendingDeliveries}</strong></div>
            <Link to="/app/deliveries"><Button variant="outline" size="sm" className="w-full rounded-2xl mt-2">Abrir logística</Button></Link>
          </div>
        </Card>
      </div>

      <Card className="p-4 rounded-3xl border-0 shadow-sm mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar venda, cliente, descrição…" className="pl-9 rounded-2xl" />
          </div>
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[180px] rounded-2xl bg-primary text-primary-foreground border-primary"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={pmFilter} onValueChange={setPmFilter}>
            <SelectTrigger className="w-[200px] rounded-2xl bg-primary text-primary-foreground border-primary"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas formas</SelectItem>
              {pms.map(p => <SelectItem key={p.id} value={p.code}>{p.label}</SelectItem>)}
              <SelectItem value="promissoria">Promissória</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Sem vendas no período" description="Use o Financeiro para registrar uma venda — ela aparece aqui automaticamente." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
                <TableHead>Entrega</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{new Date(s.transaction_date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-sm">{clientName(s.client_id)}</TableCell>
                    <TableCell className="text-sm">{s.description ?? s.category ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="uppercase text-[10px]">{s.payment_method ?? "—"}</Badge></TableCell>
                    <TableCell className="text-right">R$ {Number(s.gross_amount).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-primary">R$ {Number(s.net_amount).toFixed(2)}</TableCell>
                    <TableCell>{s.needs_delivery ? <Badge className="bg-amber-500/15 text-amber-700">Sim</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
