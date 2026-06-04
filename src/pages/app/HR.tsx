import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Users, Briefcase, Shield, CalendarClock, Plus, Trash2, Save, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";
import {
  PERMISSION_AREAS, PERMS_BY_AREA, PERMISSIONS,
  DEFAULT_ROLE_TEMPLATES, RoleTemplate, resolvePermissions,
} from "@/lib/permissions";

type Member = {
  id: string; name: string | null; email: string | null; role: string;
  position: string | null; area: string | null; phone: string | null;
  hire_date: string | null; salary: number | null;
  permissions: Record<string, boolean>;
};
type Template = { id?: string; name: string; area: string | null; permissions: Record<string, boolean> };
type Shift = { id?: string; member_user_id?: string | null; member_name: string | null; weekday: number; start_time: string; end_time: string };

const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

export default function HR() {
  const { user } = useAuth();
  const { isOwner } = useTenant();
  const [members, setMembers] = useState<Member[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [m, t, s] = await Promise.all([
      supabase.from("team_members").select("*").eq("owner_user_id", user.id).order("created_at"),
      supabase.from("role_templates").select("*").eq("owner_user_id", user.id).order("name"),
      supabase.from("employee_shifts").select("*").eq("owner_user_id", user.id).order("weekday").order("start_time"),
    ]);
    setMembers((m.data ?? []) as any);
    setTemplates(((t.data ?? []) as any).map((x: any) => ({
      id: x.id, name: x.name, area: x.area, permissions: x.permissions ?? {},
    })));
    setShifts((s.data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  if (!isOwner) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h1 className="text-2xl font-bold mb-2">Acesso restrito</h1>
        <p className="text-muted-foreground">Apenas o dono da conta pode acessar o RH.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-7 w-7" /> RH
        </h1>
        <p className="text-muted-foreground text-sm">
          Funcionários, cargos, permissões em 3 níveis e escalas semanais.
        </p>
      </div>

      <Tabs defaultValue="employees">
        <TabsList className="bg-secondary/40 flex-wrap h-auto">
          <TabsTrigger value="employees"><Users className="h-4 w-4 mr-1" />Funcionários</TabsTrigger>
          <TabsTrigger value="roles"><Briefcase className="h-4 w-4 mr-1" />Cargos</TabsTrigger>
          <TabsTrigger value="permissions"><Shield className="h-4 w-4 mr-1" />Permissões</TabsTrigger>
          <TabsTrigger value="shifts"><CalendarClock className="h-4 w-4 mr-1" />Escalas</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4">
          <EmployeesTab members={members} reload={load} loading={loading} />
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          <RolesTab templates={templates} reload={load} />
        </TabsContent>
        <TabsContent value="permissions" className="mt-4">
          <PermissionsTab members={members} templates={templates} reload={load} />
        </TabsContent>
        <TabsContent value="shifts" className="mt-4">
          <ShiftsTab shifts={shifts} members={members} reload={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Funcionários ---------------- */
function EmployeesTab({ members, reload, loading }: { members: Member[]; reload: () => void; loading: boolean }) {
  const update = async (m: Member, patch: Partial<Member>) => {
    const { error } = await supabase.from("team_members").update(patch as any).eq("id", m.id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Atualizado");
    reload();
  };

  return (
    <Card className="p-4 rounded-3xl border-0 shadow-sm">
      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!loading && members.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum funcionário ainda. Convide membros na página <strong>Equipe</strong>.
        </p>
      )}
      <div className="space-y-3">
        {members.map((m) => (
          <EmployeeRow key={m.id} m={m} onSave={(patch) => update(m, patch)} />
        ))}
      </div>
    </Card>
  );
}

function EmployeeRow({ m, onSave }: { m: Member; onSave: (p: Partial<Member>) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: m.name ?? "", position: m.position ?? "", area: m.area ?? "",
    phone: m.phone ?? "", hire_date: m.hire_date ?? "", salary: m.salary ?? 0,
  });

  return (
    <div className="p-3 rounded-2xl border bg-card">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-left flex-1">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <div>
            <div className="font-medium">{m.name || m.email}</div>
            <div className="text-xs text-muted-foreground">
              {m.position || m.role}{m.area ? ` · ${m.area}` : ""} · {m.email}
            </div>
          </div>
        </button>
        <Badge variant="outline" className="rounded-full">{m.role}</Badge>
      </div>
      {open && (
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Cargo (livre)</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Ex.: Atendente sênior" /></div>
          <div>
            <Label>Área</Label>
            <Select value={form.area || ""} onValueChange={(v) => setForm({ ...form, area: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{PERMISSION_AREAS.map((a) => <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Admissão</Label><Input type="date" value={form.hire_date ?? ""} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></div>
          <div><Label>Salário</Label><Input type="number" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} /></div>
          <div className="sm:col-span-2 flex justify-end">
            <Button onClick={() => onSave(form as any)} className="rounded-2xl"><Save className="h-4 w-4 mr-1" />Salvar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Cargos ---------------- */
function RolesTab({ templates, reload }: { templates: Template[]; reload: () => void }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState<Template | null>(null);

  const all: Template[] = useMemo(() => {
    const customNames = new Set(templates.map((t) => t.name.toLowerCase()));
    const defaults = DEFAULT_ROLE_TEMPLATES
      .filter((d) => !customNames.has(d.label.toLowerCase()))
      .map<Template>((d) => ({ name: d.label, area: d.area ?? null, permissions: d.permissions }));
    return [...templates, ...defaults];
  }, [templates]);

  const save = async (t: Template) => {
    if (!user) return;
    if (!t.name.trim()) return toast.error("Nome obrigatório.");
    const payload = {
      owner_user_id: user.id, name: t.name.trim(),
      area: t.area || null, permissions: t.permissions,
    };
    const { error } = t.id
      ? await supabase.from("role_templates").update(payload as any).eq("id", t.id)
      : await supabase.from("role_templates").insert(payload as any);
    if (error) return toast.error(friendlyError(error));
    toast.success("Cargo salvo");
    setEditing(null);
    reload();
  };

  const remove = async (t: Template) => {
    if (!t.id) return toast.info("Esse é um cargo padrão e não pode ser removido.");
    if (!confirm("Remover este cargo?")) return;
    await supabase.from("role_templates").delete().eq("id", t.id);
    reload();
  };

  return (
    <Card className="p-4 rounded-3xl border-0 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Cargos padrão vêm prontos. Crie ou personalize para sua empresa.
        </p>
        <Button className="rounded-2xl" onClick={() => setEditing({ name: "", area: null, permissions: {} })}>
          <Plus className="h-4 w-4 mr-1" />Novo cargo
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {all.map((t, i) => (
          <div key={(t.id ?? "def-") + i} className="p-3 rounded-2xl border bg-card flex items-center justify-between">
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-muted-foreground">
                {t.area ?? "Sem área"} · {Object.values(t.permissions).filter(Boolean).length} permissões
                {!t.id && <Badge variant="secondary" className="ml-2 text-[10px]">padrão</Badge>}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing({ ...t })}>Editar</Button>
              {t.id && <Button size="sm" variant="ghost" onClick={() => remove(t)}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar cargo" : "Novo cargo"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Nome</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div>
                  <Label>Área principal</Label>
                  <Select value={editing.area ?? ""} onValueChange={(v) => setEditing({ ...editing, area: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{PERMISSION_AREAS.map((a) => <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <PermissionMatrix
                permissions={editing.permissions}
                onChange={(perms) => setEditing({ ...editing, permissions: perms })}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => editing && save(editing)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------------- Matriz de permissões (Cargo → Área → Permissão) ---------------- */
function PermissionMatrix({
  permissions, onChange,
}: { permissions: Record<string, boolean>; onChange: (p: Record<string, boolean>) => void }) {
  const setKey = (k: string, v: boolean) => onChange({ ...permissions, [k]: v });
  const toggleArea = (areaKey: string, v: boolean) => {
    const next = { ...permissions };
    PERMS_BY_AREA[areaKey]?.forEach((p) => { next[p.key] = v; });
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {PERMISSION_AREAS.map((a) => {
        const items = PERMS_BY_AREA[a.key] ?? [];
        const total = items.length;
        const on = items.filter((p) => permissions[p.key]).length;
        const allOn = on === total && total > 0;
        return (
          <div key={a.key} className="rounded-2xl border bg-card">
            <div className="flex items-center justify-between p-3 border-b bg-secondary/30">
              <div>
                <div className="font-medium">{a.label}</div>
                <div className="text-xs text-muted-foreground">{on}/{total} permissões</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Toda área</span>
                <Switch checked={allOn} onCheckedChange={(v) => toggleArea(a.key, v)} />
              </div>
            </div>
            <div className="p-3 grid sm:grid-cols-2 gap-2">
              {items.map((p) => (
                <label key={p.key} className="flex items-center justify-between text-sm gap-2 p-2 rounded-xl hover:bg-secondary/40">
                  <span>{p.label}</span>
                  <Switch checked={!!permissions[p.key]} onCheckedChange={(v) => setKey(p.key, v)} />
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Permissões (override por usuário) ---------------- */
function PermissionsTab({
  members, templates, reload,
}: { members: Member[]; templates: Template[]; reload: () => void }) {
  const [selectedId, setSelectedId] = useState<string>(members[0]?.id ?? "");
  useEffect(() => { if (!selectedId && members[0]) setSelectedId(members[0].id); }, [members]);
  const member = members.find((m) => m.id === selectedId);

  // Tenta resolver template pelo role/position
  const allTemplates: Template[] = useMemo(() => {
    const map = new Map<string, Template>();
    DEFAULT_ROLE_TEMPLATES.forEach((d) =>
      map.set(d.label.toLowerCase(), { name: d.label, area: d.area ?? null, permissions: d.permissions })
    );
    templates.forEach((t) => map.set(t.name.toLowerCase(), t));
    return Array.from(map.values());
  }, [templates]);

  const tpl = useMemo(() => {
    if (!member) return undefined;
    return allTemplates.find(
      (t) => t.name.toLowerCase() === (member.position ?? "").toLowerCase()
        || t.name.toLowerCase() === member.role.toLowerCase()
    );
  }, [member, allTemplates]);

  const effective = useMemo(
    () => resolvePermissions(tpl?.permissions, member?.permissions),
    [tpl, member]
  );

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  useEffect(() => { setOverrides(member?.permissions ?? {}); }, [selectedId, member?.id]);

  const save = async () => {
    if (!member) return;
    const { error } = await supabase
      .from("team_members")
      .update({ permissions: overrides as any })
      .eq("id", member.id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Permissões salvas");
    reload();
  };

  const applyTemplate = (slug: string) => {
    const t = allTemplates.find((x) => x.name === slug);
    if (!t) return;
    setOverrides(t.permissions);
  };

  if (!member) return (
    <Card className="p-6 text-sm text-muted-foreground">
      Nenhum funcionário cadastrado. Convide alguém em <strong>Equipe</strong> primeiro.
    </Card>
  );

  return (
    <Card className="p-4 rounded-3xl border-0 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label>Funcionário</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name || m.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px]">
          <Label>Aplicar cargo</Label>
          <Select onValueChange={applyTemplate}>
            <SelectTrigger><SelectValue placeholder={tpl?.name ?? "Escolher template…"} /></SelectTrigger>
            <SelectContent>
              {allTemplates.map((t) => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button className="rounded-2xl ml-auto mt-5" onClick={save}>
          <Save className="h-4 w-4 mr-1" />Salvar overrides
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        Hierarquia: <strong>Cargo</strong> ({tpl?.name ?? "—"}) → <strong>Área</strong> → <strong>Usuário</strong>.
        Toggles abaixo aplicam override individual; vazios herdam do cargo.
      </div>

      <PermissionMatrix permissions={overrides} onChange={setOverrides} />

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Ver permissões efetivas resolvidas ({Object.values(effective).filter(Boolean).length})</summary>
        <div className="mt-2 flex flex-wrap gap-1">
          {PERMISSIONS.filter((p) => effective[p.key]).map((p) => (
            <Badge key={p.key} variant="outline" className="text-[10px]">{p.label}</Badge>
          ))}
        </div>
      </details>
    </Card>
  );
}

/* ---------------- Escalas ---------------- */
function ShiftsTab({ shifts, members, reload }: { shifts: Shift[]; members: Member[]; reload: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState<Shift>({
    member_user_id: null, member_name: "", weekday: 1, start_time: "09:00", end_time: "18:00",
  });

  const add = async () => {
    if (!user) return;
    if (!form.member_name?.trim()) return toast.error("Informe o nome.");
    if (form.start_time >= form.end_time) return toast.error("Horário final deve ser após o inicial.");
    const { error } = await supabase.from("employee_shifts").insert({
      owner_user_id: user.id,
      member_user_id: form.member_user_id || null,
      member_name: form.member_name.trim(),
      weekday: form.weekday,
      start_time: form.start_time,
      end_time: form.end_time,
    } as any);
    if (error) return toast.error(friendlyError(error));
    toast.success("Escala adicionada");
    setForm({ ...form, member_name: "" });
    reload();
  };

  const remove = async (id: string) => {
    await supabase.from("employee_shifts").delete().eq("id", id);
    reload();
  };

  const onMember = (id: string) => {
    const m = members.find((x) => x.id === id);
    setForm({ ...form, member_user_id: id, member_name: m?.name || m?.email || "" });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 rounded-3xl border-0 shadow-sm">
        <h2 className="font-semibold mb-3">Nova escala</h2>
        <div className="grid sm:grid-cols-5 gap-3">
          <div className="sm:col-span-2">
            <Label>Funcionário</Label>
            <Select onValueChange={onMember}>
              <SelectTrigger><SelectValue placeholder="Selecione ou digite abaixo" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name || m.email}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              className="mt-2"
              placeholder="Ou nome livre"
              value={form.member_name ?? ""}
              onChange={(e) => setForm({ ...form, member_name: e.target.value, member_user_id: null })}
            />
          </div>
          <div>
            <Label>Dia</Label>
            <Select value={String(form.weekday)} onValueChange={(v) => setForm({ ...form, weekday: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{WEEKDAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Início</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
          <div><Label>Fim</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
        </div>
        <div className="flex justify-end mt-3">
          <Button onClick={add} className="rounded-2xl"><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
        </div>
      </Card>

      <Card className="p-4 rounded-3xl border-0 shadow-sm">
        <h2 className="font-semibold mb-3">Agenda semanal</h2>
        {shifts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem escalas cadastradas ainda.</p>
        ) : (
          <div className="grid sm:grid-cols-7 gap-3">
            {WEEKDAYS.map((d, i) => {
              const items = shifts.filter((s) => s.weekday === i);
              return (
                <div key={i} className="rounded-2xl border p-2 bg-secondary/20">
                  <div className="font-semibold text-sm mb-2 text-center">{d}</div>
                  <div className="space-y-1">
                    {items.length === 0 && <p className="text-[11px] text-center text-muted-foreground">—</p>}
                    {items.map((s) => (
                      <div key={s.id} className="text-xs p-2 rounded-xl bg-card border flex flex-col">
                        <span className="font-medium truncate">{s.member_name}</span>
                        <span className="text-muted-foreground">{s.start_time.slice(0,5)} – {s.end_time.slice(0,5)}</span>
                        <button onClick={() => s.id && remove(s.id)} className="self-end mt-1 text-rose-500 hover:underline text-[10px]">remover</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
