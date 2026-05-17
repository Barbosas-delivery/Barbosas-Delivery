const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("barbosasDesktop", {
  getAppInfo: () => ipcRenderer.invoke("desktop:get-app-info"),
  getConfig: () => ipcRenderer.invoke("desktop:get-config"),
  saveConfig: (config) => ipcRenderer.invoke("desktop:save-config", config),
  getPrinters: () => ipcRenderer.invoke("desktop:get-printers"),
  testPrint: (options) => ipcRenderer.invoke("desktop:test-print", options),
  validateSupabase: (config) => ipcRenderer.invoke("desktop:validate-supabase", config),
  openPrintPanel: () => ipcRenderer.invoke("desktop:open-print-panel"),
  getPrintWorkerStatus: () => ipcRenderer.invoke("desktop:get-print-worker-status"),
  startPrintWorker: () => ipcRenderer.invoke("desktop:start-print-worker"),
  stopPrintWorker: () => ipcRenderer.invoke("desktop:stop-print-worker"),
  processPrintJobsOnce: () => ipcRenderer.invoke("desktop:process-print-jobs-once"),
  onPrintWorkerLog: (callback) => {
    const listener = (_event, entry) => callback(entry);
    ipcRenderer.on("desktop:print-worker-log", listener);
    return () => ipcRenderer.removeListener("desktop:print-worker-log", listener);
  },
});
