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
  assert.match(constantsSource, /APP_VERSION = "6\.0\.38-fase-51-pedido-direto-sem-aprovacao"/);
  assert.match(serviceWorkerSource, /barbosas-delivery-6-0-38-fase-51-pedido-direto-sem-aprovacao-sem-cache/);
  assert.match(serviceWorkerSource, /cache: "no-store"/);
  assert.doesNotMatch(serviceWorkerSource, /cache\.addAll|caches\.match|cache\.put/);

  assert.ok(appSource.includes('status: DELIVERY_STATUS.WAITING_PICKUP,\n        origin: "customer",\n        needsStoreApproval: false'), "pedido do app deve nascer direto como aguardando retirada, sem aprovação");
  assert.ok(appSource.includes('Pedido recebido pela loja e enviado para preparo.'), "mensagem do cliente não deve pedir aprovação manual");
  assert.doesNotMatch(appSource, /A loja vai aprovar e liberar para entrega|Pedido enviado para a loja\. Aguarde a confirmação|Aprove o pedido antes de confirmar recebimento/, "fluxo novo não deve orientar aprovação manual do pedido");
  assert.ok(appSource.includes("restoreProductInSupabase"), "recadastro de produto excluído precisa reativar por ID, não atualizar todos por código de barras");
  assert.ok(appSource.includes("makeUniqueNumericId()"), "IDs críticos não devem depender só de Date.now() em produção");
  assert.ok(appSource.includes("buildStockDeltasFromItems"), "persistência de estoque deve calcular deltas dos produtos alterados");
  assert.ok(appSource.includes("const stockPersisted = await persistStockDeltasForItems"), "fluxos críticos devem verificar retorno da sincronização de estoque");
  assert.ok(appSource.includes("applyProductStockDeltasInSupabase"), "estoque deve usar delta atômico no Supabase quando a migração estiver aplicada");
  const stockServiceSource = readFileSync(new URL("../src/services/supabaseProducts.js", import.meta.url), "utf8");
  const stockMigrationSource = readFileSync(new URL("../supabase/migracao-final-producao-6-0-38.sql", import.meta.url), "utf8");
  assert.doesNotMatch(stockServiceSource, /Fallback de compatibilidade|fallbackUsed:\s*true|select\("id, stock"\)/, "estoque não pode cair em fallback não atômico em produção");
  assert.match(stockServiceSource, /Migração de estoque atômico não encontrada/, "sem função SQL, o app deve alertar e não mascarar o erro");
  assert.match(stockMigrationSource, /for update/i, "função de estoque precisa travar a linha do produto");
  assert.match(stockMigrationSource, /if jsonb_array_length\(failures\) > 0[\s\S]*return jsonb_build_object\('success', false/i, "função de estoque precisa validar tudo antes de alterar qualquer produto");
  assert.match(stockMigrationSource, /insufficient_stock/i, "função de estoque precisa recusar baixa sem saldo suficiente");
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
  assert.ok(appSource.includes("Kit atualizado e sincronizado no Supabase."), "edição de kit precisa confirmar sincronização real");
  assert.match(stockMigrationSource, /create or replace function replace_kit_items/i, "migração final precisa criar função transacional para substituir itens de kit");
  assert.match(stockMigrationSource, /create or replace function replace_tab_account_items/i, "migração final precisa criar função transacional para substituir itens de comanda");
  assert.ok(readFileSync(new URL("../src/services/supabaseTabs.js", import.meta.url), "utf8").includes('supabase.rpc("replace_tab_account_items"'), "itens de comanda precisam ser substituídos via função SQL transacional");
  assert.doesNotMatch(readFileSync(new URL("../src/services/supabaseTabs.js", import.meta.url), "utf8"), /from\("tab_account_items"\)\.delete\(\)[\s\S]*insertWithSchemaRetry\("tab_account_items"/, "comandas não podem apagar e inserir itens pelo front-end em duas etapas");
  assert.match(stockMigrationSource, /alter table orders add column if not exists payment_status/i, "migração final precisa reforçar colunas de orders em bancos antigos");
  assert.match(stockMigrationSource, /alter table order_items add column if not exists is_kit/i, "migração final precisa reforçar colunas de order_items em bancos antigos");
  assert.doesNotMatch(appSource, /restoreProductByBarcodeInSupabase|updateWithFilterSchemaRetry\("products"/, "não pode reativar produto por filtro amplo de código de barras");
  assert.ok(supabaseClientSource.includes("channel()"), "cliente Supabase desativado precisa ter channel() para não quebrar sem env");
  assert.ok(supabaseClientSource.includes("removeChannel()"), "cliente Supabase desativado precisa ter removeChannel() para cleanup seguro");
  assert.ok(readFileSync(new URL("../src/services/supabaseProducts.js", import.meta.url), "utf8").includes("isTruthyActive(product.active)"), "produtos com active nulo/ausente no Supabase devem continuar visíveis, não sumir do cliente");
  assert.ok(readFileSync(new URL("../src/utils/catalog.js", import.meta.url), "utf8").includes("isTruthyActive(product.active)"), "catálogo do cliente precisa tratar active ausente como ativo para tabelas antigas");
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
    "supabase/migracao-final-producao-6-0-38.sql",
  ];
  for (const file of requiredFiles) {
    assert.equal(existsSync(new URL(`../${file}`, import.meta.url)), true, `Arquivo ausente: ${file}`);
  }
});

console.log("\nTodos os testes de fumaça passaram.");
