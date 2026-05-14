# Auditoria de reserva de estoque — 6.0.30

Versão: `6.0.30-fase-50-app-dividido-auditoria-final`

## Correção principal

A criação de pedidos, vendas de balcão, pedidos do PDV Entregas e fechamento de comandas agora reserva/baixa estoque no Supabase **antes** de gravar o pedido final.

Antes, o pedido podia ser salvo e só depois o estoque era baixado. Se a função de estoque falhasse, a operação podia ficar registrada sem estoque sincronizado.

Agora o fluxo é:

1. validar itens na tela;
2. aplicar delta atômico de estoque no Supabase;
3. salvar pedido/venda/comanda;
4. se o salvamento falhar, tentar devolver o estoque automaticamente;
5. recarregar produtos do Supabase.

## Estoque

A função `apply_product_stock_deltas` continua sendo obrigatória. Rode:

```sql
supabase/migracao-final-producao-6-0-30.sql
```

## Cache

Sem registro novo de service worker. O app segue limpando caches e service workers antigos ao abrir.
