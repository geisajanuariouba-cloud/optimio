import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_AI_BYTES = 18 * 1024 * 1024; // 18MB — margem extra sob o limite de 30MB do gateway
const CHUNK_CONCURRENCY = 3;
const CHUNK_TIMEOUT_MS = 45_000;
const JOB_TIMEOUT_MS = 105_000;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const KEY = Deno.env.get("LOVABLE_API_KEY")!;

const statusPt: Record<string, string> = {
  enviado: "enviado",
  extraindo_produtos: "extraindo produtos",
  extraindo_imagens: "extraindo imagens",
  organizando_categorias: "organizando categorias",
  cruzando_precos: "cruzando preços",
  criando_produtos: "criando produtos",
  concluido: "concluído",
  concluido_parcialmente: "concluído parcialmente",
  erro: "erro",
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} demorou demais e foi interrompido.`)), ms)),
  ]);
}

function normalizeStatus(status: string) {
  if (status === "completed") return "concluido";
  if (status === "failed") return "erro";
  if (["pending", "processing", "splitting", "extracting", "consolidating"].includes(status)) return "extraindo_produtos";
  return status;
}

function applyPricingMotor(rawCost: number, rules: any) {
  const cf = Number(rules.cost_fee_percent ?? 0);
  const mg = Number(rules.default_margin_percent ?? 100);
  const mk = Number(rules.default_markup_percent ?? 0);
  const cost = rawCost * (1 + cf / 100);
  const sale = cost * (1 + mg / 100) * (1 + mk / 100);
  return { cost: +cost.toFixed(2), sale: +sale.toFixed(2) };
}

const productTools = (existingCatNames: string[]) => [{
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

async function callAI(signedUrl: string, existingCatNames: string[]): Promise<any[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Você é um extrator de catálogos. O preço é SEMPRE custo. Sempre chame extract_products." },
        { role: "user", content: [
          { type: "text", text: "Extraia TODOS os produtos desta tabela/catálogo. O valor é o CUSTO (não venda). Inclua código, categoria e medidas quando aparecerem." },
          { type: "image_url", image_url: { url: signedUrl } },
        ] },
      ],
      tools: productTools(existingCatNames),
      tool_choice: { type: "function", function: { name: "extract_products" } },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    let msg = "Erro ao processar com a IA.";
    if (res.status === 413 || /30MB|too large|exceed/i.test(t)) msg = "Parte do catálogo está pesada demais para a IA. Reduza a qualidade do PDF.";
    else if (res.status === 429) msg = "Limite de uso da IA atingido. Tente novamente em alguns minutos.";
    else if (res.status === 402) msg = "Créditos de IA esgotados.";
    throw new Error(msg);
  }
  const j = await res.json();
  const args = JSON.parse(j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
  return args.products ?? [];
}

async function splitAndUpload(
  supabase: any,
  bytes: Uint8Array,
  targetBytes: number,
  storagePath: string,
): Promise<{ path: string; pageStart: number; pageEnd: number; pages: number }[]> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = src.getPageCount();
  const avgPerPage = bytes.length / total;
  const pagesPerChunk = Math.max(1, Math.floor(targetBytes / Math.max(avgPerPage, 1)));
  const result: { path: string; pageStart: number; pageEnd: number; pages: number }[] = [];
  let idx = 0;
  for (let i = 0; i < total; i += pagesPerChunk) {
    const end = Math.min(i + pagesPerChunk, total);
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, Array.from({ length: end - i }, (_, k) => i + k));
    pages.forEach((p) => out.addPage(p));
    const buf = await out.save();
    const path = `${storagePath}.chunks/${idx}.pdf`;
    await supabase.storage.from("supplier-catalogs").upload(path, buf, { contentType: "application/pdf", upsert: true });
    result.push({ path, pageStart: i + 1, pageEnd: end, pages: end - i });
    idx++;
  }
  return result;
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

async function processCatalog(parentId: string, userId: string, supplierId: string, storagePath: string, mime: string) {
  const supabase = createClient(SB_URL, SVC);
  const started = Date.now();
  const logs: any[] = [];
  const log = async (step: string, message: string, extra: any = {}) => {
    logs.push({ at: new Date().toISOString(), step, message, ...extra });
    await supabase.from("supplier_catalogs").update({ processing_logs: logs.slice(-80), last_heartbeat_at: new Date().toISOString() }).eq("id", parentId);
  };
  const setStatus = (patch: any, stage?: string) => supabase.from("supplier_catalogs").update({
    ...patch,
    ...(stage ? { processing_stage: stage } : {}),
    last_heartbeat_at: new Date().toISOString(),
  }).eq("id", parentId);

  try {
    await setStatus({ processing_status: "processing", error_message: null, partial_reason: null }, "extraindo_produtos");
    await log("upload_storage", "Catálogo original localizado. Iniciando leitura interna.");

    const [{ data: supplier }, { data: cats }, { data: existing }] = await Promise.all([
      supabase.from("suppliers").select("cost_fee_percent,default_margin_percent,default_markup_percent").eq("id", supplierId).maybeSingle(),
      supabase.from("product_categories").select("id,name").eq("user_id", userId),
      supabase.from("products").select("id,name,code").eq("user_id", userId).is("deleted_at", null),
    ]);
    const rules = supplier ?? { cost_fee_percent: 0, default_margin_percent: 100, default_markup_percent: 0 };
    const existingCatNames = (cats ?? []).map((c) => c.name);
    const catByName = new Map((cats ?? []).map((c) => [c.name.toLowerCase(), c.id]));
    const byCode = new Map((existing ?? []).filter((p) => p.code).map((p) => [p.code!.toLowerCase(), p.id]));
    const byName = new Map((existing ?? []).map((p) => [p.name.toLowerCase(), p.id]));

    const isPdf = mime === "application/pdf" || /\.pdf$/i.test(storagePath);
    let chunkInfos: { path: string; pageStart: number; pageEnd: number; pages: number }[];

    if (isPdf) {
      const { data: file, error: dlErr } = await supabase.storage.from("supplier-catalogs").download(storagePath);
      if (dlErr || !file) throw new Error("Erro ao ler o catálogo do armazenamento.");
      const bytes = new Uint8Array(await file.arrayBuffer());

      if (bytes.length > MAX_AI_BYTES) {
        await setStatus({ processing_status: "splitting" }, "extraindo_imagens");
        await log("ocr", "PDF grande detectado. Dividindo em partes internas invisíveis.", { bytes: bytes.length });
        chunkInfos = await splitAndUpload(supabase, bytes, MAX_AI_BYTES, storagePath);
      } else {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const tp = src.getPageCount();
        chunkInfos = [{ path: storagePath, pageStart: 1, pageEnd: tp, pages: tp }];
      }
    } else {
      chunkInfos = [{ path: storagePath, pageStart: 1, pageEnd: 1, pages: 1 }];
    }

    const totalPages = chunkInfos.reduce((s, c) => s + c.pages, 0);
    await supabase.from("supplier_catalog_chunks").delete().eq("catalog_id", parentId);
    await supabase.from("supplier_catalog_chunks").insert(chunkInfos.map((c, i) => ({
      catalog_id: parentId, user_id: userId, supplier_id: supplierId, storage_path: c.path,
      chunk_index: i, page_start: c.pageStart, page_end: c.pageEnd, pages: c.pages, status: "enviado",
    })));
    await setStatus({ total_pages: totalPages, processed_pages: 0, total_chunks: chunkInfos.length, processed_chunks: 0, products_extracted: 0, processing_status: "extracting" }, "extraindo_produtos");
    await log("ocr", "Chunks preparados para processamento paralelo.", { chunks: chunkInfos.length, totalPages });

    let extractedTotal = 0, donePages = 0, doneChunks = 0, failedChunks = 0;

    const ensureCategory = async (name?: string): Promise<string | null> => {
      if (!name) return null;
      const key = name.toLowerCase().trim();
      const found = catByName.get(key);
      if (found) return found;
      const { data: created } = await supabase.from("product_categories")
        .insert({ user_id: userId, name: name.trim() }).select("id").single();
      if (created?.id) { catByName.set(key, created.id); return created.id; }
      return null;
    };

    const persistChunk = async (items: any[]) => {
      let created = 0, updated = 0;
      for (const p of items) {
        const key = p.code ? `c:${String(p.code).toLowerCase()}` : `n:${String(p.name).toLowerCase()}|${(p.measurements ?? "").toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const rawCost = Number(p.cost ?? 0);
        const { cost, sale } = applyPricingMotor(rawCost, rules);
        const category_id = await ensureCategory(p.category);
        const pid = (p.code && byCode.get(String(p.code).toLowerCase())) || byName.get(String(p.name).toLowerCase());
        const payload: any = {
          cost, sale_price: sale, supplier_id: supplierId, status: "active",
          ...(p.code ? { code: p.code } : {}),
          ...(category_id ? { category_id, category: p.category } : (p.category ? { category: p.category } : {})),
          ...(p.measurements ? { measurements: { raw: p.measurements } } : {}),
        };
        if (pid) {
          await supabase.from("products").update(payload).eq("id", pid);
          updated++;
        } else {
          const { data: ins } = await supabase.from("products")
            .insert({ user_id: userId, name: p.name, stock: 0, min_stock: 0, ...payload })
            .select("id").single();
          if (ins?.id) {
            if (p.code) byCode.set(String(p.code).toLowerCase(), ins.id);
            byName.set(String(p.name).toLowerCase(), ins.id);
          }
          created++;
        }
      }
      return { created, updated };
    };

    await mapLimit(chunkInfos, CHUNK_CONCURRENCY, async (info, index) => {
      if (Date.now() - started > JOB_TIMEOUT_MS) throw new Error("Tempo limite atingido. Salvando o que já foi encontrado.");
      await supabase.from("supplier_catalog_chunks").update({ status: "extraindo_produtos", started_at: new Date().toISOString(), last_heartbeat_at: new Date().toISOString() }).eq("catalog_id", parentId).eq("chunk_index", index);
      try {
        const { data: signed } = await supabase.storage.from("supplier-catalogs").createSignedUrl(info.path, 60 * 30);
        if (!signed?.signedUrl) throw new Error("Falha ao gerar URL interna.");
        const items = await withTimeout(callAI(signed.signedUrl, existingCatNames), CHUNK_TIMEOUT_MS, `Chunk ${index + 1}`);
        extractedTotal += items.length;
        donePages += info.pages;
        doneChunks++;
        await supabase.from("supplier_catalog_chunks").update({
          status: "concluido", extracted_products: items, products_extracted: items.length,
          completed_at: new Date().toISOString(), last_heartbeat_at: new Date().toISOString(),
        }).eq("catalog_id", parentId).eq("chunk_index", index);
        await setStatus({ processed_pages: donePages, processed_chunks: doneChunks, products_extracted: extractedTotal }, "extraindo_produtos");
      } catch (err: any) {
        failedChunks++;
        donePages += info.pages;
        doneChunks++;
        await supabase.from("supplier_catalog_chunks").update({
          status: "erro", error_message: err?.message ?? "Erro ao extrair este trecho.", completed_at: new Date().toISOString(), last_heartbeat_at: new Date().toISOString(),
        }).eq("catalog_id", parentId).eq("chunk_index", index);
        await log("ia_parsing", "Falha em um chunk; o restante continuará.", { chunk: index + 1, error: err?.message });
        await setStatus({ processed_pages: donePages, processed_chunks: doneChunks, products_extracted: extractedTotal }, "extraindo_produtos");
      }
    });

    await setStatus({ processing_status: "consolidating" }, "organizando_categorias");
    await log("merge_final", "Consolidando produtos extraídos e removendo duplicados.");
    const { data: chunks } = await supabase.from("supplier_catalog_chunks")
      .select("extracted_products,status,error_message")
      .eq("catalog_id", parentId)
      .order("chunk_index");
    const extractedItems = (chunks ?? []).flatMap((c: any) => Array.isArray(c.extracted_products) ? c.extracted_products : []);

    const seen = new Set<string>();
    let createdTotal = 0, updatedTotal = 0;
    await setStatus({}, "cruzando_precos");
    const batch = extractedItems.filter((p: any) => {
      const key = p.code ? `c:${String(p.code).toLowerCase()}` : `n:${String(p.name).toLowerCase()}|${(p.measurements ?? "").toLowerCase()}`;
      if (!p.name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    await setStatus({ products_extracted: batch.length }, "criando_produtos");
    const persisted = await persistChunk(batch);
    createdTotal = persisted.created;
    updatedTotal = persisted.updated;

    await setStatus({
      processing_status: failedChunks ? "partial" : "completed",
      processing_stage: failedChunks ? "concluido_parcialmente" : "concluido",
      products_created: createdTotal,
      products_updated: updatedTotal,
      processed_pages: totalPages,
      processed_chunks: chunkInfos.length,
      products_extracted: batch.length,
      completed_at: new Date().toISOString(),
      partial_reason: failedChunks ? "Alguns produtos foram processados. Revise os itens restantes." : null,
    });
  } catch (e: any) {
    const { data: doneChunksData } = await supabase.from("supplier_catalog_chunks").select("extracted_products").eq("catalog_id", parentId).eq("status", "concluido");
    const recovered = (doneChunksData ?? []).flatMap((c: any) => Array.isArray(c.extracted_products) ? c.extracted_products : []);
    await supabase.from("supplier_catalogs").update({
      processing_status: recovered.length ? "partial" : "failed",
      processing_stage: recovered.length ? "concluido_parcialmente" : "erro",
      partial_reason: recovered.length ? "Alguns produtos foram processados. Revise os itens restantes." : null,
      error_message: recovered.length ? null : (e?.message ?? "Erro inesperado ao processar catálogo."),
      completed_at: new Date().toISOString(),
      last_heartbeat_at: new Date().toISOString(),
    }).eq("id", parentId);
  }
}

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

    // RETRY: reprocessa catálogo existente
    if (body.retry_catalog_id) {
      const { data: cat } = await supabase.from("supplier_catalogs")
        .select("id,user_id,supplier_id,storage_path,mime")
        .eq("id", body.retry_catalog_id).maybeSingle();
      if (!cat || cat.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Catálogo não encontrado." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("supplier_catalogs").update({
        processing_status: "pending", error_message: null, processed_pages: 0, products_created: 0, products_updated: 0,
      }).eq("id", cat.id);
      // @ts-ignore
      EdgeRuntime.waitUntil(processCatalog(cat.id, cat.user_id, cat.supplier_id, cat.storage_path, cat.mime));
      return new Response(JSON.stringify({ catalog_id: cat.id, status: "processing" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { supplier_id, filename, mime, storage_path, size_bytes, kind } = body;
    const docKind = kind === "pricing" ? "pricing" : "catalog";
    if (!supplier_id || !storage_path) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios faltando" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: parent, error: insErr } = await supabase.from("supplier_catalogs").insert({
      user_id: user.id, supplier_id, filename: filename ?? "catalogo", storage_path,
      mime, size_bytes: size_bytes ?? null, kind: docKind,
      processing_status: "pending", internal_only: false,
    }).select("id").single();
    if (insErr || !parent) {
      return new Response(JSON.stringify({ error: "Erro ao registrar catálogo." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // @ts-ignore
    EdgeRuntime.waitUntil(processCatalog(parent.id, user.id, supplier_id, storage_path, mime));

    return new Response(JSON.stringify({ catalog_id: parent.id, status: "processing" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro inesperado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
