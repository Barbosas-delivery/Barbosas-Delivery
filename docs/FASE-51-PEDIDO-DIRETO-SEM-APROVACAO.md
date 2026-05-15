# Fase 51 — Pedido direto sem aprovação

## Objetivo

Remover a aprovação manual do pedido feito pelo aplicativo do cliente. O pedido agora entra direto na operação da loja como **Aguardando retirada**, com estoque reservado no momento da finalização.

## Novo fluxo

```txt
Cliente finaliza pedido
↓
Estoque é reservado no Supabase
↓
Pedido é salvo como Aguardando retirada
↓
Loja recebe o pedido no painel
↓
Entregador pode retirar quando estiver pronto
```

## O que mudou

- Pedidos do cliente não nascem mais como **Aguardando aprovação do pedido**.
- `needs_store_approval` passa a ser `false` para pedidos novos.
- `store_order_approved` passa a ser `true` para pedidos novos.
- Pedidos antigos aguardando aprovação são convertidos pela migração para **Aguardando retirada**.
- O painel **Hoje** e o checklist de fechamento não cobram mais aprovação de pedido.
- A mensagem para o cliente mudou para **Pedido recebido**.
- Pagamento pode ser confirmado sem passar por aprovação de pedido.
- A rotina de impressão automática existente passa a considerar pedido recebido como status válido.

## Migração obrigatória

Rode no Supabase:

```txt
supabase/migracao-final-producao-6-0-38.sql
```

## Observação

A aprovação de entrega/finalização feita pela loja continua existindo, porque ela é outra etapa operacional: confirmar que uma entrega foi concluída corretamente.
