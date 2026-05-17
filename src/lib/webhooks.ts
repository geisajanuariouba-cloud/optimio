import { supabase } from "@/integrations/supabase/client";

// Dispara um POST simples para a URL de webhook configurada em integrations (provider='make').
// Nunca lança — é fire-and-forget para não atrapalhar a UX.
export async function fireMakeWebhook(event: string, payload: Record<string, any>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("integrations")
      .select("config,status")
      .eq("user_id", user.id)
      .eq("provider", "make")
      .maybeSingle();
    const url = (data?.config as any)?.webhook_url;
    if (!url || data?.status !== "connected") return;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, at: new Date().toISOString(), payload }),
      mode: "no-cors",
    });
  } catch {
    /* silent */
  }
}
