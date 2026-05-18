# Fase 58 — Estabilidade de produção: cupons e estoque seguro

Versão: `6.0.46-fase-58-estabilidade-producao`

## Objetivo

Corrigir problemas encontrados no app publicado e reforçar a operação antes de novas melhorias.

## Correções incluídas

- Criação e reforço da tabela `public.coupons`.
- Mensagem operacional mais clara quando `coupons` ainda não existe no Supabase.
- Recriação de `public.apply_product_stock_deltas(jsonb)` usando operação atômica e `TRUNCATE` em tabela temporária, evitando erro de ambientes com proteção contra `DELETE` sem `WHERE`.
- Mantida a regra de estoque tudo-ou-nada: se algum item não tiver saldo, nenhum produto é baixado.
- `vercel.json` adicionado para padronizar o deploy com pnpm.
- Scripts desktop ajustados para usar `pnpm`, evitando retorno ao `npm install`/`npm run build` no fluxo local.

## SQL obrigatório

Rodar `supabase/migracao-final-producao-6-0-46.sql` no SQL Editor do Supabase.
