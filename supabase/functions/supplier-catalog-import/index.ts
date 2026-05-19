import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_AI_BYTES = 22 * 1024 * 1024; // 22MB — margem de segurança sob o limite de 30MB do gateway
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const KEY = Deno.env.get("LOVABLE_API_KEY")!;

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

async function callAI(signedUrl: string, mime: string, existingCatNames: string[]): Promise<any[]> {
  const userMessage = [
    { type: "text", text: "Extraia TODOS os produtos desta tabela de preços. O valor é o CUSTO (não venda). Inclua código, categoria e medidas quando aparecerem." },
    { type: "image_url", image_url: { url: signedUrl } },
  ];
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Você é um extrator de catálogos. O preço é SEMPRE custo. Sempre chame extract_products." },
        { role: "user", content: userMessage },
      ],
      tools: productTools(existingCatNames),
      tool_choice: { type: "function", function: { name: "extract_products" } },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    let msg = "Erro ao processar com a IA.";
    if (res.status === 413 || /30MB|too large|exceed/i.test(t)) msg = "Parte do catálogo ainda está pesada demais. Reduza a qualidade do PDF.";
    else if (res.status === 429) msg = "Limite de uso da IA atingido. Tente novamente em alguns minutos.";
    else if (res.status === 402) msg = "Créditos de IA esgotados.";
    throw new Error(msg);
  }
  const j = await res.json();
  const args = JSON.parse(j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
  return args.products ?? [];
}

async function splitPdf(bytes: Uint8Array, targetBytes: number): Promise<Uint8Array[]> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = src.getPageCount();
  // Estimativa: páginas por chunk baseada em tamanho médio
  const avgPerPage = bytes.length / total;
  const pagesPerChunk = Math.max(1, Math.floor(targetBytes / Math.max(avgPerPage, 1)));
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < total; i += pagesPerChunk) {
    const end = Math.min(i + pagesPerChunk, total);
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, Array.from({ length: end - i }, (_, k) => i + k));
    pages.forEach((p) => out.addPage(p));
    const buf = await out.save();
    chunks.push(buf);
  }
  return chunks;
}

async function processCatalog(parentId: string, userId: string, supplierId: string, storagePath: string, mime: string, kind: string) {
  const supabase = createClient(SB_URL, SVC);
  const setStatus = (patch: any) => supabase.from("supplier_catalogs").update(patch).eq("id", parentId);

  try {
    await setStatus({ processing_status: "processing" });

    // Carrega fornecedor + categorias + produtos existentes
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

    const allProducts: any[] = [];
    const isPdf = mime === "application/pdf" || /\.pdf$/i.test(storagePath);

    if (isPdf) {
      // Baixa o PDF original
      const { data: file, error: dlErr } = await supabase.storage.from("supplier-catalogs").download(storagePath);
      if (dlErr || !file) throw new Error("Erro ao ler o catálogo do armazenamento.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const totalPages = src.getPageCount();
      await setStatus({ total_pages: totalPages, processing_status: "splitting" });

      const chunks = bytes.length > MAX_AI_BYTES ? await splitPdf(bytes, MAX_AI_BYTES) : [bytes];
      await setStatus({ processing_status: "extracting" });

      let pageCursor = 0;
      for (let i = 0; i < chunks.length; i++) {
        const chunkBytes = chunks[i];
        const chunkPath = `${storagePath}.chunks/${i}.pdf`;
        await supabase.storage.from("supplier-catalogs").upload(chunkPath, chunkBytes, {
          contentType: "application/pdf", upsert: true,
        });
        // Calcula páginas desse chunk
        const chunkDoc = await PDFDocument.load(chunkBytes, { ignoreEncryption: true });
        const chunkPages = chunkDoc.getPageCount();
        const pageStart = pageCursor + 1;
        const pageEnd = pageCursor + chunkPages;
        pageCursor = pageEnd;

        await supabase.from("supplier_catalogs").insert({
          user_id: userId, supplier_id: supplierId, filename: `${i + 1}.pdf`, storage_path: chunkPath,
          mime: "application/pdf", size_bytes: chunkBytes.length, products_created: 0, products_updated: 0,
          kind, parent_id: parentId, internal_only: true, chunk_index: i,
          page_start: pageStart, page_end: pageEnd, processing_status: "processing",
        });

        const { data: signed } = await supabase.storage.from("supplier-catalogs").createSignedUrl(chunkPath, 60 * 30);
        if (!signed?.signedUrl) throw new Error("Falha ao gerar URL interna.");
        const items = await callAI(signed.signedUrl, "application/pdf", existingCatNames);
        allProducts.push(...items.map((p) => ({ ...p, source_page: pageStart })));
        await setStatus({ processed_pages: pageEnd });
      }
    } else {
      // Imagem ou outro: envia direto
      const { data: signed } = await supabase.storage.from("supplier-catalogs").createSignedUrl(storagePath, 60 * 30);
      if (!signed?.signedUrl) throw new Error("Falha ao gerar URL do arquivo.");
      await setStatus({ processing_status: "extracting", total_pages: 1 });
      const items = await callAI(signed.signedUrl, mime, existingCatNames);
      allProducts.push(...items);
      await setStatus({ processed_pages: 1 });
    }

    // Consolidar / deduplicar (por código; fallback nome+medidas)
    await setStatus({ processing_status: "consolidating" });
    const dedup = new Map<string, any>();
    for (const p of allProducts) {
      const key = (p.code ? `c:${String(p.code).toLowerCase()}` : `n:${String(p.name).toLowerCase()}|${(p.measurements ?? "").toLowerCase()}`);
      if (!dedup.has(key)) dedup.set(key, p);
    }

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

    let created = 0, updated = 0;
    for (const p of dedup.values()) {
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
        await supabase.from("products").insert({ user_id: userId, name: p.name, stock: 0, min_stock: 0, ...payload });
        created++;
      }
    }

    await setStatus({ processing_status: "completed", products_created: created, products_updated: updated });
  } catch (e: any) {
    await supabase.from("supplier_catalogs").update({
      processing_status: "failed",
      error_message: e?.message ?? "Erro inesperado ao processar catálogo.",
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

    const { supplier_id, filename, mime, storage_path, size_bytes, kind } = await req.json();
    const docKind = kind === "pricing" ? "pricing" : "catalog";
    if (!supplier_id || !storage_path) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios faltando" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SB_URL, SVC);

    // Cria registro pai imediatamente
    const { data: parent, error: insErr } = await supabase.from("supplier_catalogs").insert({
      user_id: user.id, supplier_id, filename: filename ?? "catalogo", storage_path,
      mime, size_bytes: size_bytes ?? null, kind: docKind,
      processing_status: "pending", internal_only: false,
    }).select("id").single();
    if (insErr || !parent) {
      return new Response(JSON.stringify({ error: "Erro ao registrar catálogo." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Processa em background (não bloqueia a resposta)
    // @ts-ignore — EdgeRuntime existe no runtime Supabase
    EdgeRuntime.waitUntil(processCatalog(parent.id, user.id, supplier_id, storage_path, mime, docKind));

    return new Response(JSON.stringify({ catalog_id: parent.id, status: "processing" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro inesperado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
