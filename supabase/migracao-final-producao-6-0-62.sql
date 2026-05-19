-- =====================================================================
-- Fases 74 a 82 / 6.0.62 - Operação profissional e segurança Supabase.
-- Objetivo: avançar marca, horário de funcionamento, cardápio, PDV,
-- permissões, relatórios, backup, cozinha/KDS, WhatsApp e corrigir avisos
-- do Supabase Advisor sobre SECURITY DEFINER VIEW.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Segurança Supabase: corrigir views operacionais para SECURITY INVOKER.
-- O Advisor alerta quando views rodam com privilégios do criador.
-- SECURITY INVOKER faz a view respeitar as permissões/RLS do usuário atual.
-- ---------------------------------------------------------------------
alter view if exists public.phase_68_operational_test_summary_view set (security_invoker = true);
alter view if exists public.category_addons_operational_view set (security_invoker = true);
alter view if exists public.phase_67_functional_test_summary_view set (security_invoker = true);
alter view if exists public.stock_control_lanchonete_view set (security_invoker = true);
alter view if exists public.open_commandas_operational_view set (security_invoker = true);
alter view if exists public.menu_lanchonete_view set (security_invoker = true);
alter view if exists public.phase_73_brand_test_summary_view set (security_invoker = true);
alter view if exists public.print_jobs_operational_view set (security_invoker = true);
alter view if exists public.menu_lanchonete_pro_view set (security_invoker = true);
alter view if exists public.desktop_installations_operational_view set (security_invoker = true);
alter view if exists public.production_validation_summary_view set (security_invoker = true);
alter view if exists public.phase_72_complete_retest_summary_view set (security_invoker = true);

-- ---------------------------------------------------------------------
-- Fase 74: personalização avançada da marca.
-- ---------------------------------------------------------------------
insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_74_advanced_branding',
  jsonb_build_object(
    'phase', '6.0.62',
    'appVersion', '6.0.62-fase-74-a-82-operacao-profissional-seguranca',
    'storeAddress', '',
    'receiptFooterMessage', 'Obrigado pela preferência!',
    'whatsappBusinessNumber', '',
    'advancedBrandingEnabled', true
  ),
  now(), now()
)
on conflict (id) do update set settings = public.store_settings.settings || excluded.settings, updated_at = now();

-- ---------------------------------------------------------------------
-- Fase 75: horário de funcionamento e loja aberta/fechada.
-- ---------------------------------------------------------------------
create table if not exists public.store_business_hours (
  id uuid primary key default gen_random_uuid(),
  weekday integer not null check (weekday between 0 and 6),
  label text not null default '',
  opens_at time,
  closes_at time,
  closed boolean not null default false,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (weekday)
);

insert into public.store_business_hours (weekday, label, opens_at, closes_at, closed, active)
values
  (0, 'Domingo', '18:00', '23:30', false, true),
  (1, 'Segunda', null, null, true, true),
  (2, 'Terça', '18:00', '23:30', false, true),
  (3, 'Quarta', '18:00', '23:30', false, true),
  (4, 'Quinta', '18:00', '23:30', false, true),
  (5, 'Sexta', '18:00', '00:30', false, true),
  (6, 'Sábado', '18:00', '00:30', false, true)
on conflict (weekday) do nothing;

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_75_business_hours',
  jsonb_build_object(
    'phase', '6.0.62',
    'businessHoursEnabled', true,
    'storeOpenToggleEnabled', true,
    'temporaryPauseEnabled', true,
    'closedStoreMessage', 'Estamos fechados no momento. Consulte nosso horário de funcionamento.'
  ),
  now(), now()
)
on conflict (id) do update set settings = public.store_settings.settings || excluded.settings, updated_at = now();

-- ---------------------------------------------------------------------
-- Fase 76: cardápio profissional do cliente.
-- ---------------------------------------------------------------------
create table if not exists public.menu_highlights (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  product_id bigint,
  badge text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_menu_highlights_active_sort on public.menu_highlights(active, sort_order, created_at desc);

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_76_customer_menu',
  jsonb_build_object(
    'phase', '6.0.62',
    'menuSearchEnabled', true,
    'showBestSellers', true,
    'menuFeaturedTitle', 'Mais pedidos da casa',
    'menuPromoMessage', 'Confira nossos combos e adicionais.'
  ), now(), now()
)
on conflict (id) do update set settings = public.store_settings.settings || excluded.settings, updated_at = now();

