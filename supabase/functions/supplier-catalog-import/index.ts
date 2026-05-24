// ============================================================================
// supplier-catalog-import — REWRITE
// Catálogo: extrai produtos + variações + medidas SEM preencher preço.
// Tabela de custo (kind=pricing): casa produto existente e preenche custo+venda.
// Sem pdf-lib (evita OOM). Uma única chamada à IA por arquivo.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const KEY = Deno.env.get("LOVABLE_API_KEY")!;

const MAX_AI_BYTES = 18 * 1024 * 1024;   // limite seguro para o gateway
const AI_TIMEOUT_MS = 110_000;           // 110s para a IA responder

// ---------- utils ----------
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} demorou demais e foi interrompido.`)), ms)),
  ]);
}
function normCat(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/s$/, "").trim();
}
function num(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function codnameOf(name: string, size?: string | null, color?: string | null): string {
  if (!name) return "";
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const base = norm(name).trim().split(/\s+/)[0]?.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() ?? "";
  const sz = size ? (String(size).match(/[0-9]+/g)?.join("") ?? "").slice(0, 4) : "";
  const co = color ? norm(color).replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() : "";
  return `${base}${sz}${co}`;
}

// ---------- schemas ----------
const variationSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    color: { type: "string" }, fabric: { type: "string" }, material: { type: "string" },
    size: { type: "string" }, model: { type: "string" }, finish: { type: "string" },
    sku: { type: "string" },
    width: { type: "number" }, height: { type: "number" }, depth: { type: "number" },
    length_cm: { type: "number" }, weight: { type: "number" },
  },
  additionalProperties: false,
};

const catalogTools = (existingCats: string[]) => [{
  type: "function",
  function: {
    name: "extract_catalog",
    description: "Extrai produtos de um catálogo de fornecedor. NÃO inferir preço.",
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
              codname: { type: "string" },
              category: { type: "string", description: `Reutilize categorias existentes quando possível: ${existingCats.join(", ") || "(nenhuma)"}` },
              description: { type: "string" },
              page: { type: "number", description: "Página do catálogo onde apareceu" },
              color: { type: "string" }, fabric: { type: "string" }, material: { type: "string" },
              size: { type: "string" }, model: { type: "string" }, finish: { type: "string" },
              width: { type: "number" }, height: { type: "number" }, depth: { type: "number" },
              length_cm: { type: "number" }, weight: { type: "number" },
              measurements: { type: "string", description: "Texto bruto das medidas caso não consiga separar" },
              variations: { type: "array", items: variationSchema },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
      },
      required: ["products"],
      additionalProperties: false,
    },
  },
}];

const pricingTools = () => [{
  type: "function",
  function: {
    name: "extract_pricing",
    description: "Extrai linhas de tabela de custo do fornecedor. Cada linha é UM produto com seu CUSTO.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              code: { type: "string" },
              name: { type: "string" },
              color: { type: "string" }, size: { type: "string" }, model: { type: "string" }, finish: { type: "string" },
              cost: { type: "number", description: "PREÇO DE CUSTO da linha (nunca preço de venda)" },
            },
            required: ["cost"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
}];

// ---------- AI call (single, streaming-free) ----------
async function callAI(signedUrl: string, mime: string, kind: "catalog" | "pricing", existingCats: string[]) {
  const isPdf = mime === "application/pdf" || /\.pdf(\?|$)/i.test(signedUrl);
  const userContent: any[] = [{ type: "text", text: kind === "catalog"
    ? "Extraia TODOS os produtos do catálogo. Capture código, nome, categoria, descrição, cor, tecido, material, tamanho, modelo, acabamento, medidas e variações. NÃO INFERIR PREÇO."
    : "Extraia cada linha de produto da tabela de CUSTO. Capture código, nome e o valor de CUSTO. Ignore impostos, totais, frete." }];
  userContent.push(isPdf
    ? { type: "file", file: { file_data: signedUrl, filename: "catalogo.pdf" } }
    : { type: "image_url", image_url: { url: signedUrl } });

  const tools = kind === "catalog" ? catalogTools(existingCats) : pricingTools();
  const fnName = kind === "catalog" ? "extract_catalog" : "extract_pricing";

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: kind === "catalog"
          ? "Você é um extrator de catálogos de móveis/varejo. NUNCA invente preço. Identifique variações (cor, tecido, modelo, acabamento, tamanho) e medidas (LxAxP, comprimento, peso). Sempre chame extract_catalog."
          : "Você é um extrator de tabelas de CUSTO. O valor é sempre o CUSTO do produto, não a venda. Sempre chame extract_pricing." },
        { role: "user", content: userContent },
      ],
      tools,
      tool_choice: { type: "function", function: { name: fnName } },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 413 || /too large|exceed|30MB/i.test(t)) throw new Error("Arquivo grande demais para a IA. Envie um PDF menor ou em partes.");
    if (res.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em alguns minutos.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error("Erro ao processar com a IA. Tente novamente.");
  }
  const j = await res.json();
  const args = JSON.parse(j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
  return kind === "catalog" ? (args.products ?? []) : (args.items ?? []);
}

// ---------- parent aggregation ----------
async function recomputeParent(parentId: string) {
  const supabase = createClient(SB_URL, SVC);
  const { data: parent } = await supabase.from("supplier_catalogs")
    .select("total_chunks").eq("id", parentId).maybeSingle();
  const { data: children } = await supabase.from("supplier_catalogs")
    .select("processing_status,products_created,products_updated,products_extracted")
    .eq("parent_id", parentId);
  if (!children) return;
  const sum = (k: string) => children.reduce((a: number, c: any) => a + (Number(c[k]) || 0), 0);
  const terminalSt = ["completed", "partial", "failed"];
  const done = children.filter((c: any) => terminalSt.includes(c.processing_status));
  const expected = parent?.total_chunks || children.length;
  const allDone = done.length >= expected;
  const anyOk = children.some((c: any) => ["completed", "partial"].includes(c.processing_status));
  const status = !allDone ? "processing" : (anyOk ? (children.some((c: any) => c.processing_status === "failed") ? "partial" : "completed") : "failed");
  await supabase.from("supplier_catalogs").update({
    processing_status: status,
    processing_stage: status === "processing" ? "criando_produtos" : (status === "completed" ? "concluido" : (status === "partial" ? "concluido_parcialmente" : "erro")),
    processed_chunks: done.length,
    products_created: sum("products_created"),
    products_updated: sum("products_updated"),
    products_extracted: sum("products_extracted"),
    last_heartbeat_at: new Date().toISOString(),
    completed_at: allDone ? new Date().toISOString() : null,
    partial_reason: status === "partial" ? "Algumas partes do PDF falharam, mas o restante foi processado." : null,
  }).eq("id", parentId);
}

// ---------- catalog processor ----------
async function processCatalog(catalogId: string, userId: string, supplierId: string, storagePath: string, mime: string, kind: "catalog" | "pricing", parentId: string | null = null) {

  const supabase = createClient(SB_URL, SVC);
  const t0 = Date.now();
  const logs: any[] = [];
  const log = async (step: string, message: string, extra: any = {}) => {
    logs.push({ at: new Date().toISOString(), step, message, ...extra });
    await supabase.from("supplier_catalogs").update({
      processing_logs: logs.slice(-80),
      last_heartbeat_at: new Date().toISOString(),
    }).eq("id", catalogId);
  };
  const setStatus = (patch: any, stage?: string) =>
    supabase.from("supplier_catalogs").update({
      ...patch,
      ...(stage ? { processing_stage: stage } : {}),
      last_heartbeat_at: new Date().toISOString(),
    }).eq("id", catalogId);

  try {
    await setStatus({ processing_status: "processing", error_message: null, partial_reason: null,
      products_created: 0, products_updated: 0, products_extracted: 0 }, "extraindo_produtos");
    await log("start", `Arquivo localizado. Tipo: ${mime || "desconhecido"}.`);

    // tamanho rápido (HEAD via signed url evitado — usamos size_bytes do registro)
    const { data: meta } = await supabase.from("supplier_catalogs").select("size_bytes").eq("id", catalogId).maybeSingle();
    if (meta?.size_bytes && meta.size_bytes > MAX_AI_BYTES) {
      await setStatus({
        processing_status: "failed",
        processing_stage: "erro",
        error_message: "Arquivo acima de 18MB. Envie um PDF mais leve ou divida em partes — o original continua salvo.",
        completed_at: new Date().toISOString(),
      });
      return;
    }

    const { data: signed } = await supabase.storage.from("supplier-catalogs").createSignedUrl(storagePath, 60 * 30);
    if (!signed?.signedUrl) throw new Error("Falha ao gerar URL interna do arquivo.");

    if (kind === "pricing") {
      await log("ai", "Enviando tabela de custo para a IA.");
      const items: any[] = await withTimeout(callAI(signed.signedUrl, mime, "pricing", []), AI_TIMEOUT_MS, "IA");
      await log("ai_done", `IA retornou ${items.length} linhas.`);

      const { data: supplier } = await supabase.from("suppliers")
        .select("cost_fee_percent,default_margin_percent,default_markup_percent")
        .eq("id", supplierId).maybeSingle();
      const cf = Number(supplier?.cost_fee_percent ?? 0);
      const mg = Number(supplier?.default_margin_percent ?? 100);
      const mk = Number(supplier?.default_markup_percent ?? 0);

      const { data: existing } = await supabase.from("products")
        .select("id,name,code")
        .eq("user_id", userId).eq("supplier_id", supplierId).is("deleted_at", null);
      const byCode = new Map((existing ?? []).filter(p => p.code).map(p => [String(p.code).toLowerCase(), p.id]));
      const byName = new Map((existing ?? []).map(p => [String(p.name).toLowerCase(), p.id]));

      let updated = 0, missed = 0;
      for (const it of items) {
        const rawCost = num(it.cost) ?? 0;
        if (!rawCost) { missed++; continue; }
        const cost = +(rawCost * (1 + cf / 100)).toFixed(2);
        const sale = +(cost * (1 + mg / 100) * (1 + mk / 100)).toFixed(2);
        const pid = (it.code && byCode.get(String(it.code).toLowerCase())) || (it.name && byName.get(String(it.name).toLowerCase()));
        if (!pid) { missed++; continue; }
        await supabase.from("products").update({ cost, sale_price: sale, status: "active" }).eq("id", pid);
        updated++;
      }
      await setStatus({
        processing_status: "completed",
        processing_stage: "concluido",
        products_updated: updated,
        products_extracted: items.length,
        completed_at: new Date().toISOString(),
        partial_reason: missed ? `${missed} linha(s) sem produto correspondente.` : null,
      });
      await log("done", `Custos aplicados: ${updated}. Sem match: ${missed}. Tempo: ${Math.round((Date.now() - t0) / 1000)}s.`);
      return;
    }

    // ---------- CATALOG ----------
    const { data: cats } = await supabase.from("product_categories")
      .select("id,name").eq("user_id", userId);
    const catMap = new Map<string, string>((cats ?? []).map(c => [normCat(c.name), c.id]));
    const existingCatNames = (cats ?? []).map(c => c.name);

    await log("ai", "Enviando catálogo para a IA.");
    const items: any[] = await withTimeout(
      callAI(signed.signedUrl, mime, "catalog", existingCatNames),
      AI_TIMEOUT_MS, "IA"
    );
    await log("ai_done", `IA retornou ${items.length} produto(s).`);
    await setStatus({ products_extracted: items.length }, "criando_produtos");

    // dedup interno
    const seen = new Set<string>();
    const batch = items.filter((p: any) => {
      if (!p?.name) return false;
      const key = p.code ? `c:${String(p.code).toLowerCase()}` : `n:${String(p.name).toLowerCase()}|${(p.measurements ?? "").toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // existentes para dedup contra o BD
    const { data: existing } = await supabase.from("products")
      .select("id,name,code").eq("user_id", userId).eq("supplier_id", supplierId).is("deleted_at", null);
    const byCode = new Map((existing ?? []).filter(p => p.code).map(p => [String(p.code).toLowerCase(), p.id]));
    const byName = new Map((existing ?? []).map(p => [String(p.name).toLowerCase(), p.id]));

    const ensureCategory = async (name?: string): Promise<{ id: string | null; label: string | null }> => {
      if (!name) return { id: null, label: null };
      const k = normCat(name);
      if (catMap.has(k)) return { id: catMap.get(k)!, label: name };
      const { data: created } = await supabase.from("product_categories")
        .insert({ user_id: userId, name: name.trim() }).select("id,name").single();
      if (created?.id) { catMap.set(k, created.id); return { id: created.id, label: created.name }; }
      return { id: null, label: name };
    };

    let created = 0, updated = 0, skipped = 0, noImage = 0;
    for (const p of batch) {
      const cat = await ensureCategory(p.category);
      const hasVar = Array.isArray(p.variations) && p.variations.length > 0;
      const pid = (p.code && byCode.get(String(p.code).toLowerCase())) || byName.get(String(p.name).toLowerCase());
      const codname = (p.codname && String(p.codname).trim()) || codnameOf(p.name, p.size, p.color);
      const baseDesc: string = p.description ?? "";
      const pageNote = p.page ? `Página ${p.page} do catálogo.` : "";
      const description = [baseDesc, pageNote].filter(Boolean).join("\n").trim() || null;

      // catálogo NÃO preenche preço
      const payload: any = {
        supplier_id: supplierId,
        status: "aguardando_tabela_custo",
        codname,
        has_variations: hasVar,
        description,
        ...(p.code ? { code: p.code } : {}),
        ...(cat.id ? { category_id: cat.id } : {}),
        ...(cat.label ? { category: cat.label } : {}),
        ...(p.measurements ? { measurements: { raw: p.measurements } } : {}),
        width: num(p.width), height: num(p.height), depth: num(p.depth),
        length_cm: num(p.length_cm), weight: num(p.weight),
      };

      let productId: string | null = null;
      if (pid) {
        await supabase.from("products").update(payload).eq("id", pid);
        productId = pid as string;
        updated++;
      } else {
        const { data: ins, error: insErr } = await supabase.from("products")
          .insert({ user_id: userId, name: p.name, stock: 0, min_stock: 0, ...payload })
          .select("id").single();
        if (insErr) { skipped++; continue; }
        productId = ins?.id ?? null;
        if (productId) {
          if (p.code) byCode.set(String(p.code).toLowerCase(), productId);
          byName.set(String(p.name).toLowerCase(), productId);
        }
        created++;
      }

      if (!productId) continue;
      noImage++; // imagens não são extraídas automaticamente do PDF nesta versão

      if (hasVar) {
        // limpa variações dessa rodada para evitar duplicidade
        await supabase.from("product_variations").delete().eq("product_id", productId);
        const rows = p.variations.map((v: any) => ({
          product_id: productId, user_id: userId, supplier_id: supplierId,
          name: v.name || [v.size, v.color, v.fabric, v.model, v.finish].filter(Boolean).join(" ") || "Variação",
          codname: codnameOf(p.name, v.size, v.color),
          sku: v.sku || null,
          color: v.color || null, fabric: v.fabric || null, material: v.material || null,
          size: v.size || null, model: v.model || null, finish: v.finish || null,
          cost: 0, sale_price: 0, stock: 0, min_stock: 0,
          width: num(v.width), height: num(v.height), depth: num(v.depth),
          length_cm: num(v.length_cm), weight: num(v.weight),
          attributes: { color: v.color, fabric: v.fabric, material: v.material, size: v.size, model: v.model, finish: v.finish },
        }));
        if (rows.length) await supabase.from("product_variations").insert(rows);
      }
    }

    const finalStatus = created + updated === 0 ? "failed" : "completed";
    await setStatus({
      processing_status: finalStatus,
      processing_stage: finalStatus === "completed" ? "concluido" : "erro",
      products_created: created,
      products_updated: updated,
      products_extracted: batch.length,
      completed_at: new Date().toISOString(),
      partial_reason: noImage > 0 && finalStatus === "completed"
        ? `Imagens não identificadas automaticamente em ${noImage} produto(s). Anexe manualmente quando quiser.` : null,
      error_message: finalStatus === "failed" ? "Não foi possível extrair produtos automaticamente. O catálogo continua salvo." : null,
    });
    await log("done", `Criados ${created}, atualizados ${updated}, ignorados ${skipped}. Tempo: ${Math.round((Date.now() - t0) / 1000)}s.`);
  } catch (e: any) {
    await supabase.from("supplier_catalogs").update({
      processing_status: "failed",
      processing_stage: "erro",
      error_message: e?.message ?? "Erro inesperado ao processar catálogo.",
      completed_at: new Date().toISOString(),
      last_heartbeat_at: new Date().toISOString(),
    }).eq("id", catalogId);
  } finally {
    if (parentId) {
      try { await recomputeParent(parentId); } catch { /* noop */ }
    }
  }
}



