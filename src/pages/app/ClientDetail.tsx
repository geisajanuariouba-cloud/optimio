import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, Mail, MapPin, FileText, Wallet, Receipt, Truck, Scissors } from "lucide-react";
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

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const [c, fin, appts, d, di, dl] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).maybeSingle(),
        supabase.from("financial").select("*").eq("client_id", id).order("transaction_date", { ascending: false }),
        supabase.from("appointments").select("*").eq("client_id", id).is("deleted_at", null).order("appointment_date", { ascending: false }),
        supabase.from("debts").select("*").eq("client_id", id).order("created_at", { ascending: false }),
        supabase.from("debt_installments").select("*").order("number"),
        supabase.from("deliveries").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      ]);
      setClient(c.data);
      setSales((fin.data ?? []).filter((f: any) => f.type === "income"));
      setServices(appts.data ?? []);
      setDebts(d.data ?? []);
      setInsts(di.data ?? []);
      setDeliveries(dl.data ?? []);
    })();
  }, [user, id]);

  if (!client) return <div className="p-6 text-muted-foreground">Carregando…</div>;

  const ltv = sales.reduce((a, s) => a + Number(s.net_amount ?? 0), 0);
  const debtOpen = debts.filter(d => d.status !== "paid");
  const debtTotal = insts.filter(i => debts.find(d => d.id === i.debt_id) && !i.paid_at).reduce((a, i) => a + Number(i.amount), 0);

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
            </div>
          </div>
        </div>
      </Card>

      <MetricsRow items={[
        { label: "LTV (recebido)", value: `R$ ${ltv.toFixed(2)}`, tone: "primary" },
        { label: "Vendas", value: String(sales.length), tone: "primary" },
        { label: "Serviços", value: String(services.length), tone: "primary" },
        { label: "Dívida em aberto", value: `R$ ${debtTotal.toFixed(2)}`, tone: debtTotal > 0 ? "danger" : "success", hint: `${debtOpen.length} promissória(s)` },
      ]} />

      <Tabs defaultValue="sales">
        <TabsList className="bg-secondary/40 flex-wrap h-auto">
          <TabsTrigger value="sales"><Wallet className="h-4 w-4 mr-1" />Vendas</TabsTrigger>
          <TabsTrigger value="services"><Scissors className="h-4 w-4 mr-1" />Serviços</TabsTrigger>
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
                <div className="font-bold text-primary">R$ {Number(s.net_amount).toFixed(2)}</div>
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
