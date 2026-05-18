# Fase 57 — Central de impressão no sistema

Versão: `6.0.45-fase-57-central-impressao`

## Objetivo

Dar controle operacional completo para a loja acompanhar a fila `print_jobs` dentro do Barbosa’s Delivery Desktop.

## Implementado

- Central de impressão no painel Electron.
- Resumo de jobs por status: pendente, imprimindo, impresso, falha e cancelado.
- Filtros por status e origem.
- Lista dos últimos jobs com origem, via, tentativas, worker, erro e horário.
- Reimpressão manual de jobs impressos, cancelados, falhos ou travados.
- Cancelamento manual de jobs pendentes/falhos/travados.
- Reprocessamento em lote de jobs com falha.
- Limpeza de jobs impressos antigos.
- Liberação de jobs travados em `printing`.
- Heartbeat do computador de impressão em `print_workers`.

## Fluxo operacional

1. Pedido ou venda cria `print_jobs`.
2. Electron consome os jobs pendentes.
3. Central mostra se o job ficou `printed`, `failed`, `pending`, `printing` ou `cancelled`.
4. Se falhar, a loja pode clicar em reimprimir.
5. Se ficar travado em `printing`, a loja pode liberar travados e processar novamente.

## Migração obrigatória

Rodar no Supabase:

```sql
-- ver arquivo supabase/migracao-final-producao-6-0-45.sql
```

