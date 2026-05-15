import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import AIChat from "@/components/AIChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app/PageHeader";
import { toast } from "sonner";
import { LifeBuoy, Clock } from "lucide-react";

type Ticket = { id: string; user_id: string; subject: string; status: string; last_message_at: string };

export default function Support() {
  const { user } = useAuth();
  const { isAdmin } = useTenant();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const q = isAdmin
      ? supabase.from("support_tickets").select("*").order("last_message_at", { ascending: false })
      : supabase.from("support_tickets").select("*").eq("user_id", user!.id).order("last_message_at", { ascending: false });
    const { data } = await q;
    setTickets((data ?? []) as Ticket[]);
  };
  useEffect(() => { if (user) load(); }, [user, isAdmin]);

  const escalate = async () => {
    if (!user || !msg.trim()) return toast.error("Descreva sua dúvida");
    const { data: ticket, error } = await supabase.from("support_tickets").insert({
      user_id: user.id, subject: msg.slice(0, 80), status: "human",
    }).select().single();
    if (error) return toast.error(error.message);
    if (ticket) {
      await supabase.from("support_messages").insert({ ticket_id: ticket.id, user_id: user.id, role: "user", content: msg });
    }
    toast.success("Mensagem enviada — tempo de resposta: até 24h úteis.");
    setMsg(""); load();
  };

  if (isAdmin) {
    return (
      <div>
        <PageHeader title="Suporte — Tickets" description="Tickets escalados pelos tenants para atendimento humano." />
        <Card className="rounded-3xl border-0 shadow-sm divide-y">
          {tickets.length === 0 && <div className="p-8 text-center text-muted-foreground">Sem tickets em aberto.</div>}
          {tickets.map(t => (
            <div key={t.id} className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-medium">{t.subject}</div>
                <div className="text-xs text-muted-foreground">tenant: {t.user_id.slice(0, 8)} · {new Date(t.last_message_at).toLocaleString("pt-BR")}</div>
              </div>
              <Badge>{t.status}</Badge>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Suporte 24h" description="Resolva no chat IA ou abra um ticket interno." />
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="h-[600px]"><AIChat context="app" floating={false} onEscalate={() => document.getElementById("escalate")?.scrollIntoView({ behavior: "smooth" })} /></div>

        <div className="space-y-4">
          <Card id="escalate" className="rounded-3xl border-0 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-3"><LifeBuoy className="h-5 w-5 text-primary" /><h3 className="font-semibold">Chamar humano</h3></div>
            <p className="text-sm text-muted-foreground mb-2">Descreva sua dúvida. Sua mensagem cai no painel do admin.</p>
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mb-3">
              <Clock className="h-3 w-3" /> Tempo de resposta: até 24h úteis
            </div>
            <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Conte o que está acontecendo..." rows={4} className="mb-3" />
            <Button onClick={escalate} className="w-full rounded-2xl bg-gradient-brand text-white border-0">Enviar ticket</Button>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm p-6">
            <h3 className="font-semibold mb-3">Meus tickets</h3>
            {tickets.length === 0
              ? <div className="text-sm text-muted-foreground">Nenhum ticket aberto.</div>
              : <div className="space-y-2">{tickets.map(t => (
                  <div key={t.id} className="text-sm flex items-center justify-between">
                    <span className="truncate">{t.subject}</span><Badge variant="outline">{t.status}</Badge>
                  </div>
                ))}</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}
