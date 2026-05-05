import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { page_type, company_name, niche, country = "Brasil", extra = "" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const titles: Record<string, string> = {
      terms: "Termos de Uso",
      privacy: "Política de Privacidade",
      refund: "Política de Reembolso",
      cookies: "Política de Cookies",
      shipping: "Política de Envio",
    };
    const title = titles[page_type] ?? "Página Legal";

    const prompt = `Gere uma ${title} completa e profissional em HTML formatado (use <h1>, <h2>, <p>, <ul>, <li>) para a empresa "${company_name}" (segmento: ${niche}, país: ${country}). ${extra}\n\nA página deve estar em conformidade com LGPD (Brasil) / GDPR quando aplicável, ser clara, em português, e incluir todas as cláusulas padrão para o segmento. Devolva APENAS o HTML, sem markdown.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um advogado digital. Responda apenas com HTML formatado, sem ```html nem comentários." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: t }), { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await r.json();
    let html = data.choices?.[0]?.message?.content ?? "";
    html = html.replace(/^```html\s*/i, "").replace(/```$/, "").trim();
    return new Response(JSON.stringify({ title, html }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
