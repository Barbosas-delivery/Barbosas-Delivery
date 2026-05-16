const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("barbosasDesktop", {
  getAppInfo: () => ipcRenderer.invoke("desktop:get-app-info"),
  getConfig: () => ipcRenderer.invoke("desktop:get-config"),
  saveConfig: (config) => ipcRenderer.invoke("desktop:save-config", config),
  getPrinters: () => ipcRenderer.invoke("desktop:get-printers"),
  testPrint: (options) => ipcRenderer.invoke("desktop:test-print", options),
  validateSupabase: (config) => ipcRenderer.invoke("desktop:validate-supabase", config),
  openPrintPanel: () => ipcRenderer.invoke("desktop:open-print-panel"),
});
