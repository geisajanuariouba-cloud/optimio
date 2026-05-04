import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import AIChat from "@/components/AIChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/app/PageHeader";
import { toast } from "sonner";
import { LifeBuoy, Phone } from "lucide-react";

type Ticket = { id: string; user_id: string; subject: string; status: string; whatsapp: string | null; last_message_at: string };

export default function Support() {
  const { user } = useAuth();
  const { isAdmin, profile } = useTenant();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [whats, setWhats] = useState("");

  const load = async () => {
    const q = isAdmin
      ? supabase.from("support_tickets").select("*").order("last_message_at", { ascending: false })
      : supabase.from("support_tickets").select("*").eq("user_id", user!.id).order("last_message_at", { ascending: false });
    const { data } = await q;
    setTickets((data ?? []) as Ticket[]);
  };
  useEffect(() => { if (user) load(); }, [user, isAdmin]);

  const escalate = async () => {
    if (!user) return;
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id, subject: "Pedido de atendimento humano", status: "human", whatsapp: whats || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Sua dúvida foi enviada ao admin. Em breve entrará em contato.");
    setWhats(""); load();
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
              {t.whatsapp && (
                <a href={`https://wa.me/${t.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-2"><Phone className="h-4 w-4" />WhatsApp</Button>
                </a>
              )}
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Suporte 24h" description="Resolva no chat IA ou chame um humano." />
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="h-[600px]"><AIChat context="app" floating={false} onEscalate={() => document.getElementById("escalate")?.scrollIntoView({ behavior: "smooth" })} /></div>

        <div className="space-y-4">
          <Card id="escalate" className="rounded-3xl border-0 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-3"><LifeBuoy className="h-5 w-5 text-primary" /><h3 className="font-semibold">Falar com um humano</h3></div>
            <p className="text-sm text-muted-foreground mb-4">Deixe seu WhatsApp para que o admin entre em contato.</p>
            <Label>WhatsApp (com DDD)</Label>
            <Input value={whats} onChange={(e) => setWhats(e.target.value)} placeholder="(11) 99999-9999" className="mb-3" />
            <Button onClick={escalate} className="w-full rounded-2xl bg-gradient-brand text-white border-0">Solicitar contato</Button>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm p-6">
            <h3 className="font-semibold mb-3">Meus tickets</h3>
            {tickets.length === 0
              ? <div className="text-sm text-muted-foreground">Nenhum ticket aberto.</div>
              : <div className="space-y-2">{tickets.map(t => (
                  <div key={t.id} className="text-sm flex items-center justify-between">
                    <span>{t.subject}</span><Badge variant="outline">{t.status}</Badge>
                  </div>
                ))}</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}
