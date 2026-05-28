import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/app/PageHeader";
import { Zap, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Automations() {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("tenant_integrations").select("*").eq("user_id", user.id).eq("provider", "make_webhook").maybeSingle();
    if (data) {
      setRecordId(data.id);
      setUrl((data.credentials as any)?.webhook_url ?? "");
      setEnabled(data.status === "connected");
    }
  };
  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!user) return;
    if (!url.startsWith("http")) return toast.error("URL inválida");
    const payload = {
      user_id: user.id, provider: "make_webhook",
      credentials: { webhook_url: url } as any,
      status: "connected", connected_at: new Date().toISOString(),
    };
    const { error } = recordId
      ? await supabase.from("tenant_integrations").update(payload).eq("id", recordId)
      : await supabase.from("tenant_integrations").insert(payload);
    if (error) return toast.error(friendlyError(error));
    toast.success("Webhook salvo");
    setEnabled(true); load();
  };

  const test = async () => {
    if (!url) return;
    setTesting(true);
    try {
      await fetch(url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "test", source: "lovable_app", timestamp: new Date().toISOString() }) });
      toast.success("Teste enviado! Confira no Make.");
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally { setTesting(false); }
  };

  const disconnect = async () => {
    if (!recordId) return;
    await supabase.from("tenant_integrations").update({ status: "disconnected" }).eq("id", recordId);
    setEnabled(false); toast.success("Desconectado");
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Automações" description="Conecte o Make/Integromat para disparar fluxos quando eventos do sistema acontecerem." />

      <Card className="p-6 rounded-3xl border-0 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Webhook do Make</h2>
          {enabled && <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Ativo</span>}
        </div>
        <p className="text-sm text-muted-foreground">
          Cole a URL do <strong>Webhook</strong> gerada no seu cenário Make. Ao salvar, eventos como <em>Nova Venda</em> e <em>Novo Cliente</em> serão enviados como POST para essa URL.
        </p>

        <div>
          <Label>Webhook URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hook.make.com/..." />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={save}>Salvar</Button>
          <Button variant="outline" onClick={test} disabled={!url || testing}>{testing ? "Enviando..." : "Enviar teste"}</Button>
          {enabled && <Button variant="ghost" onClick={disconnect}>Desconectar</Button>}
          <a href="https://www.make.com/" target="_blank" rel="noreferrer">
            <Button variant="ghost" className="gap-1"><ExternalLink className="h-3 w-3" />Abrir Make</Button>
          </a>
        </div>

        <div className="bg-secondary/40 rounded-2xl p-4 text-xs space-y-2">
          <div className="font-semibold">Eventos disparados:</div>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><code>sale.created</code> — Nova venda registrada</li>
            <li><code>client.created</code> — Novo cliente cadastrado</li>
            <li><code>combo.sold</code> — Combo vendido</li>
            <li><code>quote.created</code> — Novo orçamento</li>
          </ul>
          <div className="text-muted-foreground">Payload: <code>{`{ event, data, timestamp, user_id }`}</code></div>
        </div>
      </Card>
    </div>
  );
}