-- ---------------------------------------------------------------------
-- Fase 77: melhorias no PDV balcão.
-- ---------------------------------------------------------------------
create table if not exists public.pdv_quick_actions (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_pdv_quick_actions_active_sort on public.pdv_quick_actions(active, sort_order, label);

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_77_counter_pdv',
  jsonb_build_object(
    'phase', '6.0.62',
    'pdvQuickActionsEnabled', true,
    'mixedPaymentEnabled', true,
    'cancellationReasonRequired', true,
    'reprintSaleEnabled', true,
    'discountRequiresManager', true
  ), now(), now()
)
on conflict (id) do update set settings = public.store_settings.settings || excluded.settings, updated_at = now();

-- ---------------------------------------------------------------------
-- Fase 78: permissões de funcionários.
-- ---------------------------------------------------------------------
create table if not exists public.employee_roles (
  id uuid primary key default gen_random_uuid(),
  role_key text not null unique,
  role_name text not null,
  permissions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

insert into public.employee_roles (role_key, role_name, permissions)
values
  ('attendant', 'Atendente', jsonb_build_array('pdv.sell', 'orders.view', 'tabs.add_items')),
  ('manager', 'Gerente', jsonb_build_array('pdv.sell', 'orders.view', 'orders.cancel', 'cash.close', 'discount.apply', 'reports.view', 'settings.manage')),
  ('courier', 'Motoboy', jsonb_build_array('deliveries.view', 'deliveries.pickup', 'deliveries.confirm')),
  ('kitchen', 'Cozinha', jsonb_build_array('kitchen.view', 'kitchen.mark_ready', 'print.requeue'))
on conflict (role_key) do update set role_name = excluded.role_name, permissions = excluded.permissions, updated_at = now();

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_78_permissions',
  jsonb_build_object(
    'phase', '6.0.62',
    'permissionsModeEnabled', true,
    'managerPasswordRequired', true,
    'criticalActions', jsonb_build_array('cancel_order', 'apply_discount', 'close_cash', 'delete_product')
  ), now(), now()
)
on conflict (id) do update set settings = public.store_settings.settings || excluded.settings, updated_at = now();

-- ---------------------------------------------------------------------
-- Fase 79: relatórios profissionais.
-- ---------------------------------------------------------------------
create or replace view public.professional_sales_report_view
with (security_invoker = true)
as
select
  current_date as report_date,
  count(*) as total_orders,
  coalesce(sum(value), 0) as gross_total,
  coalesce(sum(case when lower(coalesce(payment, '')) like '%pix%' then value else 0 end), 0) as pix_total,
  coalesce(sum(case when lower(coalesce(payment, '')) like '%dinheiro%' then value else 0 end), 0) as cash_total,
  coalesce(sum(case when lower(coalesce(payment, '')) like '%cart%' then value else 0 end), 0) as card_total,
  count(*) filter (where lower(coalesce(status, '')) like '%cancel%') as cancelled_orders
from public.orders
where coalesce(created_at, launched_at, now())::date = current_date;

grant select on public.professional_sales_report_view to anon, authenticated;

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_79_professional_reports',
  jsonb_build_object(
    'phase', '6.0.62',
    'reportsEnabled', true,
    'dailySalesReportEnabled', true,
    'paymentSummaryEnabled', true,
    'addonSalesReportEnabled', true,
    'comboSalesReportEnabled', true
  ), now(), now()
)
on conflict (id) do update set settings = public.store_settings.settings || excluded.settings, updated_at = now();

-- ---------------------------------------------------------------------
-- Fase 80: backup e exportação.
-- ---------------------------------------------------------------------
create table if not exists public.backup_export_runs (
  id uuid primary key default gen_random_uuid(),
  requested_by text not null default 'operador',
  export_type text not null default 'manual',
  status text not null default 'created' check (status in ('created', 'processing', 'done', 'failed')),
  included_tables jsonb not null default '[]'::jsonb,
  file_url text not null default '',
  notes text not null default '',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_80_backup_security',
  jsonb_build_object(
    'phase', '6.0.62',
    'backupEnabled', true,
    'manualExportEnabled', true,
    'recommendedTables', jsonb_build_array('orders', 'order_items', 'products', 'clients', 'cash_sessions', 'tab_accounts')
  ), now(), now()
)
on conflict (id) do update set settings = public.store_settings.settings || excluded.settings, updated_at = now();

