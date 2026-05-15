# Auditoria final criteriosa — Fase 50

Versão: 6.0.23-fase-50-auditoria-final-criteriosa

## Correção aplicada nesta revisão

Foi corrigido um risco de compatibilidade com tabelas antigas do Supabase: produtos com a coluna `active` ausente ou nula podiam ser interpretados como inativos no catálogo do cliente.

A partir desta versão, produtos com `active` nulo/ausente são tratados como ativos, seguindo o mesmo padrão já usado para clientes e entregadores. Produtos continuam sendo ocultados quando `active` é falso ou quando possuem `deleted_at`.

## Validações executadas

- npm test
- npm run lint
- npm run build
- npm audit --audit-level=moderate

## Observação de produção

O funcionamento final depende das variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, tabelas criadas, colunas compatíveis e policies/RLS liberando as operações necessárias.
