# Fase 70 — Correção de estoque para lanchonete

Esta fase corrige o bloqueio indevido de venda quando o pedido contém lanches, porções ou combos sem estoque físico.

## Problema corrigido

O sistema tentava baixar estoque de todos os itens do pedido. Para lanchonete, isso é incorreto:

- Lanche não deve bloquear por estoque.
- Porção não deve bloquear por estoque.
- Combo não deve bloquear por estoque como produto final.
- Bebida, sobremesa e produto pronto podem continuar controlando estoque.

## Correção

- O app agora filtra os itens e envia para baixa somente produtos com `stockControlled=true`.
- A função SQL `apply_product_stock_deltas` também ignora produtos com `stock_controlled=false`.
- A proteção foi aplicada no front-end e no banco para evitar erro mesmo se algum fluxo antigo mandar o produto indevidamente.

## Resultado esperado

Uma venda com X-Bacon, batata e Coca deve:

- não baixar estoque do X-Bacon;
- não baixar estoque da batata, se for porção sem controle;
- baixar estoque apenas da Coca, se ela estiver com controle de estoque ativo.
