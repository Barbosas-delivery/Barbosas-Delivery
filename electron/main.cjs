const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const crypto = require("node:crypto");

const APP_NAME = "Barbosa's Delivery Desktop";
const APP_VERSION = "6.0.58-fase-70-correcao-estoque-lanchonete";
const CONFIG_FILE = "desktop-config.json";
const MAX_PRINT_LOGS = 80;
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
  startWithWindows: false,
};

const printWorker = {
  timer: null,
  running: false,
  processing: false,
  workerId: `barbosas-desktop-${crypto.randomUUID()}`,
  lastRunAt: "",
  lastError: "",
  lastClaimCount: 0,
  printedCount: 0,
  failedCount: 0,
  logs: [],
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
    startWithWindows: Boolean(input.startWithWindows),
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


function applyStartupSetting(config) {
  if (!app.isPackaged && process.platform !== "win32") return;
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(config.startWithWindows),
      path: process.execPath,
    });
  } catch (error) {
    addPrintLog("error", `Não foi possível alterar inicialização com Windows: ${error?.message || error}`);
  }
}

function getStartupStatus() {
  try {
    return app.getLoginItemSettings();
  } catch {
    return { openAtLogin: false };
  }
}

async function writeConfig(config) {
  const nextConfig = sanitizeConfig(config);
  await fs.mkdir(path.dirname(getConfigPath()), { recursive: true });
  await fs.writeFile(getConfigPath(), JSON.stringify(nextConfig, null, 2), "utf8");
  applyStartupSetting(nextConfig);
  void registerDesktopInstallation();
  if (nextConfig.autoPrint.enabled) {
    try {
      await startPrintWorker();
    } catch (error) {
      addPrintLog("error", `Configuração salva, mas a impressão automática não iniciou: ${error?.message || error}`);
    }
  } else {
    stopPrintWorker();
  }
  return nextConfig;
}

