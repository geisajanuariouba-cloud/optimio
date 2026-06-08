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
        .select("cost_fee_percent,default_margin_percent,default_markup_percent,auto_out_of_line")
        .eq("id", supplierId).maybeSingle();
      const cf = Number(supplier?.cost_fee_percent ?? 0);
      const mg = Number(supplier?.default_margin_percent ?? 100);
      const mk = Number(supplier?.default_markup_percent ?? 0);
      const computeSale = (finalCost: number) => +(finalCost * (1 + mg / 100) * (1 + mk / 100)).toFixed(2);

      // Carrega produtos e variações do fornecedor para matching robusto
      const { data: prods } = await supabase.from("products")
        .select("id,name,code,match_key_code,match_key_name,manual_price_override,pricing_mode")
        .eq("user_id", userId).eq("supplier_id", supplierId).is("deleted_at", null).limit(20000);
      const { data: vars } = await supabase.from("product_variations")
        .select("id,name,sku,codname,match_key_code,match_key_name,manual_price_override,pricing_mode")
        .eq("user_id", userId).eq("supplier_id", supplierId).limit(50000);

      const norm = (s?: string | null) => {
        if (!s) return "";
        return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .toLowerCase().replace(/[^a-z0-9]/g, "");
      };

      const pByCode = new Map<string, any>();
      const pByName = new Map<string, any>();
      for (const p of prods ?? []) {
        const k = p.match_key_code ?? norm(p.code);
        const n = p.match_key_name ?? norm(p.name);
        if (k) pByCode.set(k, p);
        if (n) pByName.set(n, p);
      }
      const vByCode = new Map<string, any>();
      const vByName = new Map<string, any>();
      for (const v of vars ?? []) {
        const k = v.match_key_code ?? norm(v.sku || v.codname);
        const n = v.match_key_name ?? norm(v.name);
        if (k) vByCode.set(k, v);
        if (n) vByName.set(n, v);
      }

      const syncStart = new Date().toISOString();
      let updated = 0, missed = 0, varsUpdated = 0, outOfSync = 0;
      const missedLines: string[] = [];

      for (const it of items) {
        const rawCost = num(it.cost) ?? 0;
        if (!rawCost) { missed++; continue; }
        const finalCost = +(rawCost * (1 + cf / 100)).toFixed(2);
        const suggested = computeSale(finalCost);
        const codeKey = norm(it.code);
        const nameKey = norm(it.name);

        // Match prioridade: variação por código > produto por código > variação por nome > produto por nome
        const vMatch = (codeKey && vByCode.get(codeKey)) || (nameKey && vByName.get(nameKey));
        const pMatch = (codeKey && pByCode.get(codeKey)) || (nameKey && pByName.get(nameKey));

        if (vMatch) {
          const patch: any = {
            cost: rawCost,
            final_cost_price: finalCost,
            engine_suggested_price: suggested,
            last_cost_synced_at: syncStart,
          };
          if (vMatch.manual_price_override) {
            patch.price_out_of_sync = true;
            outOfSync++;
          } else {
            patch.sale_price = suggested;
            patch.price_out_of_sync = false;
            patch.pricing_mode = "auto";
          }
          await supabase.from("product_variations").update(patch).eq("id", vMatch.id);
          varsUpdated++;
          continue;
        }
        if (pMatch) {
          const patch: any = {
            cost: rawCost,
            final_cost_price: finalCost,
            engine_suggested_price: suggested,
            last_cost_synced_at: syncStart,
            status: "active",
            out_of_line: false,
          };
          if (pMatch.manual_price_override) {
            patch.price_out_of_sync = true;
            outOfSync++;
          } else {
            patch.sale_price = suggested;
            patch.price_out_of_sync = false;
            patch.pricing_mode = "auto";
          }
          await supabase.from("products").update(patch).eq("id", pMatch.id);
          updated++;
          continue;
        }
        missed++;
        if (missedLines.length < 20) missedLines.push(String(it.code || it.name || "?"));
      }

      // Fora de linha automático (se fornecedor habilitar)
      let outOfLineMarked = 0;
      if (supplier?.auto_out_of_line) {
        try {
          const { data: c } = await supabase.rpc("mark_supplier_out_of_line", {
            _supplier_id: supplierId, _since: syncStart,
          });
          outOfLineMarked = Number(c ?? 0);
        } catch (_) { /* opcional */ }
      }

      await setStatus({
        processing_status: "completed",
        processing_stage: "concluido",
        products_updated: updated + varsUpdated,
        products_extracted: items.length,
        completed_at: new Date().toISOString(),
        partial_reason: missed || outOfSync || outOfLineMarked
          ? [
              missed && `${missed} linha(s) sem produto correspondente.`,
              outOfSync && `${outOfSync} item(ns) com preço manual ficaram fora de sincronia.`,
              outOfLineMarked && `${outOfLineMarked} produto(s) marcados como fora de linha.`,
            ].filter(Boolean).join(" ")
          : null,
      });
      await log("done", `Produtos: ${updated}, variações: ${varsUpdated}, sem match: ${missed}, fora de sync: ${outOfSync}, fora de linha: ${outOfLineMarked}. ${missedLines.length ? "Exemplos sem match: " + missedLines.join(", ") : ""}`);
      return;
    }

    // ---------- CATALOG (STAGING ONLY — não cria produtos diretos) ----------
    const { data: cats } = await supabase.from("product_categories")
      .select("id,name").eq("user_id", userId);
    const existingCatNames = (cats ?? []).map(c => c.name);

    await log("ai", "Enviando catálogo para a IA.");
    const items: any[] = await withTimeout(
      callAI(signed.signedUrl, mime, "catalog", existingCatNames),
      AI_TIMEOUT_MS, "IA"
    );
    await log("ai_done", `IA retornou ${items.length} produto(s).`);
    await setStatus({ products_extracted: items.length }, "extraindo_imagens");

    // dedup interno
    const seen = new Set<string>();
    const batch = items.filter((p: any) => {
      if (!p?.name) return false;
      const key = p.code ? `c:${String(p.code).toLowerCase()}` : `n:${String(p.name).toLowerCase()}|${(p.measurements ?? "").toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // ---------- Extração best-effort de imagens (JPEG embutido no PDF) ----------
    const imageUrls: string[] = [];
    try {
      const isPdf = mime === "application/pdf" || /\.pdf(\?|$)/i.test(storagePath);
      if (isPdf) {
        await log("imgs", "Procurando imagens embutidas no PDF.");
        const dl = await supabase.storage.from("supplier-catalogs").download(storagePath);
        if (dl.data) {
          const buf = new Uint8Array(await dl.data.arrayBuffer());
          // Scan JPEG markers FFD8...FFD9
          const found: Uint8Array[] = [];
          let i = 0;
          const max = buf.length - 4;
          while (i < max && found.length < 200) {
            if (buf[i] === 0xff && buf[i + 1] === 0xd8 && buf[i + 2] === 0xff) {
              let j = i + 2;
              while (j < max) {
                if (buf[j] === 0xff && buf[j + 1] === 0xd9) { j += 2; break; }
                j++;
              }
              const size = j - i;
              // tolera thumbnails maiores que 1KB e ignora imagens enormes (>6MB)
              if (size > 1024 && size < 6_000_000) {
                found.push(buf.slice(i, j));
              }
              i = j;
            } else {
              i++;
            }
          }
          await log("imgs_found", `${found.length} imagem(ns) candidata(s) localizada(s).`);
          for (let idx = 0; idx < Math.min(found.length, 200); idx++) {
            const path = `${userId}/${catalogId}/img-${String(idx).padStart(3, "0")}.jpg`;
            const up = await supabase.storage.from("catalog-images")
              .upload(path, found[idx], { contentType: "image/jpeg", upsert: true });
            if (!up.error) {
              const { data: pub } = supabase.storage.from("catalog-images").getPublicUrl(path);
              if (pub?.publicUrl) imageUrls.push(pub.publicUrl);
            }
          }
        }
      }
    } catch (e: any) {
      await log("imgs_err", `Extração de imagens não disponível: ${e?.message ?? e}.`);
    }

    // ---------- Alimenta fila de revisão (staging real — NÃO cria produtos) ----------
    const { data: existingHashes } = await supabase.from("products")
      .select("dedup_hash").eq("user_id", userId).not("dedup_hash", "is", null);
    const known = new Set((existingHashes ?? []).map((r: any) => r.dedup_hash));

    const ordered = [...batch].sort((a: any, b: any) => (num(a.page) ?? 0) - (num(b.page) ?? 0));
    const reviewRows = ordered.map((p: any, idx: number) => {
      const hash = `${(p.code ?? "").toString().toLowerCase()}|${p.name.toLowerCase()}|${(p.measurements ?? "").toLowerCase()}`;
      return {
        user_id: userId,
        catalog_id: catalogId,
        supplier_id: supplierId,
        source_page: num(p.page),
        proposed_name: p.name,
        proposed_code: p.code ?? null,
        proposed_category: p.category ?? null,
        proposed_image_url: imageUrls[idx] ?? null,
        proposed_measurements: {
          width: num(p.width), height: num(p.height), depth: num(p.depth),
          length_cm: num(p.length_cm), weight: num(p.weight), raw: p.measurements ?? null,
        },
        proposed_variations: p.variations ?? null,
        dedup_hash: hash,
        match_status: known.has(hash) ? "duplicate" : "new",
        review_status: "pending",
        raw_data: p,
      };
    });

    let inserted = 0;
    for (let k = 0; k < reviewRows.length; k += 200) {
      const { error: insErr } = await supabase.from("catalog_review_items")
        .insert(reviewRows.slice(k, k + 200));
      if (!insErr) inserted += Math.min(200, reviewRows.length - k);
    }

    await setStatus({
      processing_status: inserted === 0 ? "failed" : "completed",
      processing_stage: inserted === 0 ? "erro" : "concluido",
      products_created: 0,
      products_updated: 0,
      products_extracted: batch.length,
      completed_at: new Date().toISOString(),
      partial_reason: inserted > 0
        ? `${inserted} item(ns) aguardando revisão. ${imageUrls.length} imagem(ns) anexada(s). Aprove em "Revisão de Importação" para virarem produtos.`
        : null,
      error_message: inserted === 0 ? "Não foi possível extrair itens automaticamente. O catálogo continua salvo." : null,
    });
    await log("done", `Revisão: ${inserted}, imagens: ${imageUrls.length}. Tempo: ${Math.round((Date.now() - t0) / 1000)}s.`);
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
        .select("id,user_id,supplier_id,storage_path,mime,kind,parent_id")
        .eq("id", body.retry_catalog_id).maybeSingle();
      if (!cat || cat.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Catálogo não encontrado." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Se é um pai com filhos: reprocessar apenas filhos que não concluíram com sucesso
      const { data: childRows } = await supabase.from("supplier_catalogs")
        .select("id,user_id,supplier_id,storage_path,mime,kind,processing_status")
        .eq("parent_id", cat.id);
      if (childRows && childRows.length > 0) {
        const targets = childRows.filter((c: any) => ["failed", "partial", "pending", "processing", "extracting", "consolidating", "splitting"].includes(c.processing_status));
        await supabase.from("supplier_catalogs").update({
          processing_status: "processing", processing_stage: "criando_produtos",
          error_message: null, partial_reason: null, last_heartbeat_at: new Date().toISOString(),
        }).eq("id", cat.id);
        for (const ch of targets) {
          await supabase.from("supplier_catalogs").update({
            processing_status: "pending", processing_stage: "enviado",
            error_message: null, partial_reason: null, processing_logs: [],
            completed_at: null, last_heartbeat_at: new Date().toISOString(),
          }).eq("id", ch.id);
          // @ts-ignore
          EdgeRuntime.waitUntil(processCatalog(ch.id, ch.user_id, ch.supplier_id, ch.storage_path, ch.mime, (ch.kind ?? "catalog") as any, cat.id));
        }
        return new Response(JSON.stringify({ catalog_id: cat.id, status: "processing", retried: targets.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("supplier_catalogs").update({
        processing_status: "pending", processing_stage: "enviado",
        error_message: null, partial_reason: null, processing_logs: [],
        completed_at: null, last_heartbeat_at: new Date().toISOString(),
      }).eq("id", cat.id);
      // @ts-ignore
      EdgeRuntime.waitUntil(processCatalog(cat.id, cat.user_id, cat.supplier_id, cat.storage_path, cat.mime, (cat.kind ?? "catalog") as any, cat.parent_id));
      return new Response(JSON.stringify({ catalog_id: cat.id, status: "processing" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    const { supplier_id, filename, mime, storage_path, size_bytes, kind, parent_catalog_id, chunk_index, page_start, page_end } = body;
    const docKind: "catalog" | "pricing" = kind === "pricing" ? "pricing" : "catalog";
    if (!supplier_id || !storage_path) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios faltando" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isChild = !!parent_catalog_id;
    const { data: parent, error: insErr } = await supabase.from("supplier_catalogs").insert({
      user_id: user.id, supplier_id, filename: filename ?? "catalogo", storage_path,
      mime, size_bytes: size_bytes ?? null, kind: docKind,
      processing_status: "pending", processing_stage: "enviado",
      internal_only: isChild,
      parent_id: isChild ? parent_catalog_id : null,
      chunk_index: chunk_index ?? null,
      page_start: page_start ?? null,
      page_end: page_end ?? null,
    }).select("id").single();
    if (insErr || !parent) {
      return new Response(JSON.stringify({ error: "Erro ao registrar catálogo." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // @ts-ignore
    EdgeRuntime.waitUntil(processCatalog(parent.id, user.id, supplier_id, storage_path, mime, docKind, isChild ? parent_catalog_id : null));

    return new Response(JSON.stringify({ catalog_id: parent.id, status: "processing" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro inesperado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
