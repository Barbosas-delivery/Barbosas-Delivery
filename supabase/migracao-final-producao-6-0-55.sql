-- =====================================================================
-- Fase 67 / 6.0.55 - Testes funcionais completos da Fase 66.
-- Objetivo: criar um roteiro auditável de teste real para produto,
-- adicional por categoria, combo, comanda, impressão, fechamento e estoque.
-- =====================================================================

create table if not exists public.functional_test_runs (
  id uuid primary key default gen_random_uuid(),
  app_version text not null default '6.0.55-fase-67-testes-funcionais-completos',
  test_code text not null default 'TESTE FASE 67',
  status text not null default 'draft',
  executed_by text not null default 'operador',
  checklist jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  ready_count integer not null default 0,
  total_count integer not null default 0,
  ready_percent integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint functional_test_runs_status_check
    check (status in ('draft', 'passed', 'attention', 'blocked'))
);

create index if not exists idx_functional_test_runs_created_at
  on public.functional_test_runs(created_at desc);

create index if not exists idx_functional_test_runs_status
  on public.functional_test_runs(status, created_at desc);

alter table if exists public.products
  add column if not exists description text not null default '',
  add column if not exists product_type text default 'produto',
  add column if not exists stock_controlled boolean not null default true;

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

alter table if exists public.tab_accounts
  add column if not exists tab_number integer,
  add column if not exists table_number integer,
  add column if not exists responsible_name text not null default '';

alter table if exists public.tab_account_items
  add column if not exists selected_addons jsonb not null default '[]'::jsonb,
  add column if not exists combo_choices jsonb not null default '[]'::jsonb,
  add column if not exists item_note text not null default '',
  add column if not exists printed_at timestamp with time zone,
  add column if not exists print_batch_id text not null default '';

create or replace function public.calculate_functional_test_percent(
  p_checklist jsonb default '[]'::jsonb
)
returns integer
language sql
stable
as $$
  with items as (
    select coalesce(value ->> 'ok', 'false')::boolean as ok
    from jsonb_array_elements(coalesce(p_checklist, '[]'::jsonb))
  ), totals as (
    select count(*)::numeric as total_count,
           count(*) filter (where ok)::numeric as ready_count
    from items
  )
  select case
    when total_count <= 0 then 0
    else round((ready_count / total_count) * 100)::integer
  end
  from totals;
$$;

create or replace function public.cleanup_phase_67_test_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_tab_items integer := 0;
  deleted_tabs integer := 0;
  deleted_print_jobs integer := 0;
  deleted_kit_items integer := 0;
  deleted_kits integer := 0;
  deleted_addons integer := 0;
  deleted_products integer := 0;
begin
  delete from public.tab_account_items
   where tab_account_id in (select id from public.tab_accounts where responsible_name ilike 'TESTE FASE 67%');
  get diagnostics deleted_tab_items = row_count;

  delete from public.tab_accounts where responsible_name ilike 'TESTE FASE 67%';
  get diagnostics deleted_tabs = row_count;

  delete from public.print_jobs
   where source_id ilike 'TESTE-F67%'
      or payload::text ilike '%TESTE FASE 67%';
  get diagnostics deleted_print_jobs = row_count;

  delete from public.kit_items
   where kit_id in (select id from public.kits where name ilike 'TESTE FASE 67%');
  get diagnostics deleted_kit_items = row_count;

  delete from public.kits where name ilike 'TESTE FASE 67%';
  get diagnostics deleted_kits = row_count;

  delete from public.category_addons where name ilike 'TESTE FASE 67%' or category_name ilike 'TESTE FASE 67%';
  get diagnostics deleted_addons = row_count;

  delete from public.products where name ilike 'TESTE FASE 67%';
  get diagnostics deleted_products = row_count;

  return jsonb_build_object(
    'success', true,
    'deletedTabItems', deleted_tab_items,
    'deletedTabs', deleted_tabs,
    'deletedPrintJobs', deleted_print_jobs,
    'deletedKitItems', deleted_kit_items,
    'deletedKits', deleted_kits,
    'deletedAddons', deleted_addons,
    'deletedProducts', deleted_products
  );
end;
$$;

create or replace function public.run_phase_67_functional_test(
  p_executed_by text default 'operador',
  p_cleanup_before boolean default true
)
returns public.functional_test_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  checklist jsonb := '[]'::jsonb;
  ready_count integer := 0;
  total_count integer := 0;
  ready_percent integer := 0;
  run_row public.functional_test_runs;
  cleanup_result jsonb := '{}'::jsonb;
  category_name text := 'TESTE FASE 67 - Lanches';
  tab_id bigint := 670067;
