# Auditoria de estoque sem negativo — 6.0.28

Versão: `6.0.28-fase-50-auditoria-estoque-sem-negativo`

## Correção crítica

A função de estoque atômico agora bloqueia baixa que deixaria o produto com estoque negativo.

Antes, em concorrência ou venda acima do saldo real, a função podia aplicar `greatest(0, estoque + delta)`. Isso impedia número negativo, mas ainda permitia concluir uma venda sem estoque suficiente.

Agora a função `apply_product_stock_deltas`:

- trava a linha do produto com `for update` durante a movimentação;
- calcula `stock + delta` dentro do banco;
- se o resultado ficar abaixo de zero, retorna `insufficient_stock`;
- não altera aquele produto quando não há saldo suficiente;
- devolve os movimentos aplicados em `applied` e falhas em `failures`.

## Regra de produção

Rode obrigatoriamente no Supabase:

`supabase/migracao-final-producao-6-0-28.sql`

O app não usa mais fallback de compatibilidade para estoque. Se a função SQL não existir, a venda/pedido continua registrado, mas o sistema alerta que o estoque não sincronizou. Isso evita mascarar erro de configuração em produção.