function addPrintLog(level, message, details = {}) {
  const entry = {
    at: new Date().toISOString(),
    level,
    message,
    details,
  };
  printWorker.logs.unshift(entry);
  printWorker.logs = printWorker.logs.slice(0, MAX_PRINT_LOGS);
  if (printPanelWindow && !printPanelWindow.isDestroyed()) {
    printPanelWindow.webContents.send("desktop:print-worker-log", entry);
  }
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
    width: 980,
    height: 780,
    minWidth: 820,
    minHeight: 620,
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
        { label: "Processar fila agora", click: () => void processPrintJobsOnce() },
        { label: "Iniciar impressão automática", click: () => void startPrintWorker() },
        { label: "Parar impressão automática", click: () => stopPrintWorker() },
        { type: "separator" },
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

function normalizeHtmlForPrinting(html = "", paperWidthMm = 80) {
  const body = String(html || "").trim() || "<h1>Barbosa's Delivery</h1><p>Teste de impressão.</p>";
  const width = Number(paperWidthMm) === 58 ? 50 : 72;
  if (/<!doctype html>|<html/i.test(body)) return body;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Impressão</title><style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 12px; color: #111; }
    .ticket { width: ${width}mm; max-width: ${width}mm; }
    h1,h2,h3,p { margin: 0 0 6px; }
    hr { border: 0; border-top: 1px dashed #333; margin: 8px 0; }
  </style></head><body><div class="ticket">${body}</div></body></html>`;
}

async function printHtml({ html, printerName, silentPrint = true, paperWidthMm = 80 } = {}) {
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
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(normalizeHtmlForPrinting(html, paperWidthMm || config.paperWidthMm))}`);
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

function requireSupabaseConfig(config) {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error("Configure a URL e a anon key do Supabase no painel desktop.");
  }
}

async function supabaseRpc(config, functionName, body = {}) {
  requireSupabaseConfig(config);
  const baseUrl = config.supabaseUrl.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: config.supabaseAnonKey,
      authorization: `Bearer ${config.supabaseAnonKey}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message = typeof payload === "object" && payload?.message ? payload.message : text || `Supabase respondeu ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}


async function supabaseRest(config, pathAndQuery, { method = "GET", body = null } = {}) {
  requireSupabaseConfig(config);
  const baseUrl = config.supabaseUrl.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/rest/v1/${pathAndQuery}`, {
    method,
    headers: {
      apikey: config.supabaseAnonKey,
      authorization: `Bearer ${config.supabaseAnonKey}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: body === null ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message = typeof payload === "object" && payload?.message ? payload.message : text || `Supabase respondeu ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function normalizePrintJobId(jobId) {
  const raw = String(jobId ?? "").trim();
  if (!raw) throw new Error("ID do job de impressão não informado.");
  return raw;
}

function buildPrintJobFilters({ status = "", source = "", printType = "", limit = 50 } = {}) {
  const params = new URLSearchParams();
  params.set("select", "id,source,source_id,print_type,status,attempts,worker_id,locked_by,printer_name,created_at,printing_at,printed_at,failed_at,cancelled_at,error_message,updated_at");
  params.set("order", "created_at.desc");
  params.set("limit", String(Math.max(1, Math.min(Number(limit || 50), 100))));
  if (status) params.set("status", `eq.${status}`);
  if (source) params.set("source", `eq.${source}`);
  if (printType) params.set("print_type", `eq.${printType}`);
  return params.toString();
}

async function fetchPrintJobs(filters = {}) {
  const config = await readConfig();
  const query = buildPrintJobFilters(filters);
  return await supabaseRest(config, `print_jobs?${query}`) || [];
}

async function requeuePrintJob(jobId) {
  const config = await readConfig();
  const id = normalizePrintJobId(jobId);
  const payload = {
    status: "pending",
    worker_id: "",
    locked_by: "",
    printing_at: null,
    failed_at: null,
    cancelled_at: null,
    error_message: "",
    updated_at: new Date().toISOString(),
  };
  const result = await supabaseRest(config, `print_jobs?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
  addPrintLog("info", `Job ${id} reenfileirado para reimpressão.`);
  return result?.[0] || { ok: true, id };
}

async function cancelPrintJob(jobId) {
  const config = await readConfig();
  const id = normalizePrintJobId(jobId);
  const payload = {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    error_message: "Cancelado manualmente pela central de impressão.",
    updated_at: new Date().toISOString(),
  };
  const result = await supabaseRest(config, `print_jobs?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
  addPrintLog("info", `Job ${id} cancelado manualmente.`);
  return result?.[0] || { ok: true, id };
}

async function requeueFailedPrintJobs() {
  const config = await readConfig();
  const payload = {
    status: "pending",
    worker_id: "",
    locked_by: "",
    printing_at: null,
    failed_at: null,
    error_message: "",
    updated_at: new Date().toISOString(),
  };
  const result = await supabaseRest(config, "print_jobs?status=eq.failed", { method: "PATCH", body: payload }) || [];
  addPrintLog("info", `${result.length} job(s) com falha reenfileirado(s).`);
  return result;
}

async function resetStalePrintJobs(minutes = 10) {
  const config = await readConfig();
  const result = await supabaseRpc(config, "reset_stale_print_jobs", {
    p_minutes: Math.max(1, Math.min(Number(minutes || 10), 120)),
  }) || [];
  addPrintLog("info", `${result.length} job(s) travado(s) voltou/voltaram para pendente.`);
  return result;
}

async function cleanupPrintedPrintJobs(daysToKeep = 7) {
  const config = await readConfig();
  const days = Math.max(1, Math.min(Number(daysToKeep || 7), 90));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const result = await supabaseRest(config, `print_jobs?status=eq.printed&printed_at=lt.${encodeURIComponent(cutoff)}`, { method: "DELETE" }) || [];
  addPrintLog("info", `${result.length} job(s) impresso(s) antigo(s) removido(s).`);
  return { deleted: result.length, cutoff };
}

async function fetchPrintWorkers() {
  const config = await readConfig();
  try {
    const params = new URLSearchParams();
    params.set("select", "worker_id,computer_name,status,last_seen_at,last_error,printer_name,app_version,updated_at");
    params.set("order", "last_seen_at.desc");
    params.set("limit", "20");
    return await supabaseRest(config, `print_workers?${params.toString()}`) || [];
  } catch (error) {
    return { unavailable: true, message: error?.message || String(error) };
  }
}

async function upsertPrintWorkerHeartbeat(status = "online") {
  const config = await readConfig();
  try {
    await supabaseRpc(config, "upsert_print_worker_heartbeat", {
      p_worker_id: printWorker.workerId,
      p_computer_name: process.env.COMPUTERNAME || process.env.HOSTNAME || "computador-da-loja",
      p_status: status,
      p_printer_name: config.printerName || "padrão do sistema",
      p_app_version: APP_VERSION,
      p_last_error: printWorker.lastError || "",
    });
  } catch (error) {
    addPrintLog("warn", `Não foi possível atualizar status do computador de impressão: ${error?.message || error}`);
  }
}

function getComputerName() {
  return process.env.COMPUTERNAME || process.env.HOSTNAME || "computador-da-loja";
}

function getDesktopInstallChecklist(config = DEFAULT_CONFIG) {
  return [
    { id: "version", label: "Versão desktop instalada", ok: APP_VERSION.includes("6.0.58"), detail: APP_VERSION },
    { id: "supabase", label: "Supabase configurado", ok: Boolean(config.supabaseUrl && config.supabaseAnonKey), detail: config.supabaseUrl ? "URL configurada" : "Configure URL e anon key" },
    { id: "printer", label: "Impressora selecionada", ok: Boolean(config.printerName) || Boolean(config.silentPrint), detail: config.printerName || "Usando impressora padrão do Windows" },
    { id: "autoprint", label: "Impressão automática", ok: Boolean(config.autoPrint?.enabled), detail: config.autoPrint?.enabled ? "Ligada" : "Desligada" },
    { id: "startup", label: "Iniciar com Windows", ok: Boolean(config.startWithWindows), detail: config.startWithWindows ? "Ativado" : "Opcional: ativar no painel" },
  ];
}

async function getDesktopUpdateStatus() {
  const config = await readConfig();
  const checklist = getDesktopInstallChecklist(config);
  const okCount = checklist.filter((item) => item.ok).length;
  return {
    appVersion: APP_VERSION,
    packageVersion: app.getVersion(),
    computerName: getComputerName(),
    workerId: printWorker.workerId,
    userDataPath: app.getPath("userData"),
    configPath: getConfigPath(),
    installDate: new Date().toISOString(),
    checklist,
    readyPercent: Math.round((okCount / checklist.length) * 100),
  };
}

async function backupDesktopConfig() {
  const config = await readConfig();
  const status = await getDesktopUpdateStatus();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(app.getPath("userData"), `backup-config-desktop-${stamp}.json`);
  const payload = {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    status,
    config,
  };
  await fs.writeFile(backupPath, JSON.stringify(payload, null, 2), "utf8");
  addPrintLog("info", `Backup da configuração desktop criado em ${backupPath}`);
  return { ok: true, backupPath, appVersion: APP_VERSION };
}

async function registerDesktopInstallation() {
  const config = await readConfig();
  const status = await getDesktopUpdateStatus();
  try {
    const result = await supabaseRpc(config, "register_desktop_installation", {
      p_worker_id: printWorker.workerId,
      p_computer_name: status.computerName,
      p_app_version: APP_VERSION,
      p_package_version: app.getVersion(),
      p_printer_name: config.printerName || "padrão do sistema",
      p_auto_print_enabled: Boolean(config.autoPrint?.enabled),
      p_start_with_windows: Boolean(config.startWithWindows),
      p_config: {
        paperWidthMm: config.paperWidthMm,
        silentPrint: config.silentPrint,
        copies: config.copies,
        autoPrint: config.autoPrint,
        pollIntervalSeconds: config.pollIntervalSeconds,
      },
    });
    addPrintLog("ok", `Instalação desktop registrada no Supabase: ${APP_VERSION}`);
    return { ok: true, result, status };
  } catch (error) {
    const message = error?.message || String(error);
    addPrintLog("warn", `Não foi possível registrar instalação desktop: ${message}`);
    return { ok: false, message, status };
  }
}

async function fetchPrintCenterData(filters = {}) {
  const config = await readConfig();
  requireSupabaseConfig(config);
  const [jobs, workers] = await Promise.all([
    fetchPrintJobs(filters),
    fetchPrintWorkers(),
  ]);
  const summary = Array.isArray(jobs)
    ? jobs.reduce((acc, job) => {
        const status = String(job.status || "unknown");
        acc[status] = (acc[status] || 0) + 1;
        acc.total += 1;
        return acc;
      }, { total: 0, pending: 0, printing: 0, printed: 0, failed: 0, cancelled: 0 })
    : { total: 0, pending: 0, printing: 0, printed: 0, failed: 0, cancelled: 0 };
  return { jobs, workers, summary, worker: getPrintWorkerStatus() };
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

function getEnabledSources(config) {
  const sources = [];
  if (config.autoPrint.customerApp !== false) sources.push("customer_app");
  if (config.autoPrint.pdvDelivery !== false) sources.push("pdv_entregas");
  if (config.autoPrint.pdvCounter !== false) sources.push("pdv_balcao");
  return sources;
}

function ticketLinesToHtml(lines = []) {
  const escapedLines = Array.isArray(lines) ? lines : [];
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  return `<pre style="font-family: Consolas, monospace; white-space: pre-wrap; font-size: 12px; line-height: 1.28;">${escapedLines.map(escapeHtml).join("\n")}</pre>`;
}

function getJobHtml(job) {
  const payload = job?.payload || {};
  const ticket = payload.ticket || {};
  if (ticket.html) return ticket.html;
  if (Array.isArray(ticket.lines)) return ticketLinesToHtml(ticket.lines);
  return `<h2>BARBOSA'S DELIVERY</h2><hr><p><strong>${String(job.print_type || "Impressão").toUpperCase()}</strong></p><p>Job: ${String(job.id || "")}</p>`;
}

function getJobCopies(job, config) {
  const printType = String(job.print_type || "");
  const payloadCopies = Number(job?.payload?.ticket?.copies || 0);
  const jobCopies = Number(job?.copies || 0);
  const configCopies = Number(config?.copies?.[printType] || 0);
  return Math.max(1, Math.min(5, payloadCopies || jobCopies || configCopies || 1));
}

async function claimPendingPrintJobs(config, limit = 5) {
  const sources = getEnabledSources(config);
  if (!sources.length) return [];
  const body = {
    p_worker_id: printWorker.workerId,
    p_limit: limit,
    p_sources: sources,
    p_print_types: ["kitchen", "delivery", "counter"],
  };
  return await supabaseRpc(config, "claim_pending_print_jobs", body) || [];
}

async function markPrintJobPrinted(config, job, printerName) {
  return supabaseRpc(config, "mark_print_job_printed", {
    p_job_id: job.id,
    p_printer_name: printerName || "",
  });
}

async function markPrintJobFailed(config, job, errorMessage) {
  return supabaseRpc(config, "mark_print_job_failed", {
    p_job_id: job.id,
    p_error_message: String(errorMessage || "Falha de impressão").slice(0, 1000),
  });
}

async function printJob(config, job) {
  const html = getJobHtml(job);
  const copies = getJobCopies(job, config);
  const targetPrinter = String(job.printer_name || config.printerName || "").trim();
  for (let copy = 1; copy <= copies; copy += 1) {
    const result = await printHtml({
      html,
      printerName: targetPrinter,
      silentPrint: config.silentPrint,
      paperWidthMm: config.paperWidthMm,
    });
    if (!result.success) {
      throw new Error(result.failureReason || `A impressora recusou o job ${job.id}.`);
    }
  }
  await markPrintJobPrinted(config, job, targetPrinter);
  printWorker.printedCount += 1;
  addPrintLog("ok", `Job impresso: ${job.print_type} • ${job.source} • ${job.source_id}`, {
    id: job.id,
    copies,
    printerName: targetPrinter || "padrão do sistema",
  });
}

async function processPrintJobsOnce() {
  if (printWorker.processing) {
    return getPrintWorkerStatus();
  }
  printWorker.processing = true;
  printWorker.lastRunAt = new Date().toISOString();
  printWorker.lastError = "";

  try {
    const config = await readConfig();
    if (!config.autoPrint.enabled) {
      addPrintLog("info", "Impressão automática desativada. Nenhum job foi consumido.");
      return getPrintWorkerStatus();
    }
    requireSupabaseConfig(config);
    await upsertPrintWorkerHeartbeat("online");
    const jobs = await claimPendingPrintJobs(config, 5);
    printWorker.lastClaimCount = Array.isArray(jobs) ? jobs.length : 0;
    if (!jobs.length) return getPrintWorkerStatus();

    for (const job of jobs) {
      try {
        await printJob(config, job);
      } catch (error) {
        printWorker.failedCount += 1;
        const message = error?.message || "Falha de impressão";
        addPrintLog("error", `Falha ao imprimir job ${job.id}: ${message}`, { id: job.id, error: message });
        try {
          await markPrintJobFailed(config, job, message);
        } catch (markError) {
          addPrintLog("error", `Falha também ao registrar erro do job ${job.id}: ${markError?.message || markError}`, { id: job.id });
        }
      }
    }
  } catch (error) {
    printWorker.lastError = error?.message || String(error);
    addPrintLog("error", `Erro no consumidor de impressão: ${printWorker.lastError}`);
  } finally {
    printWorker.processing = false;
  }

  return getPrintWorkerStatus();
}

function schedulePrintWorker(config) {
  if (printWorker.timer) clearInterval(printWorker.timer);
  const intervalMs = Math.max(3, Number(config.pollIntervalSeconds || DEFAULT_CONFIG.pollIntervalSeconds)) * 1000;
  printWorker.timer = setInterval(() => {
    void processPrintJobsOnce();
  }, intervalMs);
}

async function startPrintWorker() {
  const config = await readConfig();
  if (!config.autoPrint.enabled) {
    return { ...getPrintWorkerStatus(), running: false, message: "Ative a impressão automática no painel antes de iniciar." };
  }
  try {
    requireSupabaseConfig(config);
  } catch (error) {
    printWorker.lastError = error?.message || String(error);
    addPrintLog("error", printWorker.lastError);
    return { ...getPrintWorkerStatus(), running: false, message: printWorker.lastError };
  }
  if (!printWorker.running) addPrintLog("info", "Consumidor automático de impressão iniciado.");
  printWorker.running = true;
  schedulePrintWorker(config);
  void processPrintJobsOnce();
  return getPrintWorkerStatus();
}

function stopPrintWorker() {
  if (printWorker.timer) clearInterval(printWorker.timer);
  printWorker.timer = null;
  if (printWorker.running) addPrintLog("info", "Consumidor automático de impressão parado.");
  printWorker.running = false;
  void upsertPrintWorkerHeartbeat("offline");
  return getPrintWorkerStatus();
}

function getPrintWorkerStatus() {
  return {
    running: printWorker.running,
    processing: printWorker.processing,
    workerId: printWorker.workerId,
    lastRunAt: printWorker.lastRunAt,
    lastError: printWorker.lastError,
    lastClaimCount: printWorker.lastClaimCount,
    printedCount: printWorker.printedCount,
    failedCount: printWorker.failedCount,
    logs: printWorker.logs,
    startup: getStartupStatus(),
  };
}

app.whenReady().then(async () => {
  app.setName(APP_NAME);
  Menu.setApplicationMenu(buildMenu());
  createMainWindow();
  const config = await readConfig();
  applyStartupSetting(config);
  if (config.supabaseUrl && config.supabaseAnonKey) void registerDesktopInstallation();
  if (config.autoPrint.enabled && config.supabaseUrl && config.supabaseAnonKey) {
    try {
      await startPrintWorker();
    } catch (error) {
      addPrintLog("error", `Não foi possível iniciar impressão automática: ${error?.message || error}`);
    }
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  stopPrintWorker();
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("desktop:get-app-info", () => ({
  name: APP_NAME,
  version: APP_VERSION,
  electronVersion: process.versions.electron,
  packageVersion: app.getVersion(),
  userDataPath: app.getPath("userData"),
  isPackaged: app.isPackaged,
  computerName: getComputerName(),
  configPath: getConfigPath(),
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
  return printHtml({ html, printerName: options.printerName, silentPrint: options.silentPrint ?? config.silentPrint, paperWidthMm: options.paperWidthMm || config.paperWidthMm });
});

ipcMain.handle("desktop:fetch-print-center", (_event, filters = {}) => fetchPrintCenterData(filters));
ipcMain.handle("desktop:fetch-print-jobs", (_event, filters = {}) => fetchPrintJobs(filters));
ipcMain.handle("desktop:requeue-print-job", (_event, jobId) => requeuePrintJob(jobId));
ipcMain.handle("desktop:cancel-print-job", (_event, jobId) => cancelPrintJob(jobId));
ipcMain.handle("desktop:requeue-failed-print-jobs", () => requeueFailedPrintJobs());
ipcMain.handle("desktop:cleanup-printed-print-jobs", (_event, daysToKeep = 7) => cleanupPrintedPrintJobs(daysToKeep));
ipcMain.handle("desktop:reset-stale-print-jobs", (_event, minutes = 10) => resetStalePrintJobs(minutes));
ipcMain.handle("desktop:get-update-status", () => getDesktopUpdateStatus());
ipcMain.handle("desktop:backup-config", () => backupDesktopConfig());
ipcMain.handle("desktop:register-installation", () => registerDesktopInstallation());
ipcMain.handle("desktop:validate-supabase", (_event, config) => validateSupabaseConnection(config));
ipcMain.handle("desktop:get-print-worker-status", () => getPrintWorkerStatus());
ipcMain.handle("desktop:start-print-worker", () => startPrintWorker());
ipcMain.handle("desktop:stop-print-worker", () => stopPrintWorker());
ipcMain.handle("desktop:process-print-jobs-once", () => processPrintJobsOnce());
