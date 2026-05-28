import { useEffect, useMemo, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Factory, Pencil, Trash2, ExternalLink, Phone, MapPin } from "lucide-react";
import { AddressFields, fullAddress } from "@/components/app/AddressFields";

const empty = { name: "", cnpj: "", contact_name: "", phone: "", email: "", catalog_url: "", notes: "", cost_fee_percent: 10, default_margin_percent: 100, default_markup_percent: 20, avg_delivery_days: 15, address_zip: "", address_street: "", address_number: "", address_complement: "", address_neighborhood: "", address_city: "", address_state: "" };

export default function Suppliers() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    const [a, b] = await Promise.all([
      supabase.from("suppliers").select("*").is("deleted_at", null).order("name"),
      supabase.from("products").select("supplier_id,id,name,status").is("deleted_at", null),
    ]);
    setList(a.data ?? []); setProducts(b.data ?? []);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ ...empty, ...s }); setOpen(true); };

  const save = async () => {
    if (!user || !form.name.trim()) return toast.error("Nome obrigatório");
    const payload: any = { ...form, user_id: user.id, full_address: fullAddress(form) };
    delete payload.catalog_url;
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    const { error } = editing
      ? await supabase.from("suppliers").update(payload).eq("id", editing.id)
      : await supabase.from("suppliers").insert(payload);
    if (error) return toast.error(friendlyError(error));
    toast.success("Fornecedor salvo"); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover fornecedor?")) return;
    await supabase.from("suppliers").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const productCount = (sid: string) => products.filter(p => p.supplier_id === sid && p.status !== "discontinued").length;
  const discontinuedCount = (sid: string) => products.filter(p => p.supplier_id === sid && p.status === "discontinued").length;

  return (
    <div>
      <PageHeader title="Fornecedores / Fábricas" description="Cadastre fábricas, importe catálogos com IA e dispare comandos por chat." actionLabel="Novo fornecedor" onAction={openNew} />
      <MetricsRow items={[
        { label: "Cadastrados", value: String(list.length), tone: "primary" },
        { label: "Produtos vinculados", value: String(products.filter(p => p.supplier_id).length), tone: "primary" },
        { label: "Fora de linha", value: String(products.filter(p => p.status === "discontinued").length), tone: "warning" },
        { label: "Sem fornecedor", value: String(products.filter(p => !p.supplier_id).length), tone: "primary" },
      ]} />

      {list.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={Factory} title="Nenhum fornecedor" description="Cadastre fábricas e vincule seus produtos para gerenciar contas a pagar e logística." actionLabel="Novo fornecedor" onAction={openNew} />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {list.map(s => (
            <Card key={s.id} className="p-5 rounded-3xl border-0 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-lg truncate">{s.name}</h3>
                  {s.cnpj && <div className="text-xs text-muted-foreground">CNPJ: {s.cnpj}</div>}
                  {s.phone && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Phone className="h-3 w-3" />{s.phone}</div>}
                  {s.full_address && <div className="text-xs text-muted-foreground flex items-start gap-1 mt-1"><MapPin className="h-3 w-3 mt-0.5" />{s.full_address}</div>}
                </div>
                <div className="flex">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-secondary/50 p-2"><div className="text-xs text-muted-foreground">Ativos</div><div className="font-bold text-primary">{productCount(s.id)}</div></div>
                <div className="rounded-2xl bg-secondary/50 p-2"><div className="text-xs text-muted-foreground">Fora linha</div><div className="font-bold text-amber-500">{discontinuedCount(s.id)}</div></div>
                <div className="rounded-2xl bg-secondary/50 p-2"><div className="text-xs text-muted-foreground">Total</div><div className="font-bold">{productCount(s.id) + discontinuedCount(s.id)}</div></div>
              </div>
              <Link to={`/app/suppliers/${s.id}`}>
                <Button variant="outline" className="w-full mt-3 rounded-2xl gap-2"><ExternalLink className="h-4 w-4" />Abrir painel + chat</Button>
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CNPJ</Label><Input value={form.cnpj ?? ""} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
              <div><Label>Contato</Label><Input value={form.contact_name ?? ""} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-primary">Motor de precificação</h4>
              <div className="text-xs text-muted-foreground leading-relaxed bg-background/60 p-3 rounded-xl space-y-1">
                <div><strong>Custo</strong> = valor da tabela de preços do fornecedor (não vai para venda).</div>
                <div><strong>Taxa de custo</strong> = só ajusta o custo se houver valor configurado (frete, impostos, etc.).</div>
                <div><strong>Margem</strong> = % de lucro desejada em cima do custo.</div>
                <div><strong>Taxa extra</strong> = % adicional (cartão, comissão, etc.).</div>
                <div className="pt-1 border-t border-border/50 mt-1.5">
                  <strong>Exemplo:</strong> Custo R$100 + Margem 100% + Taxa extra 20% = <strong className="text-primary">R$220</strong> (Lucro R$120).
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Taxa custo (%)</Label><Input type="number" step="0.1" value={form.cost_fee_percent} onChange={(e) => setForm({ ...form, cost_fee_percent: +e.target.value })} /></div>
                <div><Label className="text-xs">Margem (%)</Label><Input type="number" step="0.1" value={form.default_margin_percent} onChange={(e) => setForm({ ...form, default_margin_percent: +e.target.value })} /></div>
                <div><Label className="text-xs">Taxa extra (%)</Label><Input type="number" step="0.1" value={form.default_markup_percent} onChange={(e) => setForm({ ...form, default_markup_percent: +e.target.value })} /></div>
              </div>
              <div><Label className="text-xs">Prazo médio de entrega (dias)</Label><Input type="number" value={form.avg_delivery_days ?? ""} onChange={(e) => setForm({ ...form, avg_delivery_days: +e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground bg-secondary/40 p-3 rounded-2xl">📎 Para anexar catálogo (PDF/Excel/CSV), abra o painel do fornecedor após salvar — ele fica salvo e disponível para download a qualquer momento.</p>
            <div className="pt-2">
              <h4 className="text-sm font-semibold mb-2">Endereço da fábrica <span className="text-xs font-normal text-muted-foreground">(opcional)</span></h4>
              <AddressFields value={form} onChange={(v) => setForm({ ...form, ...v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="rounded-2xl">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
