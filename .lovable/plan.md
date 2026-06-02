# Correção Crítica Pré-Lançamento

São 14 frentes. Para evitar uma mega-migração arriscada num único disparo, proponho dividir em **3 sub-ondas** entregues em sequência, cada uma testável isoladamente.

---

## SUB-ONDA A — Dados, RLS e Storage (fundação segura)

Bloqueia o sistema de ficar inconsistente. Tudo backend + filtros de leitura.

1. **Filtro global de produtos ativos** (item 2)
   - Helper `isProductActive(status)` + view `products_active` ou filtro `.in("status", ["ativo","approved"])` em **toda** query de:
     Estoque, Vendas, Orçamentos, Combos, Logística, Busca, seletores de venda.
   - Produtos em `aguardando_revisao / em_revisao / rejeitado / processando / erro / aguardando_tabela_custo` ficam **só** em ImportReview, SupplierDetail e SuperAdmin.

2. **Aprovação publica produto corretamente** (item 3)
   - Em `ImportReview.approve` e `bulkApprove`: ao criar produto, definir `status='ativo'`, `review_status='approved'`, `published_at=now()`. Idempotência via `dedup_hash` para não duplicar em reaprovação.
   - Variações herdam `status='ativo'`.
   - Atualizar `catalog_review_items.match_product_id` para evitar reaprovação.

3. **Storage seguro** (item 9)
   - Tornar **privados**: `catalog-images`, `tenant-logos` (ou manter público só se a landing exigir — verificar uso).
   - Manter público apenas: `product-images` (usado no app cliente), `landing-assets`.
   - Adicionar políticas RLS em `storage.objects` por bucket usando `(storage.foldername(name))[1] = auth.uid()::text OR membership`.
   - Para buckets que viram privados, expor via signed URL nos componentes que consomem.

4. **Validação de imagens extraídas** (item 1 — parte backend)
   - Coluna `catalog_review_items.image_status` enum: `extracted / pending / manual / invalid / placeholder`.
   - Edge function de import marca `pending` se a confiança da extração < threshold, ou se a imagem for menor que 200×200, aspect < 0.4 ou > 3.0, ou hash duplicado de outro item.
   - Approve **não** copia imagem para `products.image_url` quando `image_status='invalid'` — usa placeholder.

5. **Audit log** (item 13)
   - Tabela `audit_logs` (já pode existir — verificar). Inserir em: approve product, bulk approve, status change, price edit, sale create, upgrade manual, payment method change, storage config change.

---

## SUB-ONDA B — Fluxo de Venda completo

Resolve o bug central: não dá pra vender. Tudo UI + lógica de cálculo.

6. **Lançamento permite escolher produto/serviço** (item 4)
   - Em `Sales.tsx` e `Financial.tsx`, quando `kind='income'` e categoria for `venda*`: exigir cliente + produto/serviço + variação + qty + método de pagamento.
   - Novo componente `<ProductPicker>` reusável (busca, filtra `status=ativo`, mostra imagem/SKU/preço).

7. **Auto-preencher dados ao selecionar** (item 5)
   - Ao escolher produto/variação: preencher imagem, nome, code/SKU, custo, sale_price, margin_percent, extra_fee_percent, medidas, categoria. Variação tem prioridade sobre produto.

8. **Margem/taxa editáveis por venda + recálculo** (item 6)
   - Inputs de `margin_percent` e `extra_fee_percent` no item; recálculo via fórmula:
     `final = cost_final * (1+m/100) * (1+f/100)` (já existe `engine_compute_sale` — espelhar no client).
   - Não persiste no produto; só no snapshot.

9. **Snapshot do item vendido** (item 7)
   - Tabela `sale_items` (ou similar) precisa colunas snapshot: `product_name, variation_name, image_url, sku, cost_table_price, discount_percent, final_cost_price, margin_percent, extra_fee_percent, sale_price, quantity, total, measurements_snapshot jsonb`.
   - Migration adiciona o que faltar.

10. **Consistência financeira** (item 11)
    - Venda criada → entrada em `financial_entries` + `cash_drawer` se aplicável.
    - Baixa de estoque **só** se `product.status='ativo'`.
    - Aplica taxa do método de pagamento.

---

## SUB-ONDA C — UI, Admin, Métodos de Pagamento e Polimento

11. **Imagens pendentes na ImportReview** (item 1 — parte UI)
    - Cards mostram badge `Imagem pendente / inválida / manual / extraída`.
    - Botões: Trocar imagem (upload), Remover, Marcar como inválida.
    - Aprovação bloqueada com aviso suave se `image_status='pending'` (permite aprovar mesmo assim, mas avisa).

12. **Upgrade manual no SuperAdmin** (item 8)
    - Em `SuperAdmin.tsx`, drawer/modal "Upgrade manual" por tenant:
      plano, ciclo (mensal/trimestral/semestral/anual), data início, vencimento, marcar pago, anexo de comprovante (upload em `payment-proofs`), observação.
    - Atualiza `subscriptions`, libera módulos, audit_log.

13. **Métodos de Pagamento volta ao menu** (item 10)
    - Já existe `src/pages/app/PaymentMethods.tsx`. Verificar rota em `App.tsx` e link em `AppSidebar.tsx`. Re-adicionar entrada do menu (Configurações ou Financeiro).
    - Garantir CRUD funcional + uso em Sales/Quotes/Financial/Cash.

14. **Erros em PT-BR** (item 12)
    - Auditar `toast.error(...)` que ainda passam erro técnico cru e envolver em `friendlyError()`.

---

## Técnica resumida

- Tudo respeita `current_tenant_owner()` que já existe.
- Sem `find /`, sem comandos paralelos perigosos.
- Cada sub-onda termina com build verde e teste manual rápido.
- Migrations separadas por sub-onda para facilitar rollback.

---

## O que eu preciso de você

Começo pela **Sub-onda A** (a mais crítica — bloqueia vazamento de dados e produtos fantasmas no estoque), ou prefere outra ordem? Confirmando, eu disparo a Sub-onda A inteira de uma vez.
