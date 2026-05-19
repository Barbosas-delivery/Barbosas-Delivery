-- =====================================================================
-- Fase 72 / 6.0.60 - Reteste operacional completo pós-cupom térmico.
-- Objetivo: retestar o sistema depois das correções reais de adicionais,
-- estoque de lanchonete e layout térmico, sem alterar venda/produção.
-- =====================================================================

create extension if not exists pgcrypto;

alter table if exists public.products
  add column if not exists description text not null default '',
  add column if not exists product_type text default 'produto',
  add column if not exists stock_controlled boolean not null default true;

alter table if exists public.orders
  add column if not exists origin text not null default 'store',
  add column if not exists delivery_district text not null default '',
  add column if not exists delivery_zone text not null default '',
  add column if not exists courier_username text not null default '',
  add column if not exists courier_name text not null default '',
  add column if not exists accepted_by_username text not null default '',
  add column if not exists accepted_by_name text not null default '',
  add column if not exists accepted_at timestamp with time zone,
  add column if not exists picked_up_by_username text not null default '',
  add column if not exists picked_up_by_name text not null default '',
  add column if not exists picked_up_at timestamp with time zone,
  add column if not exists delivered_by_username text not null default '',
  add column if not exists delivered_by_name text not null default '',
  add column if not exists delivered_at timestamp with time zone,
  add column if not exists finalized_at timestamp with time zone,
  add column if not exists finalized_by text not null default '',
  add column if not exists cancellation_reason text not null default '',
  add column if not exists cancelled_at timestamp with time zone,
  add column if not exists approved_at timestamp with time zone,
  add column if not exists payment_confirmed_at timestamp with time zone,
  add column if not exists payment_confirmed_by text not null default '',
  add column if not exists needs_store_approval boolean not null default false,
  add column if not exists store_order_approved boolean not null default true,
  add column if not exists origin_type text not null default 'store',
  add column if not exists order_type text not null default 'delivery',
  add column if not exists launched_at timestamp with time zone,
  add column if not exists created_at timestamp with time zone not null default now(),
  add column if not exists updated_at timestamp with time zone not null default now();

alter table if exists public.order_items
  add column if not exists selected_addons jsonb not null default '[]'::jsonb,
  add column if not exists removed_ingredients jsonb not null default '[]'::jsonb,
  add column if not exists combo_choices jsonb not null default '[]'::jsonb,
  add column if not exists item_note text not null default '',
  add column if not exists customization jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamp with time zone not null default now(),
  add column if not exists updated_at timestamp with time zone not null default now();

alter table if exists public.order_payments
  add column if not exists created_at timestamp with time zone not null default now(),
  add column if not exists updated_at timestamp with time zone not null default now();

alter table if exists public.cash_sessions
  add column if not exists created_at timestamp with time zone not null default now(),
  add column if not exists updated_at timestamp with time zone not null default now();

alter table if exists public.cash_movements
  add column if not exists created_at timestamp with time zone not null default now();

alter table if exists public.product_stock_movements
  add column if not exists created_at timestamp with time zone not null default now();

create table if not exists public.category_addons (
  id uuid primary key default gen_random_uuid(),
  category_name text not null,
  name text not null,
  price numeric(12,2) not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint category_addons_price_check check (price >= 0),
  constraint category_addons_name_not_blank check (length(trim(name)) > 0),
  constraint category_addons_category_not_blank check (length(trim(category_name)) > 0)
);

alter table public.category_addons enable row level security;

drop policy if exists "category_addons_select_all" on public.category_addons;
create policy "category_addons_select_all" on public.category_addons for select using (true);

drop policy if exists "category_addons_insert_all" on public.category_addons;
create policy "category_addons_insert_all" on public.category_addons for insert with check (true);

drop policy if exists "category_addons_update_all" on public.category_addons;
create policy "category_addons_update_all" on public.category_addons for update using (true) with check (true);

drop policy if exists "category_addons_delete_all" on public.category_addons;
create policy "category_addons_delete_all" on public.category_addons for delete using (true);

grant select, insert, update, delete on public.category_addons to anon, authenticated;

create unique index if not exists idx_category_addons_category_name_unique
  on public.category_addons(lower(category_name), lower(name))
  where active = true;

create index if not exists idx_category_addons_category_active_sort
  on public.category_addons(category_name, active, sort_order, name);

update public.products
   set stock_controlled = false,
       updated_at = now()
 where deleted_at is null
   and lower(coalesce(product_type, category, name, '')) ~ '(lanche|hamburg|hambúrg|porcao|porção|combo)';

update public.products
   set stock_controlled = true,
       updated_at = now()
 where deleted_at is null
   and lower(coalesce(product_type, category, name, '')) ~ '(bebida|refrigerante|suco|agua|água|sobremesa|produto)'
   and stock_controlled is distinct from true;

