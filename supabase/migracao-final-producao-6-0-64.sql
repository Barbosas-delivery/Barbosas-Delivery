-- =====================================================================
-- Fase 84 / 6.0.64 - Produção limpa final.
-- Objetivo: remover dados e objetos de teste, preservar configurações
-- operacionais reais e liberar o sistema para funcionar em produção.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.production_cleanup_runs (
  id uuid primary key default gen_random_uuid(),
  app_version text not null default '6.0.64-fase-84-producao-limpa-final',
  status text not null default 'completed',
  executed_by text not null default 'operador',
  cleanup_summary jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint production_cleanup_runs_status_check check (status in ('completed', 'attention', 'failed'))
);

create index if not exists idx_production_cleanup_runs_created_at
  on public.production_cleanup_runs(created_at desc);

create or replace function public.run_phase_84_production_cleanup(
  p_executed_by text default 'operador',
  p_drop_test_objects boolean default true
)
returns public.production_cleanup_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_summary jsonb := '{}'::jsonb;
  v_deleted integer := 0;
  v_total_deleted integer := 0;
  v_row public.production_cleanup_runs;
begin
  -- Itens de comanda de teste.
  if to_regclass('public.tab_account_items') is not null and to_regclass('public.tab_accounts') is not null then
    delete from public.tab_account_items tai
     where tai.tab_account_id in (
       select ta.id
         from public.tab_accounts ta
        where ta.id in (670067, 680068)
           or coalesce(ta.responsible_name, '') ilike 'TESTE FASE %'
           or coalesce(ta.customer_name, '') ilike 'TESTE FASE %'
           or coalesce(ta.notes, '') ilike '%TESTE FASE %'
     );
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('tab_account_items', v_deleted);
  end if;

  -- Comandas de teste.
  if to_regclass('public.tab_accounts') is not null then
    delete from public.tab_accounts ta
     where ta.id in (670067, 680068)
        or coalesce(ta.responsible_name, '') ilike 'TESTE FASE %'
        or coalesce(ta.customer_name, '') ilike 'TESTE FASE %'
        or coalesce(ta.notes, '') ilike '%TESTE FASE %';
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('tab_accounts', v_deleted);
  end if;

  -- Pagamentos, itens, movimentações e pedidos de teste.
  if to_regclass('public.order_payments') is not null then
    delete from public.order_payments op
     where op.order_id::text in ('68006801','68006802','68006803','68006804')
        or coalesce(op.notes, '') ilike '%TESTE FASE %';
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('order_payments', v_deleted);
  end if;

  if to_regclass('public.order_items') is not null then
    delete from public.order_items oi
     where oi.order_id::text in ('68006801','68006802','68006803','68006804')
        or coalesce(oi.name, '') ilike 'TESTE FASE %';
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('order_items', v_deleted);
  end if;

  if to_regclass('public.product_stock_movements') is not null then
    delete from public.product_stock_movements psm
     where psm.product_id in (6701,6702,6703,6801,6802,6803,6804,7201,7202)
        or psm.order_id::text in ('68006801','68006802','68006803','68006804')
        or coalesce(psm.reason, '') ilike '%TESTE FASE %';
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('product_stock_movements', v_deleted);
  end if;

  if to_regclass('public.orders') is not null then
    delete from public.orders o
     where o.id::text in ('68006801','68006802','68006803','68006804')
        or coalesce(o.client, '') ilike 'TESTE FASE %'
        or coalesce(o.notes, '') ilike '%TESTE FASE %'
        or coalesce(o.address, '') ilike '%Teste Operacional%'
        or coalesce(o.address, '') ilike '%Cancelamento, 68%';
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('orders', v_deleted);
  end if;

  -- Caixa de teste.
  if to_regclass('public.cash_movements') is not null then
    delete from public.cash_movements cm
     where cm.id in (680001, 680002)
        or coalesce(cm.notes, '') ilike '%TESTE FASE %'
        or coalesce(cm.reason, '') ilike '%TESTE FASE %';
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('cash_movements', v_deleted);
  end if;

  if to_regclass('public.cash_sessions') is not null then
    delete from public.cash_sessions cs
     where cs.id = '68000000-0000-0000-0000-000000000068'::uuid
        or coalesce(cs.notes, '') ilike '%TESTE FASE %';
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('cash_sessions', v_deleted);
  end if;

  -- Impressões de teste, incluindo a sonda da Fase 83.
  if to_regclass('public.print_jobs') is not null then
    delete from public.print_jobs pj
     where pj.source in ('final_audit')
        or pj.source_id::text in ('670067','68006801','68006802','68006803','68006804','680068-COMANDA-ADICAO','680068-COMANDA-CONSUMO')
        or pj.source_id::text ilike 'TESTE-F%'
        or pj.payload::text ilike '%TESTE FASE %'
        or pj.payload::text ilike '%TESTE FINAL FASE 83%';
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('print_jobs', v_deleted);
  end if;

  -- Combos/kits e adicionais de teste.
  if to_regclass('public.kit_items') is not null then
    delete from public.kit_items ki
     where ki.kit_id in (6790, 6890)
        or ki.kit_id in (select k.id from public.kits k where k.name ilike 'TESTE FASE %');
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('kit_items', v_deleted);
  end if;

  if to_regclass('public.kits') is not null then
    delete from public.kits k
     where k.id in (6790, 6890)
        or k.name ilike 'TESTE FASE %';
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('kits', v_deleted);
  end if;

  if to_regclass('public.category_addons') is not null then
    delete from public.category_addons ca
     where ca.category_name ilike 'TESTE FASE %'
        or ca.name ilike 'TESTE FASE %';
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('category_addons', v_deleted);
  end if;

  if to_regclass('public.products') is not null then
    delete from public.products p
     where p.id in (6701,6702,6703,6801,6802,6803,6804,7201,7202)
        or p.name ilike 'TESTE FASE %'
        or coalesce(p.barcode, '') ilike 'TESTE-F%';
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('products', v_deleted);
  end if;

  -- Notificações e auditorias de teste.
  if to_regclass('public.notifications') is not null then
    delete from public.notifications n
     where n.order_id::text in ('68006801','68006802','68006803','68006804')
        or coalesce(n.title, '') ilike '%TESTE FASE %'
        or coalesce(n.message, '') ilike '%TESTE FASE %';
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('notifications', v_deleted);
  end if;

  if to_regclass('public.audit_logs') is not null then
    delete from public.audit_logs al
     where al.entity_id::text in ('68006801','68006802','68006803','68006804','68000000-0000-0000-0000-000000000068')
        or al.after_json::text ilike '%TESTE FASE %'
        or al.action ilike 'phase_%_test%';
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('audit_logs', v_deleted);
  end if;

  -- Configurações que existiam apenas para testes/auditorias.
  if to_regclass('public.store_settings') is not null then
    delete from public.store_settings ss
     where ss.id in (
       'phase_67_functional_tests',
       'phase_68_operational_tests',
       'phase_72_complete_retest',
       'phase_73_brand_test',
       'phase_83_final_audit',
       'phase_83_pending_fixes'
     );
    get diagnostics v_deleted = row_count;
    v_total_deleted := v_total_deleted + v_deleted;
    v_summary := v_summary || jsonb_build_object('test_store_settings', v_deleted);
  end if;

  if p_drop_test_objects then
    -- Remove views e funções de teste. Objetos operacionais reais são preservados.
    drop view if exists public.phase_83_final_system_audit_summary_view;
    drop view if exists public.phase_82_professional_operation_summary_view;
    drop view if exists public.phase_73_brand_test_summary_view;
    drop view if exists public.phase_72_complete_retest_summary_view;
    drop view if exists public.phase_68_operational_test_summary_view;
    drop view if exists public.phase_67_functional_test_summary_view;

    drop function if exists public.run_phase_83_final_system_audit(text, boolean);
    drop function if exists public.run_phase_82_professional_operation_test(text);
    drop function if exists public.run_phase_73_brand_test(text, boolean);
    drop function if exists public.run_phase_72_complete_retest(text, boolean);
    drop function if exists public.run_phase_68_operational_test(text, boolean);
    drop function if exists public.cleanup_phase_68_test_data();
    drop function if exists public.cleanup_phase_68_print_jobs();
    drop function if exists public.calculate_operational_test_percent(jsonb);
    drop function if exists public.run_phase_67_functional_test(text, boolean);
    drop function if exists public.cleanup_phase_67_test_data();
    drop function if exists public.calculate_functional_test_percent(jsonb);

    drop table if exists public.final_system_audit_runs;
    drop table if exists public.professional_operation_test_runs;
    drop table if exists public.brand_test_runs;
    drop table if exists public.complete_retest_runs;
    drop table if exists public.operational_test_runs;
    drop table if exists public.functional_test_runs;
  end if;

  -- Garante configurações finais de produção.
  insert into public.store_settings (id, settings, created_at, updated_at)
  values (
    'production_go_live',
    jsonb_build_object(
      'phase', '6.0.64',
      'appVersion', '6.0.64-fase-84-producao-limpa-final',
      'productionReady', true,
      'testsCleaned', true,
      'dropTestObjects', p_drop_test_objects,
      'totalDeletedRows', v_total_deleted,
      'goLiveChecklist', jsonb_build_array(
        'Conferir marca da loja',
        'Conferir horário de funcionamento',
        'Abrir caixa real',
        'Conferir impressora térmica',
        'Cadastrar produtos reais',
        'Cadastrar adicionais reais',
        'Fazer pedido real de baixo valor para validação'
      ),
      'notes', 'Sistema limpo de dados de teste e liberado para operação real.'
    ),
    now(),
    now()
  )
  on conflict (id) do update
     set settings = excluded.settings,
         updated_at = now();

  if to_regclass('public.print_jobs') is not null then
    update public.print_jobs
       set template_version = '6.0.64',
           updated_at = now()
     where template_version in ('6.0.50','6.0.51','6.0.52','6.0.53','6.0.54','6.0.55','6.0.56','6.0.57','6.0.58','6.0.59','6.0.60','6.0.61','6.0.62','6.0.63');
  end if;

  v_summary := v_summary || jsonb_build_object('totalDeletedRows', v_total_deleted, 'dropTestObjects', p_drop_test_objects);

  insert into public.production_cleanup_runs (
    app_version,
    status,
    executed_by,
    cleanup_summary,
    notes
  ) values (
    '6.0.64-fase-84-producao-limpa-final',
    'completed',
    coalesce(nullif(trim(p_executed_by), ''), 'operador'),
    v_summary,
    'Limpeza final concluída. Sistema liberado para produção.'
  ) returning * into v_row;

  return v_row;
