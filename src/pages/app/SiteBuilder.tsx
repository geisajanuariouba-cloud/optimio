import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Globe, Eye, Plus, Trash2, GripVertical, Layout, Image as Img, Type, Calendar, ShoppingCart } from "lucide-react";

type Section = { id: string; type: "hero" | "services" | "booking" | "products" | "text"; data: Record<string, any> };
type Site = { id: string; slug: string; title: string; sections: Section[]; published: boolean; theme: any };

const TYPE_LABELS: Record<Section["type"], { label: string; icon: any }> = {
  hero: { label: "Hero", icon: Img },
  services: { label: "Serviços", icon: Layout },
  booking: { label: "Agendamento", icon: Calendar },
  products: { label: "Produtos", icon: ShoppingCart },
  text: { label: "Texto", icon: Type },
};

export default function SiteBuilder() {
  const { user } = useAuth();
  const [site, setSite] = useState<Site | null>(null);
  const [orders, setOrders] = useState<any[]>([]);

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
    const { error } = await supabase.from("sites").update({ title: site.title, sections: site.sections as any, published: site.published }).eq("id", site.id);
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

  return (
    <div>
      <PageHeader title="Site Builder" description={`URL pública: ${publicUrl}`} />

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <Card className="rounded-3xl border-0 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <Input value={site.title} onChange={(e) => setSite({ ...site, title: e.target.value })} className="text-xl font-bold bg-secondary/40 border-0" />
            <div className="flex items-center gap-2"><Switch checked={site.published} onCheckedChange={(v) => setSite({ ...site, published: v })} /><Label className="text-sm">Publicado</Label></div>
            <Button onClick={save} className="bg-gradient-brand text-white border-0 rounded-2xl">Salvar</Button>
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
                    <span>{o.customer_name ?? "Anônimo"}</span>
                    <Badge variant="outline">{o.status}</Badge>
                  </div>
                ))}</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}
