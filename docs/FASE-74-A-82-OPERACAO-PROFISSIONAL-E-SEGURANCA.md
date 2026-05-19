# Fases 74 a 82 — Operação profissional e segurança Supabase

Versão: `6.0.62-fase-74-a-82-operacao-profissional-seguranca`

Esta entrega consolida as próximas fases em um pacote único, com melhoria contínua em operação, atendimento, controle e segurança do Supabase.

## Fase 74 — Personalização avançada da marca

- Endereço da loja.
- WhatsApp comercial.
- Mensagem de rodapé do cupom.
- Continuidade da personalização de nome, logo, capa e slogan.

## Fase 75 — Horário de funcionamento

- Tabela `store_business_hours`.
- Controle de loja aberta/fechada.
- Mensagem quando a loja estiver fechada.
- Estrutura para pausa temporária dos pedidos.

## Fase 76 — Cardápio profissional

- Estrutura `menu_highlights` para destaques, promoções e mais vendidos.
- Configurações para busca no cardápio e destaque comercial.

## Fase 77 — PDV balcão profissional

- Estrutura `pdv_quick_actions` para atalhos rápidos.
- Configurações para pagamento misto, reimpressão, cancelamento com motivo e desconto com gerente.

## Fase 78 — Permissões de funcionários

- Tabela `employee_roles`.
- Perfis iniciais: atendente, gerente, motoboy e cozinha.
- Permissões por ação para fases futuras de login individual.

## Fase 79 — Relatórios profissionais

- View `professional_sales_report_view` com `SECURITY INVOKER`.
- Resumo de vendas do dia, formas de pagamento e cancelamentos.

## Fase 80 — Backup e exportação

- Tabela `backup_export_runs`.
- Configuração de backup manual e exportação de dados críticos.

## Fase 81 — Painel de cozinha/KDS

- Tabela `kitchen_display_events`.
- Configuração para painel de cozinha, alertas e reimpressão.

## Fase 82 — WhatsApp por status

- Tabela `whatsapp_message_templates`.
- Templates por status: pedido aceito, saiu para entrega, entregue e cancelado.

## Segurança Supabase

O print do Supabase Advisor mostrava vários alertas de `Security Definer View`. Esta fase aplica:

```sql
alter view if exists public.nome_da_view set (security_invoker = true);
```

Isso reduz o risco de uma view rodar com privilégios do criador em vez de respeitar permissões/RLS do usuário atual.

Views corrigidas quando existirem no banco:

- `phase_68_operational_test_summary_view`
- `category_addons_operational_view`
- `phase_67_functional_test_summary_view`
- `stock_control_lanchonete_view`
- `open_commandas_operational_view`
- `menu_lanchonete_view`
- `phase_73_brand_test_summary_view`
- `print_jobs_operational_view`
- `menu_lanchonete_pro_view`
- `desktop_installations_operational_view`
- `production_validation_summary_view`
- `phase_72_complete_retest_summary_view`

Depois de rodar o SQL, reabra o Supabase Advisor. Alguns avisos podem demorar um pouco para atualizar.

## Teste

Execute no Supabase:

```sql
select * from public.run_phase_82_professional_operation_test('Gabriel');
```

Confira o resumo:

```sql
select *
from public.phase_82_professional_operation_summary_view
order by created_at desc
limit 1;
```

Resultado esperado:

```txt
status: passed
ready_percent: 100
```
