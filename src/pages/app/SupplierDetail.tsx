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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Send, Upload, Phone, MapPin, MessageSquare, Boxes, Loader2, FileText, DollarSign, Eye, Download, Trash2 } from "lucide-react";
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
  const catalogRef = useRef<HTMLInputElement>(null);
  const pricingRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<null | "catalog" | "pricing">(null);
  const [preview, setPreview] = useState<{ url: string; mime: string; filename: string } | null>(null);



  const load = async () => {
    if (!id) return;
    const [s, p, h, c] = await Promise.all([
      supabase.from("suppliers").select("*").eq("id", id).maybeSingle(),
      supabase.from("products").select("*").eq("supplier_id", id).is("deleted_at", null).order("name"),
      supabase.from("supplier_commands").select("*").eq("supplier_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("supplier_catalogs").select("*").eq("supplier_id", id).eq("internal_only", false).order("created_at", { ascending: false }),
    ]);
    setSupplier(s.data); setProducts(p.data ?? []); setHistory(h.data ?? []); setCatalogs(c.data ?? []);
  };
  useEffect(() => { if (user) load(); }, [user, id]);

  // Polling de status enquanto houver catálogos em processamento
  useEffect(() => {
    const processing = catalogs.some((c: any) => ["pending", "processing", "splitting", "extracting", "consolidating"].includes(c.processing_status));
    if (!processing) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [catalogs]);


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

  const retryCatalog = async (c: any) => {
    try {
      const { error } = await supabase.functions.invoke("supplier-catalog-import", {
        body: { retry_catalog_id: c.id },
      });
      if (error) throw error;
      toast.success("Reprocessando catálogo…");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível reprocessar");
    }
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

  const compressImage = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const maxDim = 2000;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const r = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponível"));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((b) => {
          URL.revokeObjectURL(url);
          b ? resolve(b) : reject(new Error("Falha ao comprimir"));
        }, "image/jpeg", 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Imagem inválida")); };
      img.src = url;
    });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>, kind: "catalog" | "pricing") => {
    const f = e.target.files?.[0];
    if (!f || !id || !user) return;
    setImporting(kind);
    try {
      let upload: Blob = f;
      let mime = f.type || (f.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
      let outName = f.name;
      if (f.type.startsWith("image/")) {
        upload = await compressImage(f);
        mime = "image/jpeg";
        outName = f.name.replace(/\.[^.]+$/, "") + ".jpg";
      } else if (f.size > 200 * 1024 * 1024) {
        throw new Error("Arquivo muito grande (máx 200MB).");
      }
      const safeName = outName.replace(/[^\w.\-]+/g, "_");
      const storagePath = `${user.id}/${id}/${kind}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("supplier-catalogs")
        .upload(storagePath, upload, { contentType: mime, upsert: false });
      if (upErr) throw new Error("Erro ao enviar catálogo. Tente novamente.");
      toast.success("Catálogo enviado com sucesso. Processando produtos…");
      load();
      const { data, error } = await supabase.functions.invoke("supplier-catalog-import", {
        body: { supplier_id: id, filename: outName, mime, storage_path: storagePath, size_bytes: upload.size, kind },
      });
      if (error) {
        const msg = (data as any)?.error || "Erro ao processar catálogo.";
        throw new Error(msg);
      }
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro na importação");
      load();
    } finally {
      setImporting(null);
      e.target.value = "";
    }
  };

  const openPreview = async (c: any) => {
    const { data, error } = await supabase.storage.from("supplier-catalogs").createSignedUrl(c.storage_path, 60 * 30);
    if (error || !data?.signedUrl) { toast.error("Não foi possível abrir o arquivo"); return; }
    const mime = c.mime || (c.filename?.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
    setPreview({ url: data.signedUrl, mime, filename: c.filename });
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
            <div className="text-sm font-semibold mb-2">Anexar arquivos do fornecedor</div>
            <p className="text-xs text-muted-foreground mb-3">A IA lê PDF ou imagem e cadastra os produtos com <strong>preço de custo</strong>. O preço de venda é calculado pelo motor (custo + margem + taxa). Você pode visualizar, baixar ou remover os arquivos a qualquer momento.</p>
            <input ref={catalogRef} type="file" accept=".pdf,image/*" hidden onChange={(e) => onFile(e, "catalog")} />
            <input ref={pricingRef} type="file" accept=".pdf,image/*" hidden onChange={(e) => onFile(e, "pricing")} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => catalogRef.current?.click()} disabled={!!importing} className="rounded-2xl gap-2">
                {importing === "catalog" ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando catálogo…</> : <><FileText className="h-4 w-4" />Anexar catálogo</>}
              </Button>
              <Button onClick={() => pricingRef.current?.click()} disabled={!!importing} variant="secondary" className="rounded-2xl gap-2">
                {importing === "pricing" ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando tabela…</> : <><DollarSign className="h-4 w-4" />Anexar tabela de preços de custo</>}
              </Button>
            </div>

            {(["catalog", "pricing"] as const).map((k) => {
              const list = catalogs.filter((c: any) => (c.kind ?? "catalog") === k);
              if (list.length === 0) return null;
              return (
                <div key={k} className="mt-4 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {k === "catalog" ? "Catálogos anexados" : "Tabelas de preço de custo"}
                  </div>
                  {list.map((c: any) => {
                    const statusMap: Record<string, { label: string; cls: string }> = {
                      pending: { label: "Enviado", cls: "bg-slate-500/15 text-slate-600" },
                      splitting: { label: "Dividindo para processamento", cls: "bg-blue-500/15 text-blue-600" },
                      processing: { label: "Extraindo informações", cls: "bg-blue-500/15 text-blue-600" },
                      extracting: { label: "Extraindo informações", cls: "bg-blue-500/15 text-blue-600" },
                      consolidating: { label: "Consolidando produtos", cls: "bg-blue-500/15 text-blue-600" },
                      completed: { label: "Concluído", cls: "bg-emerald-500/15 text-emerald-600" },
                      failed: { label: "Erro no processamento", cls: "bg-rose-500/15 text-rose-600" },
                    };
                    const st = statusMap[c.processing_status] ?? statusMap.completed;
                    const busy = ["pending", "splitting", "processing", "extracting", "consolidating"].includes(c.processing_status);
                    const progress = c.total_pages ? Math.round((c.processed_pages / c.total_pages) * 100) : null;
                    return (
                      <div key={c.id} className="flex items-center gap-2 rounded-2xl bg-secondary/40 p-3 text-sm">
                        {k === "catalog" ? <FileText className="h-4 w-4 text-primary shrink-0" /> : <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{c.filename}</div>
                          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                            <span>{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                            <Badge className={st.cls + " font-normal"}>
                              {busy && <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />}
                              {st.label}{progress !== null && busy ? ` ${progress}%` : ""}
                            </Badge>
                            {c.processing_status === "completed" && <span>· {c.products_created} novos · {c.products_updated} atualizados</span>}
                            {c.processing_status === "failed" && c.error_message && <span className="text-rose-600">· {c.error_message}</span>}
                          </div>
                          {busy && (
                            <div className="mt-1.5 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress ?? 5}%` }} />
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => openPreview(c)}><Eye className="h-3.5 w-3.5" />Visualizar</Button>
                        <Button size="sm" variant="ghost" className="rounded-xl gap-1" onClick={() => downloadCatalog(c.storage_path, c.filename)}><Download className="h-3.5 w-3.5" />Baixar</Button>
                        <Button size="icon" variant="ghost" onClick={() => removeCatalog(c)} className="text-rose-500"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    );

                  })}
                </div>
              );
            })}
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

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-5 py-3 border-b flex-row items-center justify-between gap-3 space-y-0">
            <DialogTitle className="text-sm font-semibold truncate flex-1">{preview?.filename}</DialogTitle>
            {preview && (
              <a href={preview.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline shrink-0">Abrir em nova aba</a>
            )}
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-secondary/30">
            {preview && (preview.mime.startsWith("image/")
              ? <img src={preview.url} alt={preview.filename} className="w-full h-full object-contain" />
              : <object data={preview.url} type={preview.mime || "application/pdf"} className="w-full h-full">
                  <div className="p-6 text-sm text-muted-foreground">
                    Não foi possível exibir o arquivo aqui. <a className="text-primary underline" href={preview.url} target="_blank" rel="noreferrer">Abrir em nova aba</a>.
                  </div>
                </object>)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


