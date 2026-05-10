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

    const { supplier_id, command } = await req.json();
    if (!supplier_id || !command) return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: products } = await supabase.from("products").select("id,name,sale_price,status").eq("user_id", user.id).eq("supplier_id", supplier_id).is("deleted_at", null);

    // Use Lovable AI to interpret command
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    const tools = [{
      type: "function",
      function: {
        name: "execute",
        description: "Execute supplier command on inventory",
        parameters: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["discontinue", "rename", "update_price", "bulk_price_change", "noop"] },
            product_name: { type: "string" },
            new_name: { type: "string" },
            new_price: { type: "number" },
            percent: { type: "number", description: "for bulk_price_change, e.g. 10 for +10%, -5 for -5%" },
            message: { type: "string" },
          },
          required: ["action", "message"],
        },
      },
    }];
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `You are an inventory assistant. Available products (JSON): ${JSON.stringify(products?.map(p => ({ name: p.name, price: p.sale_price, status: p.status })) ?? [])}. Interpret user command in Portuguese and call the execute tool. Use product name fuzzy match.` },
          { role: "user", content: command },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "execute" } },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "ai error", details: t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ai = await aiRes.json();
    const args = JSON.parse(ai.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");

    let affected = 0;
    let message = args.message ?? "OK";

    if (args.action === "discontinue" && args.product_name) {
      const target = products?.find(p => p.name.toLowerCase().includes(args.product_name.toLowerCase()));
      if (target) {
        await supabase.from("products").update({ status: "discontinued" }).eq("id", target.id);
        affected = 1;
      }
    } else if (args.action === "rename" && args.product_name && args.new_name) {
      const target = products?.find(p => p.name.toLowerCase().includes(args.product_name.toLowerCase()));
      if (target) {
        await supabase.from("products").update({ name: args.new_name }).eq("id", target.id);
        affected = 1;
      }
    } else if (args.action === "update_price" && args.product_name && args.new_price) {
      const target = products?.find(p => p.name.toLowerCase().includes(args.product_name.toLowerCase()));
      if (target) {
        await supabase.from("products").update({ sale_price: args.new_price }).eq("id", target.id);
        affected = 1;
      }
    } else if (args.action === "bulk_price_change" && args.percent && products) {
      for (const p of products) {
        const np = Number(p.sale_price) * (1 + args.percent / 100);
        await supabase.from("products").update({ sale_price: np }).eq("id", p.id);
      }
      affected = products.length;
    }

    await supabase.from("supplier_commands").insert({
      user_id: user.id, supplier_id, command, result: { ...args, message }, affected_count: affected,
    });

    return new Response(JSON.stringify({ message, affected }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
