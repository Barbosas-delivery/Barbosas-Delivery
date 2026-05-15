# Auditoria completa do script — 6.0.31

Versão: `6.0.31-fase-50-revisao-script-completo`

## Correções aplicadas

1. Migração final do Supabase
   - Corrigida duplicidade da coluna `total_sold` em `cash_sessions`.
   - A migração obrigatória agora é `supabase/migracao-final-producao-6-0-31.sql`.

2. Categorias / grupos de produtos
   - A criação de grupo agora salva primeiro no Supabase.
   - Se `store_settings` falhar, o grupo não fica aparecendo como salvo apenas na tela.

3. Ajuste manual de estoque
   - Removida gravação direta do saldo final em `products.stock`.
   - Entrada, saída e correção manual passam pela função atômica `apply_product_stock_deltas`.

4. Testes
   - Teste de fumaça reforçado para validar versão, migração sem coluna duplicada, categoria sem salvamento falso e estoque sem fallback direto no produto.

## Validação esperada

Execute:

```bash
npm test
npm run lint
npm run build
npm audit --audit-level=moderate
```

Antes do deploy, rode no Supabase:

```txt
supabase/migracao-final-producao-6-0-31.sql
```
