import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { money, formatCep, isValidCep, formatBrazilMobilePhone, isValidBrazilMobilePhone, onlyPhoneNumbers, escapeHtml, buildReceiptItemsHtml } from "../src/utils/formatters.js";
import { toPositiveInteger, toSafeMoneyNumber, calculateChangeDue } from "../src/utils/numbers.js";

const appSource = [
  "../src/App.jsx",
  "../src/utils/appRuntime.js",
  "../src/components/OperationalPanels.jsx",
  "../src/components/ui.jsx",
].map((file) => readFileSync(new URL(file, import.meta.url), "utf8")).join("\n");
const constantsSource = readFileSync(new URL("../src/constants/appConstants.js", import.meta.url), "utf8");
const serviceWorkerSource = readFileSync(new URL("../public/service-worker.js", import.meta.url), "utf8");
const mainSource = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const supabaseClientSource = readFileSync(new URL("../src/supabaseClient.js", import.meta.url), "utf8");
const printJobsServiceSource = readFileSync(new URL("../src/services/supabasePrintJobs.js", import.meta.url), "utf8");
const printTemplatesSource = readFileSync(new URL("../src/utils/printJobTemplates.js", import.meta.url), "utf8");

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("formatação monetária em pt-BR", () => {
  assert.equal(money(12.5), "R$ 12,50");
});

test("CEP e telefone do cliente", () => {
  assert.equal(formatCep("87000000"), "87000-000");
  assert.equal(isValidCep("87000-000"), true);
  assert.equal(formatBrazilMobilePhone("43988736791"), "(43) 98873-6791");
  assert.equal(isValidBrazilMobilePhone("(43) 98873-6791"), true);
  assert.equal(onlyPhoneNumbers("(43) 98873-6791"), "43988736791");
});

test("números e troco", () => {
  assert.equal(toPositiveInteger("2.9"), 2);
  assert.equal(toSafeMoneyNumber("15,50"), 15.5);
  assert.equal(calculateChangeDue("60", "52"), 8);
  assert.equal(calculateChangeDue("50", "52"), 0);
});

test("HTML de impressão escapa texto e calcula subtotal", () => {
  const html = buildReceiptItemsHtml([{ name: "Copão <Maracujá>", price: 10, quantity: 2 }]);
  assert.match(html, /Copão &lt;Maracujá&gt;/);
  assert.match(html, /R\$\s*20,00/);
});

