import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "product.approve"
  | "product.bulk_approve"
  | "product.reject"
  | "product.status_change"
  | "product.price_edit"
  | "sale.create"
  | "payment_method.change"
  | "subscription.manual_upgrade"
  | "storage.config_change";

export async function logAudit(opts: {
  action: AuditAction;
  module?: string;
  entity_id?: string | null;
  metadata?: Record<string, any>;
  owner_user_id?: string | null;
}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    const actor = u.user?.id;
    if (!actor) return;
    const owner = opts.owner_user_id ?? actor;
    await supabase.from("audit_logs").insert({
      owner_user_id: owner,
      actor_user_id: actor,
      action: opts.action,
      module: opts.module ?? null,
      metadata: { ...(opts.metadata ?? {}), entity_id: opts.entity_id ?? null },
    });
  } catch {
    // não bloqueia fluxo se audit log falhar
  }
}
