# Auditoria linha a linha — segunda revisão final

Versão: `6.0.22-fase-50-auditoria-linha-a-linha-final`

Correções aplicadas nesta revisão:

1. Categorias novas agora são salvas imediatamente no Supabase ao clicar em adicionar grupo, sem depender apenas do salvamento automático com atraso.
2. IDs críticos de produtos, pedidos, cupons, promoções, kits, clientes, entregadores, comandas e fechamentos de caixa usam `makeUniqueNumericId()`, reduzindo risco de colisão quando dois aparelhos salvam no mesmo milissegundo.
3. Validação de código de barras em edição passou a normalizar o código e ignorar registros inativos/excluídos.
4. Sincronização de estoque agora verifica erros retornados pelo Supabase e mostra alerta operacional se o pedido foi salvo, mas o estoque não sincronizou.
5. Mantida a remoção de service workers e caches antigos; dados operacionais continuam sendo carregados da rede/Supabase.

Validações executadas:

- `npm test`
- `npm run lint`
- `npm run build`
- `npm audit --audit-level=moderate`

Observação: o funcionamento 100% em produção ainda depende do Supabase publicado estar com URL, chave, tabelas, colunas e policies/RLS corretas.
