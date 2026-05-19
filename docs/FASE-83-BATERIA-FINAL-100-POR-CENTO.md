# Fase 83 — Bateria final 100% antes do instalador

Versão: `6.0.63-fase-83-bateria-final-100-por-cento`

Esta fase foi criada para uma última conferência antes de baixar/instalar o aplicativo Desktop no PC da loja.

## Objetivo

Validar todos os módulos críticos já construídos:

- marca, nome da loja, logo e cupom;
- horário de funcionamento e loja aberta/fechada;
- cardápio profissional;
- adicionais por categoria;
- lanches sem estoque e bebidas com estoque;
- combos/kits;
- pedidos delivery;
- aceitar pedido, sair para entrega e confirmar entrega;
- PDV balcão;
- caixa, sangria, suprimento e fechamento;
- comandas integradas ao PDV;
- fila de impressão;
- cupom térmico 80mm/58mm;
- permissões de funcionários;
- relatórios profissionais;
- backup/exportação;
- painel de cozinha/KDS;
- WhatsApp por status;
- notificações;
- auditoria operacional;
- correções de segurança do Supabase Advisor.

## SQL principal

Depois de rodar `supabase/migracao-final-producao-6-0-63.sql`, execute:

```sql
select * from public.run_phase_83_final_system_audit('Gabriel', true);
```

Para conferir o resumo:

```sql
select *
from public.phase_83_final_system_audit_summary_view
order by created_at desc
limit 1;
```

O esperado é:

```txt
status: passed
ready_percent: 100
```

## Ver itens que falharam

```sql
select
  run.id,
  run.status,
  run.ready_count,
  run.total_count,
  run.ready_percent,
  item ->> 'id' as test_id,
  item ->> 'label' as test_label,
  item ->> 'ok' as ok
from public.final_system_audit_runs run
cross join lateral jsonb_array_elements(run.checklist) as item
where run.test_code = 'TESTE FASE 83'
  and coalesce((item ->> 'ok')::boolean, false) = false
order by run.created_at desc
limit 50;
```

## Observação sobre impressão física

A auditoria valida que a fila de impressão é criada corretamente. A impressão física depende do app Desktop aberto no PC, do driver correto e da impressora térmica configurada em 80mm/58mm.

## Decisão

Só gerar o instalador depois que a Fase 83 retornar `100%`.
