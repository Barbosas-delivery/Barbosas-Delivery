-- =====================================================================
-- Fase 65 / 6.0.53 - Atualização do aplicativo Desktop instalado no PC.
-- Objetivo: registrar a versão instalada em cada computador da loja,
-- auditar configuração local do Electron e facilitar suporte/reinstalação.
-- =====================================================================

create table if not exists public.desktop_installations (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null unique,
  computer_name text not null default 'computador-da-loja',
  app_version text not null default '6.0.53-fase-65-atualizacao-desktop-instalado',
  package_version text not null default '6.0.53',
  printer_name text not null default '',
  auto_print_enabled boolean not null default false,
  start_with_windows boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  last_seen_at timestamp with time zone not null default now(),
  installed_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint desktop_installations_status_check
    check (status in ('active', 'outdated', 'disabled', 'unknown'))
);

create index if not exists idx_desktop_installations_last_seen_at
  on public.desktop_installations(last_seen_at desc);

create index if not exists idx_desktop_installations_app_version
  on public.desktop_installations(app_version, last_seen_at desc);

create or replace function public.register_desktop_installation(
  p_worker_id text,
  p_computer_name text default 'computador-da-loja',
  p_app_version text default '6.0.53-fase-65-atualizacao-desktop-instalado',
  p_package_version text default '6.0.53',
  p_printer_name text default '',
  p_auto_print_enabled boolean default false,
  p_start_with_windows boolean default false,
  p_config jsonb default '{}'::jsonb
)
returns public.desktop_installations
language plpgsql
security definer
set search_path = public
as $$
declare
  row_result public.desktop_installations;
  clean_worker_id text := coalesce(nullif(trim(p_worker_id), ''), 'desktop-sem-worker');
begin
  insert into public.desktop_installations (
    worker_id,
    computer_name,
    app_version,
    package_version,
    printer_name,
    auto_print_enabled,
    start_with_windows,
    config,
    status,
    last_seen_at,
    installed_at,
    updated_at
  ) values (
    clean_worker_id,
    coalesce(nullif(trim(p_computer_name), ''), 'computador-da-loja'),
    coalesce(nullif(trim(p_app_version), ''), '6.0.53-fase-65-atualizacao-desktop-instalado'),
    coalesce(nullif(trim(p_package_version), ''), '6.0.53'),
    coalesce(p_printer_name, ''),
    coalesce(p_auto_print_enabled, false),
    coalesce(p_start_with_windows, false),
    coalesce(p_config, '{}'::jsonb),
    case
      when coalesce(p_app_version, '') = '6.0.53-fase-65-atualizacao-desktop-instalado' then 'active'
      else 'outdated'
    end,
    now(),
    now(),
    now()
  )
  on conflict (worker_id) do update
     set computer_name = excluded.computer_name,
         app_version = excluded.app_version,
         package_version = excluded.package_version,
         printer_name = excluded.printer_name,
         auto_print_enabled = excluded.auto_print_enabled,
         start_with_windows = excluded.start_with_windows,
         config = excluded.config,
         status = excluded.status,
         last_seen_at = now(),
         updated_at = now()
  returning * into row_result;

  return row_result;
end;
$$;

create or replace view public.desktop_installations_operational_view as
select
  id,
  worker_id,
  computer_name,
  app_version,
  package_version,
  printer_name,
  auto_print_enabled,
  start_with_windows,
  status,
  last_seen_at,
  installed_at,
  updated_at,
  case
    when app_version = '6.0.53-fase-65-atualizacao-desktop-instalado' then 'Atualizado'
    else 'Atualizar Desktop instalado'
  end as update_label,
  case
    when last_seen_at < now() - interval '15 minutes' then true
    else false
  end as heartbeat_stale
from public.desktop_installations;

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'desktop_update',
  jsonb_build_object(
    'phase', '6.0.53',
    'appVersion', '6.0.53-fase-65-atualizacao-desktop-instalado',
    'installerScript', 'pnpm run desktop:installer',
    'mustReinstallPcApp', true,
    'checks', jsonb_build_array(
      'backup_local_config',
      'install_new_setup_exe',
      'confirm_version_6_0_53',
      'test_supabase_connection',
      'test_printer',
      'register_installation'
    )
  ),
  now(),
  now()
)
on conflict (id) do update
   set settings = public.store_settings.settings || excluded.settings,
       updated_at = now();

update public.print_jobs
   set template_version = '6.0.53',
       updated_at = now()
 where template_version in ('6.0.50', '6.0.51', '6.0.52');