-- ---------------------------------------------------------------------
-- Fase 81: painel de cozinha/KDS.
-- ---------------------------------------------------------------------
create table if not exists public.kitchen_display_events (
  id uuid primary key default gen_random_uuid(),
  order_id text not null default '',
  source text not null default 'system',
  status text not null default 'new',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_kitchen_display_events_status_created on public.kitchen_display_events(status, created_at desc);

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_81_kitchen_display',
  jsonb_build_object(
    'phase', '6.0.62',
    'kitchenDisplayEnabled', true,
    'showItemNotes', true,
    'showAddons', true,
    'soundAlertEnabled', true,
    'reprintFromKitchenEnabled', true
  ), now(), now()
)
on conflict (id) do update set settings = public.store_settings.settings || excluded.settings, updated_at = now();

-- ---------------------------------------------------------------------
-- Fase 82: WhatsApp por status e comunicação com cliente.
-- ---------------------------------------------------------------------
create table if not exists public.whatsapp_message_templates (
  id uuid primary key default gen_random_uuid(),
  status_key text not null unique,
  title text not null,
  template text not null,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

insert into public.whatsapp_message_templates (status_key, title, template)
values
  ('approved', 'Pedido aceito', 'Olá, {cliente}! Seu pedido #{pedido} foi aceito pela {loja}. Total: {total}.'),
  ('outForDelivery', 'Saiu para entrega', 'Olá, {cliente}! Seu pedido #{pedido} saiu para entrega.'),
  ('delivered', 'Pedido entregue', 'Olá, {cliente}! Seu pedido #{pedido} foi entregue. A {loja} agradece!'),
  ('cancelled', 'Pedido cancelado', 'Olá, {cliente}. Seu pedido #{pedido} foi cancelado pela {loja}.')
on conflict (status_key) do update set title = excluded.title, template = excluded.template, updated_at = now();

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_82_whatsapp_automation',
  jsonb_build_object(
    'phase', '6.0.62',
    'whatsappAutomationEnabled', true,
    'statusTemplatesEnabled', true,
    'manualSendEnabled', true,
    'variables', jsonb_build_array('{cliente}', '{pedido}', '{loja}', '{total}', '{previsao}')
  ), now(), now()
)
on conflict (id) do update set settings = public.store_settings.settings || excluded.settings, updated_at = now();

