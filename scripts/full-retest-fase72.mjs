import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const appConstants = readFileSync("src/constants/appConstants.js", "utf8");
const appSource = readFileSync("src/App.jsx", "utf8");
const operationalPanel = readFileSync("src/components/OperationalPanels.jsx", "utf8");
const printJobs = readFileSync("src/services/supabasePrintJobs.js", "utf8");
const printTemplates = readFileSync("src/utils/printJobTemplates.js", "utf8");
const printing = readFileSync("src/utils/printing.js", "utf8");
const electronMain = readFileSync("electron/main.cjs", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const sql72 = readFileSync("supabase/migracao-final-producao-6-0-60.sql", "utf8");

const checklist = [
  "cash_open",
  "cash_supply",
  "cash_withdrawal",
  "customer_delivery",
  "accept_delivery",
  "dispatch_delivery",
  "confirm_delivery",
  "counter_sale",
  "tab_full_flow",
  "stock_movement",
  "print_jobs",
  "cancel_order",
  "cash_close",
  "reports",
  "cleanup",
  "addons_ui",
  "thermal_layout",
];

test("versão da Fase 72 está consistente", () => {
  assert.equal(pkg.version, "6.0.64");
  assert.match(appConstants, /6\.0\.64-fase-84-producao-limpa-final/);
  assert.match(electronMain, /6\.0\.64-fase-84-producao-limpa-final/);
});

test("teste geral inclui fases 67, 68, 69, 70, 71 e 72", () => {
  assert.match(pkg.scripts.test, /functional-test-fase67/);
  assert.match(pkg.scripts.test, /operational-test-fase68/);
  assert.match(pkg.scripts.test, /addons-ui-test-fase69/);
  assert.match(pkg.scripts.test, /stock-control-test-fase70/);
  assert.match(pkg.scripts.test, /print-layout-test-fase71/);
  assert.match(pkg.scripts.test, /full-retest-fase72/);
});

test("adicionais por categoria continuam com tela própria e RPC segura", () => {
  assert.match(appSource, /Adicionais/);
  assert.match(appSource, /create_category_addon/);
  assert.match(appSource, /set_category_addon_active/);
  assert.match(sql72, /create_category_addon/);
  assert.match(sql72, /TESTE FASE 72 - Bacon extra/);
});

test("estoque de lanchonete continua ignorando lanche, porção e combo", () => {
  assert.match(sql72, /apply_product_stock_deltas/);
  assert.match(sql72, /stock_control_disabled/);
  assert.match(sql72, /lanche\|hamburg\|hambúrg\|porcao\|porção\|combo/);
});

test("layout térmico continua protegido para 80mm e 58mm", () => {
  assert.match(electronMain, /buildThermalPrintCss/);
  assert.match(electronMain, /margins:\s*\{\s*marginType:\s*"none"\s*\}/);
  assert.match(electronMain, /pageSize:/);
  assert.match(printTemplates, /width: 72mm; max-width: 72mm/);
  assert.match(printing, /width: 72mm; max-width: 72mm/);
});

test("fila de impressão usa a versão 6.0.64", () => {
  assert.match(printJobs, /templateVersion: "6\.0\.64"/);
  assert.match(printJobs, /template_version: "6\.0\.64"/);
});

test("SQL da Fase 72 cobre todo checklist operacional", () => {
  assert.match(sql72, /run_phase_72_complete_retest/);
  assert.match(sql72, /phase_72_complete_retest_summary_view/);
  assert.match(sql72, /complete_retest_runs/);
  for (const item of checklist) {
    assert.match(sql72, new RegExp(item));
  }
});

test("diagnóstico mantém área de teste operacional", () => {
  assert.match(operationalPanel, /Teste operacional completo da Fase 68|Teste funcional da Fase 67|Pronto para produção/);
  assert.match(operationalPanel, /operationalValidation|productionReadiness|functionalTest/);
});

console.log("\nReteste automatizado da Fase 72 passou.");
