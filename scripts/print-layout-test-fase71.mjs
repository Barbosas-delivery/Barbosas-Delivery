import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mainSource = readFileSync("electron/main.cjs", "utf8");
const printTemplatesSource = readFileSync("src/utils/printJobTemplates.js", "utf8");
const printingSource = readFileSync("src/utils/printing.js", "utf8");
const migrationSource = readFileSync("supabase/migracao-final-producao-6-0-59.sql", "utf8");

assert.match(mainSource, /buildThermalPrintCss/, "Desktop precisa injetar CSS térmico antes de imprimir");
assert.match(mainSource, /pageSize:\s*\{\s*width:\s*safePaperWidthMm \* 1000,\s*height:\s*297000\s*\}/s, "Electron precisa enviar tamanho de página 80mm/58mm ao driver");
assert.match(mainSource, /margins:\s*\{\s*marginType:\s*"none"\s*\}/, "Electron precisa imprimir sem margem do Windows");
assert.match(mainSource, /scaleFactor:\s*100/, "Electron não deve deixar o driver encolher/deslocar o cupom");
assert.match(printTemplatesSource, /@page \{ size: 80mm auto; margin: 0; \}/, "Templates de fila precisam zerar margem @page");
assert.match(printTemplatesSource, /width: 72mm; max-width: 72mm/, "Templates precisam caber dentro da área imprimível de 80mm");
assert.match(printingSource, /width: 72mm; max-width: 72mm/, "Impressão manual pelo navegador precisa usar largura térmica segura");
assert.match(migrationSource, /6\.0\.59-fase-71-correcao-layout-cupom-termico/, "Migração precisa registrar a versão da Fase 71");

console.log("✓ Layout térmico Fase 71 validado.");
