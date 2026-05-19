-- =====================================================================
-- Fase 70 / 6.0.58 - Correção de estoque para lanchonete.
-- Objetivo: impedir que lanches, porções e combos sejam bloqueados por
-- estoque insuficiente. Apenas produtos com stock_controlled=true devem
-- baixar estoque no Supabase.
-- =====================================================================

alter table if exists public.products
  add column if not exists stock_controlled boolean not null default true;

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
    return jsonb_build_object(
      'success', false,
      'failures', jsonb_build_array(jsonb_build_object('error', 'invalid_payload')),
      'applied', applied,
      'ignored', ignored
    );
  end if;

  create temporary table if not exists tmp_product_stock_deltas (
    product_id bigint primary key,
    delta integer not null
  ) on commit drop;

  truncate table tmp_product_stock_deltas;

  insert into tmp_product_stock_deltas(product_id, delta)
  select product_id, sum(delta)::integer as delta
  from jsonb_to_recordset(p_deltas) as x(product_id bigint, delta integer)
  where product_id is not null
    and delta is not null
    and delta <> 0
  group by product_id;

  if not exists (select 1 from tmp_product_stock_deltas) then
    return jsonb_build_object('success', true, 'failures', failures, 'applied', applied, 'ignored', ignored);
  end if;

  perform 1
  from public.products p
  join tmp_product_stock_deltas d on d.product_id = p.id
  order by p.id
  for update;

  select coalesce(jsonb_agg(jsonb_build_object('product_id', d.product_id, 'error', 'not_found')), '[]'::jsonb)
    into failures
    from tmp_product_stock_deltas d
    left join public.products p on p.id = d.product_id
    where p.id is null;

  select coalesce(jsonb_agg(jsonb_build_object(
      'product_id', p.id,
      'delta', d.delta,
      'reason', 'stock_control_disabled'
    )), '[]'::jsonb)
    into ignored
    from tmp_product_stock_deltas d
    join public.products p on p.id = d.product_id
    where coalesce(p.stock_controlled, true) = false;

  delete from tmp_product_stock_deltas d
  using public.products p
  where p.id = d.product_id
    and coalesce(p.stock_controlled, true) = false;

  select failures || coalesce(jsonb_agg(jsonb_build_object(
      'product_id', p.id,
      'error', 'insufficient_stock',
      'stock_before', coalesce(p.stock, 0),
      'delta', d.delta
    )), '[]'::jsonb)
    into failures
    from tmp_product_stock_deltas d
    join public.products p on p.id = d.product_id
    where coalesce(p.stock, 0) + d.delta < 0;

  if jsonb_array_length(failures) > 0 then
    return jsonb_build_object('success', false, 'failures', failures, 'applied', applied, 'ignored', ignored);
  end if;

  with before_update as (
    select p.id as product_id, coalesce(p.stock, 0) as stock_before, d.delta
    from public.products p
    join tmp_product_stock_deltas d on d.product_id = p.id
  ), updated as (
    update public.products p
    set stock = before_update.stock_before + before_update.delta,
        updated_at = now()
    from before_update
    where p.id = before_update.product_id
    returning p.id as product_id,
      before_update.stock_before,
      before_update.delta,
      p.stock as stock_after
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'product_id', product_id,
    'stock_before', stock_before,
    'delta', delta,
    'stock_after', stock_after
  )), '[]'::jsonb)
  into applied
  from updated;

  return jsonb_build_object('success', true, 'failures', failures, 'applied', applied, 'ignored', ignored);
end;
$$;

grant execute on function public.apply_product_stock_deltas(jsonb) to anon, authenticated;

create or replace view public.stock_control_lanchonete_view as
select
  id,
  name,
  category,
  product_type,
  stock,
  stock_controlled,
  case
    when coalesce(stock_controlled, true) = false then 'Não baixa estoque'
    when coalesce(stock, 0) <= 0 then 'Controla estoque - sem saldo'
    else 'Controla estoque'
  end as operational_label
from public.products
where deleted_at is null;

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_70_stock_control_fix',
  jsonb_build_object(
    'phase', '6.0.58',
    'appVersion', '6.0.58-fase-70-correcao-estoque-lanchonete',
    'stockControlledOnly', true,
    'snacksWithoutStockEnabled', true,
    'notes', 'A movimentação de estoque ignora produtos com stock_controlled=false, como lanches, porções e combos.'
  ),
  now(),
  now()
)
on conflict (id) do update
   set settings = public.store_settings.settings || excluded.settings,
       updated_at = now();

update public.print_jobs
   set template_version = '6.0.58',
       updated_at = now()
 where template_version in ('6.0.50', '6.0.51', '6.0.52', '6.0.53', '6.0.54', '6.0.55', '6.0.56', '6.0.57');
