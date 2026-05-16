# Fase 52 — Fila de impressão no Supabase

Versão: `6.0.39-fase-52-fila-impressao-supabase`

## Objetivo

Preparar o Barbosa’s Delivery para impressão automática real via aplicativo desktop Electron, sem depender de pop-ups ou da janela de impressão do navegador.

## Regras de vias

- Pedido do app: 1 via cozinha + 1 via entrega.
- PDV Entregas: 1 via cozinha + 1 via entrega.
- PDV Balcão: 1 via balcão.

## Implementação

A operação continua salvando pedidos, pagamentos e estoque no Supabase. Depois que o pedido/venda é salvo, o app cria registros na tabela `print_jobs`.

O Electron da loja, na próxima fase, vai consumir essa fila e imprimir na impressora local.

## Segurança operacional

- Cada job tem ID determinístico por pedido e tipo de via, evitando duplicidade por atualização de tela.
- Falha ao criar print job gera notificação operacional, mas não apaga pedido já salvo.
- O navegador fica apenas com reimpressão manual; a impressão automática principal será do Electron.

## Migração obrigatória

Rode no Supabase:

```sql
supabase/migracao-final-producao-6-0-40.sql
```
