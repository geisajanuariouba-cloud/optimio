import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Upload, Phone, MapPin, MessageSquare, Boxes, Loader2 } from "lucide-react";
import { MetricsRow } from "@/components/app/PageHeader";

export default function SupplierDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [supplier, setSupplier] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [cmd, setCmd] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const load = async () => {
    if (!id) return;
    const [s, p, h, c] = await Promise.all([
      supabase.from("suppliers").select("*").eq("id", id).maybeSingle(),
      supabase.from("products").select("*").eq("supplier_id", id).is("deleted_at", null).order("name"),
      supabase.from("supplier_commands").select("*").eq("supplier_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("supplier_catalogs").select("*").eq("supplier_id", id).order("created_at", { ascending: false }),
    ]);
    setSupplier(s.data); setProducts(p.data ?? []); setHistory(h.data ?? []); setCatalogs(c.data ?? []);
  };
  useEffect(() => { if (user) load(); }, [user, id]);

  const downloadCatalog = async (path: string, filename: string) => {
    const { data, error } = await supabase.storage.from("supplier-catalogs").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { toast.error("Não foi possível abrir o arquivo"); return; }
    const a = document.createElement("a");
    a.href = data.signedUrl; a.download = filename; a.target = "_blank";
    document.body.appendChild(a); a.click(); a.remove();
  };

  const removeCatalog = async (c: any) => {
    if (!confirm(`Remover "${c.filename}"?`)) return;
    await supabase.storage.from("supplier-catalogs").remove([c.storage_path]);
    await supabase.from("supplier_catalogs").delete().eq("id", c.id);
    toast.success("Catálogo removido"); load();
  };

  const sendCommand = async () => {
    if (!cmd.trim() || !user || !id) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("supplier-command", {
        body: { supplier_id: id, command: cmd },
      });
      if (error) throw error;
      toast.success(data?.message ?? "Comando processado");
      setCmd(""); load();
    } catch (e: any) {
      toast.error(e.message ?? "Erro no comando");
    } finally { setSending(false); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !id || !user) return;
    setImporting(true);
    try {
      const safeName = f.name.replace(/[^\w.\-]+/g, "_");
      const storagePath = `${user.id}/${id}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("supplier-catalogs")
        .upload(storagePath, f, { contentType: f.type || "application/octet-stream", upsert: false });
      if (upErr) throw upErr;
      const { data, error } = await supabase.functions.invoke("supplier-catalog-import", {
        body: { supplier_id: id, filename: f.name, mime: f.type, storage_path: storagePath, size_bytes: f.size },
      });
      if (error) throw error;
      toast.success(`${data?.created ?? 0} criados, ${data?.updated ?? 0} atualizados`);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Erro na importação");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  if (!supplier) return <div className="p-6 text-muted-foreground">Carregando…</div>;

  const active = products.filter(p => p.status !== "discontinued").length;
  const disc = products.filter(p => p.status === "discontinued").length;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)} className="gap-1"><ArrowLeft className="h-4 w-4" />Voltar</Button>

      <Card className="p-6 rounded-3xl border-0 shadow-sm">
        <h1 className="text-2xl md:text-3xl font-bold">{supplier.name}</h1>
        <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
          {supplier.cnpj && <div>CNPJ: <strong className="text-foreground">{supplier.cnpj}</strong></div>}
          {supplier.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{supplier.phone}</div>}
          {supplier.full_address && <div className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 mt-0.5" />{supplier.full_address}</div>}
        </div>
      </Card>

      <MetricsRow items={[
        { label: "Produtos ativos", value: String(active), tone: "primary" },
        { label: "Fora de linha", value: String(disc), tone: "warning" },
        { label: "Comandos enviados", value: String(history.length), tone: "primary" },
        { label: "Status", value: supplier.status, tone: "success" },
      ]} />

      <Tabs defaultValue="chat">
        <TabsList className="bg-secondary/40">
          <TabsTrigger value="chat"><MessageSquare className="h-4 w-4 mr-1" />Chat & Importação</TabsTrigger>
          <TabsTrigger value="products"><Boxes className="h-4 w-4 mr-1" />Produtos ({products.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <Card className="p-5 rounded-3xl border-0 shadow-sm">
            <div className="text-sm font-semibold mb-2">Importar catálogo / tabela de preços</div>
            <p className="text-xs text-muted-foreground mb-3">A IA lê PDF, Excel ou CSV e cadastra produtos com <strong>preço de custo</strong> (não venda). O preço de venda é calculado pelo motor de precificação do fornecedor (custo + margem + taxa extra). O arquivo fica salvo aqui para reabrir ou baixar quando quiser.</p>
            <input ref={fileRef} type="file" accept=".pdf,.csv,.xlsx,.xls" hidden onChange={onFile} />
            <Button onClick={() => fileRef.current?.click()} disabled={importing} className="rounded-2xl gap-2">
              {importing ? <><Loader2 className="h-4 w-4 animate-spin" />Importando…</> : <><Upload className="h-4 w-4" />Anexar catálogo</>}
            </Button>

            {catalogs.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Catálogos anexados</div>
                {catalogs.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-2xl bg-secondary/40 p-3 text-sm">
                    <Upload className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleString("pt-BR")} · {c.products_created} novos · {c.products_updated} atualizados
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => downloadCatalog(c.storage_path, c.filename)}>Baixar</Button>
                    <Button size="icon" variant="ghost" onClick={() => removeCatalog(c)} className="text-rose-500"><Loader2 className="h-4 w-4 hidden" />×</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 rounded-3xl border-0 shadow-sm">
            <div className="text-sm font-semibold mb-1">Chat de comandos</div>
            <p className="text-xs text-muted-foreground mb-3">Ex.: <em>"o produto X saiu de linha"</em>, <em>"renomear Produto Y para Produto Z"</em>, <em>"aumentar 10% no preço de todos"</em>.</p>
            <div className="flex gap-2">
              <Input value={cmd} onChange={(e) => setCmd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendCommand()} placeholder="Digite seu comando…" disabled={sending} />
              <Button onClick={sendCommand} disabled={sending} className="rounded-2xl gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar
              </Button>
            </div>
            <div className="mt-4 space-y-2 max-h-80 overflow-auto">
              {history.length === 0 && <p className="text-xs text-muted-foreground">Nenhum comando ainda.</p>}
              {history.map(h => (
                <div key={h.id} className="rounded-2xl bg-secondary/40 p-3 text-sm">
                  <div className="font-medium">{h.command}</div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(h.created_at).toLocaleString("pt-BR")} · {h.affected_count} afetado(s)</div>
                  {h.result?.message && <div className="text-xs text-primary mt-1">{h.result.message}</div>}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border">
            {products.length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhum produto vinculado. Importe um catálogo ou edite produtos existentes.</div>}
            {products.map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">Estoque: {p.stock} · R$ {Number(p.sale_price).toFixed(2)}</div>
                </div>
                {p.status === "discontinued"
                  ? <Badge className="bg-amber-500/15 text-amber-600">fora de linha</Badge>
                  : <Badge className="bg-emerald-500/15 text-emerald-600">ativo</Badge>}
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
