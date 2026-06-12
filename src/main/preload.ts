import { contextBridge, ipcRenderer } from 'electron';

// The cashier renderer is the Hisab web SPA (talks to the API directly over
// HTTPS). The only native bridge it needs is the cash drawer / printer.
contextBridge.exposeInMainWorld('cashier', {
  openDrawer: () => ipcRenderer.invoke('cashier:openDrawer'),
  rawPrint: (bytes: number[]) => ipcRenderer.invoke('cashier:rawPrint', bytes),
  // Silent receipt/label printing — no browser pop-up, no print dialog.
  // options.widthMm = roll width for thermal receipts (e.g. 80); omit for A4.
  printHtml: (html: string, options?: { widthMm?: number }) =>
    ipcRenderer.invoke('cashier:printHtml', { html, options: options || {} }),
  listPrinters: () => ipcRenderer.invoke('cashier:listPrinters'),
  getSettings: () => ipcRenderer.invoke('cashier:getSettings'),
  saveSettings: (s: any) => ipcRenderer.invoke('cashier:saveSettings', s),
  reloadApp: () => ipcRenderer.invoke('cashier:reloadApp'),
  // Durable storage for state that must survive relaunch (PIN, account, token).
  secureGetAll: () => ipcRenderer.invoke('cashier:secureGetAll'),
  secureSet: (key: string, value: string) => ipcRenderer.invoke('cashier:secureSet', { key, value }),
  secureDelete: (key: string) => ipcRenderer.invoke('cashier:secureDelete', key),
  closeSettings: () => ipcRenderer.invoke('cashier:closeSettings'),
  toggleFullscreen: () => ipcRenderer.invoke('cashier:toggleFullscreen'),
  isFullscreen: () => ipcRenderer.invoke('cashier:isFullscreen'),
});
