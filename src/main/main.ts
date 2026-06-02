import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { execFile } from 'child_process';
import Store from 'electron-store';

type Settings = {
  webUrl: string;
  receiptPrinter: string;
  openDrawerOnSale: boolean;
};

const store = new Store<Settings>({
  defaults: {
    webUrl: 'https://inventory.olive-dev.com',
    receiptPrinter: '',
    openDrawerOnSale: true,
  },
});

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: 'Hisab Cashier',
    backgroundColor: '#111827',
    fullscreen: !isDev,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../../assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  // Load the cashier's own bundled pages (forked Hisab web SPA, talks to the API).
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open external links (if any) in the same kiosk window rather than a new one.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow WhatsApp share / tel / mailto to leave to the OS; keep app navigation in-window.
    if (/^(https?:\/\/wa\.me|mailto:|tel:)/i.test(url)) return { action: 'allow' };
    mainWindow?.loadURL(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function openSettingsWindow() {
  if (settingsWindow) { settingsWindow.focus(); return; }
  settingsWindow = new BrowserWindow({
    width: 520,
    height: 420,
    title: 'Cashier Settings',
    parent: mainWindow ?? undefined,
    modal: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWindow.loadFile(path.join(__dirname, '../../assets/settings.html'));
  settingsWindow.on('closed', () => { settingsWindow = null; });
}

app.whenReady().then(() => {
  createWindow();

  // Admin hotkeys (cashiers don't see chrome): settings, reload, quit, devtools.
  globalShortcut.register('CommandOrControl+Shift+S', () => openSettingsWindow());
  globalShortcut.register('CommandOrControl+Shift+R', () => mainWindow?.reload());
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit());
  globalShortcut.register('F12', () => mainWindow?.webContents.toggleDevTools());
  globalShortcut.register('F11', () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()));
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => globalShortcut.unregisterAll());

// ---- Cash drawer / raw ESC/POS printing (Windows) ----

// ESC p 0 25 250 — standard cash-drawer kick (pin 2).
const DRAWER_KICK = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);

function rawPrintWindows(printerName: string, data: Buffer): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({ success: false, error: 'Raw printing is only supported on Windows.' });
    }
    if (!printerName) return resolve({ success: false, error: 'No printer configured.' });
    const tmpData = path.join(os.tmpdir(), `hisab-raw-${Date.now()}.bin`);
    const tmpPs = path.join(os.tmpdir(), `hisab-raw-${Date.now()}.ps1`);
    try {
      fs.writeFileSync(tmpData, data);
      const ps = `
$ErrorActionPreference = 'Stop'
$bytes = [System.IO.File]::ReadAllBytes(${JSON.stringify(tmpData)})
$printer = ${JSON.stringify(printerName)}
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrinter {
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi)] public static extern bool OpenPrinter(string src, out IntPtr h, IntPtr p);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter")] public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", CharSet=CharSet.Ansi)] public static extern bool StartDocPrinter(IntPtr h, int level, ref DOCINFOA di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter")] public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter")] public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter")] public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter")] public static extern bool WritePrinter(IntPtr h, byte[] buf, int n, out int written);
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)] public struct DOCINFOA { [MarshalAs(UnmanagedType.LPStr)] public string pDocName; [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile; [MarshalAs(UnmanagedType.LPStr)] public string pDataType; }
  public static bool Send(string printer, byte[] bytes) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) return false;
    DOCINFOA di = new DOCINFOA(); di.pDocName = "Hisab Cashier"; di.pDataType = "RAW";
    StartDocPrinter(h, 1, ref di); StartPagePrinter(h);
    int w; bool ok = WritePrinter(h, bytes, bytes.Length, out w);
    EndPagePrinter(h); EndDocPrinter(h); ClosePrinter(h); return ok;
  }
}
"@
$ok = [RawPrinter]::Send($printer, $bytes)
if (-not $ok) { throw "WritePrinter failed for '$printer'" }
`;
      fs.writeFileSync(tmpPs, ps);
      execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tmpPs], (err, _stdout, stderr) => {
        try { fs.unlinkSync(tmpData); } catch {}
        try { fs.unlinkSync(tmpPs); } catch {}
        if (err) resolve({ success: false, error: (stderr || err.message || '').trim() });
        else resolve({ success: true });
      });
    } catch (e: any) {
      resolve({ success: false, error: e.message });
    }
  });
}

// ---- IPC ----
ipcMain.handle('cashier:openDrawer', async () => {
  return rawPrintWindows(store.get('receiptPrinter'), DRAWER_KICK);
});

// Print raw ESC/POS bytes (array of numbers) — optional, for full ESC/POS receipts.
ipcMain.handle('cashier:rawPrint', async (_, bytes: number[]) => {
  return rawPrintWindows(store.get('receiptPrinter'), Buffer.from(bytes));
});

ipcMain.handle('cashier:listPrinters', async () => {
  try {
    if (!mainWindow) return [];
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers.map((p) => ({ name: p.name, displayName: p.displayName, isDefault: p.isDefault }));
  } catch { return []; }
});

ipcMain.handle('cashier:getSettings', () => ({
  webUrl: store.get('webUrl'),
  receiptPrinter: store.get('receiptPrinter'),
  openDrawerOnSale: store.get('openDrawerOnSale'),
}));

ipcMain.handle('cashier:saveSettings', (_, s: Partial<Settings>) => {
  if (typeof s.webUrl === 'string' && s.webUrl.trim()) store.set('webUrl', s.webUrl.trim());
  if (typeof s.receiptPrinter === 'string') store.set('receiptPrinter', s.receiptPrinter);
  if (typeof s.openDrawerOnSale === 'boolean') store.set('openDrawerOnSale', s.openDrawerOnSale);
  return { success: true };
});

ipcMain.handle('cashier:toggleFullscreen', () => {
  if (!mainWindow) return { fullscreen: false };
  const next = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(next);
  return { fullscreen: next };
});
ipcMain.handle('cashier:isFullscreen', () => ({ fullscreen: mainWindow?.isFullScreen() ?? false }));

ipcMain.handle('cashier:reloadApp', () => { mainWindow?.loadFile(path.join(__dirname, '../renderer/index.html')); return { success: true }; });
ipcMain.handle('cashier:closeSettings', () => { settingsWindow?.close(); return { success: true }; });
