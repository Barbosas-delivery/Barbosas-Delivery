# Auditoria criteriosa de estoque — 6.0.26

Versão: `6.0.26-fase-50-auditoria-estoque-criteriosa`

## Correções desta revisão

- A sincronização de estoque agora atualiza somente produtos com estoque realmente alterado, evitando sobrescrever estoque de produtos não envolvidos na venda/pedido quando outro aparelho também estiver usando o sistema.
- As telas de pedido, PDV, cancelamento, reabertura e fechamento de comanda não mostram mais mensagem final de sucesso quando o estoque não sincroniza no Supabase.
- Quando uma falha de estoque acontece depois de salvar o pedido/venda, o sistema cria notificação operacional para a loja conferir antes de continuar vendendo.
- O diagnóstico passou a ler o WhatsApp correto da loja (`storePhone`) em vez de um campo legado.

## Validações obrigatórias no app publicado

1. Criar produto com estoque 10.
2. Fazer venda de 2 unidades e confirmar estoque 8 no cliente e no painel.
3. Cancelar a venda e confirmar estoque 10.
4. Criar outro produto e confirmar que uma venda do primeiro produto não altera o estoque do segundo.
5. Criar pedido pelo cliente e confirmar atualização no painel da loja.
