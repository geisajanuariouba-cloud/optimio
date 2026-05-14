# V7 — Refatoração crítica + novos módulos

Vou executar em **4 fases sequenciais** para evitar quebrar tudo de uma vez. Cada fase é entregue funcional antes da próxima.

## Fase 1 — Bugs críticos (entrego primeiro, ~rápido)
- **Clientes**: remover obrigatoriedade de CPF e endereço (form + validação). Banco já é nullable.
- **Produtos**: investigar e corrigir erro ao criar (provável mismatch de coluna; vou rodar query no DB e ler payload).
- **Pacotes**: corrigir erro ao salvar novo pacote.
- **Logística**: corrigir erro da página (provável Leaflet/SSR ou coluna faltante).
- **Promissórias**: botão Excluir com confirmação ("Tem certeza?").
- **Serviços**: campo Categoria vira `<Select>` puxando do módulo Categorias (kind='service' — vou criar esse kind se não existir).
- **Catálogo Fornecedor**: trocar URL por upload de arquivo (Storage bucket `supplier-catalogs`); IA processa o arquivo upado.

## Fase 2 — Recorrência (ex-Pacotes) + Anamnese editável
- Renomear módulo **Pacotes → Recorrência** (rota `/app/recurrence`, sidebar, títulos). Tabela `packages` mantém nome interno; adiciono coluna `recurrence_type` (`smart` | `manual`).
- **Tratamento Inteligente**: lógica atual baseada em anamnese (IA sugere ordem).
- **Recorrência Manual**: usuário escolhe N serviços, define preço total e nº de sessões livre.
- **Botão "Agendar Sessão"** no perfil do cliente: abre modal de agendamento pré-preenchido com próximo serviço da recorrência ativa, abate da contagem.
- **Anamnese editável**: tela admin para criar/editar perguntas (texto / múltipla escolha) salvas em `anamnesis_templates`.

## Fase 3 — Logística (extensão) + Combos + Projetos Kanban + Marketing
- **Venda → Entrega**: checkbox "É para entregar?" no Financial → mostra taxa de entrega (soma no total) e checkbox "Passar no fornecedor antes?".
- **Dashboard Logística**: tabela com Cliente, Endereço, Taxa, Status, Data Máxima.
- **Combos** (novo módulo `/app/combos`): nome, itens (produtos+serviços), preço original (auto-soma) vs preço combo, métricas de vendas/ROI. Tabela nova `combos` + `combo_items` + `combo_sales`.
- **Projetos Kanban** (`/app/projects`): tabela `projects` com colunas To Do / In Progress / Done.
- **Marketing**: editar data das tarefas; Posts ganham Select de status (A Fazer / Agendado / Postado).

## Fase 4 — Make Webhook + Dashboard customizável + Rollback Site Builder
- **Remover Site Builder**: deleta `SiteBuilder.tsx`, `PublicSite.tsx`, edge function `site-builder-ai`, rotas e item da sidebar. Tabela `sites` e `site_orders` ficam (não destruir dados).
- **Automações** (`/app/automations`): input único de Webhook URL salvo em `tenant_integrations` (provider='make_webhook'). Edge function `dispatch-webhook` é chamada nos eventos: nova venda, novo cliente.
- **Dashboard customizável**: usuário liga/desliga blocos via toggles (salvo em `profiles.dashboard_widgets`); padronizar layout dos gráficos.

## Detalhes técnicos
- Migração SQL única no início de cada fase com `IF NOT EXISTS`.
- Storage bucket `supplier-catalogs` (privado) com RLS por user_id.
- Webhook dispatch via trigger no Postgres → `pg_net.http_post` para a URL salva (mais robusto que rodar do client).
- `combo_items` polimórfico: `item_type` ('product'|'service'), `item_id`, qty, unit_price.
- Soft-delete mantido em todas as novas tabelas (`deleted_at`).

## O que NÃO vou fazer (confirmar se quer adicionar depois)
- Não vou tocar no fluxo de auth/super admin (já corrigido em V anteriores).
- Não vou implementar IA generativa de combos sozinha — apenas a estrutura do módulo.
- Webhook é one-way (sistema → Make). Make → sistema (entrada de leads) fica para próxima.

Confirma para eu iniciar pela Fase 1?