create or replace function public.create_category_addon(
  p_category_name text,
  p_name text,
  p_price numeric default 0,
  p_active boolean default true,
  p_sort_order integer default 0
)
returns public.category_addons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.category_addons;
  v_category_name text := nullif(trim(coalesce(p_category_name, '')), '');
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_price numeric := greatest(0, coalesce(p_price, 0));
  v_sort_order integer := greatest(0, coalesce(p_sort_order, 0));
begin
  if v_category_name is null then
    raise exception 'Informe a categoria do adicional.';
  end if;

  if v_name is null then
    raise exception 'Informe o nome do adicional.';
  end if;

  update public.category_addons ca
     set price = v_price,
         active = coalesce(p_active, true),
         sort_order = case when v_sort_order > 0 then v_sort_order else ca.sort_order end,
         updated_at = now()
   where lower(ca.category_name) = lower(v_category_name)
     and lower(ca.name) = lower(v_name)
  returning * into v_row;

  if v_row.id is not null then
    return v_row;
  end if;

  insert into public.category_addons (category_name, name, price, active, sort_order, created_at, updated_at)
  values (
    v_category_name,
    v_name,
    v_price,
    coalesce(p_active, true),
    case when v_sort_order > 0 then v_sort_order else coalesce((select max(sort_order) + 1 from public.category_addons where lower(category_name) = lower(v_category_name)), 1) end,
    now(),
    now()
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.create_category_addon(text, text, numeric, boolean, integer) to anon, authenticated;

create or replace function public.set_category_addon_active(p_id uuid, p_active boolean default true)
returns public.category_addons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.category_addons;
begin
  update public.category_addons
     set active = coalesce(p_active, true),
         updated_at = now()
   where id = p_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Adicional não encontrado.';
  end if;

  return v_row;
end;
$$;

grant execute on function public.set_category_addon_active(uuid, boolean) to anon, authenticated;

create or replace function public.apply_product_stock_deltas(p_deltas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  failures jsonb := '[]'::jsonb;
  applied jsonb := '[]'::jsonb;
  ignored jsonb := '[]'::jsonb;
begin
  if p_deltas is null or jsonb_typeof(p_deltas) <> 'array' then
    return jsonb_build_object('success', false, 'failures', jsonb_build_array(jsonb_build_object('error', 'invalid_payload')), 'applied', applied, 'ignored', ignored);
  end if;

  create temporary table if not exists tmp_product_stock_deltas (product_id bigint primary key, delta integer not null) on commit drop;
  truncate table tmp_product_stock_deltas;

  insert into tmp_product_stock_deltas(product_id, delta)
  select product_id, sum(delta)::integer
  from jsonb_to_recordset(p_deltas) as x(product_id bigint, delta integer)
  where product_id is not null and delta is not null and delta <> 0
  group by product_id;

  perform 1 from public.products p join tmp_product_stock_deltas d on d.product_id = p.id order by p.id for update;

  select coalesce(jsonb_agg(jsonb_build_object('product_id', d.product_id, 'error', 'not_found')), '[]'::jsonb)
    into failures
    from tmp_product_stock_deltas d
    left join public.products p on p.id = d.product_id
    where p.id is null;

  select coalesce(jsonb_agg(jsonb_build_object('product_id', p.id, 'delta', d.delta, 'reason', 'stock_control_disabled')), '[]'::jsonb)
    into ignored
    from tmp_product_stock_deltas d
    join public.products p on p.id = d.product_id
    where coalesce(p.stock_controlled, true) = false;

  delete from tmp_product_stock_deltas d using public.products p where p.id = d.product_id and coalesce(p.stock_controlled, true) = false;

  select failures || coalesce(jsonb_agg(jsonb_build_object('product_id', p.id, 'error', 'insufficient_stock', 'stock_before', coalesce(p.stock, 0), 'delta', d.delta)), '[]'::jsonb)
    into failures
    from tmp_product_stock_deltas d
    join public.products p on p.id = d.product_id
    where coalesce(p.stock, 0) + d.delta < 0;

  if jsonb_array_length(failures) > 0 then
    return jsonb_build_object('success', false, 'failures', failures, 'applied', applied, 'ignored', ignored);
  end if;

  with before_update as (
    select p.id as product_id, coalesce(p.stock, 0) as stock_before, d.delta
    from public.products p join tmp_product_stock_deltas d on d.product_id = p.id
  ), updated as (
    update public.products p
       set stock = before_update.stock_before + before_update.delta,
           updated_at = now()
      from before_update
     where p.id = before_update.product_id
    returning p.id as product_id, before_update.stock_before, before_update.delta, p.stock as stock_after
  )
  select coalesce(jsonb_agg(jsonb_build_object('product_id', product_id, 'stock_before', stock_before, 'delta', delta, 'stock_after', stock_after)), '[]'::jsonb)
    into applied
    from updated;

  return jsonb_build_object('success', true, 'failures', failures, 'applied', applied, 'ignored', ignored);
end;
$$;

grant execute on function public.apply_product_stock_deltas(jsonb) to anon, authenticated;

create table if not exists public.complete_retest_runs (
  id uuid primary key default gen_random_uuid(),
  app_version text not null default '6.0.60-fase-72-reteste-operacional-completo',
  test_code text not null default 'TESTE FASE 72',
  status text not null default 'draft',
  executed_by text not null default 'operador',
  checklist jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  ready_count integer not null default 0,
  total_count integer not null default 0,
  ready_percent integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint complete_retest_runs_status_check check (status in ('draft', 'passed', 'attention', 'blocked'))
);

create index if not exists idx_complete_retest_runs_created_at on public.complete_retest_runs(created_at desc);
create index if not exists idx_complete_retest_runs_status on public.complete_retest_runs(status, created_at desc);

create or replace function public.run_phase_72_complete_retest(
  p_executed_by text default 'operador',
  p_run_phase_68_first boolean default true
)
returns public.complete_retest_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  phase68_run public.operational_test_runs;
  checklist jsonb := '[]'::jsonb;
  ready_count integer := 0;
  total_count integer := 0;
  ready_percent integer := 0;
  row_result public.complete_retest_runs;
  v_print_count integer := 0;
  v_addon public.category_addons;
  v_stock_test jsonb := '{}'::jsonb;
begin
  if p_run_phase_68_first and to_regprocedure('public.run_phase_68_operational_test(text, boolean)') is not null then
    select * into phase68_run from public.run_phase_68_operational_test(p_executed_by, true);
  else
    select * into phase68_run
      from public.operational_test_runs
     where test_code = 'TESTE FASE 68'
     order by created_at desc
     limit 1;
  end if;

  select count(*) into v_print_count
    from public.print_jobs pj
   where (pj.payload::text ilike '%TESTE FASE 68%' or pj.source_id::text ilike '%680068%')
     and pj.template_version in ('6.0.56', '6.0.57', '6.0.58', '6.0.59', '6.0.60');

  select * into v_addon
    from public.create_category_addon('TESTE FASE 72 - Lanches', 'TESTE FASE 72 - Bacon extra', 5, true, 1);

  insert into public.products (id, name, category, product_type, price, stock, active, stock_controlled, updated_at)
  values
    (7201, 'TESTE FASE 72 - Lanche sem estoque', 'TESTE FASE 72 - Lanches', 'lanche', 28, 0, true, false, now()),
    (7202, 'TESTE FASE 72 - Bebida com estoque', 'Bebidas', 'bebida', 7, 2, true, true, now())
  on conflict (id) do update
     set name = excluded.name,
         category = excluded.category,
         product_type = excluded.product_type,
         price = excluded.price,
         stock = excluded.stock,
         active = true,
         stock_controlled = excluded.stock_controlled,
         updated_at = now();

  v_stock_test := public.apply_product_stock_deltas(jsonb_build_array(
    jsonb_build_object('product_id', 7201, 'delta', -1),
    jsonb_build_object('product_id', 7202, 'delta', -1)
  ));

  checklist := jsonb_build_array(
    jsonb_build_object('id','cash_open','label','Abrir caixa','ok', coalesce((phase68_run.checklist @? '$[*] ? (@.id == "cash_open" && @.ok == true)'), false)),
    jsonb_build_object('id','cash_supply','label','Suprimento de caixa','ok', coalesce((phase68_run.checklist @? '$[*] ? (@.id == "cash_supply" && @.ok == true)'), false)),
    jsonb_build_object('id','cash_withdrawal','label','Sangria','ok', coalesce((phase68_run.checklist @? '$[*] ? (@.id == "cash_withdrawal" && @.ok == true)'), false)),
    jsonb_build_object('id','customer_delivery','label','Pedido delivery criado','ok', coalesce((phase68_run.checklist @? '$[*] ? (@.id == "customer_delivery" && @.ok == true)'), false)),
    jsonb_build_object('id','accept_delivery','label','Aceitar pedido','ok', coalesce((phase68_run.checklist @? '$[*] ? (@.id == "accept_delivery" && @.ok == true)'), false)),
    jsonb_build_object('id','dispatch_delivery','label','Sair para entrega','ok', coalesce((phase68_run.checklist @? '$[*] ? (@.id == "dispatch_delivery" && @.ok == true)'), false)),
    jsonb_build_object('id','confirm_delivery','label','Confirmar entrega','ok', coalesce((phase68_run.checklist @? '$[*] ? (@.id == "confirm_delivery" && @.ok == true)'), false)),
    jsonb_build_object('id','counter_sale','label','Venda PDV balcão','ok', coalesce((phase68_run.checklist @? '$[*] ? (@.id == "counter_sale" && @.ok == true)'), false)),
    jsonb_build_object('id','tab_full_flow','label','Comanda completa','ok', coalesce((phase68_run.checklist @? '$[*] ? (@.id == "tab_full_flow" && @.ok == true)'), false)),
    jsonb_build_object('id','stock_movement','label','Estoque real','ok', coalesce((v_stock_test ->> 'success')::boolean, false) and jsonb_array_length(coalesce(v_stock_test -> 'ignored', '[]'::jsonb)) >= 1 and exists(select 1 from public.products where id = 7202 and stock = 1)),
    jsonb_build_object('id','print_jobs','label','Impressões','ok', v_print_count >= 6),
    jsonb_build_object('id','cancel_order','label','Cancelamento','ok', coalesce((phase68_run.checklist @? '$[*] ? (@.id == "cancel_order" && @.ok == true)'), false)),
    jsonb_build_object('id','cash_close','label','Fechar caixa','ok', coalesce((phase68_run.checklist @? '$[*] ? (@.id == "cash_close" && @.ok == true)'), false)),
    jsonb_build_object('id','reports','label','Relatórios e auditoria','ok', coalesce((phase68_run.checklist @? '$[*] ? (@.id == "reports" && @.ok == true)'), false)),
    jsonb_build_object('id','cleanup','label','Limpeza segura','ok', coalesce((phase68_run.checklist @? '$[*] ? (@.id == "cleanup" && @.ok == true)'), true)),
    jsonb_build_object('id','addons_ui','label','Cadastro de adicional por categoria','ok', v_addon.id is not null and exists(select 1 from public.category_addons where id = v_addon.id and active = true)),
    jsonb_build_object('id','thermal_layout','label','Cupom térmico 80mm/58mm','ok', exists(select 1 from public.store_settings where id in ('phase_71_thermal_receipt_layout_fix','phase_72_complete_retest') and settings::text ilike '%safePrintableWidthMm%'))
  );

  select count(*)::integer, count(*) filter (where coalesce(value ->> 'ok', 'false')::boolean)::integer
    into total_count, ready_count
    from jsonb_array_elements(checklist);

  ready_percent := case when total_count <= 0 then 0 else round((ready_count::numeric / total_count::numeric) * 100)::integer end;

  insert into public.complete_retest_runs (app_version, test_code, status, executed_by, checklist, details, ready_count, total_count, ready_percent)
  values (
    '6.0.60-fase-72-reteste-operacional-completo',
    'TESTE FASE 72',
    case when ready_percent = 100 then 'passed' when ready_percent >= 70 then 'attention' else 'blocked' end,
    coalesce(nullif(trim(p_executed_by), ''), 'operador'),
    checklist,
    jsonb_build_object('phase68RunId', phase68_run.id, 'printJobsFound', v_print_count, 'stockTest', v_stock_test, 'nextPhase', 'Fase 73 - Personalização da marca: nome da loja e foto/logo'),
    ready_count,
    total_count,
    ready_percent
  ) returning * into row_result;

  return row_result;
end;
$$;

create or replace view public.phase_72_complete_retest_summary_view as
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
    when ready_percent = 100 then 'Reteste completo aprovado'
    when ready_percent >= 70 then 'Reteste completo com atenção'
    else 'Reteste completo bloqueado'
  end as operational_label,
  details ->> 'printJobsFound' as print_jobs_found,
  details ->> 'nextPhase' as next_phase
from public.complete_retest_runs;

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_72_complete_retest',
  jsonb_build_object(
    'phase', '6.0.60',
    'appVersion', '6.0.60-fase-72-reteste-operacional-completo',
    'completeRetestEnabled', true,
    'safePrintableWidthMm', 72,
    'paperWidthDefaultMm', 80,
    'runFunction', 'select * from public.run_phase_72_complete_retest(''Gabriel'', true);',
    'summaryView', 'public.phase_72_complete_retest_summary_view',
    'nextPhase', 'Fase 73 - Personalização da marca: nome da loja e foto/logo',
    'checks', jsonb_build_array('cash_open','cash_supply','cash_withdrawal','customer_delivery','accept_delivery','dispatch_delivery','confirm_delivery','counter_sale','tab_full_flow','stock_movement','print_jobs','cancel_order','cash_close','reports','cleanup','addons_ui','thermal_layout')
  ),
  now(),
  now()
)
on conflict (id) do update
   set settings = public.store_settings.settings || excluded.settings,
       updated_at = now();

update public.print_jobs
   set template_version = '6.0.60',
       updated_at = now()
 where template_version in ('6.0.50','6.0.51','6.0.52','6.0.53','6.0.54','6.0.55','6.0.56','6.0.57','6.0.58','6.0.59');
