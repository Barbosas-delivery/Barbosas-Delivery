# Fase 84 — Produção limpa final

Versão: `6.0.64-fase-84-producao-limpa-final`

## Objetivo

Finalizar o sistema para operação real, removendo dados e objetos de teste do Supabase e deixando o aplicativo sem avisos de bateria de testes na interface principal.

## O que foi feito

- Atualização da versão para `6.0.64`.
- Remoção do aviso visual da Fase 83 na tela de configurações.
- Inclusão do aviso de sistema liberado para produção.
- Criação da função `run_phase_84_production_cleanup`.
- Criação da tabela `production_cleanup_runs` para registrar a limpeza final.
- Criação da view `production_go_live_summary_view` com `security_invoker = true`.
- SQL para apagar dados `TESTE FASE ...` de produtos, adicionais, combos, pedidos, caixa, comandas, impressões, notificações e auditorias.
- SQL para remover tabelas, funções e views usadas apenas em testes.
- Preservação das configurações reais: marca, horário, PDV, permissões, relatórios, backup, KDS, WhatsApp e operação profissional.

## Como usar

Depois de rodar a migração `supabase/migracao-final-producao-6-0-64.sql`, execute:

```sql
select * from public.run_phase_84_production_cleanup('Gabriel', true);
```

Depois confira:

```sql
select *
from public.production_go_live_summary_view
order by created_at desc
limit 1;
```

O esperado é `status = completed`.

## Observação importante

Essa fase remove dados e objetos de teste do Supabase. Não rode novamente testes antigos das fases 67, 68, 72, 82 ou 83 depois da limpeza, porque as funções de teste serão removidas quando `p_drop_test_objects = true`.

Para operar a loja, use dados reais: produtos reais, adicionais reais, caixa real e pedidos reais.
