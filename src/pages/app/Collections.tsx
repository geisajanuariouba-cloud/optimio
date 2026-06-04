import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Receipt, Phone, Copy, MessageCircle, Search } from "lucide-react";

type Inst = { id: string; debt_id: string; number: number; amount: number; amount_paid: number; due_date: string; status: string; paid_at: string | null };
type Debt = { id: string; client_id: string | null; total_amount: number; installments_count: number; description: string | null };
type Client = { id: string; full_name: string; phone: string | null };

function daysLate(date: string) {
  const d = new Date(date + "T00:00:00");
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}

function buildMessage(opts: { client: string; amount: number; days: number; company?: string }) {
  const { client, amount, days, company } = opts;
  return `Olá ${client.split(" ")[0]}, tudo bem? Aqui é ${company ?? "da equipe"}.

Identificamos uma parcela em aberto no valor de R$ ${amount.toFixed(2)}, com ${days} dia${days === 1 ? "" : "s"} de atraso.

Pode regularizar hoje? Qualquer dúvida estou à disposição. Obrigado!`;
}

export default function Collections() {
  const { user } = useAuth();
  const [insts, setInsts] = useState<Inst[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [companyName, setCompanyName] = useState<string>("");
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    const [{ data: di }, { data: d }, { data: c }, { data: prof }] = await Promise.all([
      supabase.from("debt_installments").select("*").is("paid_at", null).order("due_date"),
      supabase.from("debts").select("*"),
      supabase.from("clients").select("id,full_name,phone").is("deleted_at", null),
      supabase.from("profiles").select("company_name").eq("id", user.id).maybeSingle(),
    ]);
    setInsts((di ?? []) as Inst[]);
    setDebts((d ?? []) as Debt[]);
    setClients((c ?? []) as Client[]);
    setCompanyName(prof?.company_name ?? "");
  };
  useEffect(() => { load(); }, [user]);

  const today = new Date().toISOString().slice(0, 10);
  const overdue = useMemo(() => insts.filter(i => i.due_date < today), [insts, today]);
  const upcoming = useMemo(() => insts.filter(i => i.due_date >= today).slice(0, 30), [insts, today]);

  const clientOf = (instId: string) => {
    const i = insts.find(x => x.id === instId);
    if (!i) return null;
    const d = debts.find(x => x.id === i.debt_id);
    if (!d?.client_id) return null;
    return clients.find(c => c.id === d.client_id) ?? null;
  };

  // Inadimplentes (cliente único com pelo menos 1 parcela vencida)
  const delinquent = useMemo(() => {
    const map = new Map<string, { client: Client; openAmount: number; oldestDays: number; count: number }>();
    for (const i of overdue) {
      const cli = clientOf(i.id);
      if (!cli) continue;
      const current = map.get(cli.id) ?? { client: cli, openAmount: 0, oldestDays: 0, count: 0 };
      current.openAmount += Number(i.amount) - Number(i.amount_paid);
      current.oldestDays = Math.max(current.oldestDays, daysLate(i.due_date));
      current.count += 1;
      map.set(cli.id, current);
    }
    return Array.from(map.values()).sort((a, b) => b.oldestDays - a.oldestDays);
  }, [overdue, debts, clients]);

  const filterFn = (cli: Client | null) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (cli?.full_name ?? "").toLowerCase().includes(q) || (cli?.phone ?? "").includes(q);
  };

  const copyMsg = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mensagem copiada!");
    } catch { toast.error("Não foi possível copiar."); }
  };

  const waLink = (phone: string | null | undefined, text: string) => {
    if (!phone) return "#";
    const num = phone.replace(/\D/g, "");
    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  };

  const totalOverdue = overdue.reduce((a, i) => a + (Number(i.amount) - Number(i.amount_paid)), 0);

  return (
    <div>
      <PageHeader title="Cobrança Inteligente" description="Parcelas vencidas, clientes inadimplentes e mensagens prontas para WhatsApp." />

      <MetricsRow items={[
        { label: "Parcelas vencidas", value: String(overdue.length), tone: overdue.length > 0 ? "danger" : "primary" },
        { label: "Inadimplentes", value: String(delinquent.length), tone: delinquent.length > 0 ? "warning" : "primary" },
        { label: "Total em atraso", value: `R$ ${totalOverdue.toFixed(2)}`, tone: totalOverdue > 0 ? "danger" : "success" },
        { label: "A vencer (próximas)", value: String(upcoming.length), tone: "primary" },
      ]} />

      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente ou telefone…" className="pl-9 h-9" />
      </div>

      <Tabs defaultValue="overdue">
        <TabsList className="rounded-2xl mb-4">
          <TabsTrigger value="overdue">Vencidas ({overdue.length})</TabsTrigger>
          <TabsTrigger value="delinquent">Inadimplentes ({delinquent.length})</TabsTrigger>
          <TabsTrigger value="upcoming">A vencer ({upcoming.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overdue">
          {overdue.length === 0 ? (
            <Card className="rounded-3xl border-0 shadow-sm">
              <EmptyState icon={Receipt} title="Nenhuma parcela vencida" description="Tudo em dia por aqui!" />
            </Card>
          ) : (
            <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border overflow-hidden">
              {overdue.filter(i => filterFn(clientOf(i.id))).map(i => {
                const cli = clientOf(i.id);
                const open = Number(i.amount) - Number(i.amount_paid);
                const days = daysLate(i.due_date);
                const msg = buildMessage({
                  client: cli?.full_name ?? "cliente",
                  amount: open, days, company: companyName,
                });
                return (
                  <div key={i.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex-1 min-w-[180px]">
                      <div className="font-medium">{cli?.full_name ?? "Sem cliente"}</div>
                      <div className="text-xs text-muted-foreground">
                        Parc. {i.number} · venc. {new Date(i.due_date).toLocaleDateString("pt-BR")}
                        {cli?.phone && <> · <Phone className="inline h-3 w-3" /> {cli.phone}</>}
                      </div>
                    </div>
                    <Badge className="bg-rose-500/15 text-rose-600">{days} dia{days === 1 ? "" : "s"}</Badge>
                    <span className="font-bold text-rose-600">R$ {open.toFixed(2)}</span>
                    <Button size="sm" variant="outline" onClick={() => copyMsg(msg)} className="rounded-xl gap-1">
                      <Copy className="h-3.5 w-3.5" /> Copiar
                    </Button>
                    <Button size="sm" disabled={!cli?.phone} asChild className="rounded-xl gap-1 bg-emerald-600 hover:bg-emerald-700">
                      <a href={waLink(cli?.phone, msg)} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    </Button>
                  </div>
                );
              })}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="delinquent">
          {delinquent.length === 0 ? (
            <Card className="rounded-3xl border-0 shadow-sm">
              <EmptyState icon={Receipt} title="Sem inadimplentes" description="Nenhum cliente com parcela em atraso." />
            </Card>
          ) : (
            <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border overflow-hidden">
              {delinquent.filter(d => filterFn(d.client)).map(d => {
                const msg = buildMessage({
                  client: d.client.full_name, amount: d.openAmount, days: d.oldestDays, company: companyName,
                });
                return (
                  <div key={d.client.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex-1 min-w-[180px]">
                      <div className="font-medium">{d.client.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.count} parcela(s) em aberto {d.client.phone && <>· <Phone className="inline h-3 w-3" /> {d.client.phone}</>}
                      </div>
                    </div>
                    <Badge className="bg-rose-500/15 text-rose-600">{d.oldestDays} dia{d.oldestDays === 1 ? "" : "s"}</Badge>
                    <span className="font-bold text-rose-600">R$ {d.openAmount.toFixed(2)}</span>
                    <Button size="sm" variant="outline" onClick={() => copyMsg(msg)} className="rounded-xl gap-1">
                      <Copy className="h-3.5 w-3.5" /> Copiar
                    </Button>
                    <Button size="sm" disabled={!d.client.phone} asChild className="rounded-xl gap-1 bg-emerald-600 hover:bg-emerald-700">
                      <a href={waLink(d.client.phone, msg)} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    </Button>
                  </div>
                );
              })}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <Card className="rounded-3xl border-0 shadow-sm">
              <EmptyState icon={Receipt} title="Sem parcelas próximas" description="Nada a vencer nos próximos registros." />
            </Card>
          ) : (
            <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border overflow-hidden">
              {upcoming.filter(i => filterFn(clientOf(i.id))).map(i => {
                const cli = clientOf(i.id);
                const open = Number(i.amount) - Number(i.amount_paid);
                return (
                  <div key={i.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex-1 min-w-[180px]">
                      <div className="font-medium">{cli?.full_name ?? "Sem cliente"}</div>
                      <div className="text-xs text-muted-foreground">Parc. {i.number} · venc. {new Date(i.due_date).toLocaleDateString("pt-BR")}</div>
                    </div>
                    <Badge variant="outline">{Math.abs(daysLate(i.due_date))} dia(s)</Badge>
                    <span className="font-bold text-primary">R$ {open.toFixed(2)}</span>
                  </div>
                );
              })}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
