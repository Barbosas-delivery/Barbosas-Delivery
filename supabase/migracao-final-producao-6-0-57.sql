-- =====================================================================
-- Fase 69 / 6.0.57 - Correção real do cadastro de adicionais.
-- Objetivo: garantir que a interface consiga criar, listar, ativar e
-- pausar adicionais por categoria, com policies e RPCs compatíveis.
-- =====================================================================

create extension if not exists pgcrypto;

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

alter table public.category_addons enable row level security;

drop policy if exists "category_addons_select_all" on public.category_addons;
create policy "category_addons_select_all"
  on public.category_addons
  for select
  using (true);

drop policy if exists "category_addons_insert_all" on public.category_addons;
create policy "category_addons_insert_all"
  on public.category_addons
  for insert
  with check (true);

drop policy if exists "category_addons_update_all" on public.category_addons;
create policy "category_addons_update_all"
  on public.category_addons
  for update
  using (true)
  with check (true);

drop policy if exists "category_addons_delete_all" on public.category_addons;
create policy "category_addons_delete_all"
  on public.category_addons
  for delete
  using (true);

grant select, insert, update, delete on public.category_addons to anon, authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_category_addons_touch_updated_at on public.category_addons;
create trigger trg_category_addons_touch_updated_at
before update on public.category_addons
for each row execute function public.touch_updated_at();

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

  insert into public.category_addons (
    category_name,
    name,
    price,
    active,
    sort_order,
    created_at,
    updated_at
  ) values (
    v_category_name,
    v_name,
    v_price,
    coalesce(p_active, true),
    case
      when v_sort_order > 0 then v_sort_order
      else coalesce((
        select max(ca.sort_order) + 1
        from public.category_addons ca
        where lower(ca.category_name) = lower(v_category_name)
      ), 1)
    end,
    now(),
    now()
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.create_category_addon(text, text, numeric, boolean, integer) to anon, authenticated;

create or replace function public.set_category_addon_active(
  p_id uuid,
  p_active boolean default true
)
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

create or replace view public.category_addons_operational_view as
select
  ca.id,
  ca.category_name,
  ca.name,
  ca.price,
  ca.active,
  ca.sort_order,
  ca.created_at,
  ca.updated_at,
  count(p.id) filter (where p.deleted_at is null and lower(p.category) = lower(ca.category_name)) as products_in_category,
  case
    when ca.active then 'Ativo no cardápio'
    else 'Pausado'
  end as operational_label
from public.category_addons ca
left join public.products p on lower(p.category) = lower(ca.category_name)
group by ca.id;

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_69_category_addons_fix',
  jsonb_build_object(
    'phase', '6.0.57',
    'appVersion', '6.0.57-fase-69-cadastro-real-adicionais',
    'categoryAddonsScreenEnabled', true,
    'createAddonFunction', 'public.create_category_addon',
    'toggleAddonFunction', 'public.set_category_addon_active',
    'notes', 'Correção da criação real de adicionais por categoria pela interface.'
  ),
  now(),
  now()
)
on conflict (id) do update
   set settings = public.store_settings.settings || excluded.settings,
       updated_at = now();

update public.print_jobs
   set template_version = '6.0.57',
       updated_at = now()
 where template_version in ('6.0.50', '6.0.51', '6.0.52', '6.0.53', '6.0.54', '6.0.55', '6.0.56');
