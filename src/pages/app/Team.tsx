import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Trash2, UserPlus, Users } from "lucide-react";

const ROLES = [
  { v: "admin_master", l: "Admin Master" },
  { v: "financeiro", l: "Financeiro" },
  { v: "estoque", l: "Estoque" },
  { v: "recepcao", l: "Recepção" },
  { v: "profissional", l: "Profissional" },
  { v: "montador", l: "Montador" },
  { v: "marketing", l: "Marketing" },
  { v: "vendas", l: "Vendas" },
];

const PERMISSIONS = [
  { k: "financial.view", l: "Ver Financeiro" },
  { k: "financial.edit", l: "Editar Financeiro" },
  { k: "products.view", l: "Ver Produtos" },
  { k: "products.edit", l: "Editar Produtos" },
  { k: "sales.create", l: "Criar Vendas" },
  { k: "deliveries.update", l: "Atualizar Entregas" },
  { k: "marketing.edit", l: "Marketing" },
  { k: "settings.edit", l: "Configurações" },
];

import { useTenant } from "@/hooks/useTenant";

export default function Team() {
  const { user } = useAuth();
  const { isOwner } = useTenant();
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [plan, setPlan] = useState<{ slug: string; max: number }>({ slug: "basic", max: 1 });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", role: "recepcao", permissions: {} as Record<string, boolean> });

  const load = async () => {
    if (!user) return;
    const [m, i, sub] = await Promise.all([
      supabase.from("team_members").select("*").eq("owner_user_id", user.id).order("created_at"),
      supabase.from("team_invites").select("*").eq("owner_user_id", user.id).eq("status","pending").order("created_at"),
      supabase.from("subscriptions").select("internal_plan,plan_slug").eq("user_id", user.id).order("created_at",{ ascending: false }).limit(1).maybeSingle(),
    ]);
    setMembers(m.data ?? []);
    setInvites(i.data ?? []);
    const slug = (sub.data?.internal_plan || sub.data?.plan_slug || "basic") as string;
    const limits: Record<string, number> = { basic: 1, pro: 3, advanced: 9999 };
    setPlan({ slug, max: limits[slug] ?? 1 });
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const totalSeats = members.length + invites.length + 1; // +1 admin master (você)
  const canInvite = totalSeats < plan.max;

  const invite = async () => {
    if (!user) return;
    if (!form.email.includes("@")) return toast.error("Email inválido.");
    if (!canInvite) return toast.error(`Limite do plano ${plan.slug} atingido (${plan.max} usuários).`);
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("team_invites").insert({
      owner_user_id: user.id, email: form.email.toLowerCase().trim(), role: form.role,
      permissions: form.permissions, token, created_by: user.id,
    });
    if (error) return toast.error(friendlyError(error));
    const url = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success("Convite criado — link copiado!");
    setOpen(false); setForm({ email: "", role: "recepcao", permissions: {} });
    load();
  };

  const removeMember = async (id: string) => {
    if (!confirm("Remover este usuário da equipe?")) return;
    await supabase.from("team_members").delete().eq("id", id);
    toast.success("Usuário removido.");
    load();
  };

  const revokeInvite = async (id: string) => {
    await supabase.from("team_invites").update({ status: "revoked" }).eq("id", id);
    load();
  };

  const copyInvite = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
    toast.success("Link copiado!");
  };

  if (!isOwner) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h1 className="text-2xl font-bold mb-2">Acesso restrito</h1>
        <p className="text-muted-foreground">Apenas o dono da conta pode gerenciar a equipe.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Users className="h-7 w-7" /> Equipe</h1>
          <p className="text-muted-foreground text-sm">Plano <Badge variant="secondary">{plan.slug}</Badge> · {totalSeats} de {plan.max === 9999 ? "∞" : plan.max} usuários</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={!canInvite}><UserPlus className="h-4 w-4" /> Convidar usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Convidar novo usuário</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="usuario@email.com" /></div>
              <div>
                <Label>Cargo</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Permissões específicas</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {PERMISSIONS.map(p => (
                    <label key={p.k} className="flex items-center gap-2 text-sm p-2 rounded-lg border cursor-pointer">
                      <input type="checkbox" checked={!!form.permissions[p.k]} onChange={(e) => setForm({ ...form, permissions: { ...form.permissions, [p.k]: e.target.checked } })} />
                      {p.l}
                    </label>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={invite}>Gerar convite</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Membros ativos</h2>
        {members.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum membro além do admin master.</p> : (
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border">
                <div>
                  <div className="font-medium">{m.name || m.email}</div>
                  <div className="text-xs text-muted-foreground">{m.email} · {m.role}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeMember(m.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Convites pendentes</h2>
        {invites.length === 0 ? <p className="text-sm text-muted-foreground">Sem convites pendentes.</p> : (
          <div className="space-y-2">
            {invites.map(i => (
              <div key={i.id} className="flex items-center justify-between p-3 rounded-xl border">
                <div>
                  <div className="font-medium">{i.email}</div>
                  <div className="text-xs text-muted-foreground">{i.role} · expira em {new Date(i.expires_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyInvite(i.token)}><Copy className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => revokeInvite(i.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