exception when others then
  insert into public.production_cleanup_runs (
    app_version,
    status,
    executed_by,
    cleanup_summary,
    notes
  ) values (
    '6.0.64-fase-84-producao-limpa-final',
    'failed',
    coalesce(nullif(trim(p_executed_by), ''), 'operador'),
    v_summary || jsonb_build_object('error', sqlerrm),
    'Falha durante limpeza final. Revise a mensagem de erro.'
  ) returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.run_phase_84_production_cleanup(text, boolean) to anon, authenticated;

create or replace view public.production_go_live_summary_view
with (security_invoker = true)
as
select
  pcr.id,
  pcr.app_version,
  pcr.status,
  pcr.executed_by,
  pcr.cleanup_summary,
  pcr.cleanup_summary ->> 'totalDeletedRows' as total_deleted_rows,
  pcr.notes,
  pcr.created_at,
  pcr.updated_at,
  case
    when pcr.status = 'completed' then 'Sistema limpo e liberado para produção'
    when pcr.status = 'attention' then 'Sistema com atenção antes da produção'
    else 'Limpeza final falhou'
  end as operational_label
from public.production_cleanup_runs pcr;

grant select on public.production_go_live_summary_view to anon, authenticated;

-- Registra a fase sem executar a limpeza automaticamente.
insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_84_production_cleanup',
  jsonb_build_object(
    'phase', '6.0.64',
    'appVersion', '6.0.64-fase-84-producao-limpa-final',
    'cleanupFunction', 'select * from public.run_phase_84_production_cleanup(''Gabriel'', true);',
    'productionReady', true,
    'notes', 'Execute a função de limpeza depois de confirmar que a bateria final da Fase 83 passou 100%.'
  ),
  now(),
  now()
)
on conflict (id) do update
   set settings = public.store_settings.settings || excluded.settings,
       updated_at = now();
