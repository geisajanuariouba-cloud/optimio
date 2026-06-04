import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, ShoppingBag } from "lucide-react";

const PLATFORMS = [
  { value: "shopee", label: "Shopee" },
  { value: "mercado_livre", label: "Mercado Livre" },
  { value: "amazon", label: "Amazon" },
  { value: "magalu", label: "Magalu" },
];

type MK = { id: string; platform: string; name: string; status: string; last_sync_at: string | null };
type MKS = { id: string; marketplace_id: string; product_id: string; reserved: number; external_sku: string | null; external_price: number | null };
type Product = { id: string; name: string; stock: number | null; sale_price: number | null };

export default function Marketplaces() {
  const { tenantOwnerId } = useTenant();
  const [marketplaces, setMarketplaces] = useState<MK[]>([]);
  const [stock, setStock] = useState<MKS[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ platform: "shopee", name: "" });

  const load = async () => {
    if (!tenantOwnerId) return;
    const [m, s, p] = await Promise.all([
      supabase.from("marketplaces" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("marketplace_stock" as any).select("*"),
      supabase.from("products").select("id,name,stock,sale_price").eq("user_id", tenantOwnerId).is("deleted_at", null).order("name"),
    ]);
    setMarketplaces((m.data as any) ?? []);
    setStock((s.data as any) ?? []);
    setProducts((p.data as any) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantOwnerId]);

  const create = async () => {
    if (!form.name || !tenantOwnerId) return;
    const { error } = await supabase.from("marketplaces" as any).insert({
      user_id: tenantOwnerId, platform: form.platform, name: form.name, status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Marketplace criado. Integração será configurada em breve.");
    setOpen(false); setForm({ platform: "shopee", name: "" });
    load();
  };

  const totalReserved = (mkId: string) => stock.filter(s => s.marketplace_id === mkId).reduce((a, b) => a + Number(b.reserved || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingBag className="h-6 w-6 text-primary" /> Marketplaces</h1>
          <p className="text-sm text-muted-foreground">Estrutura de integração com Shopee, Mercado Livre, Amazon e Magalu. Sincronização será habilitada nas próximas ondas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Novo marketplace</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo marketplace</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Plataforma</Label>
                <Select value={form.platform} onValueChange={v => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Nome da loja</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Minha loja" /></div>
            </div>
            <DialogFooter><Button onClick={create}>Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {marketplaces.map(m => (
          <Card key={m.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                {m.name}
                <Badge variant={m.status === "connected" ? "default" : "secondary"}>{m.status === "connected" ? "Conectado" : "Pendente"}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>Plataforma: <b>{PLATFORMS.find(p => p.value === m.platform)?.label || m.platform}</b></div>
              <div>Estoque reservado: <b>{totalReserved(m.id)}</b></div>
              <div className="text-xs text-muted-foreground">Última sincronização: {m.last_sync_at ? new Date(m.last_sync_at).toLocaleString() : "—"}</div>
            </CardContent>
          </Card>
        ))}
        {!marketplaces.length && <div className="text-sm text-muted-foreground col-span-full text-center p-8">Nenhum marketplace conectado.</div>}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Visão de estoque</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left"><tr><th className="p-3">Produto</th><th className="p-3 text-right">Estoque físico</th><th className="p-3 text-right">Reservado MK</th><th className="p-3 text-right">Disponível</th></tr></thead>
            <tbody>
              {products.slice(0, 50).map(p => {
                const reserved = stock.filter(s => s.product_id === p.id).reduce((a, b) => a + Number(b.reserved || 0), 0);
                const physical = Number(p.stock || 0);
                return (
                  <tr key={p.id} className="border-t">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 text-right">{physical}</td>
                    <td className="p-3 text-right">{reserved}</td>
                    <td className="p-3 text-right font-semibold">{physical - reserved}</td>
                  </tr>
                );
              })}
              {!products.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Sem produtos.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
