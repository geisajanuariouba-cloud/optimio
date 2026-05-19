# Etapa 2 — Kiwify, Landing, Conta Automática, Multiusuário e Onboarding

Escopo grande e créditos limitados. Vou priorizar **infraestrutura sólida + fluxos críticos** primeiro, deixando refinamentos visuais para iterações curtas depois.

## Ordem de execução (uma resposta por bloco para economizar créditos)

### Bloco 1 — Banco de dados (1 migration única)
- `subscriptions` (ajustar): adicionar `provider`, `provider_customer_id`, `provider_subscription_id`, `provider_product_id`, `provider_plan_name`, `internal_plan`, `current_period_start`.
- `billing_events` (nova): id, user_id, provider, event_type, event_id (UNIQUE p/ idempotência), raw_payload jsonb, status, error_message.
- `team_members` (nova): id, owner_user_id (tenant=dono), member_user_id, name, email, role, status, permissions jsonb, invited_by.
- `team_invites` (nova): id, owner_user_id, email, role, permissions, token (UNIQUE), status, expires_at, created_by.
- `audit_logs` (nova): id, owner_user_id, actor_user_id, action, module, metadata jsonb.
- `onboarding_status` (nova): id, user_id UNIQUE, completed bool, current_step, niche, checklist jsonb.
- `system_settings` (nova): id, scope ('global'|'tenant'), owner_user_id null se global, key, value jsonb, UNIQUE(scope,owner_user_id,key). Serve para guardar `checkout_basic_url`, `checkout_pro_url`, `checkout_advanced_url`, `kiwify_webhook_secret` (admin).
- RLS em todas: somente dono (owner_user_id) ou membro vinculado (via team_members ativo) acessa.
- Função SECURITY DEFINER `public.current_tenant_owner()` que retorna o `owner_user_id` para o usuário logado (próprio ou via team_members.status='active'). Usar em policies de tabelas existentes nos próximos passos (não tocar agora para não quebrar).
- Função `has_permission(_user_id uuid, _key text)` consultando role+permissions.
- Plans seed: basic/pro/advanced com limites de usuários (1/3/9999).

### Bloco 2 — Webhook Kiwify (Edge Function pública)
- `supabase/functions/kiwify-webhook/index.ts` — `verify_jwt = false`.
- Valida `x-kiwify-signature` ou query `?token=` contra `kiwify_webhook_secret` salvo em `system_settings` (global).
- Idempotência via `billing_events.event_id` (UNIQUE).
- Eventos:
  - `order_approved` / `subscription_approved` → cria/reaproveita user via `auth.admin.createUser` (service role) + envia magic link de definição de senha; cria/atualiza `subscriptions` ativa; `onboarding_status.completed=false`.
  - `subscription_renewed` → atualiza period_end e status=active.
  - `subscription_canceled` → status=canceled.
  - `order_refunded` / `chargeback` → status=suspended.
  - `order_rejected` → log only.
- Mapeia produto/plano Kiwify → `internal_plan` via `system_settings` (`kiwify_product_map`).
- Loga tudo em `billing_events` (mesmo erros).
- CORS + responses em JSON.

### Bloco 3 — Landing page nova (`src/pages/Landing.tsx`)
- Hero, vídeo placeholder (`<iframe>` configurável via settings), benefícios por nicho (tabs Beauty/Retail), "Como funciona" 5 passos, 3 planos com CTA → links Kiwify lidos de `system_settings` (fallback hardcoded vazio). WhatsApp vira link de suporte no rodapé.
- Mantém design system existente (tokens HSL).

### Bloco 4 — Onboarding + "Comece Aqui"
- `Onboarding.tsx` já existe — adicionar gravação em `onboarding_status` (nicho, checklist inicial por nicho).
- Novo `src/pages/app/StartHere.tsx` com checklist por nicho (beauty/retail), progresso (lê tabelas reais: clients/services/products/financial/deliveries), atalhos.
- Botão fixo "Comece Aqui" na sidebar enquanto `onboarding_status.completed=false`.

### Bloco 5 — Equipe / Multiusuário
- Nova página `src/pages/app/Team.tsx`: lista membros + convites; botão "Convidar usuário" (email, role, permissions). Cria registro em `team_invites` e gera link `/invite/:token`.
- Página pública `src/pages/InviteAccept.tsx`: aceita token, força login/cadastro, insere em `team_members` com `owner_user_id` do convite, marca convite usado.
- `useTenant` passa a expor `tenantOwnerId` (próprio user.id ou owner via team_members) + `role` + `permissions`. Todas queries existentes continuam funcionando para admin master (owner = self).
- `<RequirePermission perm="...">` wrapper e helper `can(perm)` para esconder botões.
- Limite de usuários por plano: ao convidar, checa subscriptions.internal_plan vs `plans.limits.max_users`.

### Bloco 6 — Admin: logs de billing + config checkout
- `SuperAdmin.tsx`: nova aba "Billing" lista `billing_events` (todos, admin) + form para editar `checkout_*_url`, `kiwify_webhook_secret`, `kiwify_product_map` em `system_settings` (scope=global).

### Fora do escopo (confirmado)
OCR, catálogo, produtos, logística, montagem, redesign profundo de módulos internos.

## Riscos / decisões
- **Tenant model:** não existe coluna `tenant_id` hoje — tudo usa `user_id` como dono. Para não quebrar, **tenant = user_id do admin master**. Membros acessam via função `current_tenant_owner()` que injeta o owner correto. Migração futura para `tenant_id` real fica como dívida.
- **Senha do novo usuário:** criar via service role + enviar `generateLink({type:'recovery'})` por email Supabase. Sem custo extra.
- **RLS tabelas existentes:** não vou ampliar agora para incluir membros — fica como TODO marcado. Admin master segue funcionando 100%. Multiusuário real de dados compartilhados precisa de uma 2ª passada nas policies (avisarei explicitamente).

## Confirmação
Posso começar pelo **Bloco 1 (migration)**? Cada bloco vai numa resposta separada para você acompanhar e cortar onde quiser.
