import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, CreditCard, History } from "lucide-react";

type Machine = {
  id: string; name: string; operator: string | null; plan_name: string | null;
  rates: { debit?: number; credit?: number; installments?: number }; active: boolean;
};
type Plan = { id: string; card_machine_id: string; plan_name: string; rates: any; started_at: string; ended_at: string | null };

export default function CardMachines() {
  const { tenantOwnerId } = useTenant();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", operator: "", plan_name: "", debit: 0, credit: 0, installments: 0 });
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    if (!tenantOwnerId) return;
    const [m, p] = await Promise.all([
      supabase.from("card_machines" as any).select("*").order("name"),
      supabase.from("card_machine_plans" as any).select("*").order("started_at", { ascending: false }),
    ]);
    setMachines((m.data as any) ?? []);
    setPlans((p.data as any) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantOwnerId]);

  const save = async () => {
    if (!form.name || !tenantOwnerId) return;
    const rates = { debit: Number(form.debit) || 0, credit: Number(form.credit) || 0, installments: Number(form.installments) || 0 };
    if (editId) {
      // se mudar plano, arquiva o anterior
      const cur = machines.find(x => x.id === editId);
      if (cur && cur.plan_name !== form.plan_name) {
        await supabase.from("card_machine_plans" as any).insert({
          user_id: tenantOwnerId, card_machine_id: editId, plan_name: cur.plan_name || "—", rates: cur.rates, ended_at: new Date().toISOString(),
        });
      }
      const { error } = await supabase.from("card_machines" as any).update({
        name: form.name, operator: form.operator, plan_name: form.plan_name, rates,
      }).eq("id", editId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("card_machines" as any).insert({
        user_id: tenantOwnerId, name: form.name, operator: form.operator, plan_name: form.plan_name, rates,
      });
      if (error) return toast.error(error.message);
    }
    toast.success("Salvo");
    setOpen(false); setEditId(null);
    setForm({ name: "", operator: "", plan_name: "", debit: 0, credit: 0, installments: 0 });
    load();
  };

  const edit = (m: Machine) => {
    setEditId(m.id);
    setForm({ name: m.name, operator: m.operator || "", plan_name: m.plan_name || "", debit: m.rates?.debit || 0, credit: m.rates?.credit || 0, installments: m.rates?.installments || 0 });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="h-6 w-6 text-primary" /> Maquininhas</h1>
          <p className="text-sm text-muted-foreground">Cadastro de operadora, plano e taxas. Histórico preservado a cada troca.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm({ name: "", operator: "", plan_name: "", debit: 0, credit: 0, installments: 0 }); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova maquininha</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Editar maquininha" : "Nova maquininha"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Maquininha balcão" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Operadora</Label><Input value={form.operator} onChange={e => setForm({ ...form, operator: e.target.value })} placeholder="Cielo, Stone, PagBank…" /></div>
                <div><Label>Plano atual</Label><Input value={form.plan_name} onChange={e => setForm({ ...form, plan_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Débito (%)</Label><Input type="number" step="0.01" value={form.debit} onChange={e => setForm({ ...form, debit: e.target.value })} /></div>
                <div><Label>Crédito à vista (%)</Label><Input type="number" step="0.01" value={form.credit} onChange={e => setForm({ ...form, credit: e.target.value })} /></div>
                <div><Label>Parcelado (%)</Label><Input type="number" step="0.01" value={form.installments} onChange={e => setForm({ ...form, installments: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active">
        <TabsList><TabsTrigger value="active">Ativas</TabsTrigger><TabsTrigger value="history"><History className="h-4 w-4 mr-1" />Histórico de planos</TabsTrigger></TabsList>
        <TabsContent value="active" className="space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {machines.map(m => (
              <Card key={m.id} className="cursor-pointer hover:border-primary/40" onClick={() => edit(m)}>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center justify-between">{m.name}<Badge variant="outline">{m.operator || "—"}</Badge></CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="text-muted-foreground">Plano: {m.plan_name || "—"}</div>
                  <div>Débito: <b>{m.rates?.debit ?? 0}%</b></div>
                  <div>Crédito: <b>{m.rates?.credit ?? 0}%</b></div>
                  <div>Parcelado: <b>{m.rates?.installments ?? 0}%</b></div>
                </CardContent>
              </Card>
            ))}
            {!machines.length && <div className="text-sm text-muted-foreground col-span-full text-center p-8">Nenhuma maquininha cadastrada.</div>}
          </div>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left"><tr><th className="p-3">Maquininha</th><th className="p-3">Plano</th><th className="p-3">Débito</th><th className="p-3">Crédito</th><th className="p-3">Parcelado</th><th className="p-3">Período</th></tr></thead>
                <tbody>
                  {plans.map(p => {
                    const m = machines.find(x => x.id === p.card_machine_id);
                    return (
                      <tr key={p.id} className="border-t">
                        <td className="p-3 font-medium">{m?.name || "—"}</td>
                        <td className="p-3">{p.plan_name}</td>
                        <td className="p-3">{p.rates?.debit ?? 0}%</td>
                        <td className="p-3">{p.rates?.credit ?? 0}%</td>
                        <td className="p-3">{p.rates?.installments ?? 0}%</td>
                        <td className="p-3 text-muted-foreground text-xs">{new Date(p.started_at).toLocaleDateString()} → {p.ended_at ? new Date(p.ended_at).toLocaleDateString() : "atual"}</td>
                      </tr>
                    );
                  })}
                  {!plans.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Sem histórico ainda.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
