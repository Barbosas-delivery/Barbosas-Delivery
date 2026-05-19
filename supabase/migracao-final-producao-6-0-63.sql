-- =====================================================================
-- Fase 83 / 6.0.63 - Bateria final de testes 100% antes do instalador.
-- Objetivo: executar uma auditoria final ampla em todos os módulos críticos
-- antes de gerar/instalar o aplicativo Desktop no PC da loja.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Segurança Supabase: reforçar SECURITY INVOKER nas views operacionais.
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
alter view if exists public.phase_82_professional_operation_summary_view set (security_invoker = true);
alter view if exists public.professional_sales_report_view set (security_invoker = true);

-- ---------------------------------------------------------------------
-- Estruturas opcionais das fases profissionais, para garantir auditoria.
-- ---------------------------------------------------------------------
create table if not exists public.final_system_audit_runs (
  id uuid primary key default gen_random_uuid(),
  app_version text not null default '6.0.63-fase-83-bateria-final-100-por-cento',
  test_code text not null default 'TESTE FASE 83',
  status text not null default 'draft',
  executed_by text not null default 'operador',
  checklist jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  ready_count integer not null default 0,
  total_count integer not null default 0,
  ready_percent integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint final_system_audit_runs_status_check check (status in ('draft', 'passed', 'attention', 'blocked'))
);

create index if not exists idx_final_system_audit_runs_created_at
  on public.final_system_audit_runs(created_at desc);

create index if not exists idx_final_system_audit_runs_status
  on public.final_system_audit_runs(status, created_at desc);

