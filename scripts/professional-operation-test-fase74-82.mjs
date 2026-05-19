import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const appConstants = readFileSync("src/constants/appConstants.js", "utf8");
const electronMain = readFileSync("electron/main.cjs", "utf8");
const appSource = readFileSync("src/App.jsx", "utf8");
const initialData = readFileSync("src/constants/initialData.js", "utf8");
const sql = readFileSync("supabase/migracao-final-producao-6-0-62.sql", "utf8");
const docs = readFileSync("docs/FASE-74-A-82-OPERACAO-PROFISSIONAL-E-SEGURANCA.md", "utf8");

test("versão das fases 74 a 82 está consistente", () => {
  assert.equal(pkg.version, "6.0.64");
  assert.match(appConstants, /6\.0\.64-fase-84-producao-limpa-final/);
  assert.match(electronMain, /6\.0\.64-fase-84-producao-limpa-final/);
});

test("painel de configurações exibe operação profissional", () => {
  assert.match(appSource, /Operação profissional — Fases 74 a 82/);
  assert.match(appSource, /Horário|Loja aberta|WhatsApp|Painel de cozinha|Relatórios|Backup|Permissões/);
  assert.match(initialData, /receiptFooterMessage/);
  assert.match(initialData, /whatsappAutomationEnabled/);
  assert.match(initialData, /kitchenDisplayEnabled/);
});

test("migração cria estruturas das fases 74 a 82", () => {
  for (const token of [
    "phase_74_advanced_branding",
    "store_business_hours",
    "menu_highlights",
    "pdv_quick_actions",
    "employee_roles",
    "professional_sales_report_view",
    "backup_export_runs",
    "kitchen_display_events",
    "whatsapp_message_templates",
    "run_phase_82_professional_operation_test",
  ]) {
    assert.match(sql, new RegExp(token));
  }
});

test("migração corrige avisos de SECURITY DEFINER VIEW", () => {
  assert.match(sql, /security_invoker\s*=\s*true/i);
  assert.match(sql, /alter view if exists public\.phase_68_operational_test_summary_view set \(security_invoker = true\)/i);
  assert.match(sql, /alter view if exists public\.category_addons_operational_view set \(security_invoker = true\)/i);
  assert.match(sql, /alter view if exists public\.print_jobs_operational_view set \(security_invoker = true\)/i);
});

test("documentação descreve fases e correção do Advisor", () => {
  assert.match(docs, /Fase 74/);
  assert.match(docs, /Fase 82/);
  assert.match(docs, /Supabase Advisor/);
  assert.match(docs, /SECURITY INVOKER/);
});
