# Fase 55 — Consumidor automático de impressão

Versão: `6.0.43-fase-55-consumidor-impressao-automatico`

## Objetivo

Ativar a impressão automática real pelo aplicativo Electron instalado no computador da loja.

O navegador/web app continua salvando pedidos, vendas e fila de impressão no Supabase. O Electron agora consome a tabela `print_jobs`, imprime na impressora local e registra o resultado no Supabase.

## Fluxo operacional

1. Pedido/venda é salvo no Supabase.
2. O sistema cria registros em `print_jobs`.
3. O Electron reserva os jobs pendentes com `claim_pending_print_jobs`.
4. O Electron imprime o HTML do cupom na impressora configurada.
5. Se imprimir corretamente, chama `mark_print_job_printed`.
6. Se falhar, chama `mark_print_job_failed` com a mensagem do erro.

## Regras de vias

- Pedido do app: 1 via cozinha + 1 via entrega.
- PDV Entregas: 1 via cozinha + 1 via entrega.
- PDV Balcão: 1 via balcão.

## Recursos adicionados

- Iniciar/parar consumidor automático pelo painel local.
- Botão para processar a fila imediatamente.
- Logs locais de impressão.
- Contadores de impressões e falhas.
- Filtro por origem habilitada no computador.
- Quantidade de vias protegida entre 1 e 5 cópias por job.

## Migração obrigatória

Rode no Supabase:

```txt
supabase/migracao-final-producao-6-0-43.sql
```

A função `claim_pending_print_jobs` agora aceita filtros:

```txt
p_sources
p_print_types
```

Isso permite que cada computador respeite quais origens deve imprimir.

## Como testar no computador da loja

```bash
pnpm install
pnpm run build
pnpm run desktop
```

No app desktop:

1. Abra **Impressão > Configurar impressora**.
2. Configure Supabase URL e anon key.
3. Escolha a impressora.
4. Clique em **Testar impressão**.
5. Ative **Impressão automática neste computador**.
6. Clique em **Iniciar automático**.
7. Faça um pedido/venda no sistema e acompanhe os logs.
