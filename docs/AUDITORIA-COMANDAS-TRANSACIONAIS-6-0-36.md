# Auditoria de comandas transacionais — 6.0.36

Versão: `6.0.36-fase-50-comandas-transacionais`

## Problema corrigido

A persistência de comandas/fiados ainda substituía itens em duas etapas pelo front-end:

1. apagar itens antigos em `tab_account_items`;
2. inserir itens novos em `tab_account_items`.

Se a inserção falhasse depois da exclusão, a comanda poderia ficar sem itens ou parcialmente atualizada.

## Correção

Foi adicionada a função SQL `replace_tab_account_items`, chamada por RPC pelo app.

A substituição dos itens agora ocorre dentro de uma função transacional no Supabase. Se a inserção falhar, a operação é revertida pelo banco e os itens antigos não são perdidos.

## Arquivo obrigatório no Supabase

Rode:

```txt
supabase/migracao-final-producao-6-0-36.sql
```

## Validações

- `npm test`
- `npm run lint`
- `npm run build`
- `npm audit --audit-level=moderate`