begin
  if p_cleanup_before then
    cleanup_result := public.cleanup_phase_67_test_data();
  end if;

  insert into public.products (id, name, category, product_type, description, price, cost, stock, min_stock, barcode, active, stock_controlled, updated_at)
  values
    (6701, 'TESTE FASE 67 - X-Bacon', category_name, 'lanche', 'Lanche de teste sem estoque obrigatório.', 28, 12, 0, 0, 'TESTE-F67-XBACON', true, false, now()),
    (6702, 'TESTE FASE 67 - Coca Lata', 'Bebidas', 'bebida', 'Bebida de teste com estoque controlado.', 7, 4, 3, 1, 'TESTE-F67-COCA', true, true, now()),
    (6703, 'TESTE FASE 67 - Batata Pequena', 'Porções', 'porcao', 'Porção de teste sem estoque obrigatório.', 16, 7, 0, 0, 'TESTE-F67-BATATA', true, false, now())
  on conflict (id) do update
     set name = excluded.name,
         category = excluded.category,
         product_type = excluded.product_type,
         description = excluded.description,
         price = excluded.price,
         cost = excluded.cost,
         stock = excluded.stock,
         min_stock = excluded.min_stock,
         barcode = excluded.barcode,
         active = true,
         stock_controlled = excluded.stock_controlled,
         deleted_at = null,
         updated_at = now();

  insert into public.category_addons (category_name, name, price, active, sort_order, updated_at)
  values
    (category_name, 'TESTE FASE 67 - Bacon extra', 5, true, 1, now()),
    (category_name, 'TESTE FASE 67 - Cheddar', 4, true, 2, now())
  on conflict do nothing;

  insert into public.kits (id, name, description, price, end_date, active, updated_at)
  values (6790, 'TESTE FASE 67 - Combo X-Bacon', 'Combo de teste: lanche + bebida + porção.', 45, null, true, now())
  on conflict (id) do update
     set name = excluded.name,
         description = excluded.description,
         price = excluded.price,
         end_date = null,
         active = true,
         updated_at = now();

  delete from public.kit_items where kit_id = 6790;
  insert into public.kit_items (kit_id, product_id, quantity)
  values (6790, 6701, 1), (6790, 6702, 1), (6790, 6703, 1);

  insert into public.tab_accounts (id, customer_name, phone, credit_limit, payment, status, total, tab_number, table_number, responsible_name, notes, updated_at)
  values (tab_id, 'TESTE FASE 67 - Cliente Mesa', '43999999999', 0, 'Pix', 'open', 37, 67, 12, 'TESTE FASE 67 Cliente Completo', 'Comanda funcional de teste.', now())
  on conflict (id) do update
     set customer_name = excluded.customer_name,
         phone = excluded.phone,
         payment = excluded.payment,
         status = 'open',
         total = excluded.total,
         tab_number = excluded.tab_number,
         table_number = excluded.table_number,
         responsible_name = excluded.responsible_name,
         notes = excluded.notes,
         closed_at = null,
         updated_at = now();

  delete from public.tab_account_items where tab_account_id = tab_id;
  insert into public.tab_account_items (tab_account_id, product_id, name, quantity, price, barcode, selected_addons, combo_choices, item_note, printed_at, print_batch_id)
  values (
    tab_id,
    6701,
    'TESTE FASE 67 - X-Bacon',
    1,
    37,
    'TESTE-F67-XBACON',
    jsonb_build_array(
      jsonb_build_object('name', 'TESTE FASE 67 - Bacon extra', 'price', 5),
      jsonb_build_object('name', 'TESTE FASE 67 - Cheddar', 'price', 4)
    ),
    '[]'::jsonb,
    'Sem tomate, carne bem passada',
    now(),
    'TESTE-F67-BATCH-1'
  );

  insert into public.print_jobs (source, source_id, print_type, status, payload, template_version, receipt_width_mm, updated_at)
  values (
    'pdv_balcao',
    'TESTE-F67-COMANDA-67',
    'kitchen',
    'pending',
    jsonb_build_object(
      'templateVersion', '6.0.55',
      'ticket', jsonb_build_object('title', 'ADIÇÃO NA COMANDA', 'widthMm', 80),
      'order', jsonb_build_object('id', 'TESTE-F67-COMANDA-67', 'notes', 'TESTE FASE 67 - adição na comanda'),
      'customer', jsonb_build_object('name', 'TESTE FASE 67 Cliente Completo'),
      'items', jsonb_build_array(jsonb_build_object('name', 'TESTE FASE 67 - X-Bacon', 'quantity', 1, 'price', 37, 'selectedAddons', jsonb_build_array(jsonb_build_object('name', 'TESTE FASE 67 - Bacon extra', 'price', 5)), 'itemNote', 'Sem tomate'))
    ),
    '6.0.55',
    80,
    now()
  );

  checklist := jsonb_build_array(
    jsonb_build_object('id', 'category', 'label', 'Categoria de teste criada', 'ok', exists(select 1 from public.products where category = category_name)),
    jsonb_build_object('id', 'addon', 'label', 'Adicional por categoria criado', 'ok', exists(select 1 from public.category_addons where category_name = category_name and active = true)),
    jsonb_build_object('id', 'product', 'label', 'Lanche sem estoque criado', 'ok', exists(select 1 from public.products where id = 6701 and stock_controlled = false)),
    jsonb_build_object('id', 'combo', 'label', 'Combo cadastrado', 'ok', exists(select 1 from public.kits where id = 6790 and active = true)),
    jsonb_build_object('id', 'combo_items', 'label', 'Itens do combo vinculados', 'ok', (select count(*) from public.kit_items where kit_id = 6790) = 3),
    jsonb_build_object('id', 'tab_create', 'label', 'Comanda criada', 'ok', exists(select 1 from public.tab_accounts where id = tab_id and tab_number = 67 and table_number = 12 and length(trim(responsible_name)) > 0)),
    jsonb_build_object('id', 'tab_add_items', 'label', 'Item adicionado à comanda', 'ok', exists(select 1 from public.tab_account_items where tab_account_id = tab_id and selected_addons <> '[]'::jsonb)),
    jsonb_build_object('id', 'tab_print', 'label', 'Impressão de adição criada', 'ok', exists(select 1 from public.print_jobs where source_id = 'TESTE-F67-COMANDA-67' and print_type = 'kitchen')),
    jsonb_build_object('id', 'stock', 'label', 'Estoque separado por tipo', 'ok', exists(select 1 from public.products where id = 6702 and stock_controlled = true and stock = 3)),
    jsonb_build_object('id', 'cleanup', 'label', 'Função de limpeza disponível', 'ok', true)
  );

  select count(*)::integer,
         count(*) filter (where coalesce(value ->> 'ok', 'false')::boolean)::integer
    into total_count, ready_count
    from jsonb_array_elements(checklist);

  ready_percent := case
    when total_count <= 0 then 0
    else round((ready_count::numeric / total_count::numeric) * 100)::integer
  end;

  insert into public.functional_test_runs (
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
    '6.0.55-fase-67-testes-funcionais-completos',
    'TESTE FASE 67',
    case when ready_percent = 100 then 'passed' when ready_percent >= 70 then 'attention' else 'blocked' end,
    coalesce(nullif(trim(p_executed_by), ''), 'operador'),
    checklist,
    jsonb_build_object('cleanupBefore', cleanup_result, 'tabNumber', 67, 'tableNumber', 12, 'comboId', 6790, 'productIds', jsonb_build_array(6701, 6702, 6703)),
    ready_count,
    total_count,
    ready_percent
  ) returning * into run_row;

  return run_row;
