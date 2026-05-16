# Fase 53 — Modelos de cupom para impressão

Versão: `6.0.40-fase-53-modelos-cupom-impressao`

## Objetivo

Preparar os cupons que serão impressos pelo aplicativo desktop Electron.

A Fase 52 criou a fila `print_jobs`. A Fase 53 melhora o conteúdo de cada job para que o Electron não precise adivinhar o que imprimir.

## Regras de vias

- Pedido do aplicativo: 1 via cozinha + 1 via entrega.
- PDV Entregas: 1 via cozinha + 1 via entrega.
- PDV Balcão: 1 via balcão.

## Payload de impressão

Cada job agora recebe:

- dados estruturados do pedido/venda;
- itens normalizados;
- totais;
- cliente/endereço quando aplicável;
- `ticket.title`;
- `ticket.subtitle`;
- `ticket.lines` para impressão simples;
- `ticket.html` para impressão térmica formatada;
- `ticket.sections` para o Electron renderizar com flexibilidade.

## Modelo cozinha

Foco em preparo:

- número do pedido;
- origem;
- horário;
- itens;
- observações.

## Modelo entrega

Foco no entregador:

- número do pedido;
- cliente;
- telefone;
- endereço;
- pagamento;
- total;
- itens.

## Modelo balcão

Foco no caixa:

- número da venda;
- horário;
- itens com valores;
- pagamento;
- total.

## Arquivos principais

- `src/utils/printJobTemplates.js`
- `src/services/supabasePrintJobs.js`
- `supabase/migracao-final-producao-6-0-40.sql`
- `scripts/smoke-test.mjs`

## Observação

A impressão automática real ainda será feita pelo Electron nas próximas fases. Esta fase deixa os dados prontos e padronizados para o aplicativo desktop consumir.
