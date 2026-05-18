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
assert.ok(packageJson.scripts["desktop:installer"], "script npm run desktop:installer precisa existir");
assert.ok(packageJson.scripts["desktop:pack"], "script npm run desktop:pack precisa existir");
assert.ok(packageJson.devDependencies.electron, "Electron precisa estar nas devDependencies");
assert.ok(packageJson.devDependencies["electron-builder"], "electron-builder precisa estar preparado para gerar instalador");
assert.equal(packageJson.build?.productName, "Barbosa's Delivery Desktop", "instalador precisa ter nome do produto");
assert.match(JSON.stringify(packageJson.build || {}), /Barbosas-Delivery-Desktop-\$\{version\}-Setup/, "instalador precisa gerar Setup identificável");

assert.match(mainSource, /BrowserWindow/, "main precisa criar janelas Electron");
assert.match(mainSource, /getPrintersAsync/, "Electron precisa listar impressoras locais");
assert.match(mainSource, /webContents\.print/, "Electron precisa ter teste de impressão local");
assert.match(mainSource, /print_jobs\?select=id&limit=1/, "painel desktop precisa validar a tabela print_jobs no Supabase");
assert.match(mainSource, /claim_pending_print_jobs/, "Electron precisa reservar jobs pendentes no Supabase");
assert.match(mainSource, /mark_print_job_printed/, "Electron precisa marcar jobs como impressos");
assert.match(mainSource, /mark_print_job_failed/, "Electron precisa registrar falhas de impressão");
assert.match(mainSource, /setInterval\(\(\) => \{\n    void processPrintJobsOnce\(\);/, "Electron precisa consumir a fila automaticamente por intervalo");
assert.match(mainSource, /p_sources/, "Electron precisa respeitar fontes de impressão habilitadas");
assert.match(mainSource, /getJobCopies/, "Electron precisa respeitar a quantidade de vias por tipo de cupom");
assert.match(mainSource, /desktop-config\.json/, "configurações locais precisam ficar salvas no computador");
assert.match(mainSource, /setLoginItemSettings/, "Electron precisa permitir iniciar com Windows");
assert.match(mainSource, /fetchPrintCenterData/, "Electron precisa buscar dados da central de impressão");
assert.match(mainSource, /requeuePrintJob/, "Electron precisa reenfileirar jobs para reimpressão");
assert.match(mainSource, /upsertPrintWorkerHeartbeat/, "Electron precisa atualizar heartbeat do computador de impressão");
assert.match(mainSource, /registerDesktopInstallation/, "Electron precisa registrar instalação desktop no Supabase");
assert.match(mainSource, /backupDesktopConfig/, "Electron precisa gerar backup da configuração local");
assert.match(mainSource, /getDesktopUpdateStatus/, "Electron precisa expor checklist de atualização instalada");
assert.match(mainSource, /APP_VERSION = "6\.0\.54-fase-66-lanchonete-pro-comandas-pdv"/, "Electron precisa expor a versão da Fase 66");
assert.match(mainSource, /contextIsolation:\s*true/, "janela Electron precisa manter contextIsolation ativo");
assert.match(mainSource, /nodeIntegration:\s*false/, "janela Electron não deve expor Node diretamente ao app web");
assert.match(preloadSource, /contextBridge\.exposeInMainWorld\("barbosasDesktop"/, "preload precisa expor bridge segura");
assert.match(preloadSource, /startPrintWorker/, "preload precisa expor início da impressão automática");
assert.match(preloadSource, /processPrintJobsOnce/, "preload precisa permitir processar a fila sob demanda");
assert.match(preloadSource, /fetchPrintCenter/, "preload precisa expor a central de impressão");
assert.match(preloadSource, /requeuePrintJob/, "preload precisa permitir reimpressão manual");
assert.match(preloadSource, /resetStalePrintJobs/, "preload precisa permitir liberar jobs travados");
assert.match(preloadSource, /getUpdateStatus/, "preload precisa expor status de atualização do desktop instalado");
assert.match(preloadSource, /backupConfig/, "preload precisa permitir backup da configuração local");
assert.match(preloadSource, /registerInstallation/, "preload precisa registrar instalação no Supabase");
assert.match(panelSource, /Pedido do app: 1 via cozinha \+ 1 via entrega/, "painel precisa refletir regra operacional do app");
assert.match(panelSource, /PDV Entregas: 1 via cozinha \+ 1 via entrega/, "painel precisa refletir regra do PDV Entregas");
assert.match(panelSource, /PDV Balcão: 1 via balcão/, "painel precisa refletir regra do PDV Balcão");
assert.match(panelSource, /Ativar impressão automática neste computador/, "painel precisa permitir ligar impressão automática real");
assert.match(panelSource, /Processar fila agora/, "painel precisa permitir processar a fila manualmente");
assert.match(panelSource, /Central de impressão/, "painel precisa ter central de impressão operacional");
assert.match(panelSource, /Reprocessar falhas/, "central precisa reprocessar falhas");
assert.match(panelSource, /Liberar travados/, "central precisa liberar jobs travados");
assert.match(panelSource, /Iniciar Barbosa’s Delivery Desktop junto com o Windows/, "painel precisa controlar inicialização com Windows");
assert.match(panelSource, /Atualização do app instalado no PC/, "painel precisa mostrar atualização do app instalado no PC");
assert.match(panelSource, /Backup da configuração local/, "painel precisa permitir backup da configuração local");
assert.match(panelSource, /Registrar instalação no Supabase/, "painel precisa registrar instalação no Supabase");

console.log("✓ Estrutura Electron validada.");