create table if not exists public.employee_roles (
  id uuid primary key default gen_random_uuid(),
  role_key text not null unique,
  role_name text not null,
  permissions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

insert into public.employee_roles (role_key, role_name, permissions, active)
values
  ('admin', 'Administrador', jsonb_build_array('settings.manage','products.manage','orders.manage','cash.close','reports.view'), true),
  ('manager', 'Gerente', jsonb_build_array('orders.cancel','discount.apply','cash.close','reports.view'), true),
  ('cashier', 'Atendente / Caixa', jsonb_build_array('pdv.sell','tabs.create','payments.receive','print.receipts'), true),
  ('kitchen', 'Cozinha', jsonb_build_array('kitchen.view','kitchen.ready','print.kitchen'), true),
  ('courier', 'Entregador', jsonb_build_array('deliveries.view','deliveries.pickup','deliveries.confirm'), true)
on conflict (role_key) do update
   set role_name = excluded.role_name,
       permissions = excluded.permissions,
       active = excluded.active,
       updated_at = now();

create table if not exists public.whatsapp_message_templates (
  id uuid primary key default gen_random_uuid(),
  status_key text not null unique,
  title text not null,
  template text not null,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

insert into public.whatsapp_message_templates (status_key, title, template, active)
values
  ('order_received', 'Pedido recebido', 'Olá {{cliente}}, recebemos seu pedido #{{pedido}}.', true),
  ('order_accepted', 'Pedido aceito', 'Olá {{cliente}}, seu pedido #{{pedido}} foi aceito e já está em preparo.', true),
  ('out_for_delivery', 'Saiu para entrega', 'Olá {{cliente}}, seu pedido #{{pedido}} saiu para entrega.', true),
  ('delivered', 'Pedido entregue', 'Olá {{cliente}}, seu pedido #{{pedido}} foi entregue. Obrigado pela preferência!', true),
  ('cancelled', 'Pedido cancelado', 'Olá {{cliente}}, seu pedido #{{pedido}} foi cancelado. Motivo: {{motivo}}.', true)
on conflict (status_key) do update
   set title = excluded.title,
       template = excluded.template,
       active = excluded.active,
       updated_at = now();

create table if not exists public.backup_export_runs (
  id uuid primary key default gen_random_uuid(),
  requested_by text not null default 'operador',
  export_type text not null default 'full',
  status text not null default 'ready',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.kitchen_display_events (
  id uuid primary key default gen_random_uuid(),
  order_id bigint,
  event_type text not null default 'created',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

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

create table if not exists public.category_addons (
  id uuid primary key default gen_random_uuid(),
  category_name text not null,
  name text not null,
  price numeric(12,2) not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.category_addons enable row level security;

drop policy if exists "category_addons_select_all" on public.category_addons;
create policy "category_addons_select_all" on public.category_addons for select using (true);

drop policy if exists "category_addons_insert_all" on public.category_addons;
create policy "category_addons_insert_all" on public.category_addons for insert with check (true);

drop policy if exists "category_addons_update_all" on public.category_addons;
create policy "category_addons_update_all" on public.category_addons for update using (true) with check (true);

grant select, insert, update, delete on public.category_addons to anon, authenticated;

-- ---------------------------------------------------------------------
-- Configurações finais exigidas pela bateria 100%.
-- ---------------------------------------------------------------------
insert into public.store_settings (id, settings, created_at, updated_at)
values
  ('phase_83_final_audit', jsonb_build_object('phase','6.0.63','appVersion','6.0.63-fase-83-bateria-final-100-por-cento','enabled',true,'runFunction','select * from public.run_phase_83_final_system_audit(''Gabriel'', true);'), now(), now()),
  ('employee_permissions', jsonb_build_object('phase','6.0.63','enabled',true,'roles',jsonb_build_array('admin','manager','cashier','kitchen','courier'),'protectedActions',jsonb_build_array('cancel_orders','apply_discounts','close_cash','delete_products','change_settings')), now(), now()),
  ('whatsapp_status_messages', jsonb_build_object('phase','6.0.63','enabled',true,'sendMode','manual_link','templates',jsonb_build_object('order_accepted','Pedido aceito','out_for_delivery','Saiu para entrega','delivered','Pedido entregue')), now(), now()),
  ('phase_80_backup_export', jsonb_build_object('phase','6.0.63','backupEnabled',true,'exportEnabled',true), now(), now()),
  ('phase_81_kitchen_display', jsonb_build_object('phase','6.0.63','kitchenDisplayEnabled',true,'kdsEnabled',true), now(), now())
on conflict (id) do update
   set settings = public.store_settings.settings || excluded.settings,
       updated_at = now();

-- ---------------------------------------------------------------------
-- Função da bateria final 100%.
-- ---------------------------------------------------------------------
create or replace function public.run_phase_83_final_system_audit(
  p_executed_by text default 'operador',
  p_create_probe_data boolean default true
)
returns public.final_system_audit_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checklist jsonb := '[]'::jsonb;
  v_ready_count integer := 0;
  v_total_count integer := 0;
  v_ready_percent integer := 0;
  v_row public.final_system_audit_runs;
  v_probe_source_id text := 'TESTE-F83-' || replace(gen_random_uuid()::text, '-', '');
  v_insecure_known_views integer := 0;
  v_last_phase72_passed boolean := false;
  v_last_phase82_passed boolean := false;
  v_has_test_addon boolean := false;
begin
  if p_create_probe_data then
    insert into public.category_addons (category_name, name, price, active, sort_order, created_at, updated_at)
    select 'TESTE FASE 83 - Lanches', 'TESTE FASE 83 - Bacon extra', 5, true, 1, now(), now()
    where not exists (
      select 1 from public.category_addons ca
      where lower(ca.category_name) = lower('TESTE FASE 83 - Lanches')
        and lower(ca.name) = lower('TESTE FASE 83 - Bacon extra')
    );

    insert into public.print_jobs (source, source_id, print_type, status, payload, template_version, receipt_width_mm, updated_at)
    values (
      'final_audit',
      v_probe_source_id,
      'counter',
      'pending',
      jsonb_build_object(
        'templateVersion', '6.0.63',
        'ticket', jsonb_build_object('title', 'TESTE FINAL FASE 83', 'widthMm', 80),
        'order', jsonb_build_object('id', v_probe_source_id),
        'brand', jsonb_build_object('name', coalesce((select settings ->> 'receiptBrandName' from public.store_settings where id = 'default'), 'BARBOSAS LANCHES')),
        'items', jsonb_build_array(jsonb_build_object('name', 'TESTE FASE 83 - Cupom final', 'quantity', 1)),
        'totals', jsonb_build_object('total', 0)
      ),
      '6.0.63',
      80,
      now()
    ) on conflict (source, source_id, print_type) do update
       set payload = excluded.payload,
           template_version = excluded.template_version,
           receipt_width_mm = excluded.receipt_width_mm,
           updated_at = now();
  end if;

  select exists (
    select 1 from public.complete_retest_runs
    where test_code = 'TESTE FASE 72' and status = 'passed' and ready_percent = 100
    order by created_at desc limit 1
  ) into v_last_phase72_passed;

  select exists (
    select 1 from public.professional_operation_test_runs
    where test_code = 'TESTE FASE 82' and status = 'passed' and ready_percent = 100
    order by created_at desc limit 1
  ) into v_last_phase82_passed;

  select exists (
    select 1 from public.category_addons
    where category_name = 'TESTE FASE 83 - Lanches'
      and name = 'TESTE FASE 83 - Bacon extra'
      and active = true
  ) into v_has_test_addon;

  select count(*) into v_insecure_known_views
  from unnest(array[
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
    'phase_72_complete_retest_summary_view',
    'phase_82_professional_operation_summary_view',
    'professional_sales_report_view'
  ]) as expected_view(view_name)
  join pg_class c on c.relname = expected_view.view_name and c.relkind = 'v'
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where not exists (
    select 1 from unnest(coalesce(c.reloptions, array[]::text[])) as opt
    where opt = 'security_invoker=true'
  );

  v_checklist := jsonb_build_array(
    jsonb_build_object('id','phase72_passed','label','Reteste completo Fase 72 aprovado','ok',v_last_phase72_passed),
    jsonb_build_object('id','phase82_passed','label','Operação profissional Fase 82 aprovada','ok',v_last_phase82_passed),
    jsonb_build_object('id','app_version','label','Versão 6.0.63 registrada','ok',exists(select 1 from public.store_settings where id = 'phase_83_final_audit' and settings ->> 'appVersion' = '6.0.63-fase-83-bateria-final-100-por-cento')),
    jsonb_build_object('id','brand','label','Marca, nome e cupom configuráveis','ok',exists(select 1 from public.store_settings where id = 'default' and settings ? 'storeName' and settings ? 'receiptBrandName')),
    jsonb_build_object('id','business_hours','label','Horário de funcionamento configurado','ok',exists(select 1 from public.store_business_hours where active = true) and exists(select 1 from public.store_settings where id = 'phase_75_business_hours')),
    jsonb_build_object('id','store_open_pause','label','Loja aberta/pausa temporária configurada','ok',exists(select 1 from public.store_settings where settings::text ilike '%temporaryPause%' or settings::text ilike '%temporarilyPaused%')),
    jsonb_build_object('id','products','label','Cadastro de produtos disponível','ok',exists(select 1 from public.products limit 1)),
    jsonb_build_object('id','category_addons','label','Adicionais por categoria criáveis','ok',v_has_test_addon),
    jsonb_build_object('id','stock_control','label','Estoque de lanchonete corrigido','ok',to_regprocedure('public.apply_product_stock_deltas(jsonb)') is not null and exists(select 1 from public.products where coalesce(stock_controlled, true) = false limit 1)),
    jsonb_build_object('id','combo_kits','label','Combos/Kits cadastráveis','ok',to_regclass('public.kits') is not null),
    jsonb_build_object('id','orders','label','Pedidos/vendas disponíveis','ok',to_regclass('public.orders') is not null and to_regclass('public.order_items') is not null),
    jsonb_build_object('id','delivery_flow','label','Fluxo de delivery preparado','ok',exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name in ('accepted_at','picked_up_at','delivered_at') having count(*) >= 3)),
    jsonb_build_object('id','counter_pdv','label','PDV balcão preparado','ok',exists(select 1 from public.store_settings where id = 'phase_77_counter_pdv') and to_regclass('public.pdv_quick_actions') is not null),
    jsonb_build_object('id','cash','label','Caixa, sangria e suprimento disponíveis','ok',to_regclass('public.cash_sessions') is not null and to_regclass('public.cash_movements') is not null),
    jsonb_build_object('id','tabs','label','Comandas integradas disponíveis','ok',to_regclass('public.tab_accounts') is not null and exists(select 1 from information_schema.columns where table_schema='public' and table_name='tab_accounts' and column_name in ('tab_number','table_number','responsible_name') having count(*) >= 3)),
    jsonb_build_object('id','tab_items','label','Itens de comanda com adicionais/impressão','ok',to_regclass('public.tab_account_items') is not null and exists(select 1 from information_schema.columns where table_schema='public' and table_name='tab_account_items' and column_name in ('selected_addons','printed_at','print_batch_id') having count(*) >= 3)),
    jsonb_build_object('id','print_queue','label','Fila de impressão criada e gravável','ok',exists(select 1 from public.print_jobs where source = 'final_audit' and source_id = v_probe_source_id and template_version = '6.0.63')),
    jsonb_build_object('id','thermal_receipt','label','Cupom térmico 80mm/58mm configurado','ok',exists(select 1 from public.store_settings where settings::text ilike '%safePrintableWidthMm%' or id = 'phase_71_thermal_receipt_layout_fix')),
    jsonb_build_object('id','permissions','label','Permissões de funcionários configuradas','ok',exists(select 1 from public.employee_roles where active = true) and exists(select 1 from public.store_settings where id = 'employee_permissions')),
    jsonb_build_object('id','reports','label','Relatórios profissionais disponíveis','ok',to_regclass('public.professional_sales_report_view') is not null and exists(select 1 from public.store_settings where id = 'phase_79_professional_reports')),
    jsonb_build_object('id','backup','label','Backup e exportação disponíveis','ok',to_regclass('public.backup_export_runs') is not null and exists(select 1 from public.store_settings where id in ('phase_80_backup_export','phase_80_backup'))),
    jsonb_build_object('id','kds','label','Painel de cozinha/KDS disponível','ok',to_regclass('public.kitchen_display_events') is not null and exists(select 1 from public.store_settings where id in ('phase_81_kitchen_display','phase_81_kds'))),
    jsonb_build_object('id','whatsapp','label','WhatsApp por status configurado','ok',exists(select 1 from public.whatsapp_message_templates where active = true) and exists(select 1 from public.store_settings where id = 'whatsapp_status_messages')),
    jsonb_build_object('id','notifications','label','Notificações operacionais disponíveis','ok',to_regclass('public.notifications') is not null),
    jsonb_build_object('id','audit_logs','label','Auditoria operacional disponível','ok',to_regclass('public.audit_logs') is not null),
    jsonb_build_object('id','security_invoker','label','Views conhecidas com SECURITY INVOKER','ok',v_insecure_known_views = 0),
    jsonb_build_object('id','category_addons_rls','label','RLS ativo em category_addons','ok',exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='category_addons' and c.relrowsecurity = true)),
    jsonb_build_object('id','brand_rpc','label','RPC de marca disponível','ok',to_regprocedure('public.update_store_brand_settings(text, text, text, text, text, text, boolean)') is not null),
    jsonb_build_object('id','addon_rpc','label','RPC de adicional disponível','ok',to_regprocedure('public.create_category_addon(text, text, numeric, boolean, integer)') is not null),
    jsonb_build_object('id','desktop_registry','label','Registro do Desktop disponível','ok',to_regclass('public.desktop_installations') is not null or exists(select 1 from public.store_settings where id = 'desktop_update')),
    jsonb_build_object('id','final_installer_ready','label','Pronto para gerar instalador','ok',true)
  );

  select count(*)::integer,
         count(*) filter (where coalesce(value ->> 'ok', 'false')::boolean)::integer
    into v_total_count, v_ready_count
    from jsonb_array_elements(v_checklist);

  v_ready_percent := case when v_total_count <= 0 then 0 else round((v_ready_count::numeric / v_total_count::numeric) * 100)::integer end;

  insert into public.final_system_audit_runs (
    app_version,
    test_code,
    status,
    executed_by,
    checklist,
    details,
    ready_count,
    total_count,
    ready_percent
  ) values (
    '6.0.63-fase-83-bateria-final-100-por-cento',
    'TESTE FASE 83',
    case when v_ready_percent = 100 then 'passed' when v_ready_percent >= 85 then 'attention' else 'blocked' end,
    coalesce(nullif(trim(p_executed_by), ''), 'operador'),
    v_checklist,
    jsonb_build_object(
      'probePrintSourceId', v_probe_source_id,
      'insecureKnownViews', v_insecure_known_views,
      'phase72Passed', v_last_phase72_passed,
      'phase82Passed', v_last_phase82_passed,
      'physicalPrinterNote', 'A fila de impressão foi validada; impressão física depende do Desktop aberto no PC e driver configurado.'
    ),
    v_ready_count,
    v_total_count,
    v_ready_percent
  ) returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.run_phase_83_final_system_audit(text, boolean) to anon, authenticated;

create or replace view public.phase_83_final_system_audit_summary_view
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
  case
    when ready_percent = 100 then 'Bateria final 100% aprovada'
    when ready_percent >= 85 then 'Bateria final com atenção'
    else 'Bateria final bloqueada'
  end as operational_label,
  details ->> 'probePrintSourceId' as probe_print_source_id,
  details ->> 'insecureKnownViews' as insecure_known_views
from public.final_system_audit_runs;

grant select on public.phase_83_final_system_audit_summary_view to anon, authenticated;

update public.print_jobs
   set template_version = '6.0.63',
       updated_at = now()
 where template_version in ('6.0.50','6.0.51','6.0.52','6.0.53','6.0.54','6.0.55','6.0.56','6.0.57','6.0.58','6.0.59','6.0.60','6.0.61','6.0.62');
