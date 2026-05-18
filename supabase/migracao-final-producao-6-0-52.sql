-- =====================================================================
-- Fase 64 / 6.0.52 - Finalização profissional para produção.
-- Objetivo: registrar validações operacionais finais, consolidar checklist
-- de produção e manter rastreabilidade antes de abrir a lanchonete.
-- =====================================================================

create table if not exists public.production_validation_runs (
  id uuid primary key default gen_random_uuid(),
  app_version text not null default '6.0.52-fase-64-finalizacao-profissional',
  status text not null default 'draft',
  validated_by text not null default 'operador',
  checklist jsonb not null default '[]'::jsonb,
  notes text not null default '',
  ready_count integer not null default 0,
  total_count integer not null default 0,
  ready_percent integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint production_validation_runs_status_check
    check (status in ('draft', 'passed', 'attention', 'blocked'))
);

create index if not exists idx_production_validation_runs_created_at
  on public.production_validation_runs(created_at desc);

create index if not exists idx_production_validation_runs_status
  on public.production_validation_runs(status, created_at desc);

create or replace function public.calculate_production_readiness_percent(
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

create or replace function public.register_production_validation_run(
  p_checklist jsonb default '[]'::jsonb,
  p_validated_by text default 'operador',
  p_notes text default ''
)
returns public.production_validation_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  ready_count integer := 0;
  total_count integer := 0;
  ready_percent integer := 0;
  run_row public.production_validation_runs;
begin
  select
    count(*)::integer,
    count(*) filter (where coalesce(value ->> 'ok', 'false')::boolean)::integer
  into total_count, ready_count
  from jsonb_array_elements(coalesce(p_checklist, '[]'::jsonb));

  ready_percent := case
    when total_count <= 0 then 0
    else round((ready_count::numeric / total_count::numeric) * 100)::integer
  end;

  insert into public.production_validation_runs (
    app_version,
    status,
    validated_by,
    checklist,
    notes,
    ready_count,
    total_count,
    ready_percent
  ) values (
    '6.0.52-fase-64-finalizacao-profissional',
    case
      when total_count <= 0 then 'draft'
      when ready_percent = 100 then 'passed'
      when ready_percent >= 70 then 'attention'
      else 'blocked'
    end,
    coalesce(nullif(trim(p_validated_by), ''), 'operador'),
    coalesce(p_checklist, '[]'::jsonb),
    coalesce(p_notes, ''),
    ready_count,
    total_count,
    ready_percent
  )
  returning * into run_row;

  return run_row;
end;
$$;

create or replace view public.production_validation_summary_view as
select
  id,
  app_version,
  status,
  validated_by,
  ready_count,
  total_count,
  ready_percent,
  notes,
  created_at,
  updated_at,
  case
    when ready_percent = 100 then 'Pronto para produção'
    when ready_percent >= 70 then 'Atenção antes de abrir'
    else 'Bloqueado para produção'
  end as operational_label
from public.production_validation_runs;

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'production_readiness',
  jsonb_build_object(
    'phase', '6.0.52',
    'appVersion', '6.0.52-fase-64-finalizacao-profissional',
    'requiredChecks', jsonb_build_array(
      'supabase',
      'order_flow',
      'print_flow',
      'stock_flow',
      'vercel',
      'desktop',
      'backup'
    ),
    'minimumPercentToOpen', 100,
    'notes', 'Use a aba Diagnóstico para baixar o JSON de conferência antes de operar vendas reais.'
  ),
  now(),
  now()
)
on conflict (id) do update
   set settings = public.store_settings.settings || excluded.settings,
       updated_at = now();

update public.print_jobs
   set template_version = '6.0.52',
       updated_at = now()
 where template_version in ('6.0.50', '6.0.51');
