Promover `geisajanuario.uba@gmail.com` (user_id `dfd2d503-58c5-4a38-aa2f-290d5c996d74`) a Super Admin do Optimio.

## O que será feito

1. Rodar migração SQL que:
   - Insere registro em `user_roles` com `role = 'admin'` para o user_id acima (com `ON CONFLICT DO NOTHING` para ser idempotente).
   - Garante `account_status = 'active'` no `profiles` desse usuário (caso esteja em `waiting_approval`).

2. Após aplicar, basta acessar **`/admin`** logado com essa conta para ver o painel Super Admin (aprovar tenants, MRR, etc.).

## Detalhes técnicos

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('dfd2d503-58c5-4a38-aa2f-290d5c996d74', 'admin')
ON CONFLICT DO NOTHING;

UPDATE public.profiles
SET account_status = 'active'
WHERE id = 'dfd2d503-58c5-4a38-aa2f-290d5c996d74';
```

Sem alteração de código — apenas dados. O fluxo de Super Admin já existe em `/admin` e é protegido pela função `has_role`.