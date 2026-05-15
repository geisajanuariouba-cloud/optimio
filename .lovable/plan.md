
# Plano V8 — Execução em 6 Fases

Você pediu MUITA coisa de uma vez (2 prompts gigantes). Vou organizar em 6 fases sequenciais, todas implementadas nesta mesma rodada (sem pausa entre elas). Confirme antes de eu começar — depois só mando bala.

---

## FASE A — Bugs críticos restantes (Módulo 6 do prompt 2)

- **Estoque mínimo 0 + estoque 0**: já tratado em Products (manter), revisar Dashboard/alertas para também ignorar.
- **Bug "Editar Aparência"**: refatorar `Settings.tsx` para aplicar `primary_color` / `border_style` no `:root` imediatamente após salvar (atualizar `useTenant` profile no contexto).
- **Bug Anamnese**: o formulário renderizado no atendimento deve ler de `anamnesis_templates.questions` em vez de hard-coded.
- **Bug Suporte WhatsApp**: remover qualquer link `wa.me` da área logada. Manter apenas chat IA + escalonamento via ticket interno (já existe em `Support.tsx`, mas remover botão WhatsApp do AdminView e qualquer header/sidebar). Mensagem para cliente: "Tempo de resposta: até 24h úteis".
- **Pacote save error**: corrigir antes de migrar para Recorrência.

## FASE B — Recorrência (renomear Pacotes) + Anamnese editável

- Migration: `ALTER TABLE packages ADD recurrence_type text DEFAULT 'smart'` ('smart' | 'manual') + `sessions_total int`, `sessions_used int`.
- Renomear sidebar "Pacotes" → "Recorrência". Manter rota `/app/packages` por compat.
- UI: dois modos no dialog de criação (Inteligente via anamnese / Manual com seleção livre de serviços + preço).
- Botão "Agendar Sessão" no `ClientDetail` que abre `/app/appointments?client=...&package=...&service=...` pré-preenchido e abate sessão.
- `Anamnesis.tsx`: tela admin para editar `anamnesis_templates.questions` (texto / múltipla escolha). Form do cliente lê dinamicamente.

## FASE C — Logística avançada

- Migration: `deliveries.status` aceita `pending | with_assembler | assembled | delivered`. Coluna `max_delivery_date date`.
- Em `Financial.tsx` checkout: checkbox "É para entregar?" → mostra "Taxa de entrega" (soma no total) + "Passar no fornecedor antes?".
- Dashboard de Logística: Kanban com 4 colunas (Pendente → Montador → Montado → Entregue). Mostrar nome cliente, endereço, taxa, data máxima.

## FASE D — Combos + Projetos Kanban + Marketing

- Tabelas novas: `combos`, `combo_items` (polymorphic product/service), `combo_sales`. RLS por user.
- Página `/app/combos`: criar combo, calcular preço original vs combo, métricas ROI (qtd vendida + faturamento).
- Página `/app/projects`: Kanban (To Do / In Progress / Done) reaproveitando tabela `tasks` (já existe `status`).
- `Marketing.tsx`: editar data das tarefas; posts ganham Select de status (A Fazer / Agendado / Postado).

## FASE E — Site Builder rollback + Make Webhook + Dashboard customizável

- **Remover Site Builder**: deletar `SiteBuilder.tsx`, `PublicSite.tsx` (rota), edge function `site-builder-ai`, item da sidebar e rota `/s/:slug`. Manter tabelas `sites` e `site_orders` (não destrutivo).
- **Automações** `/app/automations`: input único de Webhook URL salvo em `tenant_integrations` (provider='make_webhook'). Edge function `dispatch-webhook` chamada ao criar venda/cliente.
- **Dashboard customizável**: `profiles.dashboard_widgets jsonb` com toggles. Widgets obrigatórios: Venda do Mês, Estoque Depósito, Entregas Pendentes, Retiradas Pendentes, Tabelas, Catálogo, Promissórias Vencidas. Layout unificado (cards padronizados).
- **Busca global** no Dashboard: barra que pesquisa em catálogo/produtos com ícone "Orçamento" rápido ao lado.
- **Quick Chat / Notas pendentes**: bloco flutuante no Dashboard que cria cards de pendência (tabela `quick_notes` com `resolved bool`). Cards somem ao resolver.

## FASE F — Motor IA de Catálogos + Orçamentos + Variações + Vendas

### Migrations
- `product_variations` (id, product_id, user_id, name, attributes jsonb, sale_price, cost, stock, image_url, status).
- `products`: novas colunas `image_url`, `measurements jsonb`, `out_of_line bool`.
- `suppliers`: `pricing_rules jsonb` (ex: `{"discount_percent": 28, "is_net": false}`), `default_margin_percent numeric default 100`, `default_markup_percent numeric default 20`.
- `quotes` (id, user_id, client_id, status, payment_method, total, created_at) + `quote_items` (id, quote_id, product_id, variation_id, qty, unit_cost, margin_percent, unit_price).
- `quick_notes` (id, user_id, content, resolved, resolved_at).

### Motor de Precificação (edge function `supplier-catalog-import` v2)
- IA Gemini extrai: nome, foto (base64), medidas, variações (cor/tecido), custo bruto.
- Aplica regra do fornecedor: se `is_net=false`, custo_base = preço_bruto × (1 - desconto%).
- Preço final = custo_base × (1 + margem%) × (1 + markup%).
- Editável por variação.
- Sync fora-de-linha: produtos do fornecedor que não vieram no novo catálogo → `out_of_line=true`.
- Alertas: campos faltantes geram warning visual.

### Orçamentos (`/app/quotes`)
- Busca produto por nome/código/foto.
- Mostra foto + custo (admin only) editável.
- Variação obrigatória se houver.
- Margem editável por item.
- Forma de pagamento → calcula total.
- Múltiplos produtos. Status "Aberto".

### Vendas (Financial.tsx)
- Se produto tem variação → dropdown obrigatório, preço puxado da variação.
- **Alerta de duplicidade**: cruza cliente+produto+valor+data. Se 100% match, modal de revisão. Se confirmar, marca venda com badge vermelho "Duplicada" (`financial.is_duplicate bool`).

---

## Detalhes Técnicos

- **Migrations**: 1 por fase, todas com `IF NOT EXISTS`.
- **RLS**: todas as tabelas novas com policy `auth.uid() = user_id`.
- **Storage**: já temos `supplier-catalogs`. Criar `product-images` (público) para fotos extraídas pela IA.
- **Edge functions novas**: `dispatch-webhook`, `supplier-catalog-import` (refatorada).
- **Sem quebrar dados existentes**: tudo aditivo, soft-delete.

---

## Ordem de execução
A → B → C → D → E → F, tudo numa só rodada. Vou enviar as migrations sequencialmente (uma por fase, aguardando aprovação) e depois o código de cada fase.

⚠️ **Aviso honesto**: isso é ~30+ arquivos novos/editados, 6 migrations e 2 edge functions. Pode levar várias rodadas de tool calls. Se preferir fatiar (ex: só A+B+E agora, resto depois), me diga. Caso contrário, **respondo "ok" e mando bala**.
