// Kiwify webhook — recebe eventos de compra/assinatura e provisiona conta/plano
// Público (sem JWT). Valida segredo via query `?token=` ou header `x-kiwify-token`.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kiwify-token, x-kiwify-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Lê segredo configurado (system_settings global kiwify_webhook_secret) OU env
  const url = new URL(req.url);
  const incomingToken = url.searchParams.get("token") || req.headers.get("x-kiwify-token") || "";
  const incomingSig = url.searchParams.get("signature") || req.headers.get("x-kiwify-signature") || "";
  let expectedToken = Deno.env.get("KIWIFY_WEBHOOK_SECRET") || "";
  if (!expectedToken) {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("scope", "global")
      .eq("key", "kiwify_webhook_secret")
      .maybeSingle();
    const v: any = data?.value;
    expectedToken = typeof v === "string" ? v : (v?.value ?? "");
  }
  if (!expectedToken) {
    return json(500, { error: "Webhook secret not configured" });
  }

  // Lê o corpo como texto para preservar bytes para verificação HMAC
  const rawBody = await req.text();

  // Aceita: (1) token simples == secret OU (2) HMAC SHA1 do corpo (padrão Kiwify)
  let authorized = !!incomingToken && incomingToken === expectedToken;
  if (!authorized && incomingSig) {
    try {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", enc.encode(expectedToken),
        { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
      const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
      const hex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2,"0")).join("");
      authorized = hex.toLowerCase() === incomingSig.toLowerCase();
    } catch { /* ignore */ }
  }
  if (!authorized) {
    return json(401, { error: "Assinatura/token inválido" });
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return json(400, { error: "JSON inválido" }); }

  // Extração resiliente — Kiwify varia layout entre versões
  const eventType: string = payload.webhook_event_type || payload.event || payload.order_status || "unknown";
  const orderId: string = payload.order_id || payload.id || payload.transaction_id || crypto.randomUUID();
  const subscriptionId: string | null = payload.subscription_id || payload.Subscription?.id || payload.subscription?.id || null;
  const eventId = `${eventType}:${subscriptionId || orderId}:${payload.created_at || ""}`;

  const customer = payload.Customer || payload.customer || {};
  const email: string = (customer.email || payload.customer_email || "").toLowerCase().trim();
  const fullName: string = customer.full_name || customer.name || payload.customer_name || email.split("@")[0] || "Cliente";
  const phone: string = customer.mobile || customer.phone || payload.customer_mobile || "";

  const product = payload.Product || payload.product || {};
  const productId: string = product.product_id || product.id || payload.product_id || "";
  const productName: string = product.product_name || product.name || payload.product_name || "";

  // Mapeamento produto -> plano interno
  const { data: mapSetting } = await supabase
    .from("system_settings").select("value").eq("scope","global").eq("key","kiwify_product_map").maybeSingle();
  const productMap = (mapSetting?.value as Record<string,string>) || {};
  let internalPlan: string = productMap[productId] || productMap[productName] || "";
  if (!internalPlan) {
    const lower = productName.toLowerCase();
    if (lower.includes("avan")) internalPlan = "advanced";
    else if (lower.includes("pro")) internalPlan = "pro";
    else internalPlan = "basic";
  }

  // Idempotência
  const { data: existing } = await supabase
    .from("billing_events").select("id").eq("provider","kiwify").eq("event_id", eventId).maybeSingle();
  if (existing) return json(200, { ok: true, duplicate: true });

  const logEvent = async (status: string, userId: string | null, error?: string) => {
    await supabase.from("billing_events").insert({
      user_id: userId, provider: "kiwify", event_type: eventType, event_id: eventId,
      raw_payload: payload, status, error_message: error ?? null,
    });
  };

  try {
    const approvedTypes = ["order_approved","subscription_approved","compra_aprovada","purchase_approved","pedido_aprovado"];
    const renewedTypes = ["subscription_renewed","assinatura_renovada","renewal"];
    const canceledTypes = ["subscription_canceled","subscription_cancelled","assinatura_cancelada","cancellation"];
    const refundTypes = ["order_refunded","refund","chargeback","estorno"];
    const rejectedTypes = ["order_rejected","payment_refused","pagamento_recusado","rejected"];

    const isApproved = approvedTypes.includes(eventType) || payload.order_status === "paid";
    const isRenewed = renewedTypes.includes(eventType);
    const isCanceled = canceledTypes.includes(eventType);
    const isRefund = refundTypes.includes(eventType);
    const isRejected = rejectedTypes.includes(eventType);

    if (isApproved) {
      if (!email) { await logEvent("error", null, "Email ausente"); return json(400, { error: "Email ausente" }); }

      // Verifica usuário existente
      const { data: list } = await supabase.auth.admin.listUsers();
      let userId = list.users.find((u: any) => (u.email || "").toLowerCase() === email)?.id;

      if (!userId) {
        const { data: created, error: cErr } = await supabase.auth.admin.createUser({
          email, email_confirm: true,
          user_metadata: { full_name: fullName, company_name: fullName, phone, source: "kiwify" },
        });
        if (cErr || !created.user) throw new Error(cErr?.message || "Falha ao criar usuário");
        userId = created.user.id;
      }

      // Gera link de recuperação para o cliente definir senha (NÃO retornar na resposta)
      const siteUrl = Deno.env.get("SITE_URL") || "";
      await supabase.auth.admin.generateLink({
        type: "recovery", email,
        options: { redirectTo: siteUrl ? `${siteUrl}/auth` : undefined },
      });

      // Cria/atualiza assinatura
      const now = new Date().toISOString();
      const periodEnd = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("subscriptions").upsert({
        user_id: userId, plan_slug: internalPlan, status: "active",
        provider: "kiwify", provider_customer_id: customer.id || customer.customer_id || null,
        provider_subscription_id: subscriptionId, provider_product_id: productId,
        provider_plan_name: productName, internal_plan: internalPlan,
        current_period_start: now, current_period_end: periodEnd, last_paid_at: now,
      }, { onConflict: "provider,provider_subscription_id" });

      // Profile: marca account_status active e plano
      await supabase.from("profiles").update({
        account_status: "active", plan: internalPlan,
      }).eq("id", userId);

      // Onboarding pendente
      await supabase.from("onboarding_status").upsert({
        user_id: userId, completed: false, current_step: "welcome",
      }, { onConflict: "user_id" });

      await logEvent("processed", userId);
      return json(200, { ok: true });
    }

    if (isRenewed && subscriptionId) {
      const periodEnd = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("subscriptions").update({
        status: "active", current_period_end: periodEnd, last_paid_at: new Date().toISOString(),
      }).eq("provider","kiwify").eq("provider_subscription_id", subscriptionId);
      await logEvent("processed", null);
      return json(200, { ok: true });
    }

    if (isCanceled && subscriptionId) {
      await supabase.from("subscriptions").update({ status: "canceled" })
        .eq("provider","kiwify").eq("provider_subscription_id", subscriptionId);
      await logEvent("processed", null);
      return json(200, { ok: true });
    }

    if (isRefund && subscriptionId) {
      await supabase.from("subscriptions").update({ status: "suspended" })
        .eq("provider","kiwify").eq("provider_subscription_id", subscriptionId);
      await logEvent("processed", null);
      return json(200, { ok: true });
    }

    if (isRejected) {
      await logEvent("rejected", null);
      return json(200, { ok: true });
    }

    await logEvent("ignored", null, `Evento não tratado: ${eventType}`);
    return json(200, { ok: true, ignored: true });
  } catch (e: any) {
    await logEvent("error", null, e?.message || String(e));
    return json(500, { error: e?.message || "Erro interno" });
  }
});
