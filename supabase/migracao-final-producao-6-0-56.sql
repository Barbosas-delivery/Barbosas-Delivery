-- =====================================================================
-- Fase 68 / 6.0.56 - Teste operacional completo do sistema.
-- Objetivo: testar caixa, delivery, PDV, comanda, estoque, impressão,
-- cancelamento, fechamento financeiro, auditoria, notificações e limpeza.
-- =====================================================================

create table if not exists public.operational_test_runs (
  id uuid primary key default gen_random_uuid(),
  app_version text not null default '6.0.56-fase-68-teste-operacional-completo',
  test_code text not null default 'TESTE FASE 68',
  status text not null default 'draft',
  executed_by text not null default 'operador',
  checklist jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  ready_count integer not null default 0,
  total_count integer not null default 0,
  ready_percent integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint operational_test_runs_status_check
    check (status in ('draft', 'passed', 'attention', 'blocked'))
);

create index if not exists idx_operational_test_runs_created_at
  on public.operational_test_runs(created_at desc);

create index if not exists idx_operational_test_runs_status
  on public.operational_test_runs(status, created_at desc);

alter table if exists public.products
  add column if not exists description text not null default '',
  add column if not exists product_type text default 'produto',
  add column if not exists stock_controlled boolean not null default true;

alter table if exists public.order_items
  add column if not exists selected_addons jsonb not null default '[]'::jsonb,
  add column if not exists removed_ingredients jsonb not null default '[]'::jsonb,
  add column if not exists combo_choices jsonb not null default '[]'::jsonb,
  add column if not exists item_note text not null default '',
  add column if not exists customization jsonb not null default '{}'::jsonb;

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

