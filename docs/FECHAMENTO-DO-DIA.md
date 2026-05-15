# Fase 49 — Fechamento do dia

A Fase 49 adiciona ao painel principal da loja um bloco chamado **Fechamento do dia**.

O objetivo é ajudar a loja a conferir rapidamente se ainda existe alguma pendência antes de encerrar o expediente.

## O que aparece no fechamento

O bloco verifica quatro pontos principais:

- **Entregas ativas**: mostra se ainda existe entrega em andamento.
- **Pagamentos pendentes**: mostra pedidos ainda pendentes, a receber ou fiados.
- **Pedidos recebidos**: pedidos do aplicativo entram direto na operação, sem etapa de aprovação manual.
- **Backup diário**: mostra se o backup do dia ainda não foi baixado neste navegador.

## Status do fechamento

Quando não existe pendência, o bloco exibe:

```txt
Tudo certo
```

Quando existe alguma pendência, o bloco exibe:

```txt
Conferir pendências
```

Cada item também recebe um selo individual:

- **OK** quando não existe pendência naquele ponto.
- **Conferir** quando ainda existe algo para resolver.

## Backup diário

Se o backup do dia ainda estiver pendente, o card de backup mostra o botão:

```txt
Baixar backup diário
```

Esse botão usa o mesmo backup operacional já existente no sistema. Ao baixar o arquivo, o sistema registra a data do último backup no navegador.

## Impacto operacional

Esta fase não muda regras de pedidos, entregas, pagamentos ou estoque. Ela apenas organiza uma conferência final no painel para reduzir o risco de fechar a loja com entrega aberta, pagamento sem baixa, pedido aguardando aprovação ou backup pendente.

## Banco de dados

Esta fase não exige nova migração SQL.
