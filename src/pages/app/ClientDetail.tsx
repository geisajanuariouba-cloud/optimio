import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, Mail, MapPin, FileText, Wallet, Receipt, Truck, Scissors, Plus, MessageCircle, CheckSquare, Gift, Package as PackageIcon, Calendar } from "lucide-react";
import { fullAddress } from "@/components/app/AddressFields";
import { MetricsRow } from "@/components/app/PageHeader";

export default function ClientDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [insts, setInsts] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const [c, fin, appts, d, di, dl, qt, pk, cb] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).maybeSingle(),
        supabase.from("financial").select("*").eq("client_id", id).order("transaction_date", { ascending: false }),
        supabase.from("appointments").select("*").eq("client_id", id).is("deleted_at", null).order("appointment_date", { ascending: false }),
        supabase.from("debts").select("*").eq("client_id", id).order("created_at", { ascending: false }),
        supabase.from("debt_installments").select("*").order("number"),
        supabase.from("deliveries").select("*").eq("client_id", id).order("created_at", { ascending: false }),
        supabase.from("quotes").select("*").eq("client_id", id).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("packages").select("*").eq("client_id", id).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("combo_sales").select("*, combos(name)").eq("client_id", id).order("sold_at", { ascending: false }),
      ]);
      setClient(c.data);
      setSales((fin.data ?? []).filter((f: any) => f.type === "income"));
      setServices(appts.data ?? []);
      setDebts(d.data ?? []);
      setInsts(di.data ?? []);
      setDeliveries(dl.data ?? []);
      setQuotes(qt.data ?? []);
      setPackages(pk.data ?? []);
      setCombos(cb.data ?? []);
    })();
  }, [user, id]);

  const metrics = useMemo(() => {
    const ltv = sales.reduce((a, s) => a + Number(s.net_amount ?? 0), 0);
    const gross = sales.reduce((a, s) => a + Number(s.gross_amount ?? 0), 0);
    const debtOpen = debts.filter(d => d.status !== "paid");
    const debtTotal = insts
      .filter(i => debts.find(d => d.id === i.debt_id) && !i.paid_at)
      .reduce((a, i) => a + (Number(i.amount) - Number(i.amount_paid ?? 0)), 0);
    const ticket = sales.length > 0 ? gross / sales.length : 0;
    // Frequência média de compra (dias entre vendas)
    const dates = sales
      .map(s => new Date(s.transaction_date).getTime())
      .sort((a, b) => a - b);
    let avgDays = 0;
    if (dates.length > 1) {
      let sum = 0;
      for (let i = 1; i < dates.length; i++) sum += (dates[i] - dates[i - 1]) / 86_400_000;
      avgDays = Math.round(sum / (dates.length - 1));
    }
    const lastBuy = sales[0]?.transaction_date ?? null;
    return { ltv, gross, debtOpen, debtTotal, ticket, avgDays, lastBuy };
  }, [sales, debts, insts]);

  if (!client) return <div className="p-6 text-muted-foreground">Carregando…</div>;

  const phoneClean = (client.phone ?? "").replace(/\D/g, "");
  const waLink = phoneClean ? `https://wa.me/${phoneClean}` : null;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)} className="gap-1"><ArrowLeft className="h-4 w-4" />Voltar</Button>

      <Card className="p-6 rounded-3xl border-0 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{client.full_name}</h1>
            <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
              {client.cpf_cnpj && <div>CPF/CNPJ: <strong className="text-foreground">{client.cpf_cnpj}</strong></div>}
              {client.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{client.phone}</div>}
              {client.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{client.email}</div>}
              {fullAddress(client) && <div className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 mt-0.5" />{fullAddress(client)}</div>}
              {client.last_contact_at && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3 w-3" />
                  Último contato: {new Date(client.last_contact_at).toLocaleDateString("pt-BR")}
                </div>
              )}
            </div>
          </div>

          {/* Ações rápidas */}
          <div className="flex flex-wrap gap-2">
            <Link to={`/app/financial`}>
              <Button size="sm" variant="outline" className="rounded-xl gap-1"><Plus className="h-3.5 w-3.5" />Nova venda</Button>
            </Link>
            <Link to={`/app/quotes`}>
              <Button size="sm" variant="outline" className="rounded-xl gap-1"><FileText className="h-3.5 w-3.5" />Orçamento</Button>
            </Link>
            <Link to={`/app/debts`}>
              <Button size="sm" variant="outline" className="rounded-xl gap-1"><Receipt className="h-3.5 w-3.5" />Cobrança</Button>
            </Link>
            <Link to={`/app/tasks`}>
              <Button size="sm" variant="outline" className="rounded-xl gap-1"><CheckSquare className="h-3.5 w-3.5" />Tarefa</Button>
            </Link>
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer">
                <Button size="sm" className="rounded-xl gap-1 bg-emerald-600 hover:bg-emerald-700"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</Button>
              </a>
            )}
          </div>
        </div>
      </Card>

      <MetricsRow items={[
        { label: "Total gasto", value: `R$ ${metrics.gross.toFixed(2)}`, tone: "primary", hint: `Líquido: R$ ${metrics.ltv.toFixed(2)}` },
        { label: "Em aberto", value: `R$ ${metrics.debtTotal.toFixed(2)}`, tone: metrics.debtTotal > 0 ? "danger" : "success", hint: `${metrics.debtOpen.length} promissória(s)` },
        { label: "Nº compras", value: String(sales.length), tone: "primary", hint: `Ticket médio R$ ${metrics.ticket.toFixed(2)}` },
        { label: "Frequência", value: metrics.avgDays > 0 ? `${metrics.avgDays}d` : "—", tone: "primary", hint: metrics.lastBuy ? `Última: ${new Date(metrics.lastBuy).toLocaleDateString("pt-BR")}` : "Sem compras" },
      ]} />

      <Tabs defaultValue="sales">
        <TabsList className="bg-secondary/40 flex-wrap h-auto">
          <TabsTrigger value="sales"><Wallet className="h-4 w-4 mr-1" />Vendas</TabsTrigger>
          <TabsTrigger value="quotes"><FileText className="h-4 w-4 mr-1" />Orçamentos</TabsTrigger>
          <TabsTrigger value="services"><Scissors className="h-4 w-4 mr-1" />Serviços</TabsTrigger>
          <TabsTrigger value="recurrences"><PackageIcon className="h-4 w-4 mr-1" />Recorrências</TabsTrigger>
          <TabsTrigger value="combos"><Gift className="h-4 w-4 mr-1" />Combos</TabsTrigger>
          <TabsTrigger value="debts"><Receipt className="h-4 w-4 mr-1" />Promissórias</TabsTrigger>
          <TabsTrigger value="logistics"><Truck className="h-4 w-4 mr-1" />Logística</TabsTrigger>
          <TabsTrigger value="notes"><FileText className="h-4 w-4 mr-1" />Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border">
            {sales.length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhuma venda registrada.</div>}
            {sales.map(s => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{s.description || s.category || "Venda"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.transaction_date).toLocaleDateString("pt-BR")} · {s.payment_method ?? "—"}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">R$ {Number(s.net_amount).toFixed(2)}</div>
                  {Number(s.gross_amount) !== Number(s.net_amount) && (
                    <div className="text-[10px] text-muted-foreground">bruto R$ {Number(s.gross_amount).toFixed(2)}</div>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border">
            {quotes.length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhum orçamento.</div>}
            {quotes.map(q => (
              <div key={q.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">Orçamento #{q.id.slice(0, 6)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString("pt-BR")} · {q.payment_method ?? "—"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={q.status === "open" ? "default" : "secondary"}>{q.status}</Badge>
                  <span className="font-bold text-primary">R$ {Number(q.total).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border">
            {services.length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhum serviço/agendamento.</div>}
            {services.map(s => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{s.notes || "Atendimento"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.appointment_date).toLocaleDateString("pt-BR")} {s.appointment_time}</div>
                </div>
                <Badge variant="outline">{s.status}</Badge>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="recurrences">
          <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border">
            {packages.length === 0 && <div className="p-6 text-sm text-muted-foreground">Sem recorrências.</div>}
            {packages.map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.sessions_used}/{p.sessions_total} sessões · {p.recurrence_type}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === "in_progress" ? "default" : "secondary"}>{p.status}</Badge>
                  <span className="font-bold text-primary">R$ {Number(p.total_price).toFixed(2)}</span>
                </div>
              </div>
            ))}
            <div className="p-3"><Link to="/app/packages"><Button variant="outline" size="sm">Abrir Recorrências</Button></Link></div>
          </Card>
        </TabsContent>

        <TabsContent value="combos">
          <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border">
            {combos.length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhum combo comprado.</div>}
            {combos.map(c => (
              <div key={c.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{c.combos?.name ?? "Combo"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(c.sold_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <span className="font-bold text-primary">R$ {Number(c.amount).toFixed(2)}</span>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="debts">
          <Card className="rounded-3xl border-0 shadow-sm">
            {debts.length === 0 && <div className="p-6 text-sm text-muted-foreground">Sem promissórias.</div>}
            {debts.map(d => {
              const di = insts.filter(i => i.debt_id === d.id);
              const paid = di.filter(i => i.paid_at).length;
              return (
                <div key={d.id} className="px-4 py-3 border-b border-border last:border-0">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium">R$ {Number(d.total_amount).toFixed(2)} — {paid}/{d.installments_count} parcelas</div>
                    <Badge className={d.status === "paid" ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}>{d.status}</Badge>
                  </div>
                </div>
              );
            })}
            <div className="p-3"><Link to="/app/debts"><Button variant="outline" size="sm">Abrir Promissórias</Button></Link></div>
          </Card>
        </TabsContent>

        <TabsContent value="logistics">
          <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border">
            {deliveries.length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhuma entrega.</div>}
            {deliveries.map(d => (
              <div key={d.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{d.destination_address}</div>
                  <div className="text-xs text-muted-foreground">{d.scheduled_for ? new Date(d.scheduled_for).toLocaleDateString("pt-BR") : "Sem data"}</div>
                </div>
                <Badge variant="outline">{d.status}</Badge>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card className="p-6 rounded-3xl border-0 shadow-sm text-sm whitespace-pre-wrap">
            {client.notes || <span className="text-muted-foreground">Sem notas.</span>}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
