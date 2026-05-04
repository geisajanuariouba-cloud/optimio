import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Instagram, Mail, Plug, CheckCircle2 } from "lucide-react";

const PROVIDERS = [
  { id: "instagram", label: "Instagram", icon: Instagram, desc: "Capture menções, DMs e cliques em links de compra como leads no CRM." },
  { id: "gmail", label: "Gmail / E-mail", icon: Mail, desc: "Processa e-mails de pagamento (PIX/Cartão) e baixa estoque automaticamente." },
];

export default function Integrations() {
  const { user } = useAuth();
  const [conns, setConns] = useState<Record<string, string>>({});

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("integrations").select("provider, status").eq("user_id", user.id);
    const map: Record<string, string> = {};
    (data ?? []).forEach((c: any) => { map[c.provider] = c.status; });
    setConns(map);
  };
  useEffect(() => { load(); }, [user]);

  const toggle = async (provider: string) => {
    if (!user) return;
    const isConnected = conns[provider] === "connected";
    const next = isConnected ? "disconnected" : "connected";
    const { error } = await supabase.from("integrations").upsert({ user_id: user.id, provider, status: next }, { onConflict: "user_id,provider" });
    if (error) return toast.error(error.message);
    toast.success(`${provider} ${next === "connected" ? "conectado" : "desconectado"}`);
    load();
  };

  return (
    <div>
      <PageHeader title="Central de Integrações" description="Omnichannel: conecte canais e automatize entradas no CRM e financeiro." />
      <div className="grid md:grid-cols-2 gap-4">
        {PROVIDERS.map(p => {
          const connected = conns[p.id] === "connected";
          return (
            <Card key={p.id} className="rounded-3xl border-0 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0"><p.icon className="h-6 w-6 text-primary" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{p.label}</h3>
                    {connected && <Badge className="bg-emerald-500/10 text-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Conectado</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
                  <Button variant={connected ? "outline" : "default"} onClick={() => toggle(p.id)} className="rounded-2xl">
                    <Plug className="h-4 w-4 mr-2" />{connected ? "Desconectar" : "Conectar"}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
