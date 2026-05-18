-- =====================================================================
-- Fase 66 / 6.0.54 - Lanchonete Pro: cadastro simplificado,
-- adicionais por categoria, combos e comandas integradas ao PDV Balcão.
-- =====================================================================

alter table if exists public.products
  add column if not exists description text not null default '',
  add column if not exists stock_controlled boolean not null default true;

update public.products
   set stock_controlled = case
     when lower(coalesce(product_type, category, '')) ~ '(lanche|hamburg|hambúrg|porcao|porção|combo)' then false
     when lower(coalesce(product_type, category, '')) ~ '(bebida|refrigerante|suco|agua|água|sobremesa|produto)' then true
     else stock_controlled
   end,
   updated_at = now()
 where deleted_at is null;

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

create unique index if not exists idx_category_addons_category_name_unique
  on public.category_addons(lower(category_name), lower(name))
  where active = true;

create index if not exists idx_category_addons_category_active_sort
  on public.category_addons(category_name, active, sort_order, name);

alter table if exists public.tab_accounts
  add column if not exists tab_number integer,
  add column if not exists table_number integer,
  add column if not exists responsible_name text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tab_accounts_tab_number_range_check') then
    alter table public.tab_accounts
      add constraint tab_accounts_tab_number_range_check
      check (tab_number is null or (tab_number between 1 and 100));
  end if;
end $$;

create unique index if not exists idx_tab_accounts_open_tab_number_unique
  on public.tab_accounts(tab_number)
  where status = 'open' and tab_number is not null;

create index if not exists idx_tab_accounts_table_status
  on public.tab_accounts(table_number, status);

alter table if exists public.tab_account_items
  add column if not exists selected_addons jsonb not null default '[]'::jsonb,
  add column if not exists combo_choices jsonb not null default '[]'::jsonb,
  add column if not exists item_note text not null default '',
  add column if not exists printed_at timestamp with time zone,
  add column if not exists print_batch_id text not null default '';

create or replace function public.replace_tab_account_items(
  p_tab_account_id bigint,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.tab_account_items where tab_account_id = p_tab_account_id;

  insert into public.tab_account_items (
    tab_account_id,
    product_id,
    name,
    quantity,
    price,
    barcode,
    selected_addons,
    combo_choices,
    item_note,
    printed_at,
    print_batch_id
  )
  select
    p_tab_account_id,
    case when coalesce(item ->> 'product_id', '') ~ '^[0-9]+$' then (item ->> 'product_id')::bigint else null end,
    coalesce(nullif(item ->> 'name', ''), 'Produto'),
    greatest(1, coalesce(nullif(item ->> 'quantity', '')::numeric, 1)),
    coalesce(nullif(item ->> 'price', '')::numeric, 0),
    coalesce(item ->> 'barcode', ''),
    coalesce(item -> 'selected_addons', '[]'::jsonb),
    coalesce(item -> 'combo_choices', '[]'::jsonb),
    coalesce(item ->> 'item_note', ''),
    case when nullif(item ->> 'printed_at', '') is null then null else (item ->> 'printed_at')::timestamp with time zone end,
    coalesce(item ->> 'print_batch_id', '')
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item;

  return jsonb_build_object('success', true);
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

create or replace view public.menu_lanchonete_pro_view as
select
  p.id,
  p.name,
  p.category,
  p.product_type,
  p.description,
  p.price,
  p.cost,
  p.stock,
  p.min_stock,
  p.stock_controlled,
  p.active,
  p.image_url,
  p.combo_choices,
  p.allow_item_notes,
  p.prep_minutes,
  p.sales_tags,
  coalesce(jsonb_agg(jsonb_build_object('id', ca.id, 'name', ca.name, 'price', ca.price, 'active', ca.active, 'sort_order', ca.sort_order) order by ca.sort_order, ca.name) filter (where ca.id is not null and ca.active = true), '[]'::jsonb) as category_addons
from public.products p
left join public.category_addons ca on lower(ca.category_name) = lower(p.category)
where p.deleted_at is null
group by p.id;

create or replace view public.open_commandas_operational_view as
select
  id,
  tab_number,
  table_number,
  responsible_name,
  customer_name,
  phone,
  status,
  total,
  opened_at,
  updated_at,
  case when tab_number between 1 and 100 then 'Comanda válida' else 'Revisar número' end as operational_label
from public.tab_accounts
where status = 'open';

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'lanchonete_pro_phase_66',
  jsonb_build_object(
    'phase', '6.0.54',
    'appVersion', '6.0.54-fase-66-lanchonete-pro-comandas-pdv',
    'categoryAddonsEnabled', true,
    'productSuggestedAddonsDisabled', true,
    'structuredRemovableIngredientsDisabled', true,
    'customerStockVisibilityDisabled', true,
    'tabsIntegratedWithCounterPdv', true,
    'tabNumbers', jsonb_build_object('min', 1, 'max', 100),
    'kitsRenamedToCombos', true,
    'notes', 'Comanda não é fiado: nasce no PDV Balcão, imprime adições e fecha como venda normal.'
  ),
  now(),
  now()
)
on conflict (id) do update
   set settings = public.store_settings.settings || excluded.settings,
       updated_at = now();

update public.print_jobs
   set template_version = '6.0.54',
       updated_at = now()
 where template_version in ('6.0.50', '6.0.51', '6.0.52', '6.0.53');
