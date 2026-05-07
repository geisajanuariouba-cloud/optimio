import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Globe, Eye, Plus, Trash2, GripVertical, Layout, Image as Img, Type, Calendar, ShoppingCart, Sparkles, Send, Download, Bot } from "lucide-react";

type Section = { id: string; type: "hero" | "services" | "booking" | "products" | "text"; data: Record<string, any> };
type Site = { id: string; slug: string; title: string; sections: Section[]; published: boolean; theme: any };
type Msg = { role: "user" | "assistant"; content: string };

const TYPE_LABELS: Record<Section["type"], { label: string; icon: any }> = {
  hero: { label: "Hero", icon: Img },
  services: { label: "Serviços", icon: Layout },
  booking: { label: "Agendamento", icon: Calendar },
  products: { label: "Produtos", icon: ShoppingCart },
  text: { label: "Texto", icon: Type },
};

export default function SiteBuilder() {
  const { user } = useAuth();
  const { profile } = useTenant();
  const [site, setSite] = useState<Site | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [chat, setChat] = useState<Msg[]>([{ role: "assistant", content: "Olá! Descreva sua loja: estilo (ex.: Old Money, minimalista), cores, nicho e produtos principais. Eu monto a paleta, fontes e seções." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [proposed, setProposed] = useState<any | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }); }, [chat]);

  const load = async () => {
    if (!user) return;
    const { data: s } = await supabase.from("sites").select("*").eq("user_id", user.id).maybeSingle();
    if (s) setSite({ ...s, sections: (s.sections as any) ?? [] });
    const { data: o } = await supabase.from("site_orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    setOrders(o ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const create = async () => {
    if (!user) return;
    const slug = `${(user.email ?? "site").split("@")[0]}-${Math.random().toString(36).slice(2, 6)}`.toLowerCase();
    const { data, error } = await supabase.from("sites").insert({
      user_id: user.id, slug, title: "Meu Site",
      sections: [{ id: crypto.randomUUID(), type: "hero", data: { title: "Bem-vindo", subtitle: "Agende seu horário online" } }] as any,
    }).select().single();
    if (error) return toast.error(error.message);
    setSite({ ...data, sections: data.sections as any });
  };

  const save = async () => {
    if (!site) return;
    const { error } = await supabase.from("sites").update({ title: site.title, sections: site.sections as any, published: site.published, theme: site.theme }).eq("id", site.id);
    if (error) toast.error(error.message); else toast.success("Site salvo");
  };

  const addSection = (type: Section["type"]) => {
    if (!site) return;
    const defaults: Record<Section["type"], any> = {
      hero: { title: "Título principal", subtitle: "Subtítulo" },
      services: { title: "Nossos serviços" },
      booking: { title: "Agende agora" },
      products: { title: "Produtos" },
      text: { content: "Texto livre…" },
    };
    setSite({ ...site, sections: [...site.sections, { id: crypto.randomUUID(), type, data: defaults[type] }] });
  };

  const updateSection = (id: string, data: any) => site && setSite({ ...site, sections: site.sections.map(s => s.id === id ? { ...s, data: { ...s.data, ...data } } : s) });
  const removeSection = (id: string) => site && setSite({ ...site, sections: site.sections.filter(s => s.id !== id) });

  const sendChat = async () => {
    if (!input.trim()) return;
    const next = [...chat, { role: "user" as const, content: input }];
    setChat(next); setInput(""); setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("site-builder-ai", { body: { brief: input, niche: profile?.niche ?? "retail" } });
      if (error) throw error;
      const theme = data.theme;
      setProposed(theme);
      setChat([...next, { role: "assistant", content: `Pronto! Tema "${theme.name ?? "Sugerido"}" gerado. Cores: ${Object.values(theme.palette ?? {}).slice(0, 4).join(", ")}. Fontes: ${theme.font_pair?.heading} / ${theme.font_pair?.body}. Veja a prévia ao lado e clique em "Aplicar".` }]);
    } catch (e: any) {
      setChat([...next, { role: "assistant", content: "Erro: " + e.message }]);
    } finally { setBusy(false); }
  };

  const applyTheme = () => {
    if (!site || !proposed) return;
    const sections: Section[] = (proposed.sections ?? []).map((s: any) => ({ id: crypto.randomUUID(), type: s.type ?? "text", data: { ...s } }));
    setSite({ ...site, theme: proposed, sections: sections.length ? sections : site.sections });
    toast.success("Tema aplicado — clique em Salvar.");
  };

  const exportShopify = () => {
    if (!proposed) return toast.error("Gere um tema primeiro.");
    const blob = new Blob([JSON.stringify(proposed, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "optimio-shopify-theme.json"; a.click();
    URL.revokeObjectURL(url);
  };

  if (!site) return (
    <div>
      <PageHeader title="Site Builder" description="Crie seu site de vendas e agendamentos integrado." />
      <Card className="rounded-3xl border-0 shadow-sm p-12 text-center">
        <Globe className="h-12 w-12 mx-auto text-primary mb-4" />
        <h3 className="text-xl font-semibold mb-2">Crie seu primeiro site</h3>
        <p className="text-muted-foreground mb-6">Vendas e agendamentos caem direto no Optimio.</p>
        <Button onClick={create} className="bg-gradient-brand text-white border-0 rounded-2xl">Criar site</Button>
      </Card>
    </div>
  );

  const publicUrl = `${window.location.origin}/s/${site.slug}`;
  const palette = proposed?.palette ?? site.theme?.palette;

  return (
    <div>
      <PageHeader title="Site Builder · A Oficina" description={`URL pública: ${publicUrl}`} />

      <div className="grid lg:grid-cols-[360px_1fr_320px] gap-6">
        {/* CHAT IA */}
        <Card className="rounded-3xl border-0 shadow-sm flex flex-col h-[640px] overflow-hidden">
          <div className="p-4 border-b bg-gradient-brand text-white flex items-center gap-2">
            <Bot className="h-5 w-5" /><span className="font-semibold">A Oficina (IA)</span>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {chat.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{m.content}</div>
              </div>
            ))}
            {busy && <div className="text-xs text-muted-foreground">criando…</div>}
          </div>
          {proposed && (
            <div className="p-3 border-t space-y-2 bg-secondary/30">
              <div className="flex gap-1">
                {Object.entries(proposed.palette ?? {}).slice(0, 5).map(([k, v]) => (
                  <div key={k} title={k} className="h-6 flex-1 rounded" style={{ background: v as string }} />
                ))}
              </div>
              <div className="text-xs text-muted-foreground">{proposed.font_pair?.heading} · {proposed.font_pair?.body}</div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" onClick={applyTheme} className="bg-gradient-brand text-white border-0 rounded-xl gap-1"><Sparkles className="h-3 w-3" />Aplicar</Button>
                <Button size="sm" variant="outline" onClick={exportShopify} className="rounded-xl gap-1"><Download className="h-3 w-3" />Shopify</Button>
              </div>
            </div>
          )}
          <div className="p-3 border-t flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder="Ex: Old money, creme e dourado…" />
            <Button onClick={sendChat} disabled={busy} size="icon" className="bg-gradient-brand text-white border-0"><Send className="h-4 w-4" /></Button>
          </div>
        </Card>

        {/* EDITOR */}
        <Card className="rounded-3xl border-0 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <Input value={site.title} onChange={(e) => setSite({ ...site, title: e.target.value })} className="text-xl font-bold bg-secondary/40 border-0 flex-1 min-w-[180px]" />
            <div className="flex items-center gap-2"><Switch checked={site.published} onCheckedChange={(v) => setSite({ ...site, published: v })} /><Label className="text-sm">Publicado</Label></div>
            <Button onClick={save} className="bg-gradient-brand text-white border-0 rounded-2xl">Salvar</Button>
          </div>

          {/* PREVIEW INTERNO */}
          <div className="rounded-2xl overflow-hidden border border-border mb-6" style={palette ? { background: palette.bg, color: palette.text } : {}}>
            {site.sections.map((s, i) => (
              <div key={s.id} className="p-6 border-b border-border/40" style={palette && i === 0 ? { background: palette.surface } : {}}>
                {s.type === "hero" && <><h2 className="text-3xl font-bold mb-2" style={palette ? { color: palette.primary } : {}}>{s.data.title}</h2><p className="opacity-80">{s.data.subtitle}</p></>}
                {s.type !== "hero" && s.type !== "text" && <h3 className="text-xl font-semibold" style={palette ? { color: palette.accent } : {}}>{s.data.title}</h3>}
                {s.type === "text" && <p className="text-sm opacity-80">{s.data.content}</p>}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {site.sections.map(s => {
              const T = TYPE_LABELS[s.type];
              return (
                <Card key={s.id} className="p-4 border border-border rounded-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <T.icon className="h-4 w-4 text-primary" /><span className="font-medium text-sm">{T.label}</span>
                    <Button size="icon" variant="ghost" onClick={() => removeSection(s.id)} className="ml-auto"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  {(s.type === "hero" || s.type === "services" || s.type === "booking" || s.type === "products") && (
                    <div className="space-y-2">
                      <Input placeholder="Título" value={s.data.title ?? ""} onChange={(e) => updateSection(s.id, { title: e.target.value })} />
                      {s.type === "hero" && <Input placeholder="Subtítulo" value={s.data.subtitle ?? ""} onChange={(e) => updateSection(s.id, { subtitle: e.target.value })} />}
                    </div>
                  )}
                  {s.type === "text" && <Textarea value={s.data.content ?? ""} onChange={(e) => updateSection(s.id, { content: e.target.value })} />}
                </Card>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {(Object.keys(TYPE_LABELS) as Section["type"][]).map(t => (
              <Button key={t} size="sm" variant="outline" onClick={() => addSection(t)} className="rounded-xl"><Plus className="h-3 w-3 mr-1" />{TYPE_LABELS[t].label}</Button>
            ))}
          </div>
        </Card>

        {/* SIDEBAR */}
        <div className="space-y-4">
          <Card className="rounded-3xl border-0 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3"><Eye className="h-4 w-4 text-primary" /><span className="font-semibold">Pré-visualizar</span></div>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline break-all">{publicUrl}</a>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm p-5">
            <div className="font-semibold mb-3">Fila de revisão ({orders.length})</div>
            {orders.length === 0 ? <div className="text-xs text-muted-foreground">Pedidos do site aparecem aqui.</div>
              : <div className="space-y-2">{orders.map(o => (
                  <div key={o.id} className="flex items-center justify-between text-sm p-2 rounded-xl bg-secondary/40">
                    <span className="truncate">{o.customer_name ?? "Anônimo"}</span>
                    <Badge variant="outline">{o.status}</Badge>
                  </div>
                ))}</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}
