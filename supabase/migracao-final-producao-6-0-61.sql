-- =====================================================================
-- Fase 73 / 6.0.61 - Personalização da marca: nome da loja e foto/logo.
-- Objetivo: permitir alterar nome exibido, slogan, logo/foto, capa e nome
-- do cupom sem mexer no código, mantendo tudo salvo no store_settings.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.brand_test_runs (
  id uuid primary key default gen_random_uuid(),
  app_version text not null default '6.0.61-fase-73-personalizacao-marca',
  test_code text not null default 'TESTE FASE 73',
  status text not null default 'draft',
  executed_by text not null default 'operador',
  checklist jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  ready_count integer not null default 0,
  total_count integer not null default 0,
  ready_percent integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint brand_test_runs_status_check check (status in ('draft', 'passed', 'attention', 'blocked'))
);

create index if not exists idx_brand_test_runs_created_at
  on public.brand_test_runs(created_at desc);

create index if not exists idx_brand_test_runs_status
  on public.brand_test_runs(status, created_at desc);

create or replace function public.get_store_brand_settings()
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(settings, '{}'::jsonb)
  from public.store_settings
  where id = 'default'
$$;

create or replace function public.update_store_brand_settings(
  p_store_name text default null,
  p_store_short_name text default null,
  p_store_slogan text default null,
  p_store_logo_url text default null,
  p_store_cover_url text default null,
  p_receipt_brand_name text default null,
  p_receipt_logo_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_settings jsonb := '{}'::jsonb;
  next_settings jsonb := '{}'::jsonb;
begin
  select coalesce(settings, '{}'::jsonb)
    into current_settings
    from public.store_settings
   where id = 'default';

  next_settings := current_settings || jsonb_strip_nulls(jsonb_build_object(
    'storeName', nullif(trim(coalesce(p_store_name, current_settings ->> 'storeName', 'BARBOSAS LANCHES')), ''),
    'storeShortName', nullif(trim(coalesce(p_store_short_name, current_settings ->> 'storeShortName', 'Barbosas')), ''),
    'storeSlogan', nullif(trim(coalesce(p_store_slogan, current_settings ->> 'storeSlogan', 'Lanches, porções e combos preparados na hora.')), ''),
    'storeLogoUrl', coalesce(p_store_logo_url, current_settings ->> 'storeLogoUrl', ''),
    'storeCoverUrl', coalesce(p_store_cover_url, current_settings ->> 'storeCoverUrl', ''),
    'receiptBrandName', nullif(trim(coalesce(p_receipt_brand_name, current_settings ->> 'receiptBrandName', p_store_name, current_settings ->> 'storeName', 'BARBOSAS LANCHES')), ''),
    'receiptLogoEnabled', coalesce(p_receipt_logo_enabled, (current_settings ->> 'receiptLogoEnabled')::boolean, true),
    'brandUpdatedAt', now()::text,
    'brandVersion', '6.0.61'
  ));

  insert into public.store_settings (id, settings, created_at, updated_at)
  values ('default', next_settings, now(), now())
  on conflict (id) do update
     set settings = excluded.settings,
         updated_at = now();

  insert into public.store_settings (id, settings, created_at, updated_at)
  values (
    'brand_settings',
    jsonb_build_object(
      'phase', '6.0.61',
      'appVersion', '6.0.61-fase-73-personalizacao-marca',
      'storeName', next_settings ->> 'storeName',
      'storeShortName', next_settings ->> 'storeShortName',
      'storeSlogan', next_settings ->> 'storeSlogan',
      'hasLogo', length(coalesce(next_settings ->> 'storeLogoUrl', '')) > 0,
      'hasCover', length(coalesce(next_settings ->> 'storeCoverUrl', '')) > 0,
      'receiptBrandName', next_settings ->> 'receiptBrandName',
      'receiptLogoEnabled', coalesce((next_settings ->> 'receiptLogoEnabled')::boolean, true)
    ),
    now(),
    now()
  )
  on conflict (id) do update
     set settings = excluded.settings,
         updated_at = now();

  return next_settings;
end;
$$;

grant execute on function public.get_store_brand_settings() to anon, authenticated;
grant execute on function public.update_store_brand_settings(text, text, text, text, text, text, boolean) to anon, authenticated;

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'default',
  jsonb_build_object(
    'storeName', 'BARBOSAS LANCHES',
    'storeShortName', 'Barbosas',
    'storeSlogan', 'Lanches, porções e combos preparados na hora.',
    'storeLogoUrl', '',
    'storeCoverUrl', '',
    'receiptBrandName', 'BARBOSAS LANCHES',
    'receiptLogoEnabled', true,
    'brandVersion', '6.0.61'
  ),
  now(),
  now()
)
on conflict (id) do update
   set settings = public.store_settings.settings || jsonb_build_object(
     'storeName', coalesce(public.store_settings.settings ->> 'storeName', 'BARBOSAS LANCHES'),
     'storeShortName', coalesce(public.store_settings.settings ->> 'storeShortName', 'Barbosas'),
     'storeSlogan', coalesce(public.store_settings.settings ->> 'storeSlogan', 'Lanches, porções e combos preparados na hora.'),
     'storeLogoUrl', coalesce(public.store_settings.settings ->> 'storeLogoUrl', ''),
     'storeCoverUrl', coalesce(public.store_settings.settings ->> 'storeCoverUrl', ''),
     'receiptBrandName', coalesce(public.store_settings.settings ->> 'receiptBrandName', public.store_settings.settings ->> 'storeName', 'BARBOSAS LANCHES'),
     'receiptLogoEnabled', coalesce((public.store_settings.settings ->> 'receiptLogoEnabled')::boolean, true),
     'brandVersion', '6.0.61'
   ),
       updated_at = now();

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_73_brand_personalization',
  jsonb_build_object(
    'phase', '6.0.61',
    'appVersion', '6.0.61-fase-73-personalizacao-marca',
    'brandPersonalizationEnabled', true,
    'fields', jsonb_build_array('storeName', 'storeShortName', 'storeSlogan', 'storeLogoUrl', 'storeCoverUrl', 'receiptBrandName', 'receiptLogoEnabled'),
    'runFunction', 'select * from public.run_phase_73_brand_test(''Gabriel'', true);',
    'notes', 'Nome da loja, logo/foto, capa e nome do cupom ficam salvos no store_settings.default.'
  ),
  now(),
  now()
)
on conflict (id) do update
   set settings = public.store_settings.settings || excluded.settings,
       updated_at = now();