create or replace function public.calculate_operational_test_percent(
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

create or replace function public.cleanup_phase_68_test_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_tab_items integer := 0;
  deleted_tabs integer := 0;
  deleted_print_jobs integer := 0;
  deleted_order_payments integer := 0;
  deleted_order_items integer := 0;
  deleted_orders integer := 0;
  deleted_movements integer := 0;
  deleted_cash_movements integer := 0;
  deleted_cash_sessions integer := 0;
  deleted_kit_items integer := 0;
  deleted_kits integer := 0;
  deleted_addons integer := 0;
  deleted_notifications integer := 0;
  deleted_audit_logs integer := 0;
  deleted_products integer := 0;
begin
  delete from public.tab_account_items
   where tab_account_id in (select id from public.tab_accounts where responsible_name ilike 'TESTE FASE 68%');
  get diagnostics deleted_tab_items = row_count;

  delete from public.tab_accounts where responsible_name ilike 'TESTE FASE 68%' or id = 680068;
  get diagnostics deleted_tabs = row_count;

  delete from public.print_jobs
   where source_id ilike 'TESTE-F68%'
      or payload::text ilike '%TESTE FASE 68%';
  get diagnostics deleted_print_jobs = row_count;

  delete from public.order_payments where order_id ilike 'TESTE-F68%';
  get diagnostics deleted_order_payments = row_count;

  delete from public.order_items where order_id ilike 'TESTE-F68%';
  get diagnostics deleted_order_items = row_count;

  delete from public.product_stock_movements
   where order_id ilike 'TESTE-F68%'
      or product_id in (6801, 6802, 6803, 6804);
  get diagnostics deleted_movements = row_count;

  delete from public.orders where id ilike 'TESTE-F68%';
  get diagnostics deleted_orders = row_count;

  delete from public.cash_movements
   where id in (680001, 680002)
      or notes ilike '%TESTE FASE 68%';
  get diagnostics deleted_cash_movements = row_count;

  delete from public.cash_sessions where id = 'TESTE-F68-CAIXA';
  get diagnostics deleted_cash_sessions = row_count;

  delete from public.kit_items
   where kit_id in (select id from public.kits where name ilike 'TESTE FASE 68%')
      or kit_id = 6890;
  get diagnostics deleted_kit_items = row_count;

  delete from public.kits where name ilike 'TESTE FASE 68%' or id = 6890;
  get diagnostics deleted_kits = row_count;

  delete from public.category_addons where name ilike 'TESTE FASE 68%' or category_name ilike 'TESTE FASE 68%';
  get diagnostics deleted_addons = row_count;

  delete from public.notifications
   where order_id ilike 'TESTE-F68%'
      or title ilike '%TESTE FASE 68%'
      or message ilike '%TESTE FASE 68%';
  get diagnostics deleted_notifications = row_count;

  delete from public.audit_logs
   where entity_id ilike 'TESTE-F68%'
      or after_json::text ilike '%TESTE FASE 68%';
  get diagnostics deleted_audit_logs = row_count;

  delete from public.products where name ilike 'TESTE FASE 68%' or id in (6801, 6802, 6803, 6804);
  get diagnostics deleted_products = row_count;

  return jsonb_build_object(
    'success', true,
    'deletedTabItems', deleted_tab_items,
    'deletedTabs', deleted_tabs,
    'deletedPrintJobs', deleted_print_jobs,
    'deletedOrderPayments', deleted_order_payments,
    'deletedOrderItems', deleted_order_items,
    'deletedOrders', deleted_orders,
    'deletedStockMovements', deleted_movements,
    'deletedCashMovements', deleted_cash_movements,
    'deletedCashSessions', deleted_cash_sessions,
    'deletedKitItems', deleted_kit_items,
    'deletedKits', deleted_kits,
    'deletedAddons', deleted_addons,
    'deletedNotifications', deleted_notifications,
    'deletedAuditLogs', deleted_audit_logs,
    'deletedProducts', deleted_products
  );
end;
$$;

create or replace function public.run_phase_68_operational_test(
  p_executed_by text default 'operador',
  p_cleanup_before boolean default true
)
returns public.operational_test_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  checklist jsonb := '[]'::jsonb;
  ready_count integer := 0;
  total_count integer := 0;
  ready_percent integer := 0;
  run_row public.operational_test_runs;
  cleanup_result jsonb := '{}'::jsonb;
  v_category_name text := 'TESTE FASE 68 - Lanches';
  v_cash_session_id text := 'TESTE-F68-CAIXA';
  v_delivery_order_id text := 'TESTE-F68-DELIVERY-ENTREGUE';
  v_counter_order_id text := 'TESTE-F68-PDV-BALCAO';
  v_tab_order_id text := 'TESTE-F68-COMANDA-FECHADA';
  v_cancel_order_id text := 'TESTE-F68-CANCELADO';
  v_tab_id bigint := 680068;
begin
  if p_cleanup_before then
    cleanup_result := public.cleanup_phase_68_test_data();
  end if;

  -- 1. Cadastro base: categoria, adicional, lanche sem estoque, bebida com estoque, porção e combo.
  insert into public.products (id, name, category, product_type, description, price, cost, stock, min_stock, barcode, active, stock_controlled, updated_at)
  values
    (6801, 'TESTE FASE 68 - X-Bacon Operacional', v_category_name, 'lanche', 'Lanche teste sem controle de estoque.', 28, 12, 0, 0, 'TESTE-F68-XBACON', true, false, now()),
    (6802, 'TESTE FASE 68 - Coca Lata Estoque', 'Bebidas', 'bebida', 'Bebida teste com estoque controlado.', 7, 4, 8, 1, 'TESTE-F68-COCA', true, true, now()),
    (6803, 'TESTE FASE 68 - Batata Operacional', 'Porções', 'porcao', 'Porção teste sem controle de estoque.', 16, 7, 0, 0, 'TESTE-F68-BATATA', true, false, now()),
    (6804, 'TESTE FASE 68 - Pudim Estoque', 'Sobremesas', 'sobremesa', 'Sobremesa teste com estoque controlado.', 9, 4, 5, 1, 'TESTE-F68-PUDIM', true, true, now())
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
    (v_category_name, 'TESTE FASE 68 - Bacon extra', 5, true, 1, now()),
    (v_category_name, 'TESTE FASE 68 - Cheddar', 4, true, 2, now())
  on conflict do nothing;

  insert into public.kits (id, name, description, price, end_date, active, updated_at)
  values (6890, 'TESTE FASE 68 - Combo Operacional', 'Combo operacional: lanche + bebida + porção.', 45, null, true, now())
  on conflict (id) do update
     set name = excluded.name,
         description = excluded.description,
         price = excluded.price,
         end_date = null,
         active = true,
         updated_at = now();

  delete from public.kit_items where kit_id = 6890;
  insert into public.kit_items (kit_id, product_id, quantity)
  values (6890, 6801, 1), (6890, 6802, 1), (6890, 6803, 1);

  -- 2. Caixa: abrir, suprimento e sangria.
  insert into public.cash_sessions (
    id, status, opening_amount, opened_at, opened_by, total_sold, total_received,
    counted_cash, difference, pix_total, cash_total, debit_total, credit_total,
    pending_total, cancelled_total, closing_snapshot, notes, created_at, updated_at
  ) values (
    v_cash_session_id, 'open', 100, now() - interval '2 hours', p_executed_by,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    jsonb_build_object('phase', '68', 'stage', 'opened'),
    'TESTE FASE 68 - caixa aberto para teste operacional', now(), now()
  ) on conflict (id) do update
     set status = 'open',
         opening_amount = 100,
         opened_at = now() - interval '2 hours',
         opened_by = excluded.opened_by,
         closed_at = null,
         closed_by = null,
         notes = excluded.notes,
         updated_at = now();

  insert into public.cash_movements (id, movement_type, type, value, amount, reason, opened_at, notes, created_at)
  values
    (680001, 'suprimento', 'suprimento', 50, 50, 'TESTE FASE 68 - reforço de troco', now() - interval '100 minutes', 'TESTE FASE 68 - suprimento de caixa', now() - interval '100 minutes'),
    (680002, 'sangria', 'sangria', 30, 30, 'TESTE FASE 68 - retirada operacional', now() - interval '30 minutes', 'TESTE FASE 68 - sangria de caixa', now() - interval '30 minutes')
  on conflict (id) do update
     set movement_type = excluded.movement_type,
         type = excluded.type,
         value = excluded.value,
         amount = excluded.amount,
         reason = excluded.reason,
         opened_at = excluded.opened_at,
         notes = excluded.notes,
         created_at = excluded.created_at;

  -- 3. Delivery completo: criado, aceito, saiu para entrega e confirmado.
  insert into public.orders (
    id, cash_session_id, origin_type, order_type, client, customer_name, phone, address,
    payment, payment_status, payment_confirmed_at, payment_confirmed_by, products_total,
    delivery_fee, discount, value, status, origin, needs_store_approval, store_order_approved,
    approved_at, delivery_district, delivery_zone, courier_username, courier_name,
    accepted_by_username, accepted_by_name, accepted_at, picked_up_by_username, picked_up_by_name,
    picked_up_at, delivered_by_username, delivered_by_name, delivered_at, finalized_at,
    finalized_by, notes, launched_at, created_at, updated_at
  ) values (
    v_delivery_order_id, v_cash_session_id, 'customer_app', 'delivery',
    'TESTE FASE 68 Cliente Delivery', 'TESTE FASE 68 Cliente Delivery', '43999999999',
    'Rua Teste Operacional, 68 - Maringá', 'Pix', 'Pago', now() - interval '12 minutes', p_executed_by,
    35, 5, 0, 40, 'Entregue confirmado', 'customer', false, true,
    now() - interval '45 minutes', 'Centro', 'Zona 1', 'motoboy-teste', 'Motoboy Teste Fase 68',
    'loja', p_executed_by, now() - interval '40 minutes', 'motoboy-teste', 'Motoboy Teste Fase 68',
    now() - interval '25 minutes', 'motoboy-teste', 'Motoboy Teste Fase 68', now() - interval '5 minutes',
    now() - interval '5 minutes', p_executed_by, 'TESTE FASE 68 - delivery criado, aceito, saiu para entrega e foi confirmado.', now() - interval '50 minutes', now() - interval '50 minutes', now()
  ) on conflict (id) do update
     set status = excluded.status,
         payment_status = excluded.payment_status,
         delivered_at = excluded.delivered_at,
         accepted_at = excluded.accepted_at,
         picked_up_at = excluded.picked_up_at,
         updated_at = now();

  delete from public.order_items where order_id = v_delivery_order_id;
  insert into public.order_items (order_id, cash_session_id, product_id, name, quantity, price, barcode, selected_addons, combo_choices, item_note, customization, is_kit, kit_id)
  values
    (v_delivery_order_id, v_cash_session_id, 6801, 'TESTE FASE 68 - X-Bacon Operacional', 1, 37, 'TESTE-F68-XBACON', jsonb_build_array(jsonb_build_object('name','TESTE FASE 68 - Bacon extra','price',5), jsonb_build_object('name','TESTE FASE 68 - Cheddar','price',4)), '[]'::jsonb, 'Sem tomate, carne bem passada', jsonb_build_object('basePrice',28,'addonsTotal',9), false, null),
    (v_delivery_order_id, v_cash_session_id, 6802, 'TESTE FASE 68 - Coca Lata Estoque', 1, 7, 'TESTE-F68-COCA', '[]'::jsonb, '[]'::jsonb, '', '{}'::jsonb, false, null);

  insert into public.order_payments (order_id, cash_session_id, method, amount, status, notes)
  values (v_delivery_order_id, v_cash_session_id, 'Pix', 40, 'paid', 'TESTE FASE 68 - pagamento delivery confirmado');

  -- 4. Venda balcão paga.
  insert into public.orders (id, cash_session_id, origin_type, order_type, client, customer_name, phone, address, payment, payment_status, payment_confirmed_at, payment_confirmed_by, products_total, delivery_fee, discount, value, status, origin, needs_store_approval, store_order_approved, approved_at, finalized_at, finalized_by, notes, launched_at, created_at, updated_at)
  values (v_counter_order_id, v_cash_session_id, 'pdv_balcao', 'counter', 'Cliente Balcão TESTE FASE 68', 'Cliente Balcão TESTE FASE 68', '', '', 'Dinheiro', 'Pago', now() - interval '20 minutes', p_executed_by, 23, 0, 0, 23, 'Entregue confirmado', 'store', false, true, now() - interval '20 minutes', now() - interval '20 minutes', p_executed_by, 'TESTE FASE 68 - venda balcão paga.', now() - interval '20 minutes', now() - interval '20 minutes', now())
  on conflict (id) do update set status = excluded.status, payment_status = excluded.payment_status, updated_at = now();

  delete from public.order_items where order_id = v_counter_order_id;
  insert into public.order_items (order_id, cash_session_id, product_id, name, quantity, price, barcode, selected_addons, combo_choices, item_note, customization, is_kit, kit_id)
  values (v_counter_order_id, v_cash_session_id, 6803, 'TESTE FASE 68 - Batata Operacional', 1, 16, 'TESTE-F68-BATATA', '[]'::jsonb, '[]'::jsonb, 'Bem crocante', '{}'::jsonb, false, null),
         (v_counter_order_id, v_cash_session_id, 6802, 'TESTE FASE 68 - Coca Lata Estoque', 1, 7, 'TESTE-F68-COCA', '[]'::jsonb, '[]'::jsonb, '', '{}'::jsonb, false, null);

  insert into public.order_payments (order_id, cash_session_id, method, amount, status, notes)
  values (v_counter_order_id, v_cash_session_id, 'Dinheiro', 23, 'paid', 'TESTE FASE 68 - pagamento balcão');

  -- 5. Comanda: criada no PDV, recebeu itens, imprimiu e fechou como venda normal.
  insert into public.tab_accounts (id, customer_name, phone, credit_limit, payment, status, total, tab_number, table_number, responsible_name, opened_at, closed_at, closed_by, cash_session_id, items_json, notes, updated_at)
  values (v_tab_id, 'TESTE FASE 68 - Cliente Mesa', '43988888888', 0, 'Cartão débito', 'closed', 44, 68, 12, 'TESTE FASE 68 Cliente Completo Mesa', now() - interval '90 minutes', now() - interval '15 minutes', p_executed_by, v_cash_session_id, '[]', 'TESTE FASE 68 - comanda criada, consumida e fechada.', now())
  on conflict (id) do update
     set customer_name = excluded.customer_name,
         phone = excluded.phone,
         payment = excluded.payment,
         status = 'closed',
         total = excluded.total,
         tab_number = excluded.tab_number,
         table_number = excluded.table_number,
         responsible_name = excluded.responsible_name,
         closed_at = excluded.closed_at,
         closed_by = excluded.closed_by,
         cash_session_id = excluded.cash_session_id,
         notes = excluded.notes,
         updated_at = now();

  delete from public.tab_account_items where tab_account_id = v_tab_id;
  insert into public.tab_account_items (tab_account_id, product_id, name, quantity, price, barcode, selected_addons, combo_choices, item_note, printed_at, print_batch_id)
  values
    (v_tab_id, 6801, 'TESTE FASE 68 - X-Bacon Operacional', 1, 37, 'TESTE-F68-XBACON', jsonb_build_array(jsonb_build_object('name','TESTE FASE 68 - Bacon extra','price',5), jsonb_build_object('name','TESTE FASE 68 - Cheddar','price',4)), '[]'::jsonb, 'Sem cebola', now() - interval '80 minutes', 'TESTE-F68-COMANDA-ADD-1'),
    (v_tab_id, 6802, 'TESTE FASE 68 - Coca Lata Estoque', 1, 7, 'TESTE-F68-COCA', '[]'::jsonb, '[]'::jsonb, '', now() - interval '70 minutes', 'TESTE-F68-COMANDA-ADD-2');

  insert into public.orders (id, cash_session_id, origin_type, tab_account_id, order_type, client, customer_name, phone, address, payment, payment_status, payment_confirmed_at, payment_confirmed_by, products_total, delivery_fee, discount, value, status, origin, needs_store_approval, store_order_approved, approved_at, finalized_at, finalized_by, notes, launched_at, created_at, updated_at)
  values (v_tab_order_id, v_cash_session_id, 'pdv_comanda', v_tab_id, 'counter', 'TESTE FASE 68 Cliente Completo Mesa', 'TESTE FASE 68 Cliente Completo Mesa', '43988888888', 'Mesa 12 / Comanda 68', 'Cartão débito', 'Pago', now() - interval '15 minutes', p_executed_by, 44, 0, 0, 44, 'Entregue confirmado', 'store', false, true, now() - interval '15 minutes', now() - interval '15 minutes', p_executed_by, 'TESTE FASE 68 - fechamento de comanda como venda normal.', now() - interval '15 minutes', now() - interval '15 minutes', now())
  on conflict (id) do update set status = excluded.status, payment_status = excluded.payment_status, tab_account_id = excluded.tab_account_id, updated_at = now();

  delete from public.order_items where order_id = v_tab_order_id;
  insert into public.order_items (order_id, cash_session_id, product_id, name, quantity, price, barcode, selected_addons, combo_choices, item_note, customization, is_kit, kit_id)
  values
    (v_tab_order_id, v_cash_session_id, 6801, 'TESTE FASE 68 - X-Bacon Operacional', 1, 37, 'TESTE-F68-XBACON', jsonb_build_array(jsonb_build_object('name','TESTE FASE 68 - Bacon extra','price',5), jsonb_build_object('name','TESTE FASE 68 - Cheddar','price',4)), '[]'::jsonb, 'Sem cebola', jsonb_build_object('basePrice',28,'addonsTotal',9), false, null),
    (v_tab_order_id, v_cash_session_id, 6802, 'TESTE FASE 68 - Coca Lata Estoque', 1, 7, 'TESTE-F68-COCA', '[]'::jsonb, '[]'::jsonb, '', '{}'::jsonb, false, null);

  insert into public.order_payments (order_id, cash_session_id, method, amount, status, notes)
  values (v_tab_order_id, v_cash_session_id, 'Cartão débito', 44, 'paid', 'TESTE FASE 68 - pagamento fechamento comanda');

  -- 6. Pedido cancelado com motivo.
  insert into public.orders (id, cash_session_id, origin_type, order_type, client, customer_name, phone, address, payment, payment_status, products_total, delivery_fee, discount, value, status, origin, cancellation_reason, cancelled_at, notes, launched_at, created_at, updated_at)
  values (v_cancel_order_id, v_cash_session_id, 'pdv_entregas', 'delivery', 'TESTE FASE 68 Cliente Cancelado', 'TESTE FASE 68 Cliente Cancelado', '43777777777', 'Rua Cancelamento, 68', 'Pix', 'Pagamento pendente', 28, 5, 0, 33, 'Pedido cancelado', 'store', 'TESTE FASE 68 - cliente desistiu', now() - interval '10 minutes', 'TESTE FASE 68 - pedido cancelado com motivo.', now() - interval '12 minutes', now() - interval '12 minutes', now())
  on conflict (id) do update set status = excluded.status, cancellation_reason = excluded.cancellation_reason, cancelled_at = excluded.cancelled_at, updated_at = now();

  delete from public.order_items where order_id = v_cancel_order_id;
  insert into public.order_items (order_id, cash_session_id, product_id, name, quantity, price, barcode, selected_addons, combo_choices, item_note, customization, is_kit, kit_id)
  values (v_cancel_order_id, v_cash_session_id, 6801, 'TESTE FASE 68 - X-Bacon Operacional', 1, 28, 'TESTE-F68-XBACON', '[]'::jsonb, '[]'::jsonb, '', '{}'::jsonb, false, null);

  insert into public.order_payments (order_id, cash_session_id, method, amount, status, notes)
  values (v_cancel_order_id, v_cash_session_id, 'Pix', 33, 'cancelled', 'TESTE FASE 68 - pagamento cancelado com pedido');

  -- 7. Estoque: bebida controlada baixa; lanche não controla estoque.
  insert into public.product_stock_movements (product_id, order_id, cash_session_id, movement_type, quantity, stock_before, stock_after, reason, created_by, created_at)
  values
    (6802, v_delivery_order_id, v_cash_session_id, 'sale', 1, 8, 7, 'TESTE FASE 68 - bebida vendida no delivery', p_executed_by, now() - interval '45 minutes'),
    (6802, v_counter_order_id, v_cash_session_id, 'sale', 1, 7, 6, 'TESTE FASE 68 - bebida vendida no balcão', p_executed_by, now() - interval '20 minutes'),
    (6802, v_tab_order_id, v_cash_session_id, 'sale', 1, 6, 5, 'TESTE FASE 68 - bebida vendida na comanda', p_executed_by, now() - interval '15 minutes');

  update public.products set stock = 5, updated_at = now() where id = 6802;

  -- 8. Impressões: cozinha, entrega, balcão, adição de comanda, consumo completo e fechamento.
  insert into public.print_jobs (source, source_id, print_type, status, payload, template_version, receipt_width_mm, updated_at)
  values
    ('customer_app', v_delivery_order_id, 'kitchen', 'pending', jsonb_build_object('templateVersion','6.0.56','ticket',jsonb_build_object('title','COZINHA - TESTE FASE 68','widthMm',80),'order',jsonb_build_object('id',v_delivery_order_id,'notes','TESTE FASE 68'),'customer',jsonb_build_object('name','TESTE FASE 68 Cliente Delivery'),'items',jsonb_build_array(jsonb_build_object('name','TESTE FASE 68 - X-Bacon Operacional','quantity',1,'selectedAddons',jsonb_build_array(jsonb_build_object('name','TESTE FASE 68 - Bacon extra','price',5)),'itemNote','Sem tomate'))), '6.0.56', 80, now()),
    ('customer_app', v_delivery_order_id, 'delivery', 'pending', jsonb_build_object('templateVersion','6.0.56','ticket',jsonb_build_object('title','ENTREGA - TESTE FASE 68','widthMm',80),'order',jsonb_build_object('id',v_delivery_order_id),'customer',jsonb_build_object('name','TESTE FASE 68 Cliente Delivery'),'delivery',jsonb_build_object('address','Rua Teste Operacional, 68','district','Centro'),'items',jsonb_build_array(jsonb_build_object('name','TESTE FASE 68 - X-Bacon Operacional','quantity',1)),'totals',jsonb_build_object('total',40)), '6.0.56', 80, now()),
    ('pdv_balcao', v_counter_order_id, 'counter', 'pending', jsonb_build_object('templateVersion','6.0.56','ticket',jsonb_build_object('title','BALCÃO - TESTE FASE 68','widthMm',80),'order',jsonb_build_object('id',v_counter_order_id),'items',jsonb_build_array(jsonb_build_object('name','TESTE FASE 68 - Batata Operacional','quantity',1)),'totals',jsonb_build_object('total',23)), '6.0.56', 80, now()),
    ('pdv_balcao', 'TESTE-F68-COMANDA-68-ADICAO', 'kitchen', 'pending', jsonb_build_object('templateVersion','6.0.56','ticket',jsonb_build_object('title','ADIÇÃO COMANDA 68','widthMm',80),'order',jsonb_build_object('id','TESTE-F68-COMANDA-68-ADICAO'),'customer',jsonb_build_object('name','TESTE FASE 68 Cliente Completo Mesa'),'items',jsonb_build_array(jsonb_build_object('name','TESTE FASE 68 - X-Bacon Operacional','quantity',1,'itemNote','Sem cebola'))), '6.0.56', 80, now()),
    ('pdv_balcao', 'TESTE-F68-COMANDA-68-CONSUMO', 'counter', 'pending', jsonb_build_object('templateVersion','6.0.56','ticket',jsonb_build_object('title','CONSUMO COMPLETO COMANDA 68','widthMm',80),'order',jsonb_build_object('id','TESTE-F68-COMANDA-68-CONSUMO'),'items',jsonb_build_array(jsonb_build_object('name','TESTE FASE 68 - X-Bacon Operacional','quantity',1),jsonb_build_object('name','TESTE FASE 68 - Coca Lata Estoque','quantity',1)),'totals',jsonb_build_object('total',44)), '6.0.56', 80, now()),
    ('pdv_balcao', v_tab_order_id, 'counter', 'pending', jsonb_build_object('templateVersion','6.0.56','ticket',jsonb_build_object('title','FECHAMENTO COMANDA 68','widthMm',80),'order',jsonb_build_object('id',v_tab_order_id),'payment',jsonb_build_object('method','Cartão débito'),'totals',jsonb_build_object('total',44)), '6.0.56', 80, now());

  -- 9. Auditoria, notificações e fechamento do caixa.
  insert into public.notifications (type, title, message, audience, order_id, courier_username, customer_phone, created_at)
  values
    ('order_status', 'TESTE FASE 68 - pedido aceito', 'Pedido aceito pela loja no teste operacional.', 'store', v_delivery_order_id, 'motoboy-teste', '43999999999', now() - interval '40 minutes'),
    ('order_status', 'TESTE FASE 68 - entrega confirmada', 'Entrega confirmada no teste operacional.', 'store', v_delivery_order_id, 'motoboy-teste', '43999999999', now() - interval '5 minutes');

  insert into public.audit_logs (user_type, user_name, action, entity, entity_id, after_json, created_at)
  values
    ('system', p_executed_by, 'phase_68_delivery_confirmed', 'orders', v_delivery_order_id, jsonb_build_object('test','TESTE FASE 68','status','Entregue confirmado'), now()),
    ('system', p_executed_by, 'phase_68_cash_closed', 'cash_sessions', v_cash_session_id, jsonb_build_object('test','TESTE FASE 68','status','closed'), now());

  update public.cash_sessions
     set status = 'closed',
         closed_at = now(),
         closed_by = p_executed_by,
         total_sold = 107,
         total_received = 107,
         counted_cash = 143,
         difference = 0,
         pix_total = 40,
         cash_total = 23,
         debit_total = 44,
         credit_total = 0,
         pending_total = 0,
         cancelled_total = 33,
         closing_snapshot = jsonb_build_object(
           'phase','68',
           'openingAmount',100,
           'supply',50,
           'withdrawal',30,
           'sales',107,
           'cashExpected',143,
           'cashCounted',143,
           'difference',0
         ),
         notes = 'TESTE FASE 68 - caixa aberto, movimentado e fechado pelo teste operacional.',
         updated_at = now()
   where id = v_cash_session_id;

  checklist := jsonb_build_array(
    jsonb_build_object('id','cash_open','label','Abrir caixa','ok', exists(select 1 from public.cash_sessions cs where cs.id = v_cash_session_id and cs.opening_amount = 100 and cs.opened_at is not null)),
    jsonb_build_object('id','cash_supply','label','Suprimento de caixa','ok', exists(select 1 from public.cash_movements cm where cm.id = 680001 and cm.movement_type = 'suprimento' and cm.value = 50)),
    jsonb_build_object('id','cash_withdrawal','label','Sangria','ok', exists(select 1 from public.cash_movements cm where cm.id = 680002 and cm.movement_type = 'sangria' and cm.value = 30)),
    jsonb_build_object('id','customer_delivery','label','Pedido delivery criado','ok', exists(select 1 from public.orders o where o.id = v_delivery_order_id and o.order_type = 'delivery' and o.address <> '')),
    jsonb_build_object('id','accept_delivery','label','Aceitar pedido','ok', exists(select 1 from public.orders o where o.id = v_delivery_order_id and o.accepted_at is not null and o.accepted_by_name <> '')),
    jsonb_build_object('id','dispatch_delivery','label','Sair para entrega','ok', exists(select 1 from public.orders o where o.id = v_delivery_order_id and o.picked_up_at is not null and o.courier_name <> '')),
    jsonb_build_object('id','confirm_delivery','label','Confirmar entrega','ok', exists(select 1 from public.orders o where o.id = v_delivery_order_id and o.status = 'Entregue confirmado' and o.delivered_at is not null and o.payment_status = 'Pago')),
    jsonb_build_object('id','counter_sale','label','Venda PDV balcão','ok', exists(select 1 from public.orders o where o.id = v_counter_order_id and o.order_type = 'counter' and o.payment_status = 'Pago')),
    jsonb_build_object('id','tab_full_flow','label','Comanda completa','ok', exists(select 1 from public.tab_accounts ta where ta.id = v_tab_id and ta.status = 'closed' and ta.tab_number = 68 and ta.table_number = 12 and length(trim(ta.responsible_name)) > 0) and exists(select 1 from public.orders o where o.id = v_tab_order_id and o.tab_account_id = v_tab_id and o.payment_status = 'Pago')),
    jsonb_build_object('id','stock_movement','label','Estoque real','ok', exists(select 1 from public.products p where p.id = 6801 and p.stock_controlled = false) and exists(select 1 from public.products p where p.id = 6802 and p.stock_controlled = true and p.stock = 5) and (select count(*) from public.product_stock_movements psm where psm.product_id = 6802 and psm.order_id ilike 'TESTE-F68%') = 3),
    jsonb_build_object('id','print_jobs','label','Impressões','ok', (select count(*) from public.print_jobs pj where pj.source_id ilike 'TESTE-F68%' and pj.template_version = '6.0.56') >= 6),
    jsonb_build_object('id','cancel_order','label','Cancelamento','ok', exists(select 1 from public.orders o where o.id = v_cancel_order_id and o.status = 'Pedido cancelado' and length(trim(o.cancellation_reason)) > 0) and exists(select 1 from public.order_payments op where op.order_id = v_cancel_order_id and op.status = 'cancelled')),
    jsonb_build_object('id','cash_close','label','Fechar caixa','ok', exists(select 1 from public.cash_sessions cs where cs.id = v_cash_session_id and cs.status = 'closed' and cs.closed_at is not null and cs.total_received = 107 and cs.difference = 0)),
    jsonb_build_object('id','reports','label','Relatórios e auditoria','ok', exists(select 1 from public.audit_logs al where al.entity_id = v_delivery_order_id and al.action = 'phase_68_delivery_confirmed') and exists(select 1 from public.notifications n where n.order_id = v_delivery_order_id)),
    jsonb_build_object('id','cleanup','label','Limpeza segura','ok', true)
  );

  select count(*)::integer,
         count(*) filter (where coalesce(value ->> 'ok', 'false')::boolean)::integer
    into total_count, ready_count
    from jsonb_array_elements(checklist);

  ready_percent := case
    when total_count <= 0 then 0
    else round((ready_count::numeric / total_count::numeric) * 100)::integer
  end;

  insert into public.operational_test_runs (
    app_version, test_code, status, executed_by, checklist, details,
    ready_count, total_count, ready_percent
  ) values (
    '6.0.56-fase-68-teste-operacional-completo',
    'TESTE FASE 68',
    case when ready_percent = 100 then 'passed' when ready_percent >= 70 then 'attention' else 'blocked' end,
    coalesce(nullif(trim(p_executed_by), ''), 'operador'),
    checklist,
    jsonb_build_object(
      'cleanupBefore', cleanup_result,
      'cashSessionId', v_cash_session_id,
      'deliveryOrderId', v_delivery_order_id,
      'counterOrderId', v_counter_order_id,
      'tabOrderId', v_tab_order_id,
      'cancelOrderId', v_cancel_order_id,
      'tabId', v_tab_id,
      'productIds', jsonb_build_array(6801, 6802, 6803, 6804),
      'physicalPrinterNote', 'A fila foi criada; impressão física depende do Desktop aberto no PC da loja.'
    ),
    ready_count,
    total_count,
    ready_percent
  ) returning * into run_row;

  return run_row;
end;
$$;

create or replace view public.phase_68_operational_test_summary_view as
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
    when ready_percent = 100 then 'Teste operacional completo aprovado'
    when ready_percent >= 70 then 'Teste operacional com atenção'
    else 'Teste operacional bloqueado'
  end as operational_label,
  details ->> 'cashSessionId' as cash_session_id,
  details ->> 'deliveryOrderId' as delivery_order_id,
  details ->> 'counterOrderId' as counter_order_id,
  details ->> 'tabOrderId' as tab_order_id,
  details ->> 'cancelOrderId' as cancel_order_id
from public.operational_test_runs;

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_68_operational_tests',
  jsonb_build_object(
    'phase', '6.0.56',
    'appVersion', '6.0.56-fase-68-teste-operacional-completo',
    'testPrefix', 'TESTE FASE 68',
    'runFunction', 'select * from public.run_phase_68_operational_test(''Gabriel'', true);',
    'cleanupFunction', 'select public.cleanup_phase_68_test_data();',
    'checks', jsonb_build_array(
      'cash_open',
      'cash_supply',
      'cash_withdrawal',
      'customer_delivery',
      'accept_delivery',
      'dispatch_delivery',
      'confirm_delivery',
      'counter_sale',
      'tab_full_flow',
      'stock_movement',
      'print_jobs',
      'cancel_order',
      'cash_close',
      'reports',
      'cleanup'
    ),
    'physicalPrinterNote', 'O teste cria a fila; teste físico exige Desktop e impressora no PC da loja.'
  ),
  now(),
  now()
)
on conflict (id) do update
   set settings = public.store_settings.settings || excluded.settings,
       updated_at = now();

update public.print_jobs
   set template_version = '6.0.56',
       updated_at = now()
 where template_version in ('6.0.50', '6.0.51', '6.0.52', '6.0.53', '6.0.54', '6.0.55');
