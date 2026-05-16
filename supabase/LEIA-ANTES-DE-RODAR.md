# Migração do Supabase - Barbosa's Delivery

Use o arquivo `migracao-fases-1-a-12.sql` no SQL Editor do Supabase.

Ele consolida as colunas adicionadas nas fases anteriores para evitar que algum recurso funcione apenas no navegador e desapareça ao atualizar a página.

## Como rodar

1. Abra o painel do Supabase.
2. Entre no projeto do Barbosa's Delivery.
3. Vá em **SQL Editor**.
4. Cole o conteúdo de `migracao-fases-1-a-12.sql`.
5. Clique em **Run**.

## O que ele cobre

- Exclusão lógica de produtos, clientes e entregadores.
- Sabores/variações de produtos.
- Tempo estimado automático.
- WhatsApp do pedido.
- Notificações com leitura, resolução, cliente e entregador específico.
- Pagamentos detalhados.
- Campos extras de status de pedido, cancelamento e finalização. A aprovação manual do pedido foi removida na Fase 51.

O script usa `IF NOT EXISTS`, então pode ser rodado mais de uma vez sem recriar colunas já existentes.

## Migração final de produção

Para a versão 6.0.40 ou superior, rode também o arquivo mais recente:

```sql
supabase/migracao-final-producao-6-0-40.sql
```

Ele reforça as tabelas principais e cria/atualiza as funções:

- `apply_product_stock_deltas`, usada para movimentação atômica de estoque em vendas, pedidos, comandas, cancelamentos e ajustes manuais;
- `replace_kit_items`, usada para substituir itens de kit com segurança;
- `replace_tab_account_items`, usada para substituir itens de comanda/fiado com segurança;
- `claim_pending_print_jobs`, `mark_print_job_printed` e `mark_print_job_failed`, usadas pelo futuro aplicativo Electron para impressão automática real.