create or replace function public.run_phase_73_brand_test(
  p_executed_by text default 'operador',
  p_write_test_brand boolean default true
)
returns public.brand_test_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  brand_settings jsonb := '{}'::jsonb;
  checklist jsonb := '[]'::jsonb;
  ready_count integer := 0;
  total_count integer := 0;
  ready_percent integer := 0;
  row_result public.brand_test_runs;
begin
  if p_write_test_brand then
    brand_settings := public.update_store_brand_settings(
      'BARBOSAS LANCHES',
      'Barbosas',
      'Lanches, porções e combos preparados na hora.',
      coalesce(public.get_store_brand_settings() ->> 'storeLogoUrl', ''),
      coalesce(public.get_store_brand_settings() ->> 'storeCoverUrl', ''),
      'BARBOSAS LANCHES',
      true
    );
  else
    brand_settings := public.get_store_brand_settings();
  end if;

  checklist := jsonb_build_array(
    jsonb_build_object('id','store_name','label','Nome da loja salvo','ok', length(trim(coalesce(brand_settings ->> 'storeName', ''))) > 0),
    jsonb_build_object('id','short_name','label','Nome curto salvo','ok', length(trim(coalesce(brand_settings ->> 'storeShortName', ''))) > 0),
    jsonb_build_object('id','slogan','label','Slogan do cliente salvo','ok', length(trim(coalesce(brand_settings ->> 'storeSlogan', ''))) > 0),
    jsonb_build_object('id','logo_field','label','Campo de logo disponível','ok', brand_settings ? 'storeLogoUrl'),
    jsonb_build_object('id','cover_field','label','Campo de capa disponível','ok', brand_settings ? 'storeCoverUrl'),
    jsonb_build_object('id','receipt_brand','label','Nome do cupom salvo','ok', length(trim(coalesce(brand_settings ->> 'receiptBrandName', ''))) > 0),
    jsonb_build_object('id','receipt_logo','label','Controle de logo no cupom salvo','ok', brand_settings ? 'receiptLogoEnabled'),
    jsonb_build_object('id','settings_row','label','Configuração default atualizada','ok', exists(select 1 from public.store_settings where id = 'default' and settings ? 'storeName' and settings ? 'storeLogoUrl')),
    jsonb_build_object('id','phase_row','label','Registro da fase 73 criado','ok', exists(select 1 from public.store_settings where id = 'phase_73_brand_personalization'))
  );

  select count(*)::integer,
         count(*) filter (where coalesce(value ->> 'ok', 'false')::boolean)::integer
    into total_count, ready_count
    from jsonb_array_elements(checklist);

  ready_percent := case when total_count <= 0 then 0 else round((ready_count::numeric / total_count::numeric) * 100)::integer end;

  insert into public.brand_test_runs (
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
    '6.0.61-fase-73-personalizacao-marca',
    'TESTE FASE 73',
    case when ready_percent = 100 then 'passed' when ready_percent >= 70 then 'attention' else 'blocked' end,
    coalesce(nullif(trim(p_executed_by), ''), 'operador'),
    checklist,
    jsonb_build_object('brandSettings', brand_settings, 'nextStep', 'Alterar nome/foto no painel Configurações > Marca da loja.'),
    ready_count,
    total_count,
    ready_percent
  ) returning * into row_result;

  return row_result;
end;
$$;

grant execute on function public.run_phase_73_brand_test(text, boolean) to anon, authenticated;

create or replace view public.phase_73_brand_test_summary_view as
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
    when ready_percent = 100 then 'Personalização da marca aprovada'
    when ready_percent >= 70 then 'Personalização da marca com atenção'
    else 'Personalização da marca bloqueada'
  end as operational_label,
  details -> 'brandSettings' ->> 'storeName' as store_name,
  details -> 'brandSettings' ->> 'receiptBrandName' as receipt_brand_name
from public.brand_test_runs;

update public.print_jobs
   set template_version = '6.0.61',
       updated_at = now()
 where template_version in ('6.0.50','6.0.51','6.0.52','6.0.53','6.0.54','6.0.55','6.0.56','6.0.57','6.0.58','6.0.59','6.0.60');