// ---------- HTTP ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SB_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: ures } = await userClient.auth.getUser();
    const user = ures.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const supabase = createClient(SB_URL, SVC);

    // RETRY
    if (body.retry_catalog_id) {
      const { data: cat } = await supabase.from("supplier_catalogs")
        .select("id,user_id,supplier_id,storage_path,mime,kind")
        .eq("id", body.retry_catalog_id).maybeSingle();
      if (!cat || cat.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Catálogo não encontrado." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("supplier_catalogs").update({
        processing_status: "pending", processing_stage: "enviado",
        error_message: null, partial_reason: null, processing_logs: [],
        completed_at: null, last_heartbeat_at: new Date().toISOString(),
      }).eq("id", cat.id);
      // @ts-ignore
      EdgeRuntime.waitUntil(processCatalog(cat.id, cat.user_id, cat.supplier_id, cat.storage_path, cat.mime, (cat.kind ?? "catalog") as any));
      return new Response(JSON.stringify({ catalog_id: cat.id, status: "processing" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { supplier_id, filename, mime, storage_path, size_bytes, kind } = body;
    const docKind: "catalog" | "pricing" = kind === "pricing" ? "pricing" : "catalog";
    if (!supplier_id || !storage_path) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios faltando" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: parent, error: insErr } = await supabase.from("supplier_catalogs").insert({
      user_id: user.id, supplier_id, filename: filename ?? "catalogo", storage_path,
      mime, size_bytes: size_bytes ?? null, kind: docKind,
      processing_status: "pending", processing_stage: "enviado", internal_only: false,
    }).select("id").single();
    if (insErr || !parent) {
      return new Response(JSON.stringify({ error: "Erro ao registrar catálogo." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // @ts-ignore
    EdgeRuntime.waitUntil(processCatalog(parent.id, user.id, supplier_id, storage_path, mime, docKind));

    return new Response(JSON.stringify({ catalog_id: parent.id, status: "processing" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro inesperado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
