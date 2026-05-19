# Etapa 1 — Estabilização do Core Operacional

Esta etapa foca em consertar e estruturar o que já existe. Sem OCR avançado, sem redesign, sem IA pesada.

## 1. Produtos — Reestruturação

### Renomear "Codnome" → "Apelido Curto"
- Trocar todos os rótulos visíveis em `Products.tsx`, `VariationEditor.tsx` e telas relacionadas (Quotes, Sales, Detail).
- Coluna `codname` no banco permanece (sem migration de rename) — só a UI muda.

### Botão "Gerar Apelido Curto"
- Corrigir `generateCodname` em `src/lib/codname.ts` para considerar **nome + medida + cor + categoria**.
- Botão funcional no form do produto e em cada variação.
- Campo continua editável manualmente.

### Busca
- Filtro de produtos suporta: nome, apelido curto, código, descrição, fornecedor.

### Variações reais
- Editor já existe — garantir que salvam corretamente em `product_variations` com: cor, tecido, tamanho, material, modelo, acabamento, imagem própria, custo, preço, estoque, medidas, código.
- Adicionar campos `model` e `finish` (acabamento) à tabela.

### Medidas
- Já existem colunas (`width`, `height`, `depth`, `length_cm`, `weight`, `measure_unit`) no produto e na variação. Garantir UI funcional em ambos.

### Upload real de imagens (CRÍTICO)
- Remover input de URL manual.
- Usar bucket `product-images` (já existe, público).
- Componente reutilizável `ImageUploader` com drag-and-drop, preview, remover, trocar.
- Funciona para produto E cada variação.
- Caminho: `{user_id}/products/{product_id}/...` e `{user_id}/variations/{variation_id}/...`.

### Buckets
- `product-images` (existe, público) — produtos e variações.
- `supplier-catalogs` (existe) — catálogos.
- Não criar bucket novo para fornecedores agora (sem necessidade imediata).

### UI / Filtros
- Aumentar contraste em filtros (remover transparência baixa, estados apagados).
- Melhorar grid/cards de produtos.

### Categorias
- Manter categorias de produto e de saída inalteradas.
- Não tocar nas categorias de entrada.

## 2. Vendas — Módulo separado

- Rota já existe (`/app/sales`). Reforçar como dashboard próprio:
  - Vendas por período, ticket médio, lucro, margem, formas de pagamento (incluindo promissória), produtos mais vendidos, promissórias em aberto, entregas pendentes.
- Sem migrations novas — usar `financial` + `deliveries` + `debts`.

## 3. Promissórias
- Já integradas em Quotes/Financial/Sales. Garantir filtro "Promissória" em Sales e Financial.
- Baixa de promissória (em `Debts.tsx`) já cria movimentação em caixa em dinheiro — verificar e ajustar se necessário.

## 4. Logística — Fluxo
Status padronizados em `deliveries`:
1. `pedido_fornecedor`
2. `aguardando_fornecedor`
3. `pronto_entrega`
4. `com_montador`
5. `entregue`

- Ao criar venda sem estoque suficiente → criar entrega automaticamente em `pedido_fornecedor`.
- Seleção obrigatória de montador quando `needs_assembly = true`.
- Comissão padrão 5% sobre custo, editável.

## 5. Dashboard contextual
- `Dashboard.tsx` filtra widgets por `niche`:
  - **beauty**: agenda, recorrência, sessões, clientes (ocultar logística/montagem/fornecedores).
  - **retail/furniture**: vendas, estoque, logística, orçamento, montagem.

## 6. Erros / Mensagens
- Auditar toasts e garantir português em todo o app.

## Arquivos a tocar

**Migrations:**
- Adicionar `model` e `finish` a `product_variations`.

**Novos:**
- `src/components/products/ImageUploader.tsx` — upload com drag/drop/preview.

**Editados:**
- `src/lib/codname.ts` — incluir categoria.
- `src/components/products/VariationEditor.tsx` — "Apelido Curto", upload real, modelo/acabamento.
- `src/pages/app/Products.tsx` — rótulo, upload, filtros, contraste.
- `src/pages/app/Sales.tsx` — dashboard de vendas + filtro promissória.
- `src/pages/app/Financial.tsx` — filtro promissória.
- `src/pages/app/Deliveries.tsx` — status novos + criação auto a partir de venda sem estoque.
- `src/pages/app/Dashboard.tsx` — widgets por nicho.
- `src/pages/app/Quotes.tsx` — usar mesmo `ImageUploader` se necessário e ajustar criação de delivery.

## Fora do escopo (próxima etapa)
- OCR avançado, IA pesada, redesign, analytics complexos, automações.

## Confirmação
Aprovar para eu iniciar a migration e depois os arquivos de UI.
