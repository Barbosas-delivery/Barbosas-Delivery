import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { money, formatCep, isValidCep, formatBrazilMobilePhone, isValidBrazilMobilePhone, onlyPhoneNumbers, escapeHtml, buildReceiptItemsHtml } from "../src/utils/formatters.js";
import { toPositiveInteger, toSafeMoneyNumber, calculateChangeDue } from "../src/utils/numbers.js";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const constantsSource = readFileSync(new URL("../src/constants/appConstants.js", import.meta.url), "utf8");
const serviceWorkerSource = readFileSync(new URL("../public/service-worker.js", import.meta.url), "utf8");

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
  assert.match(constantsSource, /APP_VERSION = "6\.0\.18-fase-50-revisao-final-producao"/);
  assert.match(serviceWorkerSource, /barbosas-delivery-6-0-18-fase-50/);
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
  ];
  for (const file of requiredFiles) {
    assert.equal(existsSync(new URL(`../${file}`, import.meta.url)), true, `Arquivo ausente: ${file}`);
  }
});

console.log("\nTodos os testes de fumaça passaram.");
