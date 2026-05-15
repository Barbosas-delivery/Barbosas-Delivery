# Auditoria revisão total do script — 6.0.34

Versão: `6.0.34-fase-50-revisao-total-script-final`

## Correções principais

1. A função `apply_product_stock_deltas` passou a validar todos os produtos antes de alterar qualquer estoque. Se houver produto inexistente ou estoque insuficiente, a função retorna erro e não baixa nenhum item do pedido.
2. A edição normal de produto não envia mais o campo `stock` junto com dados como nome, preço, categoria, imagem e variantes.
3. Quando o estoque é alterado na edição de produto, o app consulta o saldo real no Supabase, calcula a diferença e aplica o ajuste pela função atômica.
4. Se a edição do produto falhar depois de ajustar estoque, o app tenta reverter o delta e gera notificação operacional se a reversão também falhar.

## Migração obrigatória

Execute no Supabase antes de publicar:

```sql
supabase/migracao-final-producao-6-0-34.sql
```

## Validações executadas

```bash
npm test
npm run lint
npm run build
npm audit --audit-level=moderate
```
