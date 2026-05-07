const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { brief, niche } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");

    const sys = `Você é um diretor de arte. Responda APENAS um JSON válido com este formato:
{"name":"...","description":"...","palette":{"bg":"#hex","surface":"#hex","primary":"#hex","accent":"#hex","text":"#hex"},"font_pair":{"heading":"Nome","body":"Nome"},"sections":[{"type":"hero","title":"...","subtitle":"..."},{"type":"products","title":"..."},{"type":"text","content":"..."}],"shopify_theme":{"settings_data":{}}}
Nichos comuns: beauty, retail, fashion, education. Considere o nicho: ${niche}.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: brief },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: t }), { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const data = await r.json();
    const text = data.choices?.[0]?.message?.content ?? "{}";
    let theme: any;
    try { theme = JSON.parse(text); } catch { theme = { raw: text }; }
    return new Response(JSON.stringify({ theme }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
