import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const appConstants = readFileSync("src/constants/appConstants.js", "utf8");
const electronMain = readFileSync("electron/main.cjs", "utf8");
const serviceWorker = readFileSync("public/service-worker.js", "utf8");
const printJobs = readFileSync("src/services/supabasePrintJobs.js", "utf8");
const appSource = readFileSync("src/App.jsx", "utf8");
const sql = readFileSync("supabase/migracao-final-producao-6-0-64.sql", "utf8");
const docs = readFileSync("docs/FASE-84-PRODUCAO-LIMPA-FINAL.md", "utf8");

test("versão da Fase 84 está consistente", () => {
  assert.equal(pkg.version, "6.0.64");
  assert.match(appConstants, /6\.0\.64-fase-84-producao-limpa-final/);
  assert.match(electronMain, /6\.0\.64-fase-84-producao-limpa-final/);
  assert.match(serviceWorker, /barbosas-delivery-6-0-64-fase-84-producao-limpa-final-sem-cache/);
});

test("fila de impressão usa template da Fase 84", () => {
  assert.match(printJobs, /templateVersion: "6\.0\.64"/);
  assert.match(printJobs, /template_version: "6\.0\.64"/);
});

test("interface não orienta rodar bateria final antes do instalador", () => {
  assert.doesNotMatch(appSource, /run_phase_83_final_system_audit/);
  assert.match(appSource, /Sistema liberado para produção/);
  assert.match(appSource, /dados reais da loja/);
});

test("SQL da Fase 84 limpa dados e objetos de teste", () => {
  assert.match(sql, /run_phase_84_production_cleanup/i);
  assert.match(sql, /delete from public\.products/i);
  assert.match(sql, /delete from public\.print_jobs/i);
  assert.match(sql, /drop function if exists public\.run_phase_83_final_system_audit/i);
  assert.match(sql, /drop table if exists public\.final_system_audit_runs/i);
  assert.match(sql, /production_go_live/i);
});

test("documentação da Fase 84 orienta produção limpa", () => {
  assert.match(docs, /Produção limpa final/);
  assert.match(docs, /run_phase_84_production_cleanup/);
  assert.match(docs, /status = completed/);
});
