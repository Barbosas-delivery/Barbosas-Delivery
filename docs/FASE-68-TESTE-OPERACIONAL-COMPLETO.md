# Fase 68 — Teste operacional completo do sistema

Versão: `6.0.56-fase-68-teste-operacional-completo`

Esta fase amplia os testes da Fase 67 para cobrir a operação completa da lanchonete.

## O que o teste cobre

- Abrir caixa.
- Registrar suprimento/reforço de caixa.
- Registrar sangria.
- Criar pedido delivery com cliente, endereço, adicional, bebida e taxa.
- Aceitar pedido pela loja.
- Enviar pedido para entrega com motoboy.
- Confirmar entrega e pagamento.
- Criar venda no PDV balcão.
- Criar comanda pelo PDV, adicionar itens, imprimir adição e consumo completo.
- Fechar comanda como venda paga.
- Validar estoque: bebida controlada baixa, lanche sem estoque não baixa.
- Criar impressões de cozinha, entrega, balcão, comanda, consumo completo e fechamento.
- Cancelar pedido com motivo.
- Fechar caixa com totais por Pix, dinheiro, débito, crédito, sangria, suprimento e diferença.
- Registrar auditoria, notificações e resumo consultável.
- Limpar dados de teste com segurança.

## Como rodar no Supabase

```sql
select * from public.run_phase_68_operational_test('Gabriel', true);
```

## Como ver o resultado

```sql
select *
from public.phase_68_operational_test_summary_view
order by created_at desc;
```

## Como ver o checklist detalhado

```sql
select
  id,
  status,
  ready_percent,
  jsonb_pretty(checklist) as checklist
from public.operational_test_runs
order by created_at desc
limit 1;
```

## Como limpar os dados de teste

```sql
select public.cleanup_phase_68_test_data();
```

## Limite do teste automatizado

O teste valida os registros e fluxos no banco/Projeto. A impressão física real ainda precisa ser conferida no computador da loja, porque depende da impressora instalada, driver do Windows e app Desktop aberto.
