# Onda 5D — Auditoria de Performance

## Status atual (baseline já bom)
- ✅ **Lazy routes**: todas as 50+ páginas do `/app` já usam `React.lazy()` + `Suspense` → bundle inicial pequeno.
- ✅ **React Query** com `staleTime: 30s`, `refetchOnWindowFocus: false`, `retry: 1` → menos refetches desnecessários.
- ✅ **Realtime**: não há `supabase.channel()` ativo na UI principal — sem listeners pendurados causando re-renders.
- ✅ **ErrorBoundary** global protege quedas de chunks.

## Infraestrutura adicionada nesta onda
| Item | Arquivo | Uso |
|---|---|---|
| `<VirtualList>` | `src/components/ui/virtual-list.tsx` | Listas/tabelas com 100+ linhas |
| `<LazyImage>` | `src/components/ui/lazy-image.tsx` | Substitui `<img>` direto — lazy + decode async + fallback |
| `useDebouncedValue` | `src/hooks/useDebouncedValue.ts` | Debounce de filtros/buscas (padrão 250ms) |
| `@tanstack/react-virtual` | dep | Motor de virtualização |

## Aplicações imediatas
- `ImageUploader` → `LazyImage`
- `ProductPicker` → `LazyImage` (2 ocorrências) + busca **debounced** (200ms)

## Recomendações para próximas ondas (alto impacto, baixo risco)

### 1. Páginas que devem migrar para `<VirtualList>`
| Página | Linhas | Por quê |
|---|---|---|
| `Products.tsx` | 641 | Grid de produtos pode passar de 500 itens |
| `Stock.tsx` | 349 | Listagem de SKUs cresce rápido |
| `Sales.tsx` / `Financial.tsx` | — | Histórico de transações |
| `Audit.tsx` | — | Log cresce indefinidamente |

Padrão:
```tsx
<VirtualList
  items={rows}
  rowHeight={64}
  renderRow={(r) => <ProductRow data={r} />}
  empty={<EmptyState />}
/>
```

### 2. Memoização recomendada
- Envolver linhas de tabela em `React.memo` quando o pai re-renderiza com freqüência (filtros).
- Usar `useDebouncedValue` em **toda** `Input` de busca antes de passar para `useMemo`/`useQuery`.
- Trocar `useEffect` que faz `fetch` por `useQuery` para ganhar cache automático (Products/Stock ainda usam `useEffect` direto).

### 3. Imagens
- Substituir restantes `<img>` por `<LazyImage>` em catálogos.
- Para o logo da empresa no header, manter `<img>` com `fetchpriority="high"` (LCP candidate).

### 4. Queries Supabase
- Aplicar `.range(0, 49)` + paginação no servidor nas páginas de listagem grandes — hoje o limite default do Supabase é 1000 linhas mas estamos puxando tudo.
- Selecionar colunas específicas (`select("id,name,price")`) em vez de `select("*")` nas grids.
- Criar índices em colunas usadas em `WHERE`/`ORDER BY` (`owner_user_id` já tem; conferir `created_at DESC`).

### 5. Realtime (quando voltar a ser usado)
- Sempre `unsubscribe` no cleanup do `useEffect`.
- Filtrar no servidor (`filter: 'owner_user_id=eq.xxx'`) — não no cliente.
- Um único canal por página, multiplexar eventos.

## Como medir
1. Abrir DevTools → Performance → gravar 5s navegando na página suspeita.
2. Procurar **Long Tasks > 50ms** e **scripts > 200ms**.
3. Lighthouse: meta LCP < 2.5s, INP < 200ms, CLS < 0.1.

---
*Esta onda entregou o ferramental. Aplicação progressiva nas páginas críticas pode ser feita sob demanda sem refator destrutivo.*
