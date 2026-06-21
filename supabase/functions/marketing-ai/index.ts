import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: claimsErr } = await supa.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { niche, recent_posts, top_products, goal, instagram } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const system = `Você é estrategista de marketing digital para PMEs brasileiras.
Analise o histórico do cliente e sugira 5 ideias de conteúdo acionáveis (Instagram/TikTok/WhatsApp).
Cada ideia deve conter: título curto, canal recomendado, hook, legenda pronta (português, tom natural).
Quando houver Instagram, avalie bio, frequência, formatos, pontos fracos, oportunidades, horários, stories, destaques e hashtags.
Retorne JSON estrito: {"analysis":"breve diagnóstico","instagram_insights":["..."],"ideas":[{"title":"","channel":"instagram|tiktok|whatsapp|facebook|email","hook":"","caption":""}]}`;

    const user = `Nicho: ${niche ?? "geral"}
Meta: ${goal ?? "engajamento e vendas"}
Últimos posts: ${JSON.stringify((recent_posts ?? []).slice(0, 10))}
Top produtos: ${JSON.stringify((top_products ?? []).slice(0, 10))}
Instagram: ${JSON.stringify(instagram ?? {})}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: t }), { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await r.json();
    let parsed: any = {};
    try { parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = { ideas: [] }; }
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
