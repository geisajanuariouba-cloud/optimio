# Plano — Execução em ondas

O prompt mistura **correções críticas urgentes** com **30+ módulos novos**. Tentar tudo numa tacada quebraria o sistema. Vou propor 3 ondas e começar a executar a Onda 1 imediatamente após sua aprovação. Ondas 2 e 3 só depois que você validar a 1.

---

## Onda 1 — CRÍTICO (faço agora, ~1 mensagem)

Resolve os bloqueios de lançamento que você relatou nas seções "Correção crítica venda/orçamento" e "Melhorias revisão de importação".

### 1.1 Migração de banco (única, idempotente)
- `products.image_review_required boolean default false`
- `financial.interest_amount`, `financial.interest_percent`, `financial.total_manual boolean`, `financial.total_with_interest numeric`
- `quotes`/`quote_items`: adicionar `image_url`, `measurements_snapshot jsonb`, `margin_percent`, `extra_fee_percent`, `cost_snapshot`, `final_cost_snapshot`, `supplier_id`, `category`
- `app_settings`: chave `support_button` (visível, posição) por user
- `catalog_review_items.rejection_reason text`

### 1.2 Revisão de Importação (`ImportReview.tsx`)
- Botão **"Rejeitar selecionados"** + modal PT-BR com motivo opcional
- Botão **"Ver detalhes"** por card → drawer com TODOS os campos editáveis (nome, código, SKU, categoria, fornecedor, custo/desconto/custo final, margem, taxa, preço venda, variações, medidas, peso, página origem, confiança IA, duplicados)
- Visualização melhor da imagem: clique abre modal com zoom; botões trocar/remover/upload; badge "imagem incorreta"
- Checkbox **"Aprovar com imagem pendente"** → grava `image_review_required=true`
- Logs em `audit_logs` para todas as ações

### 1.3 Produtos (`Products.tsx`)
- Filtro **"Imagem pendente de revisão"** (toggle)
- Badge "*Imagem pendente" no card
- Botão **"Marcar imagem como revisada"** → zera flag + log

### 1.4 Vendas/Lançamentos (`Financial.tsx` + `ProductPicker.tsx`)
- Picker filtra por categoria: se transação="Serviço" → só serviços; se "Venda"/"Produto" → só produtos ativos
- Garantir filtros: `status=active`, `deleted_at IS NULL`, `out_of_line=false`
- Resolver preço com cascata: variação → produto → fornecedor → motor; nunca permitir 0 sem confirmação
- Snapshot completo no `items` jsonb (já parcialmente feito)
- Seção separada **"Juros / Acréscimos"** (% ou valor fixo) → calcula `total_with_interest`
- Campo **Total editável** com flag `total_manual`; ao mudar item depois, pergunta se recalcula

### 1.5 Orçamentos (`Quotes.tsx`)
- Integrar `ProductPicker` (produtos + serviços + variações)
- Card grande com imagem, medidas visíveis ("160cm L x 120cm A x 45cm P"), modal de zoom
- Margem e taxa extra editáveis por item (snapshot, não altera produto)

### 1.6 Suporte movível (`AppLayout.tsx` + `Settings.tsx`)
- Página Configurações → seção **Suporte**: mostrar sim/não + 4 posições
- Salva em `app_settings` por user
- Botão flutuante respeita config

---

## Onda 2 — MÓDULOS NOVOS (precisa aprovação separada)

Cada item abaixo é uma feature inteira. Tentar tudo de uma vez quebra. Sugestão de ordem por impacto:

1. **Central Operacional do Dia** (dashboard novo com alertas acionáveis)
2. **CRM 360** (painel completo do cliente em `ClientDetail`)
3. **Funil Comercial** (Kanban de leads)
4. **Cobrança Inteligente** (lista inadimplentes + msg WhatsApp copy)
5. **Estoque Inteligente** (mínimo, parados, sugestão compra)
6. **Compras/Pedidos a fornecedor** (novo módulo)
7. **Financeiro completo** (DRE, fluxo caixa, centro custo)
8. **Marketing Hub + calendário posts**
9. **Combos com ROI**
10. **Base de Conhecimento + Suporte tickets**
11. **Relatórios exportáveis**
12. **Auditoria UI** (visualizador de `audit_logs`)
13. **Lixeira melhorada** (multi-select, restaurar em lote)
14. **PWA instalável** (manifest-only, sem service worker)
15. **Configurações por nicho** (toggle módulos)
16. **Dashboard por nicho**
17. **Onboarding guiado** melhorado
18. **IA Operacional** (cards de sugestões)
19. **Escritório virtual MVP**, **Ponto básico**, **Equipe avançada**, **Tarefas Kanban**, **Logística mapa Leaflet**, **Montadores**

## Onda 3 — POLIMENTO

- Responsividade mobile geral (menu, tabelas, filtros transparentes)
- Remover busca do dashboard
- i18n PT-BR de todos os erros restantes
- Stubs preparados (botões desabilitados) para NF-e, bancos, mobile nativo

---

## Por que faseado

- O prompt pede ~30 módulos. Cada um leva 1-3 mensagens bem feitas. Tentar tudo de uma vez = código não testado, schema quebrado, regressões em venda/financeiro (justamente o que você pediu para **não** quebrar).
- A Onda 1 entrega o que **trava lançamento hoje**: vender, orçar, importar, suporte.
- Você valida a Onda 1 em produção, depois escolhemos quais itens da Onda 2 priorizar.

**Posso começar pela Onda 1 agora?** Se quiser reordenar ou cortar algo da Onda 2, me diga antes.
