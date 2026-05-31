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

};

type Ctx = {
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  niche: NicheConfig;
  hasModule: (m: string) => boolean;
  t: (key: string) => string;
  refresh: () => Promise<void>;
};

const C = createContext<Ctx>({ profile: null, loading: true, isAdmin: false, niche: NICHES.beauty, hasModule: () => true, t: (k) => k, refresh: async () => {} });

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setProfile(null); setIsAdmin(false); setLoading(false); return; }
    const [{ data }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    if (data) setProfile({ ...data, enabled_modules: (data.enabled_modules as string[]) ?? [], terms: (data.terms as any) ?? {}, dashboard_widgets: (data.dashboard_widgets as any) ?? {} });
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

  const value: Ctx = {
    profile, loading, isAdmin, niche,
    hasModule: (m) => enabled.includes(m),
    t: (k) => profile?.terms?.[k] ?? niche.terms[k] ?? k,
    refresh,
  };
  return <C.Provider value={value}>{children}</C.Provider>;
};

export const useTenant = () => useContext(C);
