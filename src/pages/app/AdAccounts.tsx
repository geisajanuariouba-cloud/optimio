import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Landmark, Trash2, Pencil } from "lucide-react";

type AdAccount = {
  id: string; platform: string; business_manager_name: string | null; page_name: string | null;
  page_id: string | null; pixel_id: string | null; pixel_audience_notes: string | null; status: string;
};

const PLATFORMS = ["meta", "tiktok", "google"];
const PLATFORM_LABEL: Record<string, string> = { meta: "Meta", tiktok: "TikTok", google: "Google Ads" };
const STATUS: Record<string, string> = { active: "Ativa", banned: "Banida", warming: "Esquentando", paused: "Pausada" };
const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600",
  banned: "bg-rose-500/10 text-rose-600",
  warming: "bg-amber-500/10 text-amber-600",
  paused: "bg-secondary text-muted-foreground",
};

const empty = { platform: "meta", business_manager_name: "", page_name: "", page_id: "", pixel_id: "", pixel_audience_notes: "", status: "active" };

export default function AdAccounts() {
  const { user } = useAuth();
  const [list, setList] = useState<AdAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdAccount | null>(null);
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    const { data, error } = await supabase.from("ad_accounts" as any).select("*").is("deleted_at", null).order("created_at", { ascending: false });
    if (error) toast.error(friendlyError(error)); else setList((data ?? []) as AdAccount[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (a: AdAccount) => {
    setEditing(a);
    setForm({
      platform: a.platform, business_manager_name: a.business_manager_name ?? "", page_name: a.page_name ?? "",
      page_id: a.page_id ?? "", pixel_id: a.pixel_id ?? "", pixel_audience_notes: a.pixel_audience_notes ?? "", status: a.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!user) return;
    const payload: any = { ...form, user_id: user.id };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    const { error } = editing
      ? await supabase.from("ad_accounts" as any).update(payload).eq("id", editing.id)
      : await supabase.from("ad_accounts" as any).insert(payload);
    if (error) return toast.error(friendlyError(error));
    toast.success(editing ? "Conta atualizada" : "Conta criada");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Mover para a lixeira?")) return;
    const { error } = await supabase.from("ad_accounts" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Movido para lixeira"); load();
  };

  const activeCount = list.filter(a => a.status === "active").length;
  const bannedCount = list.filter(a => a.status === "banned").length;

  return (
    <div>
      <PageHeader title="Contas de Anúncio" description="Gerencie BM, página e pixel de cada conta usada para tráfego." actionLabel="Nova conta" onAction={openNew} />

      <MetricsRow items={[
        { label: "Total", value: String(list.length), tone: "primary" },
        { label: "Ativas", value: String(activeCount), tone: "success" },
        { label: "Banidas", value: String(bannedCount), tone: bannedCount > 0 ? "warning" : "primary" },
      ]} />

      {list.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={Landmark} title="Nenhuma conta cadastrada" description="Cadastre sua primeira BM/página/pixel para vincular às campanhas." actionLabel="Nova conta" onAction={openNew} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map(a => (
            <Card key={a.id} className="rounded-3xl border-0 shadow-sm p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{a.business_manager_name || "BM sem nome"}</div>
                  <div className="text-xs text-muted-foreground">{PLATFORM_LABEL[a.platform]}{a.page_name ? ` · ${a.page_name}` : ""}</div>
                </div>
                <Badge className={STATUS_COLOR[a.status]}>{STATUS[a.status]}</Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {a.page_id && <div>Página ID: {a.page_id}</div>}
                {a.pixel_id && <div>Pixel: {a.pixel_id}</div>}
              </div>
              {a.pixel_audience_notes && <p className="text-xs text-muted-foreground">{a.pixel_audience_notes}</p>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="rounded-2xl gap-1" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" />Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(a.id)} className="text-destructive hover:text-destructive ml-auto"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{editing ? "Editar conta" : "Nova conta de anúncio"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Plataforma</Label>
                <Select value={form.platform} onValueChange={v => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{PLATFORM_LABEL[p]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Nome do Business Manager</Label><Input value={form.business_manager_name} onChange={e => setForm({ ...form, business_manager_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Página</Label><Input value={form.page_name} onChange={e => setForm({ ...form, page_name: e.target.value })} /></div>
              <div><Label>ID da página</Label><Input value={form.page_id} onChange={e => setForm({ ...form, page_id: e.target.value })} /></div>
            </div>
            <div><Label>ID do Pixel</Label><Input value={form.pixel_id} onChange={e => setForm({ ...form, pixel_id: e.target.value })} /></div>
            <div><Label>Notas de público / pixel</Label><Textarea rows={2} value={form.pixel_audience_notes} onChange={e => setForm({ ...form, pixel_audience_notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} className="rounded-2xl">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
