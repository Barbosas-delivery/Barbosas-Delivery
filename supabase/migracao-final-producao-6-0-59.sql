-- =====================================================================
-- Fase 71 / 6.0.59 - Correção do layout do cupom térmico.
-- Objetivo: registrar a correção do Desktop/Electron para imprimir em
-- 80mm/58mm sem deslocar o conteúdo para a lateral do papel.
-- =====================================================================

insert into public.store_settings (id, settings, created_at, updated_at)
values (
  'phase_71_thermal_receipt_layout_fix',
  jsonb_build_object(
    'phase', '6.0.59',
    'appVersion', '6.0.59-fase-71-correcao-layout-cupom-termico',
    'thermalReceiptFix', true,
    'paperWidthDefaultMm', 80,
    'safePrintableWidthMm', 72,
    'electronPageSizeMicrons', jsonb_build_object('width', 80000, 'height', 297000),
    'printerChecklist', jsonb_build_array(
      'Selecionar a impressora térmica correta no Desktop',
      'Conferir largura 80mm no painel Desktop',
      'Configurar preferências do driver do Windows para 80mm ou Receipt',
      'Reprocessar um job de teste da fila'
    ),
    'notes', 'A correção força margem zero, largura segura de 72mm e pageSize do Electron para evitar cupom cortado na lateral.'
  ),
  now(),
  now()
)
on conflict (id) do update
   set settings = public.store_settings.settings || excluded.settings,
       updated_at = now();

update public.print_jobs
   set template_version = '6.0.59',
       updated_at = now()
 where template_version in ('6.0.50', '6.0.51', '6.0.52', '6.0.53', '6.0.54', '6.0.55', '6.0.56', '6.0.57', '6.0.58');
