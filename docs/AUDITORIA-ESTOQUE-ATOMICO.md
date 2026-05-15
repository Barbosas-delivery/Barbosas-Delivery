# Auditoria de estoque atômico — 6.0.28

Versão: `6.0.28-fase-50-auditoria-estoque-sem-negativo`

## Problema corrigido

A versão anterior já atualizava somente produtos alterados, mas ainda gravava o estoque final calculado na tela. Em dois aparelhos vendendo ao mesmo tempo, isso podia gerar concorrência: um aparelho calculava o estoque com base em uma leitura antiga e podia sobrescrever a movimentação de outro.

## Correção aplicada

- Vendas, pedidos, cancelamentos, reabertura de venda e fechamento de comanda agora calculam deltas de estoque.
- O Supabase recebe a operação como `+quantidade` ou `-quantidade`, não como valor final da tela.
- Foi adicionada a função SQL `apply_product_stock_deltas(jsonb)`.
- Depois de aplicar o estoque, o app recarrega produtos do Supabase para mostrar o valor real do banco.
- Ajustes manuais de entrada/saída também usam delta; correção manual continua podendo definir estoque absoluto.
- Foi mantido fallback de compatibilidade para bancos que ainda não rodaram a migração, mas a produção deve usar a migração 6.0.28.

## Arquivo SQL obrigatório

Rode no SQL Editor do Supabase:

```sql
supabase/migracao-final-producao-6-0-28.sql
```

## Validações executadas

- `npm test`
- `npm run lint`
- `npm run build`
- `npm audit --audit-level=moderate`
