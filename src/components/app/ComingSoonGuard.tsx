import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { isComingSoon } from "@/lib/comingSoon";
import { useDevMode } from "@/hooks/useDevMode";
import { useTenant } from "@/hooks/useTenant";
import ComingSoon from "@/pages/app/ComingSoon";

/**
 * Renders the underlying page when:
 *  - the route isn't marked as "coming soon", OR
 *  - the user is Admin Master AND has Dev Mode enabled.
 * Otherwise renders the friendly "Em breve" screen.
 */
export function ComingSoonGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { devMode } = useDevMode();
  const { isSuperAdmin } = useTenant();

  // Apenas o Super Admin Optimio com Modo Desenvolvedor ligado acessa módulos em breve.
  if (isComingSoon(pathname) && !(isSuperAdmin && devMode)) {
    return <ComingSoon />;
  }
  return <>{children}</>;
}

export default ComingSoonGuard;