-- ---------------------------------------------------------------------
-- Teste consolidado das Fases 74 a 82.
-- ---------------------------------------------------------------------
create table if not exists public.professional_operation_test_runs (
  id uuid primary key default gen_random_uuid(),
  app_version text not null default '6.0.62-fase-74-a-82-operacao-profissional-seguranca',
  test_code text not null default 'TESTE FASE 74-82',
  status text not null default 'draft' check (status in ('draft', 'passed', 'attention', 'blocked')),
  executed_by text not null default 'operador',
  checklist jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  ready_count integer not null default 0,
  total_count integer not null default 0,
  ready_percent integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create or replace function public.run_phase_82_professional_operation_test(p_executed_by text default 'operador')
returns public.professional_operation_test_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  checklist jsonb := '[]'::jsonb;
  ready_count integer := 0;
  total_count integer := 0;
  ready_percent integer := 0;
  row_result public.professional_operation_test_runs;
  security_invoker_count integer := 0;
begin
  select count(*) into security_invoker_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'phase_68_operational_test_summary_view',
      'category_addons_operational_view',
      'phase_67_functional_test_summary_view',
      'stock_control_lanchonete_view',
      'open_commandas_operational_view',
      'menu_lanchonete_view',
      'phase_73_brand_test_summary_view',
      'print_jobs_operational_view',
      'menu_lanchonete_pro_view',
      'desktop_installations_operational_view',
      'production_validation_summary_view',
      'phase_72_complete_retest_summary_view'
    )
    and coalesce(c.reloptions, array[]::text[]) @> array['security_invoker=true'];

  checklist := jsonb_build_array(
    jsonb_build_object('id','phase_74_brand','label','Marca avançada configurável','ok', exists(select 1 from public.store_settings where id = 'phase_74_advanced_branding')),
    jsonb_build_object('id','phase_75_hours','label','Horário e loja aberta/fechada','ok', exists(select 1 from public.store_business_hours) and exists(select 1 from public.store_settings where id = 'phase_75_business_hours')),
    jsonb_build_object('id','phase_76_menu','label','Cardápio profissional','ok', exists(select 1 from public.store_settings where id = 'phase_76_customer_menu')),
    jsonb_build_object('id','phase_77_pdv','label','PDV balcão profissional','ok', exists(select 1 from public.store_settings where id = 'phase_77_counter_pdv')),
    jsonb_build_object('id','phase_78_permissions','label','Permissões de funcionários','ok', exists(select 1 from public.employee_roles where role_key = 'manager')),
    jsonb_build_object('id','phase_79_reports','label','Relatórios profissionais','ok', exists(select 1 from public.store_settings where id = 'phase_79_professional_reports')),
    jsonb_build_object('id','phase_80_backup','label','Backup e exportação','ok', exists(select 1 from public.store_settings where id = 'phase_80_backup_security')),
    jsonb_build_object('id','phase_81_kitchen','label','Painel de cozinha/KDS','ok', exists(select 1 from public.store_settings where id = 'phase_81_kitchen_display')),
    jsonb_build_object('id','phase_82_whatsapp','label','WhatsApp por status','ok', exists(select 1 from public.whatsapp_message_templates where status_key = 'approved')),
    jsonb_build_object('id','security_invoker_views','label','Views corrigidas para SECURITY INVOKER','ok', security_invoker_count >= 8, 'fixedCount', security_invoker_count)
  );

  select count(*)::integer,
         count(*) filter (where coalesce(value ->> 'ok', 'false')::boolean)::integer
    into total_count, ready_count
    from jsonb_array_elements(checklist);

  ready_percent := case when total_count <= 0 then 0 else round((ready_count::numeric / total_count::numeric) * 100)::integer end;

  insert into public.professional_operation_test_runs (
    app_version, test_code, status, executed_by, checklist, details, ready_count, total_count, ready_percent
  ) values (
    '6.0.62-fase-74-a-82-operacao-profissional-seguranca',
    'TESTE FASE 74-82',
    case when ready_percent = 100 then 'passed' when ready_percent >= 70 then 'attention' else 'blocked' end,
    coalesce(nullif(trim(p_executed_by), ''), 'operador'),
    checklist,
    jsonb_build_object('securityInvokerFixedCount', security_invoker_count, 'supabaseAdvisorNote', 'Reabra o Advisor após rodar este SQL; alguns avisos podem demorar a atualizar.'),
    ready_count,
    total_count,
    ready_percent
  ) returning * into row_result;

  return row_result;
end;
$$;

grant execute on function public.run_phase_82_professional_operation_test(text) to anon, authenticated;

create or replace view public.phase_82_professional_operation_summary_view
with (security_invoker = true)
as
select
  id,
  app_version,
  test_code,
  status,
  executed_by,
  ready_count,
  total_count,
  ready_percent,
  created_at,
  updated_at,
  details ->> 'securityInvokerFixedCount' as security_invoker_fixed_count,
  case
    when ready_percent = 100 then 'Fases 74 a 82 aprovadas'
    when ready_percent >= 70 then 'Fases 74 a 82 com atenção'
    else 'Fases 74 a 82 bloqueadas'
  end as operational_label
from public.professional_operation_test_runs;

grant select on public.phase_82_professional_operation_summary_view to anon, authenticated;

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_74_82_professional_bundle',
  jsonb_build_object(
    'phase', '6.0.62',
    'appVersion', '6.0.62-fase-74-a-82-operacao-profissional-seguranca',
    'includedPhases', jsonb_build_array(74,75,76,77,78,79,80,81,82),
    'securityAdvisorFixes', jsonb_build_array('security_invoker_views'),
    'runFunction', 'select * from public.run_phase_82_professional_operation_test(''Gabriel'');'
  ), now(), now()
)
on conflict (id) do update set settings = public.store_settings.settings || excluded.settings, updated_at = now();

update public.print_jobs
   set template_version = '6.0.62',
       updated_at = now()
 where template_version in ('6.0.50','6.0.51','6.0.52','6.0.53','6.0.54','6.0.55','6.0.56','6.0.57','6.0.58','6.0.59','6.0.60','6.0.61');
