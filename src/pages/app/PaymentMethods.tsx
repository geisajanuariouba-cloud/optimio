import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { CreditCard, Pencil, Trash2 } from "lucide-react";

const CODE_LABELS: Record<string, string> = {
  pix_qr: "Pix QR Code", pix_chave: "Pix Chave", debito: "Débito",
  credito: "Crédito", dinheiro: "Dinheiro",
};

type PM = { id: string; code: string; label: string; installments: number; fee_percent: number; fee_fixed: number; active: boolean };

const empty = { code: "credito", label: "", installments: 1, fee_percent: 0, fee_fixed: 0, active: true };

export default function PaymentMethods() {
  const { user } = useAuth();
  const [list, setList] = useState<PM[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PM | null>(null);
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    const { data } = await supabase.from("payment_methods").select("*").order("code").order("installments");
    setList((data ?? []) as PM[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const seedDefaults = async () => {
    if (!user) return;
    const seeds = [
      { code: "pix_qr", label: "Pix QR Code", installments: 1, fee_percent: 0, fee_fixed: 0 },
      { code: "pix_chave", label: "Pix Chave", installments: 1, fee_percent: 0, fee_fixed: 0 },
      { code: "debito", label: "Débito", installments: 1, fee_percent: 1.5, fee_fixed: 0 },
      { code: "dinheiro", label: "Dinheiro", installments: 1, fee_percent: 0, fee_fixed: 0 },
      { code: "credito", label: "Crédito 1×", installments: 1, fee_percent: 3.5, fee_fixed: 0 },
      { code: "credito", label: "Crédito 2×", installments: 2, fee_percent: 4.0, fee_fixed: 0 },
      { code: "credito", label: "Crédito 3×", installments: 3, fee_percent: 4.5, fee_fixed: 0 },
    ];
    await supabase.from("payment_methods").insert(seeds.map(s => ({ ...s, user_id: user.id, active: true })));
    toast.success("Métodos padrão criados"); load();
  };

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p: PM) => {
    setEditing(p);
    setForm({ code: p.code, label: p.label, installments: p.installments, fee_percent: p.fee_percent, fee_fixed: p.fee_fixed, active: p.active });
    setOpen(true);
  };

  const save = async () => {
    if (!user || !form.label.trim()) return toast.error("Label obrigatório");
    const payload = { ...form, user_id: user.id };
    const { error } = editing
      ? await supabase.from("payment_methods").update(payload).eq("id", editing.id)
      : await supabase.from("payment_methods").insert(payload);
    if (error) return toast.error(friendlyError(error));
    toast.success("Salvo"); setOpen(false); load();
  };

  const toggle = async (p: PM) => {
    await supabase.from("payment_methods").update({ active: !p.active }).eq("id", p.id);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Remover este método?")) return;
    await supabase.from("payment_methods").delete().eq("id", id);
    load();
  };

  const totalActive = list.filter(p => p.active).length;
  const avgFee = list.length ? (list.reduce((a, p) => a + Number(p.fee_percent), 0) / list.length).toFixed(2) : "0";

  return (
    <div>
      <PageHeader title="Métodos de Pagamento" description="Cadastre formas, parcelas e taxas — refletem automaticamente nas vendas." actionLabel="Novo método" onAction={openNew}>
        {list.length === 0 && <Button variant="outline" onClick={seedDefaults}>Carregar padrões</Button>}
      </PageHeader>

      <MetricsRow items={[
        { label: "Métodos cadastrados", value: String(list.length), tone: "primary" },
        { label: "Ativos", value: String(totalActive), tone: "success" },
        { label: "Taxa média (%)", value: avgFee, tone: "primary" },
        { label: "Parcelamentos crédito", value: String(list.filter(p => p.code === "credito").length), tone: "primary" },
      ]} />

      <Card className="rounded-3xl border-0 shadow-sm divide-y divide-border">
        {list.length === 0 ? (
          <div className="p-10 text-center">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Nenhum método cadastrado.</p>
            <Button onClick={seedDefaults}>Carregar padrões (Pix, Débito, Crédito 1-3×, Dinheiro)</Button>
          </div>
        ) : list.map(p => (
          <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{p.label}</span>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full uppercase">{CODE_LABELS[p.code] ?? p.code}</span>
                {p.installments > 1 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{p.installments}×</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Taxa: <strong className="text-foreground">{p.fee_percent}%</strong>
                {p.fee_fixed > 0 && <> + R$ {Number(p.fee_fixed).toFixed(2)}</>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={p.active} onCheckedChange={() => toggle(p)} />
              <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{editing ? "Editar método" : "Novo método"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={form.code} onValueChange={(v) => setForm({ ...form, code: v, installments: v === "credito" ? form.installments : 1 })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CODE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Label *</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex.: Crédito 6×" /></div>
            {form.code === "credito" && (
              <div><Label>Parcelas</Label><Input type="number" min={1} max={24} value={form.installments} onChange={(e) => setForm({ ...form, installments: +e.target.value })} /></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Taxa (%)</Label><Input type="number" step="0.01" value={form.fee_percent} onChange={(e) => setForm({ ...form, fee_percent: +e.target.value })} /></div>
              <div><Label>Taxa fixa (R$)</Label><Input type="number" step="0.01" value={form.fee_fixed} onChange={(e) => setForm({ ...form, fee_fixed: +e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              Ativo
            </label>
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
