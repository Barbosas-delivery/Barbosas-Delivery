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

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const appConstants = readFileSync("src/constants/appConstants.js", "utf8");
const appSource = readFileSync("src/App.jsx", "utf8");
const initialData = readFileSync("src/constants/initialData.js", "utf8");
const runtime = readFileSync("src/utils/appRuntime.js", "utf8");
const ui = readFileSync("src/components/ui.jsx", "utf8");
const printJobs = readFileSync("src/services/supabasePrintJobs.js", "utf8");
const printTemplates = readFileSync("src/utils/printJobTemplates.js", "utf8");
const printing = readFileSync("src/utils/printing.js", "utf8");
const sql73 = readFileSync("supabase/migracao-final-producao-6-0-61.sql", "utf8");

test("versão da Fase 74-82 está consistente", () => {
  assert.equal(pkg.version, "6.0.64");
  assert.match(appConstants, /6\.0\.64-fase-84-producao-limpa-final/);
});

test("configurações iniciais possuem marca editável", () => {
  assert.match(initialData, /storeName: "BARBOSAS LANCHES"/);
  assert.match(initialData, /storeLogoUrl/);
  assert.match(initialData, /storeCoverUrl/);
  assert.match(initialData, /receiptBrandName/);
});

test("sanitização preserva nome, logo, capa e nome de cupom", () => {
  assert.match(runtime, /storeShortName/);
  assert.match(runtime, /storeLogoUrl/);
  assert.match(runtime, /storeCoverUrl/);
  assert.match(runtime, /receiptBrandName/);
  assert.match(runtime, /receiptLogoEnabled/);
});

test("interface permite editar e carregar foto da marca", () => {
  assert.match(appSource, /Marca da loja/);
  assert.match(appSource, /Nome exibido da loja/);
  assert.match(appSource, /Carregar logo\/foto/);
  assert.match(appSource, /handleBrandImageFile/);
  assert.match(appSource, /Remover logo/);
});

test("logo visual aceita URL configurada", () => {
  assert.match(ui, /function StoreLogo\(\{ size = "h-14 w-14", logoUrl/);
  assert.match(ui, /<img src=\{cleanLogoUrl\}/);
});

test("cupons e fila de impressão recebem marca dinâmica", () => {
  assert.match(printing, /receipt-logo/);
  assert.match(printTemplates, /payload\.brand/);
  assert.match(printTemplates, /storeName = safeText/);
  assert.match(printJobs, /brandSettings/);
  assert.match(printJobs, /templateVersion: "6\.0\.64"/);
  assert.match(appSource, /buildReceiptBrandHeaderHtml/);
});

test("SQL da Fase 74-82 prepara RPCs e teste de marca", () => {
  assert.match(sql73, /update_store_brand_settings/);
  assert.match(sql73, /run_phase_73_brand_test/);
  assert.match(sql73, /phase_73_brand_test_summary_view/);
  assert.match(sql73, /storeLogoUrl/);
  assert.match(sql73, /receiptBrandName/);
});

console.log("\nTeste de personalização da marca da Fase 74-82 passou.");
