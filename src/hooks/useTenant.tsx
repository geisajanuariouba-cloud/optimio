import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { NICHES, NicheKey, NicheConfig } from "@/lib/niches";

type Profile = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  niche: string;
  primary_color: string;
  secondary_color?: string | null;
  accent_color?: string | null;
  logo_url?: string | null;
  logo_palette?: string[];
  border_style: string;
  account_status: string;
  onboarding_completed: boolean;
  enabled_modules: string[];
  plan: string;
  terms: Record<string, string>;
  dashboard_widgets?: Record<string, boolean>;
  is_admin_master?: boolean;
  operational_cycle_start_day?: number;
};


type Ctx = {
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  /** Tenant (dono da conta). Para admin master = user.id; para membro = owner_user_id. */
  tenantOwnerId: string | null;
  /** true se o usuário logado é o dono da conta (não um membro convidado). */
  isOwner: boolean;
  role: string | null;
  permissions: Record<string, boolean>;
  /** Checa permissão. Owner e admin_master sempre passam. */
  can: (perm: string) => boolean;
  niche: NicheConfig;
  hasModule: (m: string) => boolean;
  t: (key: string) => string;
  refresh: () => Promise<void>;
};

const C = createContext<Ctx>({
  profile: null, loading: true, isAdmin: false,
  tenantOwnerId: null, isOwner: true, role: null, permissions: {},
  can: () => true,
  niche: NICHES.beauty, hasModule: () => true, t: (k) => k, refresh: async () => {},
});

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tenantOwnerId, setTenantOwnerId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null); setIsAdmin(false); setTenantOwnerId(null);
      setIsOwner(true); setRole(null); setPermissions({}); setLoading(false);
      return;
    }
    // 1) Verifica se este usuário é membro de alguma equipe (ativa).
    const { data: member } = await supabase
      .from("team_members")
      .select("owner_user_id, role, permissions")
      .eq("member_user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    const ownerId = member?.owner_user_id ?? user.id;
    setTenantOwnerId(ownerId);
    setIsOwner(!member);
    setRole(member?.role ?? "owner");
    setPermissions((member?.permissions as any) ?? {});

    // 2) Carrega o perfil do DONO da conta (não o do membro).
    const [{ data }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", ownerId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    if (data) setProfile({
      ...data,
      enabled_modules: (data.enabled_modules as string[]) ?? [],
      terms: (data.terms as any) ?? {},
      dashboard_widgets: (data.dashboard_widgets as any) ?? {},
      logo_palette: (data as any).logo_palette ?? [],
    });
    setIsAdmin(!!roles?.some((r: any) => r.role === "admin"));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Apply primary/secondary/accent color + border style globally
  useEffect(() => {
    const root = document.documentElement.style;
    if (profile?.primary_color) {
      root.setProperty("--primary", profile.primary_color);
      root.setProperty("--ring", profile.primary_color);
    }
    if (profile?.secondary_color) root.setProperty("--secondary", profile.secondary_color);
    if (profile?.accent_color) root.setProperty("--accent", profile.accent_color);
    if (profile?.border_style) {
      root.setProperty("--radius", profile.border_style === "sharp" ? "0.25rem" : "1rem");
    }
  }, [profile?.primary_color, profile?.secondary_color, profile?.accent_color, profile?.border_style]);


  const niche = NICHES[(profile?.niche as NicheKey) ?? "beauty"] ?? NICHES.beauty;
  const enabled = profile?.enabled_modules?.length ? profile.enabled_modules : niche.modules;

  const can = (perm: string) => {
    if (isOwner) return true;
    if (role === "admin_master") return true;
    return permissions[perm] === true;
  };

  const value: Ctx = {
    profile, loading, isAdmin,
    tenantOwnerId, isOwner, role, permissions, can,
    niche,
    hasModule: (m) => enabled.includes(m),
    t: (k) => profile?.terms?.[k] ?? niche.terms[k] ?? k,
    refresh,
  };
  return <C.Provider value={value}>{children}</C.Provider>;
};

export const useTenant = () => useContext(C);
