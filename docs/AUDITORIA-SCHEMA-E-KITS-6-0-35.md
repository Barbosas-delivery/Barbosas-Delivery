# Auditoria de schema e kits — 6.0.35

Versão: `6.0.35-fase-50-revisao-schema-e-kits`

## Correções

- A migração final agora reforça todas as colunas usadas pelo app em bancos criados em fases antigas.
- A edição de kits passa a substituir itens pela função `replace_kit_items`, evitando apagar itens antigos e falhar antes de gravar os novos.
- Mantida a função `apply_product_stock_deltas` para estoque atômico, com validação tudo-ou-nada antes de alterar estoque.

## Obrigatório antes do deploy

Rode no Supabase:

```sql
supabase/migracao-final-producao-6-0-35.sql
```