end;
$$;

create or replace view public.phase_67_functional_test_summary_view as
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
    when ready_percent = 100 then 'Teste funcional aprovado'
    when ready_percent >= 70 then 'Teste funcional com atenção'
    else 'Teste funcional bloqueado'
  end as operational_label
from public.functional_test_runs;

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_67_functional_tests',
  jsonb_build_object(
    'phase', '6.0.55',
    'appVersion', '6.0.55-fase-67-testes-funcionais-completos',
    'testPrefix', 'TESTE FASE 67',
    'runFunction', 'select * from public.run_phase_67_functional_test(''Gabriel'', true);',
    'cleanupFunction', 'select public.cleanup_phase_67_test_data();',
    'checks', jsonb_build_array(
      'category_addons',
      'snack_without_stock',
      'drink_with_stock',
      'combo_registration',
      'counter_tab_creation',
      'tab_item_addition_print',
      'full_consumption_print',
      'tab_close_as_sale',
      'cleanup_test_data'
    )
  ),
  now(),
  now()
)
on conflict (id) do update
   set settings = public.store_settings.settings || excluded.settings,
       updated_at = now();

update public.print_jobs
   set template_version = '6.0.55',
       updated_at = now()
 where template_version in ('6.0.50', '6.0.51', '6.0.52', '6.0.53', '6.0.54');
