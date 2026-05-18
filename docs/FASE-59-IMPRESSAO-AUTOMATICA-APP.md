# Fase 59 — Impressão automática definitiva para pedidos do app

Versão: `6.0.47-fase-59-impressao-automatica-app`

## Objetivo

Corrigir a criação automática dos `print_jobs` quando o cliente finaliza um pedido pelo aplicativo.

## Correção principal

A Fase 58 confirmou que o pedido do app salva, baixa estoque e que o Electron processa as vias `customer_app + kitchen` e `customer_app + delivery`. O problema era a inserção automática da fila: alguns bancos tinham `print_jobs.id` numérico, enquanto o código tentava enviar um ID textual como `order-<pedido>-kitchen`.

Nesta fase:

- o app não envia `id` no fluxo normal de `print_jobs`;
- a deduplicação passa a ser por `source + source_id + print_type`;
- existe fallback para bancos antigos que ainda exigem `id` textual;
- pedido do app cria automaticamente:
  - `customer_app + kitchen`;
  - `customer_app + delivery`.

## SQL obrigatório

Rodar `supabase/migracao-final-producao-6-0-47.sql` no SQL Editor do Supabase.

## Testes esperados

1. Fazer pedido pelo app com produto em estoque.
2. Confirmar que o pedido salva.
3. Confirmar que o estoque baixa.
4. Rodar:

```sql
select id, source, source_id, print_type, status, attempts, locked_by, printed_at, error_message, created_at
from public.print_jobs
order by created_at desc
limit 20;
```

5. Ver dois registros novos:
   - `customer_app / kitchen`;
   - `customer_app / delivery`.
6. Com Electron ligado, ambos devem virar `printed`.