test("versão final consistente", () => {
  assert.match(constantsSource, /APP_VERSION = "6\.0\.59-fase-71-correcao-layout-cupom-termico"/);
  assert.match(serviceWorkerSource, /barbosas-delivery-6-0-59-fase-71-correcao-layout-cupom-termico-sem-cache/);
  const stockServiceSource = readFileSync(new URL("../src/services/supabaseProducts.js", import.meta.url), "utf8");
  const stockMigrationSource = readFileSync(new URL("../supabase/migracao-final-producao-6-0-51.sql", import.meta.url), "utf8");
  const finalizationMigrationSource = readFileSync(new URL("../supabase/migracao-final-producao-6-0-52.sql", import.meta.url), "utf8");
  const desktopUpdateMigrationSource = readFileSync(new URL("../supabase/migracao-final-producao-6-0-53.sql", import.meta.url), "utf8");
  assert.ok(appSource.includes("Barbosa's Lanches") || readFileSync(new URL("../src/constants/initialData.js", import.meta.url), "utf8").includes("Barbosa's Lanches"), "fase 60 deve converter a identidade para lanchonete");
  assert.ok(appSource.includes("Cardápio da lanchonete"), "cadastro deve orientar operação de lanchonete");
  assert.doesNotMatch(appSource, /id: "tabs", label: "Fiados\/Comandas"/, "Fiados/Comandas não deve aparecer na navegação da operação nova");
  assert.ok(stockServiceSource.includes("product_type"), "produtos precisam estar preparados para tipo de cardápio de lanchonete");
  assert.match(stockMigrationSource, /create table if not exists public\.menu_addons/i, "migração precisa preparar adicionais globais para lanchonete");
  const lanchoneteProMigrationSource = readFileSync(new URL("../supabase/migracao-final-producao-6-0-54.sql", import.meta.url), "utf8");
  const functionalTestMigrationSource = readFileSync(new URL("../supabase/migracao-final-producao-6-0-55.sql", import.meta.url), "utf8");
  const operationalTestMigrationSource = readFileSync(new URL("../supabase/migracao-final-producao-6-0-56.sql", import.meta.url), "utf8");
  assert.match(lanchoneteProMigrationSource, /create table if not exists public\.category_addons/i, "fase 66 precisa criar adicionais por categoria");
  assert.match(lanchoneteProMigrationSource, /alter table if exists public\.tab_accounts/i, "fase 66 precisa preparar comandas integradas");
  assert.match(lanchoneteProMigrationSource, /stock_controlled/i, "fase 66 precisa separar lanches sem estoque de bebidas com estoque");
  assert.match(functionalTestMigrationSource, /run_phase_67_functional_test/i, "fase 67 precisa ter função de teste funcional real");
  assert.match(functionalTestMigrationSource, /cleanup_phase_67_test_data/i, "fase 67 precisa permitir limpar dados de teste");
  assert.match(operationalTestMigrationSource, /run_phase_68_operational_test/i, "fase 68 precisa ter função de teste operacional completo");
  assert.match(operationalTestMigrationSource, /cleanup_phase_68_test_data/i, "fase 68 precisa permitir limpar dados de teste operacional");
  assert.match(operationalTestMigrationSource, /cash_open/i, "fase 68 precisa testar abertura de caixa");
  assert.match(operationalTestMigrationSource, /confirm_delivery/i, "fase 68 precisa testar confirmação de entrega");
  assert.ok(appSource.includes("Teste funcional da Fase 67"), "diagnóstico precisa mostrar validação funcional da fase 67");
  assert.ok(appSource.includes("Teste operacional completo da Fase 68"), "diagnóstico precisa mostrar validação operacional da fase 68");
  assert.ok(appSource.includes("Personalize seu lanche"), "cliente precisa ter modal de personalização de lanche");
  assert.ok(appSource.includes("selectedAddons") && appSource.includes("removedIngredients") && appSource.includes("itemNote"), "carrinho precisa carregar adicionais, removidos e observação por item");

  const viteConfigSource = readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");
  assert.match(viteConfigSource, /base:\s*["']\.\/["']/, "vite.config.js precisa usar base './' para o Electron carregar assets via file://.");
  assert.match(serviceWorkerSource, /cache: "no-store"/);
  assert.doesNotMatch(serviceWorkerSource, /cache\.addAll|caches\.match|cache\.put/);

  assert.ok(appSource.includes('status: DELIVERY_STATUS.WAITING_PICKUP,\n        origin: "customer",\n        needsStoreApproval: false'), "pedido do app deve nascer direto como aguardando retirada, sem aprovação");
  assert.ok(appSource.includes('Pedido recebido pela loja, enviado para preparo e colocado na fila de impressão.'), "mensagem do cliente não deve pedir aprovação manual");
  assert.doesNotMatch(appSource, /A loja vai aprovar e liberar para entrega|Pedido enviado para a loja\. Aguarde a confirmação|Aprove o pedido antes de confirmar recebimento/, "fluxo novo não deve orientar aprovação manual do pedido");
  assert.ok(appSource.includes("restoreProductInSupabase"), "recadastro de produto excluído precisa reativar por ID, não atualizar todos por código de barras");
  assert.ok(appSource.includes("makeUniqueNumericId()"), "IDs críticos não devem depender só de Date.now() em produção");
  assert.ok(appSource.includes("buildStockDeltasFromItems"), "persistência de estoque deve calcular deltas dos produtos alterados");
  assert.ok(appSource.includes("const stockPersisted = await persistStockDeltasForItems"), "fluxos críticos devem verificar retorno da sincronização de estoque");
  assert.ok(appSource.includes("applyProductStockDeltasInSupabase"), "estoque deve usar delta atômico no Supabase quando a migração estiver aplicada");
  assert.doesNotMatch(stockServiceSource, /Fallback de compatibilidade|fallbackUsed:\s*true|select\("id, stock"\)/, "estoque não pode cair em fallback não atômico em produção");
  assert.match(stockServiceSource, /Migração de estoque atômico não encontrada/, "sem função SQL, o app deve alertar e não mascarar o erro");
  assert.match(stockMigrationSource, /for update/i, "função de estoque precisa travar a linha do produto");
  assert.match(stockMigrationSource, /if jsonb_array_length\(failures\) > 0[\s\S]*return jsonb_build_object\('success', false/i, "função de estoque precisa validar tudo antes de alterar qualquer produto");
  assert.match(stockMigrationSource, /insufficient_stock/i, "função de estoque precisa recusar baixa sem saldo suficiente");
  assert.match(stockMigrationSource, /create table if not exists public\.coupons/i, "migração final precisa criar public.coupons para o checkout carregar cupons");
  assert.match(stockMigrationSource, /truncate table tmp_product_stock_deltas/i, "função de estoque não pode usar DELETE sem WHERE em tabela temporária");
  assert.doesNotMatch(stockMigrationSource, /delete from tmp_product_stock_deltas/i, "função de estoque não pode usar DELETE sem WHERE em ambientes com safe update");
  assert.doesNotMatch(stockMigrationSource, /greatest\(0/i, "função de estoque não pode zerar saldo insuficiente e fingir sucesso");
  assert.doesNotMatch(stockMigrationSource, /total_sold numeric default 0,\s*total_sold numeric default 0/i, "migração final não pode ter coluna duplicada em cash_sessions");
  assert.match(appSource, /Grupo não criado: não foi possível salvar no Supabase/, "categoria não deve aparecer como criada quando falhar store_settings");
  assert.doesNotMatch(appSource, /shouldUseDelta[\s\S]*updateWithSchemaRetry\("products", product\.id, \{ stock: nextStock \}\)/, "ajuste manual de estoque deve usar função atômica, não gravação direta do saldo final");
  assert.ok(appSource.includes("fetchProductStockFromSupabase"), "edição de produto precisa consultar o estoque atual do Supabase antes de ajustar estoque");
  assert.doesNotMatch(readFileSync(new URL("../src/services/supabaseProducts.js", import.meta.url), "utf8"), /export function buildProductPatch\(product\) \{[\s\S]*?stock:/, "edição normal de produto não pode salvar stock junto com preço/nome/categoria");
  assert.ok(appSource.includes("estoque_balcao_bloqueado") || appSource.includes("estoque_nao_sincronizado"), "falha de estoque precisa gerar notificação operacional");
  assert.ok(appSource.includes("rollbackStockAfterSaveFailure"), "se pedido falhar depois da reserva, estoque precisa tentar voltar automaticamente");
  assert.ok(appSource.includes("cleanupOrderAfterPartialSave"), "pedido/venda não pode ficar salvo parcialmente se pagamentos falharem");
  assert.match(appSource, /supabase\s*\.from\(\"order_items\"\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\(\"order_id\", orderId\)/, "limpeza de pedido parcial precisa remover itens do pedido");
  assert.match(appSource, /supabase\s*\.from\(\"order_payments\"\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\(\"order_id\", orderId\)/, "limpeza de pedido parcial precisa remover pagamentos parciais");
  assert.match(appSource, /supabase\s*\.from\(\"orders\"\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\(\"id\", orderId\)/, "limpeza de pedido parcial precisa remover o pedido principal");
  assert.doesNotMatch(appSource, /const productId = Date\.now\(\)|id: Date\.now\(\),\n\s+cashSessionId|id: Date\.now\(\),\n\s+code,/, "produtos, pedidos e cupons não podem usar Date.now() puro como ID");
  assert.ok(appSource.includes("Grupo de produtos criado e salvo no Supabase"), "categorias precisam salvar imediatamente no Supabase");
  assert.ok(appSource.includes("Estoque não sincronizado no Supabase"), "falha de estoque no Supabase precisa gerar alerta operacional");
  assert.ok(appSource.includes("productGroups: normalizeProductGroups"), "categorias precisam ser parte das configurações sincronizadas");
  assert.doesNotMatch(appSource, /barbosas-delivery-store-settings-v1|loadStoreSettingsFromLocalStorage/);
  assert.ok(appSource.includes("loadProducts({ silent: true })"), "catálogo deve ter atualização periódica sem depender de realtime/cache");
  assert.ok(appSource.includes("catalogRefreshInterval"), "cliente aberto precisa atualizar catálogo mesmo sem realtime habilitado");
  assert.ok(appSource.includes("async function saveKitEdits"), "edição de kit precisa ser assíncrona para salvar no Supabase");
  assert.ok(appSource.includes('supabase.rpc("replace_kit_items"'), "edição de kit precisa substituir itens por função SQL transacional, não só no estado da tela");
  assert.ok(appSource.includes("Combo atualizado e sincronizado no Supabase."), "edição de combo precisa confirmar sincronização real");
  assert.match(stockMigrationSource, /create or replace function replace_kit_items/i, "migração final precisa criar função transacional para substituir itens de kit");
  assert.match(stockMigrationSource, /create or replace function replace_tab_account_items/i, "migração final precisa criar função transacional para substituir itens de comanda");
  assert.ok(readFileSync(new URL("../src/services/supabaseTabs.js", import.meta.url), "utf8").includes('supabase.rpc("replace_tab_account_items"'), "itens de comanda precisam ser substituídos via função SQL transacional");
  assert.doesNotMatch(readFileSync(new URL("../src/services/supabaseTabs.js", import.meta.url), "utf8"), /from\("tab_account_items"\)\.delete\(\)[\s\S]*insertWithSchemaRetry\("tab_account_items"/, "comandas não podem apagar e inserir itens pelo front-end em duas etapas");
  assert.match(stockMigrationSource, /alter table orders add column if not exists payment_status/i, "migração final precisa reforçar colunas de orders em bancos antigos");
  assert.match(stockMigrationSource, /alter table order_items add column if not exists is_kit/i, "migração final precisa reforçar colunas de order_items em bancos antigos");
  assert.match(stockMigrationSource, /create table if not exists print_jobs/i, "migração final precisa criar a fila de impressão");
  assert.match(stockMigrationSource, /create or replace function claim_pending_print_jobs/i, "migração final precisa permitir o Electron reservar jobs de impressão com segurança");
  assert.match(stockMigrationSource, /p_sources text\[\] default null/i, "função de reserva precisa aceitar filtro de origem para o Electron respeitar configuração local");
  assert.match(stockMigrationSource, /source = any\(p_sources\)/i, "reserva de impressão precisa filtrar origem habilitada");
  assert.match(stockMigrationSource, /create or replace function mark_print_job_printed/i, "migração final precisa permitir marcar impressão como concluída");
  assert.match(stockMigrationSource, /create or replace function mark_print_job_failed/i, "migração final precisa registrar falha de impressão");
  assert.match(stockMigrationSource, /create table if not exists print_workers/i, "migração final precisa criar tabela de computadores de impressão");
  assert.match(stockMigrationSource, /upsert_print_worker_heartbeat/i, "migração final precisa registrar heartbeat do Electron");
  assert.match(stockMigrationSource, /reset_stale_print_jobs/i, "migração final precisa liberar jobs travados em printing");
  assert.ok(printJobsServiceSource.includes('PRINT_JOB_TYPE.KITCHEN') && printJobsServiceSource.includes('PRINT_JOB_TYPE.DELIVERY') && printJobsServiceSource.includes('PRINT_JOB_TYPE.COUNTER'), "serviço precisa criar vias cozinha, entrega e balcão");
  assert.ok(printJobsServiceSource.includes("schemaVersion: 2") && printJobsServiceSource.includes("ticket: buildPrintTicket"), "payload de impressão precisa sair com modelo de cupom padronizado");
  assert.ok(printTemplatesSource.includes('title: "COZINHA"') && printTemplatesSource.includes('title: "ENTREGA"') && printTemplatesSource.includes('title: "BALCÃO"'), "modelos de cupom precisam existir para cozinha, entrega e balcão");
  assert.ok(printTemplatesSource.includes("Via de preparo") && printTemplatesSource.includes("Via do entregador") && printTemplatesSource.includes("Via do caixa"), "cada cupom precisa ter finalidade operacional clara");
  assert.ok(printTemplatesSource.includes("buildKitchenItemsHtml") && printTemplatesSource.includes("REMOVER / SEM") && printTemplatesSource.includes("buildHtmlTicket"), "Electron precisa receber HTML térmico otimizado para cozinha de lanchonete");
  assert.ok(appSource.includes("createPrintJobsForOrder(savedDelivery)"), "pedido/venda salvo deve criar jobs de impressão no Supabase");
  assert.ok(readFileSync(new URL("../src/services/supabasePrintJobs.js", import.meta.url), "utf8").includes("onConflict: \"source,source_id,print_type\""), "fila de impressão deve evitar duplicidade por source/source_id/print_type, não por id incompatível");
  assert.ok(readFileSync(new URL("../src/services/supabasePrintJobs.js", import.meta.url), "utf8").includes("includeLegacyTextId"), "fila de impressão precisa ter fallback para bancos antigos com id textual obrigatório");
  assert.ok(appSource.includes("impressão pendente criada") || appSource.includes("impressões pendentes criadas"), "fluxos de PDV devem informar fila de impressão, não pop-up do navegador");
  assert.doesNotMatch(appSource, /printDeliveryReceipt\(savedSale|printDeliveryReceipt\(savedDelivery|preOpenedPrintWindow/, "criação de pedido/venda não deve depender de janela de impressão do navegador");

  assert.doesNotMatch(appSource, /restoreProductByBarcodeInSupabase|updateWithFilterSchemaRetry\("products"/, "não pode reativar produto por filtro amplo de código de barras");
  assert.ok(supabaseClientSource.includes("channel()"), "cliente Supabase desativado precisa ter channel() para não quebrar sem env");
  assert.ok(supabaseClientSource.includes("removeChannel()"), "cliente Supabase desativado precisa ter removeChannel() para cleanup seguro");
  assert.ok(readFileSync(new URL("../src/services/supabaseProducts.js", import.meta.url), "utf8").includes("isTruthyActive(product.active)"), "produtos com active nulo/ausente no Supabase devem continuar visíveis, não sumir do cliente");
  assert.ok(readFileSync(new URL("../src/utils/catalog.js", import.meta.url), "utf8").includes("isTruthyActive(product.active)"), "catálogo do cliente precisa tratar active ausente como ativo para tabelas antigas");
  assert.ok(constantsSource.includes("PRODUCTION_READINESS_CHECKLIST"), "fase 64 precisa expor checklist final de produção");
  assert.ok(appSource.includes("Pronto para produção"), "diagnóstico precisa mostrar checklist final de produção");
  assert.ok(appSource.includes("productionReadiness"), "diagnóstico exportado precisa incluir resumo de prontidão");
  assert.match(finalizationMigrationSource, /create table if not exists public\.production_validation_runs/i, "fase 64 precisa registrar validações de produção");
  assert.match(finalizationMigrationSource, /register_production_validation_run/i, "fase 64 precisa ter função para registrar rodada de validação");
  assert.match(desktopUpdateMigrationSource, /create table if not exists public\.desktop_installations/i, "fase 65 precisa registrar instalações desktop por PC");
  assert.match(desktopUpdateMigrationSource, /register_desktop_installation/i, "fase 65 precisa ter função para registrar instalação desktop");
});

test("fluxos principais existem no código", () => {
  const requiredSnippets = [
    "submitCustomerOrder",
    "addProductToCustomerCart",
    "addSelectedVariantsToCustomerCart",
    "validateCouponForCart",
    "approveDelivery",
    "markCourierPickedUp",
    "updatePaymentStatus",
    "printThermalHtml",
    "buildCustomerWhatsAppMessage",
    "markNotificationsRead",
    "resolveOrderNotifications",
    "store_settings",
    "product_stock_movements",
    "store_users",
    "deletePromotion",
    "reopenCounterSaleInPdv",
    "isDeliveryDelayed",
    "buildCourierTodaySummary",
    "pauseStoreTemporarily",
    "toggleProductPause",
    "buildCourierClosingReport",
    "printCourierClosingReport",
    "exportCourierClosingCsv",
    "normalizeDeliveryZones",
    "getCustomerDeliveryFee",
    "getDeliveryZoneIssue",
    "buildCustomerSalesReport",
    "buildPeakHourSalesReport",
    "buildProfitSalesReport",
    "exportCustomerSalesCsv",
    "exportPeakHourSalesCsv",
    "exportProfitSalesCsv",
    "buildDeliveryRouteGroups",
    "getCourierAcceptBlockReason",
    "maxActiveDeliveriesPerCourier",
    "DELIVERY_PROBLEM_REASONS",
    "promptDeliveryProblemReason",
    "Hoje na loja",
    "Fila rápida de entregas",
    "Fechamento do dia",
    "Baixar backup diário",
    "isSupabaseConfigured",
    "Cliente Supabase desativado",
    "print_jobs",
    "createPrintJobsForOrder",
  ];
  for (const snippet of requiredSnippets) {
    assert.ok(appSource.includes(snippet), `Trecho obrigatório ausente: ${snippet}`);
  }
});

test("arquivos operacionais principais existem", () => {
  const requiredFiles = [
    "MANUAL-DO-SISTEMA.md",
    "CHECKLIST-TESTE-PRODUCAO.md",
    "docs/HISTORICO-DE-FASES.md",
    "docs/DIAGNOSTICO-SISTEMA.md",
    "docs/FECHAMENTO-DO-DIA.md",
    "docs/FASE-50-REVISAO-FINAL-PRODUCAO.md",
    ".env.example",
    "public/manifest.webmanifest",
    "public/service-worker.js",
    "supabase/migracao-fases-1-a-12.sql",
    "supabase/migracao-fase-24-acessos-loja.sql",
    "supabase/migracao-fase-37-pausas.sql",
    "supabase/migracao-fase-40-taxas-bairro.sql",
    "supabase/migracao-final-producao-6-0-52.sql",
    "supabase/migracao-final-producao-6-0-54.sql",
    "supabase/migracao-final-producao-6-0-55.sql",
    "supabase/migracao-final-producao-6-0-56.sql",
    "docs/FASE-67-TESTES-FUNCIONAIS-COMPLETOS.md",
    "docs/FASE-68-TESTE-OPERACIONAL-COMPLETO.md",
    "CHECKLIST-TESTE-FUNCIONAL-FASE-67.md",
    "CHECKLIST-TESTE-OPERACIONAL-FASE-68.md",
    "scripts/functional-test-fase67.mjs",
    "scripts/operational-test-fase68.mjs",
    "docs/FASE-66-LANCHONETE-PRO-COMANDAS-PDV.md",
    "docs/ATUALIZAR-APP-INSTALADO-PC.md",
    "docs/FASE-58-ESTABILIDADE-PRODUCAO.md",
    "docs/FASE-60-CONVERSAO-LANCHONETE.md",
    "docs/FASE-61-PERSONALIZACAO-LANCHES.md",
    "docs/FASE-62-IMPRESSAO-COZINHA-OTIMIZADA.md",
    "vercel.json",
    "src/utils/printJobTemplates.js",
    "electron/main.cjs",
    "electron/preload.cjs",
    "electron/print-panel.html",
  ];
  for (const file of requiredFiles) {
    assert.equal(existsSync(new URL(`../${file}`, import.meta.url)), true, `Arquivo ausente: ${file}`);
  }
});

console.log("\nTodos os testes de fumaça passaram.");
