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

// Durable key-value backing for renderer state that MUST survive relaunch
// (terminal PIN, saved account, auth token). Written to disk by the main
// process because localStorage on a file:// page is not reliably persisted.
const secureStore = new Store<Record<string, string>>({ name: 'secure', defaults: {} });

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
    // Receipt/label printing used to call window.open('', '_blank'), which lands
    // here as about:blank. NEVER navigate the kiosk window to a blank/data/blob
    // URL — that would wipe the whole app (looked like a crash) and the popup
    // would be blocked ("Please allow pop-ups to print"). Printing is now done
    // natively via the cashier:printHtml IPC, so just deny these quietly.
    if (!url || url === 'about:blank' || url.startsWith('data:') || url.startsWith('blob:')) {
      return { action: 'deny' };
    }
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

// Resolve which printer to drive: the one chosen in Settings, or — if none is
// chosen — the Windows default printer, so a freshly-connected drawer/printer
// works without the operator having to open the hidden Settings window first.
async function resolvePrinterName(): Promise<string> {
  const configured = (store.get('receiptPrinter') || '').trim();
  if (configured) return configured;
  try {
    if (mainWindow) {
      const printers = await mainWindow.webContents.getPrintersAsync();
      const def = printers.find((p) => p.isDefault) || printers[0];
      if (def) return def.name;
    }
  } catch { /* fall through */ }
  return '';
}

// ---- IPC ----
ipcMain.handle('cashier:openDrawer', async () => {
  const printer = await resolvePrinterName();
  return rawPrintWindows(printer, DRAWER_KICK);
});

// Print raw ESC/POS bytes (array of numbers) — optional, for full ESC/POS receipts.
ipcMain.handle('cashier:rawPrint', async (_, bytes: number[]) => {
  const printer = await resolvePrinterName();
  return rawPrintWindows(printer, Buffer.from(bytes));
});

// Silent HTML receipt/label printing. Renders the document in an off-screen
// window and prints it to the configured receipt printer (or the OS default)
// WITHOUT any browser pop-up or print dialog — the kiosk operator is never
// prompted.
//
// Two things matter to avoid BLANK paper:
//   1. Load from a real temp .html file, not a `data:` URL — Chromium renders
//      data: URLs inconsistently and the page often isn't painted at print time.
//   2. The window must actually paint before print() is called. We show it
//      off-screen (showInactive, far off the desktop, no taskbar/focus) and wait
//      for `ready-to-show` + a short tick so a frame exists to print.
ipcMain.handle('cashier:printHtml', async (_, payload: { html: string; options?: { widthMm?: number } } | string) => {
  // Accept either a raw HTML string (back-compat) or { html, options }.
  const html = typeof payload === 'string' ? payload : payload?.html;
  const options = (typeof payload === 'string' ? null : payload?.options) || {};
  // widthMm is set for thermal receipts (e.g. 80mm Rongta rolls). When set we
  // print at that exact roll width and size the page height to the content, so
  // the whole receipt is visible instead of a thin strip of an A4 page.
  const widthMm = typeof options.widthMm === 'number' && options.widthMm > 0 ? options.widthMm : null;

  return new Promise<{ success: boolean; error?: string }>((resolve) => {
    if (!html) return resolve({ success: false, error: 'No content to print' });
    const tmpHtml = path.join(os.tmpdir(), `hisab-receipt-${Date.now()}.html`);
    let win: BrowserWindow | null = null;
    let settled = false;
    let printing = false;
    const finish = (result: { success: boolean; error?: string }) => {
      if (settled) return;
      settled = true;
      try { win?.close(); } catch { /* noop */ }
      win = null;
      try { fs.unlinkSync(tmpHtml); } catch { /* noop */ }
      resolve(result);
    };

    try {
      fs.writeFileSync(tmpHtml, html, 'utf8');
    } catch (e: any) {
      return resolve({ success: false, error: e?.message || String(e) });
    }

    // Match the on-screen layout width to the print width so the measured
    // content height lines up with the printed roll.
    const winWidth = widthMm ? Math.ceil((widthMm * 96) / 25.4) + 24 : 420;
    win = new BrowserWindow({
      show: false,
      width: winWidth,
      height: 800,
      x: -32000,
      y: -32000,
      skipTaskbar: true,
      focusable: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
    });

    const doPrint = async () => {
      if (printing || !win) return; // guard: ready-to-show AND did-finish-load both fire
      printing = true;
      const deviceName = await resolvePrinterName();
      const opts: any = { silent: true, printBackground: true, margins: { marginType: 'none' } };
      if (deviceName) opts.deviceName = deviceName;
      if (widthMm) {
        // Size the page to the content so the thermal printer cuts at the end
        // of the receipt rather than feeding a full A4 page.
        let heightMicrons = 300000; // ~300mm fallback
        try {
          const px = Number(await win.webContents.executeJavaScript('Math.ceil(document.body.scrollHeight)'));
          if (px > 0) heightMicrons = Math.round(px * (25400 / 96)) + 8000; // +~8mm tail so nothing is cut
        } catch { /* use fallback height */ }
        opts.pageSize = { width: Math.round(widthMm * 1000), height: Math.max(heightMicrons, 40000) };
      }
      try {
        win.webContents.print(opts, (success, failureReason) => {
          finish({ success, error: success ? undefined : (failureReason || 'Printing failed') });
        });
      } catch (e: any) {
        finish({ success: false, error: e?.message || String(e) });
      }
    };

    // ready-to-show fires once the first frame is painted — the safest moment to
    // print a never-focused window. The short delay is belt-and-suspenders.
    win.once('ready-to-show', () => { try { win?.showInactive(); } catch { /* noop */ } setTimeout(doPrint, 250); });
    // Fallback in case ready-to-show is missed on some GPU/driver combos.
    win.webContents.once('did-finish-load', () => { try { win?.showInactive(); } catch { /* noop */ } setTimeout(doPrint, 500); });
    win.webContents.once('did-fail-load', (_e, _code, desc) =>
      finish({ success: false, error: desc || 'Failed to render receipt' }));
    // Safety net so a stuck print never leaks a hidden window/temp file.
    setTimeout(() => finish({ success: false, error: 'Print timed out' }), 25000);

    win.loadFile(tmpHtml);
  });
});

ipcMain.handle('cashier:listPrinters', async () => {
  try {
    if (!mainWindow) return [];
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers.map((p) => ({ name: p.name, displayName: p.displayName, isDefault: p.isDefault }));
  } catch { return []; }
});

// Durable secure store (PIN, saved account, token) — survives relaunch.
ipcMain.handle('cashier:secureGetAll', () => secureStore.store);
ipcMain.handle('cashier:secureSet', (_, payload: { key: string; value: string }) => {
  if (payload && typeof payload.key === 'string') secureStore.set(payload.key, payload.value);
  return { success: true };
});
ipcMain.handle('cashier:secureDelete', (_, key: string) => {
  if (typeof key === 'string') secureStore.delete(key);
  return { success: true };
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
