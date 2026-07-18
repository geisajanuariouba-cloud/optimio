// Routes / module identifiers marcados como "Em breve".
// Mantenha sincronizado: rota (URL) é a chave canônica.
export const COMING_SOON_ROUTES: ReadonlySet<string> = new Set([
  "/app/suggestions",
  "/app/alerts",
  "/app/funnel",
  "/app/card-machines",
  "/app/campaigns",
  "/app/knowledge",
  "/app/start",
]);

export function isComingSoon(pathname: string): boolean {
  return COMING_SOON_ROUTES.has(pathname);
}
