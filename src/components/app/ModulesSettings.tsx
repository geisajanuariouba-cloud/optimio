import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Lock, Search, Puzzle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";
import {
  MODULE_CATALOG,
  MODULE_GROUPS,
  MODULE_MAP,
  expandWithDeps,
  removeWithDependents,
} from "@/lib/modules";

export default function ModulesSettings() {
  const { user } = useAuth();
  const { profile, refresh } = useTenant();
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!profile) return;
    const initial = profile.enabled_modules?.length
      ? profile.enabled_modules
      : MODULE_CATALOG.filter((m) => m.locked).map((m) => m.key);
    setEnabled(new Set(expandWithDeps(initial)));
  }, [profile]);

  const toggle = (key: string, value: boolean) => {
    const def = MODULE_MAP[key];
    if (def?.locked) return;
    setEnabled((prev) => {
      const arr = Array.from(prev);
      if (value) {
        const next = expandWithDeps([...arr, key]);
        // Mostra deps adicionadas
        const added = next.filter((k) => !prev.has(k) && k !== key);
        if (added.length) {
          toast.info(
            `Também ativados: ${added.map((k) => MODULE_MAP[k]?.label).join(", ")}`
          );
        }
        return new Set(next);
      } else {
        const next = removeWithDependents(arr, key);
        const removed = arr.filter((k) => !next.includes(k) && k !== key);
        if (removed.length) {
          toast.info(
            `Também desativados: ${removed.map((k) => MODULE_MAP[k]?.label).join(", ")}`
          );
        }
        return new Set(next);
      }
    });
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const final = expandWithDeps(Array.from(enabled));
    const { error } = await supabase
      .from("profiles")
      .update({ enabled_modules: final } as any)
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(friendlyError(error));
    else {
      toast.success("Módulos atualizados");
      refresh();
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MODULE_CATALOG;
    return MODULE_CATALOG.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.key.includes(q)
    );
  }, [search]);

  const total = MODULE_CATALOG.length;
  const active = enabled.size;

  return (
    <div className="space-y-4">
      <Card className="p-6 rounded-3xl border-0 shadow-sm space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Puzzle className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Módulos da empresa</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Ative apenas o que sua empresa usa. Dependências são gerenciadas automaticamente.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full">
            {active} / {total} ativos
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar módulo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/50 border-0 h-11"
          />
        </div>

        <div className="space-y-6">
          {MODULE_GROUPS.map((g) => {
            const items = filtered.filter((m) => m.group === g.key);
            if (!items.length) return null;
            return (
              <div key={g.key}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {g.label}
                </h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {items.map((m) => {
                    const isOn = enabled.has(m.key);
                    const deps = m.depends ?? [];
                    return (
                      <div
                        key={m.key}
                        className={`flex items-start justify-between gap-3 p-3 rounded-2xl border transition-colors ${
                          isOn ? "bg-primary/5 border-primary/20" : "bg-secondary/30 border-transparent"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{m.label}</span>
                            {m.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                            {isOn && !m.locked && <Check className="h-3 w-3 text-primary" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {m.description}
                          </p>
                          {deps.length > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Requer: {deps.map((d) => MODULE_MAP[d]?.label ?? d).join(", ")}
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={isOn}
                          disabled={m.locked}
                          onCheckedChange={(v) => toggle(m.key, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving} className="rounded-2xl">
            {saving ? "Salvando…" : "Salvar módulos"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
