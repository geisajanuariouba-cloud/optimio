import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function applyPricingMotor(rawCost: number, rules: {
  cost_fee_percent?: number; default_margin_percent?: number; default_markup_percent?: number;
}) {
  const cf = Number(rules.cost_fee_percent ?? 0);
  const mg = Number(rules.default_margin_percent ?? 100);
  const mk = Number(rules.default_markup_percent ?? 0);
  const cost = rawCost * (1 + cf / 100);
  const sale = cost * (1 + mg / 100) * (1 + mk / 100);
  return { cost: +cost.toFixed(2), sale: +sale.toFixed(2) };
}

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
    if (!user) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(SB_URL, SVC);

    const { supplier_id, filename, mime, storage_path, size_bytes, kind } = await req.json();
    const docKind = kind === "pricing" ? "pricing" : "catalog";
    if (!supplier_id || !storage_path) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios faltando" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1) Signed URL para o catálogo (evita carregar bytes em memória)
    const { data: signed, error: signErr } = await supabase.storage
      .from("supplier-catalogs").createSignedUrl(storage_path, 60 * 30);
    if (signErr || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: "Falha ao gerar URL do arquivo" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2) Carregar fornecedor + categorias
    const [{ data: supplier }, { data: cats }] = await Promise.all([
      supabase.from("suppliers").select("cost_fee_percent,default_margin_percent,default_markup_percent").eq("id", supplier_id).maybeSingle(),
      supabase.from("product_categories").select("id,name").eq("user_id", user.id),
    ]);
    const rules = supplier ?? { cost_fee_percent: 0, default_margin_percent: 100, default_markup_percent: 0 };
    const existingCatNames = (cats ?? []).map(c => c.name);
    const catByName = new Map((cats ?? []).map(c => [c.name.toLowerCase(), c.id]));

    // 3) IA para extrair produtos
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    const tools = [{
      type: "function",
      function: {
        name: "extract_products",
        description: "Extrai produtos de uma tabela de preços de fornecedor",
        parameters: {
          type: "object",
          properties: {
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  code: { type: "string" },
                  cost: { type: "number", description: "Preço da tabela (CUSTO, não venda)" },
                  category: { type: "string", description: `Categorias existentes: ${existingCatNames.join(", ") || "(nenhuma)"}` },
                  description: { type: "string" },
                  measurements: { type: "string" },
                },
                required: ["name", "cost"],
                additionalProperties: false,
              },
            },
          },
          required: ["products"],
          additionalProperties: false,
        },
      },
    }];

    const isVisual = mime?.startsWith("image/") || mime === "application/pdf";
    let userMessage: any;
    if (isVisual) {
      userMessage = [
        { type: "text", text: "Extraia TODOS os produtos desta tabela de preços. O valor é o CUSTO (não venda). Inclua código, categoria e medidas quando aparecerem." },
        { type: "image_url", image_url: { url: signed.signedUrl } },
      ];
    } else {
      // Texto: baixa só o necessário
      const txtRes = await fetch(signed.signedUrl);
      const txt = (await txtRes.text()).slice(0, 50000);
      userMessage = [{ type: "text", text: `Tabela (texto):\n${txt}\n\nExtraia produtos. Valor é CUSTO. Categorias: ${existingCatNames.join(", ") || "nenhuma"}.` }];
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um extrator de catálogos. O preço é SEMPRE custo. Sempre chame extract_products." },
          { role: "user", content: userMessage },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "extract_products" } },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "Falha na IA", details: t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ai = await aiRes.json();
    const args = JSON.parse(ai.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    const incoming: any[] = args.products ?? [];

    const ensureCategory = async (name?: string): Promise<string | null> => {
      if (!name) return null;
      const key = name.toLowerCase().trim();
      const found = catByName.get(key);
      if (found) return found;
      const { data: created } = await supabase.from("product_categories")
        .insert({ user_id: user.id, name: name.trim() }).select("id").single();
      if (created?.id) { catByName.set(key, created.id); return created.id; }
      return null;
    };

    const { data: existing } = await supabase.from("products")
      .select("id,name,code").eq("user_id", user.id).is("deleted_at", null);
    const byCode = new Map((existing ?? []).filter(p => p.code).map(p => [p.code!.toLowerCase(), p.id]));
    const byName = new Map((existing ?? []).map(p => [p.name.toLowerCase(), p.id]));

    let created = 0, updated = 0;
    for (const p of incoming) {
      const rawCost = Number(p.cost ?? 0);
      const { cost, sale } = applyPricingMotor(rawCost, rules);
      const category_id = await ensureCategory(p.category);
      const id = (p.code && byCode.get(String(p.code).toLowerCase())) || byName.get(String(p.name).toLowerCase());
      const payload: any = {
        cost, sale_price: sale, supplier_id, status: "active",
        ...(p.code ? { code: p.code } : {}),
        ...(category_id ? { category_id, category: p.category } : (p.category ? { category: p.category } : {})),
        ...(p.measurements ? { measurements: { raw: p.measurements } } : {}),
      };
      if (id) {
        await supabase.from("products").update(payload).eq("id", id);
        updated++;
      } else {
        await supabase.from("products").insert({
          user_id: user.id, name: p.name, stock: 0, min_stock: 0, ...payload,
        });
        created++;
      }
    }

    await supabase.from("supplier_catalogs").insert({
      user_id: user.id, supplier_id, filename: filename ?? "catalogo", storage_path,
      mime, size_bytes: size_bytes ?? null, products_created: created, products_updated: updated,
    });

    return new Response(JSON.stringify({ created, updated, total: incoming.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro inesperado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
