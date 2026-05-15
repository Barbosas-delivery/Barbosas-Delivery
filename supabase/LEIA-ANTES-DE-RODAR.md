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
- Campos extras de status de pedido, aprovação, cancelamento e finalização.

O script usa `IF NOT EXISTS`, então pode ser rodado mais de uma vez sem recriar colunas já existentes.

## Migração final de produção

Para a versão 6.0.35, rode também o arquivo:

```sql
supabase/migracao-final-producao-6-0-35.sql
```

Ele reforça as tabelas principais e cria/atualiza a função `apply_product_stock_deltas`, usada para movimentação atômica de estoque em vendas, pedidos, comandas, cancelamentos e ajustes manuais.
