## Objetivo

Reestruturar o módulo de Produtos para suportar **codnome**, **variações reais** e **medidas detalhadas**, garantindo que cadastro manual, importação por catálogo (OCR), busca, orçamentos, vendas e logística reconheçam essa nova estrutura — sem quebrar produtos antigos.

---

## 1. Banco de dados (migração)

### `products` (ajustes)
- Adicionar: `codname` (text), `has_variations` (boolean, default false)
- Adicionar bloco de medidas no produto principal: `width`, `height`, `depth`, `length_cm`, `weight`, `measure_unit` (default `cm`)
- Manter campos existentes (`cost`, `sale_price`, `stock`, `image_url`, `supplier_id`, `category_id`, `code`, `measurements` jsonb legado).
- Índice em `codname` e `code` para busca rápida.

### `product_variations` (ajustes — já existe)
- Adicionar: `codname`, `sku`, `color`, `fabric`, `material`, `size`, `variation_type`, `supplier_id`
- Adicionar medidas próprias: `width`, `height`, `depth`, `length_cm`, `weight`, `measure_unit`
- Manter `attributes jsonb` para combinações personalizadas.
- Índice por `product_id`, `codname`, `sku`.

### Tabela auxiliar
- Não criar `product_measures` separada (medidas ficam embutidas em `products` e `product_variations` — mais simples e performático, equivalente em capacidade).

### RLS
- Manter políticas existentes (`owner all` por `user_id`).

---

## 2. Geração automática de codnome

Função utilitária (TS) que recebe nome + atributos (cor, tamanho) e gera código curto:
- `"Sofá Retrátil 2.30m Bege"` → `SOFA230BG`
- Estratégia: primeiros 4 chars do nome principal + número (tamanho sem ponto) + 2 chars da cor.
- Usada tanto na importação de catálogos quanto como sugestão no formulário manual.

---

## 3. UI — `src/pages/app/Products.tsx` e componentes

### Lista
- Coluna **Codnome** visível.
- Busca por: nome, codnome, código, descrição, fornecedor.

### Formulário de produto (dialog/sheet)
- Aba **Geral**: nome, codnome (com botão "gerar"), código, categoria, fornecedor, descrição, imagem.
- Aba **Preço e estoque**: custo, preço de venda, estoque, estoque mínimo.
- Aba **Medidas**: largura, altura, profundidade, comprimento, peso, unidade.
- Aba **Variações**: toggle `has_variations`. Quando ativo:
  - Cards/accordion por variação com: nome, cor, tecido, material, tamanho, sku, codnome, imagem, custo, preço, estoque, medidas próprias, fornecedor.
  - Botões: adicionar/duplicar/remover variação.
  - Quando desativado: produto funciona como antes (compatibilidade total).

### Visualização (detalhe)
- Cabeçalho com imagem grande, codnome em destaque, fornecedor, categoria.
- Chips de variações com miniatura + preço + estoque.
- Bloco de medidas formatado (`L × A × P` + peso).

---

## 4. Importação de catálogo (OCR)

`supabase/functions/supplier-catalog-import/index.ts`:
- Prompt da IA atualizado para extrair: `name`, `codname` (se houver), `code`, `description`, `category`, `cost_price`, `sale_price`, `color`, `fabric`, `material`, `size`, `measures {width,height,depth,length,weight,unit}`, `variations[]` (array com mesmos campos).
- Persistência:
  - Se produto vem com `variations[]` → cria `products` com `has_variations=true` + cria N linhas em `product_variations`.
  - Se vem simples → cria `products` plano.
  - Se `codname` ausente → gerar via util compartilhada (replicada inline na edge function).
  - Deduplicação por (`user_id`, `supplier_id`, `code` OR `codname` OR `name` normalizado).

---

## 5. Integrações dependentes (compatibilidade)

- **Orçamentos** (`Quotes.tsx`, `quote_items`): seletor de produto já aceita `variation_id` — exibir codnome + variação selecionada no item.
- **Vendas** (`Sales.tsx`) e **Financeiro**: usar codnome no resumo do item quando existir.
- **Logística/Entregas**: o `items` jsonb já guarda snapshot — incluir `codname` no snapshot.
- **Estoque**: continua decrementando em `products.stock` para simples e em `product_variations.stock` quando houver variação.

---

## 6. Migração de dados existentes

- Produtos antigos: `has_variations` default `false`, `codname` preenchido via trigger one-shot (UPDATE) gerando a partir do nome para todos onde for nulo.
- Medidas legadas em `products.measurements` (jsonb) — copiar para as colunas novas quando possível, manter jsonb intacto como fallback.

---

## Arquivos afetados

**Migração SQL** (nova):
- `supabase/migrations/<timestamp>_products_codname_variations_measures.sql`

**Frontend**:
- `src/pages/app/Products.tsx`
- `src/pages/app/ProductDetail.tsx` (se existir; senão criar dialog dedicado)
- `src/components/products/ProductForm.tsx` (novo, extraído)
- `src/components/products/VariationEditor.tsx` (novo)
- `src/lib/codname.ts` (novo — utilitário de geração)
- `src/pages/app/Quotes.tsx` (exibir codnome no item)

**Edge function**:
- `supabase/functions/supplier-catalog-import/index.ts` (novo prompt + persistência variações/medidas)

**Tipos**:
- `src/integrations/supabase/types.ts` (regenera automaticamente após migração)

---

## Aprovação

Posso aplicar a migração SQL agora e em seguida implementar a UI e a edge function?
