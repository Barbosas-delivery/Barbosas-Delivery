import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "electron/main.cjs",
  "electron/preload.cjs",
  "electron/print-panel.html",
  "electron/desktop-missing-build.html",
];

for (const file of requiredFiles) {
  assert.equal(existsSync(file), true, `Arquivo Electron ausente: ${file}`);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const mainSource = readFileSync("electron/main.cjs", "utf8");
const preloadSource = readFileSync("electron/preload.cjs", "utf8");
const panelSource = readFileSync("electron/print-panel.html", "utf8");

assert.equal(packageJson.main, "electron/main.cjs", "package.json precisa apontar o entrypoint desktop");
assert.ok(packageJson.scripts.desktop, "script npm run desktop precisa existir");
assert.ok(packageJson.scripts["desktop:build"], "script npm run desktop:build precisa existir");
assert.ok(packageJson.devDependencies.electron, "Electron precisa estar nas devDependencies");
assert.ok(packageJson.devDependencies["electron-builder"], "electron-builder precisa estar preparado para gerar instalador");

assert.match(mainSource, /BrowserWindow/, "main precisa criar janelas Electron");
assert.match(mainSource, /getPrintersAsync/, "Electron precisa listar impressoras locais");
assert.match(mainSource, /webContents\.print/, "Electron precisa ter teste de impressão local");
assert.match(mainSource, /print_jobs\?select=id&limit=1/, "painel desktop precisa validar a tabela print_jobs no Supabase");
assert.match(mainSource, /desktop-config\.json/, "configurações locais precisam ficar salvas no computador");
assert.match(mainSource, /contextIsolation:\s*true/, "janela Electron precisa manter contextIsolation ativo");
assert.match(mainSource, /nodeIntegration:\s*false/, "janela Electron não deve expor Node diretamente ao app web");
assert.match(preloadSource, /contextBridge\.exposeInMainWorld\("barbosasDesktop"/, "preload precisa expor bridge segura");
assert.match(panelSource, /Pedido do app: 1 via cozinha \+ 1 via entrega/, "painel precisa refletir regra operacional do app");
assert.match(panelSource, /PDV Entregas: 1 via cozinha \+ 1 via entrega/, "painel precisa refletir regra do PDV Entregas");
assert.match(panelSource, /PDV Balcão: 1 via balcão/, "painel precisa refletir regra do PDV Balcão");

console.log("✓ Estrutura Electron validada.");
