const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");

const APP_NAME = "Barbosa's Delivery Desktop";
const CONFIG_FILE = "desktop-config.json";
const DEFAULT_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  printerName: "",
  paperWidthMm: 80,
  silentPrint: true,
  copies: {
    kitchen: 1,
    delivery: 1,
    counter: 1,
  },
  autoPrint: {
    enabled: false,
    customerApp: true,
    pdvDelivery: true,
    pdvCounter: true,
  },
  pollIntervalSeconds: 5,
};

let mainWindow = null;
let printPanelWindow = null;

function getConfigPath() {
  return path.join(app.getPath("userData"), CONFIG_FILE);
}

function sanitizeConfig(input = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...input,
    supabaseUrl: String(input.supabaseUrl || "").trim(),
    supabaseAnonKey: String(input.supabaseAnonKey || "").trim(),
    printerName: String(input.printerName || "").trim(),
    paperWidthMm: Number(input.paperWidthMm) === 58 ? 58 : 80,
    silentPrint: input.silentPrint !== false,
    copies: {
      ...DEFAULT_CONFIG.copies,
      ...(input.copies || {}),
    },
    autoPrint: {
      ...DEFAULT_CONFIG.autoPrint,
      ...(input.autoPrint || {}),
    },
    pollIntervalSeconds: Math.max(3, Number(input.pollIntervalSeconds || DEFAULT_CONFIG.pollIntervalSeconds)),
  };
}

async function readConfig() {
  try {
    const raw = await fs.readFile(getConfigPath(), "utf8");
    return sanitizeConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

async function writeConfig(config) {
  const nextConfig = sanitizeConfig(config);
  await fs.mkdir(path.dirname(getConfigPath()), { recursive: true });
  await fs.writeFile(getConfigPath(), JSON.stringify(nextConfig, null, 2), "utf8");
  return nextConfig;
}

function getAssetPath(...segments) {
  return path.join(__dirname, ...segments);
}

function getMainAppUrl() {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || process.env.BARBOSAS_DESKTOP_DEV_URL;
  if (devServerUrl) return devServerUrl;
  return path.join(__dirname, "..", "dist", "index.html");
}

async function loadMainApp(window) {
  const url = getMainAppUrl();
  if (/^https?:\/\//i.test(url)) {
    await window.loadURL(url);
    return;
  }
  if (!fsSync.existsSync(url)) {
    await window.loadFile(getAssetPath("desktop-missing-build.html"));
    return;
  }
  await window.loadFile(url);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: APP_NAME,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: getAssetPath("preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  void loadMainApp(mainWindow);
}

function createPrintPanelWindow() {
  if (printPanelWindow && !printPanelWindow.isDestroyed()) {
    printPanelWindow.focus();
    return printPanelWindow;
  }

  printPanelWindow = new BrowserWindow({
    width: 920,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    title: "Impressão automática - Barbosa's Delivery",
    backgroundColor: "#111827",
    parent: mainWindow || undefined,
    webPreferences: {
      preload: getAssetPath("preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  printPanelWindow.on("closed", () => {
    printPanelWindow = null;
  });

  void printPanelWindow.loadFile(getAssetPath("print-panel.html"));
  return printPanelWindow;
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: "Barbosa's Delivery",
      submenu: [
        { label: "Abrir painel de impressão", click: () => createPrintPanelWindow() },
        { type: "separator" },
        { label: "Recarregar", role: "reload" },
        { label: "Ferramentas do desenvolvedor", role: "toggleDevTools" },
        { type: "separator" },
        { label: "Sair", role: "quit" },
      ],
    },
    {
      label: "Impressão",
      submenu: [
        { label: "Configurar impressora", click: () => createPrintPanelWindow() },
        { label: "Teste de impressão", click: () => createPrintPanelWindow() },
      ],
    },
    {
      label: "Ajuda",
      submenu: [
        { label: "Abrir pasta de configuração", click: () => shell.openPath(app.getPath("userData")) },
      ],
    },
  ]);
}

function normalizeHtmlForPrinting(html = "") {
  const body = String(html || "").trim() || "<h1>Barbosa's Delivery</h1><p>Teste de impressão.</p>";
  if (/<!doctype html>|<html/i.test(body)) return body;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Impressão</title><style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 12px; color: #111; }
    .ticket { width: 72mm; max-width: 72mm; }
    h1,h2,h3,p { margin: 0 0 6px; }
    hr { border: 0; border-top: 1px dashed #333; margin: 8px 0; }
  </style></head><body><div class="ticket">${body}</div></body></html>`;
}

async function printHtml({ html, printerName, silentPrint = true } = {}) {
  const config = await readConfig();
  const targetPrinter = String(printerName || config.printerName || "").trim();
  const printWindow = new BrowserWindow({
    width: 420,
    height: 640,
    show: silentPrint === false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(normalizeHtmlForPrinting(html))}`);
    const result = await new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: silentPrint !== false,
          printBackground: true,
          deviceName: targetPrinter || undefined,
        },
        (success, failureReason) => resolve({ success, failureReason: failureReason || "" }),
      );
    });
    return { ...result, printerName: targetPrinter };
  } finally {
    if (!printWindow.isDestroyed()) printWindow.close();
  }
}

async function validateSupabaseConnection(configInput) {
  const config = sanitizeConfig(configInput || await readConfig());
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return { ok: false, message: "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no painel desktop." };
  }

  const baseUrl = config.supabaseUrl.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/rest/v1/print_jobs?select=id&limit=1`, {
    headers: {
      apikey: config.supabaseAnonKey,
      authorization: `Bearer ${config.supabaseAnonKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      ok: false,
      status: response.status,
      message: `Supabase respondeu ${response.status}. Verifique a migração print_jobs e as policies/RLS.`,
      details: body.slice(0, 500),
    };
  }

  return { ok: true, message: "Conexão com Supabase e tabela print_jobs confirmadas." };
}

app.whenReady().then(() => {
  app.setName(APP_NAME);
  Menu.setApplicationMenu(buildMenu());
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("desktop:get-app-info", () => ({
  name: APP_NAME,
  version: app.getVersion(),
  userDataPath: app.getPath("userData"),
  isPackaged: app.isPackaged,
}));

ipcMain.handle("desktop:get-config", () => readConfig());
ipcMain.handle("desktop:save-config", (_event, config) => writeConfig(config));
ipcMain.handle("desktop:open-print-panel", () => {
  createPrintPanelWindow();
  return { ok: true };
});

ipcMain.handle("desktop:get-printers", async (event) => {
  const ownerWindow = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  const printers = ownerWindow ? await ownerWindow.webContents.getPrintersAsync() : [];
  return printers.map((printer) => ({
    name: printer.name,
    displayName: printer.displayName || printer.name,
    description: printer.description || "",
    status: printer.status || 0,
    isDefault: Boolean(printer.isDefault),
  }));
});

ipcMain.handle("desktop:test-print", async (_event, options = {}) => {
  const now = new Date().toLocaleString("pt-BR");
  const config = await readConfig();
  const html = options.html || `<h2>BARBOSA'S DELIVERY</h2><hr><p><strong>Teste de impressão</strong></p><p>${now}</p><p>Impressora: ${String(options.printerName || config.printerName || "padrão do sistema")}</p>`;
  return printHtml({ html, printerName: options.printerName, silentPrint: options.silentPrint ?? config.silentPrint });
});

ipcMain.handle("desktop:validate-supabase", (_event, config) => validateSupabaseConnection(config));
