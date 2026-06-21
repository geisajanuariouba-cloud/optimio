// Hook central de visibilidade de módulos.
// ÚNICA fonte de verdade para "este módulo está ativo para o tenant atual?".
// Toda a aplicação (sidebar, topnav, dashboard, busca global, relatórios, widgets,
// permissões) deve consumir este hook em vez de espalhar checagens de `enabled_modules`.
import { useMemo } from "react";
import { useTenant } from "./useTenant";
import { MODULE_CATALOG } from "@/lib/modules";

export type ModuleVisibilityMap = Record<string, boolean>;

export type ModuleVisibility = {
  /** Mapa { moduleKey: boolean } para todos os módulos do catálogo. */
  visibility: ModuleVisibilityMap;
  /** true se o módulo está habilitado para o tenant. Chave vazia/indefinida = sempre visível. */
  isModuleVisible: (key?: string | null) => boolean;
  /** Lista de chaves de módulos habilitados (resolvido pelo tenant). */
  enabledModules: string[];
};

/**
 * Consome o `useTenant` (que já resolve admin master / plano unlimited / nicho)
 * e expõe um mapa estável de visibilidade por módulo.
 */
export function useModuleVisibility(): ModuleVisibility {
  const { hasModule, enabledModules } = useTenant();

  // Recalcula apenas quando a lista efetiva de módulos muda.
  const visibility = useMemo<ModuleVisibilityMap>(() => {
    const map: ModuleVisibilityMap = {};
    for (const m of MODULE_CATALOG) map[m.key] = hasModule(m.key);
    return map;
    // hasModule é estável em relação a enabledModules + flags do tenant.
  }, [hasModule, enabledModules]);

  const isModuleVisible = useMemo(
    () => (key?: string | null) => !key || hasModule(key),
    [hasModule]
  );

  return { visibility, isModuleVisible, enabledModules };
}

export default useModuleVisibility;
