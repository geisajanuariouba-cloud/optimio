import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Instagram, Mail, Plug, CheckCircle2, ShoppingBag, CreditCard, Webhook } from "lucide-react";

type Provider = { id: string; label: string; icon: any; desc: string; fields: { key: string; label: string; type?: string; placeholder?: string }[] };

const PROVIDERS: Provider[] = [
  { id: "shopify", label: "Shopify", icon: ShoppingBag, desc: "Conecte sua loja Shopify para sincronizar produtos, pedidos e clientes.", fields: [
    { key: "shop_domain", label: "Domínio da loja", placeholder: "minhaloja.myshopify.com" },
    { key: "admin_token", label: "Admin API Access Token", type: "password" },
  ]},
  { id: "stripe", label: "Stripe", icon: CreditCard, desc: "Receba pagamentos com Stripe Connect (split de 2% Optimio).", fields: [
    { key: "account_id", label: "Stripe Account ID", placeholder: "acct_..." },
    { key: "secret_key", label: "Secret Key (sk_live_…)", type: "password" },
  ]},
  { id: "make", label: "Make / Zapier (Webhook)", icon: Webhook, desc: "Dispare automações externas via webhook a cada evento (venda, agendamento).", fields: [
    { key: "webhook_url", label: "Webhook URL", placeholder: "https://hook.eu2.make.com/..." },
  ]},
  { id: "instagram", label: "Instagram", icon: Instagram, desc: "Capture menções, DMs e cliques em links de compra como leads no CRM.", fields: [
    { key: "username", label: "Username", placeholder: "@suamarca" },
  ]},
  { id: "gmail", label: "Gmail / E-mail", icon: Mail, desc: "Processa e-mails de pagamento (PIX/Cartão) e baixa estoque automaticamente.", fields: [
    { key: "email", label: "E-mail", placeholder: "vendas@suamarca.com" },
  ]},
];

type Conn = { provider: string; status: string; metadata: any };

export default function Integrations() {
  const { user } = useAuth();
  const [conns, setConns] = useState<Record<string, Conn>>({});
  const [open, setOpen] = useState<Provider | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("tenant_integrations").select("provider, status, metadata").eq("user_id", user.id);
    const map: Record<string, Conn> = {};
    (data ?? []).forEach((c: any) => { map[c.provider] = c; });
    setConns(map);
  };
  useEffect(() => { load(); }, [user]);

  const openConfig = (p: Provider) => {
    const existing = conns[p.id];
    setForm(existing?.metadata ?? {});
    setOpen(p);
  };

  const save = async () => {
    if (!user || !open) return;
    const credentials: Record<string, string> = {};
    const metadata: Record<string, string> = {};
    open.fields.forEach(f => {
      if (f.type === "password") credentials[f.key] = form[f.key] ?? "";
      else metadata[f.key] = form[f.key] ?? "";
    });
    const { error } = await supabase.from("tenant_integrations").upsert({
      user_id: user.id, provider: open.id, status: "connected",
      credentials, metadata, connected_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });
    if (error) return toast.error(friendlyError(error));
    toast.success(`${open.label} conectado`);
    setOpen(null); load();
  };

  const disconnect = async (provider: string) => {
    if (!user) return;
    await supabase.from("tenant_integrations").update({ status: "disconnected", credentials: {} }).eq("user_id", user.id).eq("provider", provider);
    toast.success("Desconectado"); load();
  };

  return (
    <div>
      <PageHeader title="Central de Integrações" description="Conecte sua própria conta Shopify, Stripe e mais. Cada cliente tem suas credenciais isoladas." />
      <div className="grid md:grid-cols-2 gap-4">
        {PROVIDERS.map(p => {
          const connected = conns[p.id]?.status === "connected";
          return (
            <Card key={p.id} className="rounded-3xl border-0 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0"><p.icon className="h-6 w-6 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold">{p.label}</h3>
                    {connected && <Badge className="bg-emerald-500/10 text-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Conectado</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant={connected ? "outline" : "default"} onClick={() => openConfig(p)} className="rounded-2xl">
                      <Plug className="h-4 w-4 mr-2" />{connected ? "Reconfigurar" : "Conectar"}
                    </Button>
                    {connected && <Button variant="ghost" onClick={() => disconnect(p.id)}>Desconectar</Button>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Conectar {open?.label}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {open?.fields.map(f => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Input type={f.type ?? "text"} value={form[f.key] ?? ""} placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Suas credenciais ficam isoladas por conta (RLS) e nunca são vistas por outros clientes.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(null)}>Cancelar</Button>
            <Button onClick={save} className="rounded-2xl">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
