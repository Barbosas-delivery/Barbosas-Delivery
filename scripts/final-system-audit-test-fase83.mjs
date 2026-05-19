import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const appConstants = readFileSync("src/constants/appConstants.js", "utf8");
const electronMain = readFileSync("electron/main.cjs", "utf8");
const printJobs = readFileSync("src/services/supabasePrintJobs.js", "utf8");
const serviceWorker = readFileSync("public/service-worker.js", "utf8");
const appSource = readFileSync("src/App.jsx", "utf8");
const sql = readFileSync("supabase/migracao-final-producao-6-0-63.sql", "utf8");
const docs = readFileSync("docs/FASE-83-BATERIA-FINAL-100-POR-CENTO.md", "utf8");

const expectedChecklistTokens = [
  "phase72_passed",
  "phase82_passed",
  "app_version",
  "brand",
  "business_hours",
  "store_open_pause",
  "products",
  "category_addons",
  "stock_control",
  "combo_kits",
  "orders",
  "delivery_flow",
  "counter_pdv",
  "cash",
  "tabs",
  "tab_items",
  "print_queue",
  "thermal_receipt",
  "permissions",
  "reports",
  "backup",
  "kds",
  "whatsapp",
  "notifications",
  "audit_logs",
  "security_invoker",
  "category_addons_rls",
  "brand_rpc",
  "addon_rpc",
  "desktop_registry",
  "final_installer_ready",
];

test("versão da Fase 83 está consistente", () => {
  assert.equal(pkg.version, "6.0.64");
  assert.match(appConstants, /6\.0\.64-fase-84-producao-limpa-final/);
  assert.match(electronMain, /6\.0\.64-fase-84-producao-limpa-final/);
  assert.match(serviceWorker, /barbosas-delivery-6-0-64-fase-84-producao-limpa-final-sem-cache/);
});

test("fila de impressão usa template da Fase 83", () => {
  assert.match(printJobs, /templateVersion: "6\.0\.64"/);
  assert.match(printJobs, /template_version: "6\.0\.64"/);
});

test("SQL cria auditoria final 100%", () => {
  assert.match(sql, /create table if not exists public\.final_system_audit_runs/i);
  assert.match(sql, /run_phase_83_final_system_audit/i);
  assert.match(sql, /phase_83_final_system_audit_summary_view/i);
  assert.match(sql, /TESTE FASE 83/);
  assert.match(sql, /security_invoker\s*=\s*true/i);
});

test("checklist final cobre todos os módulos críticos", () => {
  for (const token of expectedChecklistTokens) {
    assert.match(sql, new RegExp(token), `Checklist final precisa conter ${token}`);
  }
});

test("teste geral inclui a Fase 83", () => {
  assert.match(pkg.scripts.test, /final-system-audit-test-fase83/);
  assert.match(appSource, /Sistema liberado para produção|Fase 84|dados reais da loja/);
});

test("documentação orienta execução antes do instalador", () => {
  assert.match(docs, /Fase 83/);
  assert.match(docs, /run_phase_83_final_system_audit/);
  assert.match(docs, /ready_percent/);
  assert.match(docs, /100%/);
});
