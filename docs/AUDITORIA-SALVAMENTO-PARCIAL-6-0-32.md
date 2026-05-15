# Auditoria de salvamento parcial — 6.0.32

Versão: `6.0.32-fase-50-revisao-salvamento-parcial`

## Correção principal

A revisão encontrou um risco de produção: se o pedido/venda fosse gravado em `orders` e `order_items`, mas falhasse depois ao salvar `order_payments`, o estoque era devolvido pelo fluxo chamador, porém o pedido poderia continuar salvo no Supabase sem pagamento completo.

Agora, quando isso acontece, o sistema tenta remover automaticamente:

- `order_items` do pedido;
- `order_payments` parciais;
- registro principal em `orders`.

Se a limpeza falhar, a mensagem operacional avisa que pode existir registro incompleto para conferência manual no Supabase.

## Comandas

Também foi reforçado o fechamento de comanda: se a venda da comanda for salva, mas o fechamento da própria comanda falhar, o pedido parcial é removido e o estoque reservado é devolvido.

## Migração obrigatória

Rode no Supabase:

```sql
supabase/migracao-final-producao-6-0-32.sql
```
