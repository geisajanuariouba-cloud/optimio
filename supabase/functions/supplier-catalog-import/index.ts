import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(SB_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: ures } = await userClient.auth.getUser();
    const user = ures.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(SB_URL, SVC);

    const { supplier_id, filename, mime, file_base64 } = await req.json();
    if (!supplier_id || !file_base64) return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const KEY = Deno.env.get("LOVABLE_API_KEY");
    const tools = [{
      type: "function",
      function: {
        name: "extract_products",
        description: "Extract products from a supplier price list",
        parameters: {
          type: "object",
          properties: {
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  sale_price: { type: "number" },
                  cost: { type: "number" },
                  category: { type: "string" },
                },
                required: ["name", "sale_price"],
                additionalProperties: false,
              },
            },
          },
          required: ["products"],
          additionalProperties: false,
        },
      },
    }];

    const userMessage = mime?.startsWith("image/") || mime === "application/pdf"
      ? [
          { type: "text", text: "Extraia TODOS os produtos com nome e preço de venda desta tabela de preços. Se houver custo e categoria, inclua. Retorne via tool call." },
          { type: "image_url", image_url: { url: `data:${mime};base64,${file_base64}` } },
        ]
      : [{ type: "text", text: `Tabela de preços (texto): \n${atob(file_base64).slice(0, 50000)}\n\nExtraia TODOS os produtos com nome e preço de venda. Retorne via tool call.` }];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "Você é um extrator de catálogos. Sempre chame a tool extract_products." },
          { role: "user", content: userMessage as any },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "extract_products" } },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "ai error", details: t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ai = await aiRes.json();
    const args = JSON.parse(ai.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    const incoming: any[] = args.products ?? [];

    const { data: existing } = await supabase.from("products").select("id,name").eq("user_id", user.id).is("deleted_at", null);
    const byName = new Map((existing ?? []).map(p => [p.name.toLowerCase(), p.id]));

    let created = 0, updated = 0;
    for (const p of incoming) {
      const id = byName.get(p.name.toLowerCase());
      if (id) {
        await supabase.from("products").update({ sale_price: p.sale_price, supplier_id, ...(p.cost ? { cost: p.cost } : {}), ...(p.category ? { category: p.category } : {}) }).eq("id", id);
        updated++;
      } else {
        await supabase.from("products").insert({ user_id: user.id, name: p.name, sale_price: p.sale_price, cost: p.cost ?? 0, category: p.category ?? null, supplier_id, status: "active", stock: 0, min_stock: 0 });
        created++;
      }
    }

    return new Response(JSON.stringify({ created, updated, total: incoming.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
