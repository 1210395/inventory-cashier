import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { execFile } from 'child_process';
import Store from 'electron-store';

// --- Diagnostic log -------------------------------------------------------
// The app appends plain-text lines to log.txt so hardware issues (printing,
// the cash drawer) can be diagnosed from a customer's machine. Open it with
// Ctrl+Shift+L; it lives at %APPDATA%\Hisab Cashier\log.txt.
let _logFile: string | null = null;
function logFilePath(): string {
  if (!_logFile) {
    try { _logFile = path.join(app.getPath('userData'), 'log.txt'); }
    catch { _logFile = path.join(os.tmpdir(), 'hisab-cashier-log.txt'); }
  }
  return _logFile;
}
function logLine(...parts: any[]) {
  const msg = parts
    .map((p) => (typeof p === 'string' ? p : (() => { try { return JSON.stringify(p); } catch { return String(p); } })()))
    .join(' ');
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(logFilePath(), line); } catch { /* noop */ }
  try { console.log(line.trimEnd()); } catch { /* noop */ }
}
function trimLogIfBig() {
  try {
    const st = fs.statSync(logFilePath());
    if (st.size > 512 * 1024) fs.writeFileSync(logFilePath(), fs.readFileSync(logFilePath(), 'utf8').slice(-256 * 1024));
  } catch { /* noop */ }
}

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
  trimLogIfBig();
  logLine('=== app start ===', 'version', app.getVersion(), 'packaged', app.isPackaged,
    'platform', process.platform, 'arch', process.arch,
    'receiptPrinter', store.get('receiptPrinter') || '(none)',
    'openDrawerOnSale', store.get('openDrawerOnSale'), 'log', logFilePath());
  createWindow();

  // Admin hotkeys (cashiers don't see chrome): settings, reload, quit, devtools, log.
  globalShortcut.register('CommandOrControl+Shift+S', () => openSettingsWindow());
  globalShortcut.register('CommandOrControl+Shift+R', () => mainWindow?.reload());
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit());
  globalShortcut.register('F12', () => mainWindow?.webContents.toggleDevTools());
  globalShortcut.register('F11', () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()));
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => globalShortcut.unregisterAll());

// ---- Cash drawer / raw ESC/POS printing (Windows) ----

// Cash-drawer kick. We send several standard kick commands in one raw job so
// the drawer opens regardless of how it's wired or which command its printer
// firmware expects; the printer ignores the ones that don't apply:
//   ESC p m t1 t2   — classic pulse on pin 2 (m=0) and pin 5 (m=1)
//   DLE DC4 1 m t   — real-time pulse on pin 2 (m=0) and pin 5 (m=1)
//   BEL             — legacy drawers
// Pulse widened (t1=0x32 → ~100ms on) since some drawers ignore a short pulse.
const DRAWER_KICK = Buffer.from([
  0x1b, 0x70, 0x00, 0x32, 0xfa, // ESC p 0  (pin 2)
  0x1b, 0x70, 0x01, 0x32, 0xfa, // ESC p 1  (pin 5)
  0x10, 0x14, 0x01, 0x00, 0x05, // DLE DC4 1 0 5 (real-time, pin 2)
  0x10, 0x14, 0x01, 0x01, 0x05, // DLE DC4 1 1 5 (real-time, pin 5)
  0x07,                         // BEL
]);

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
        if (err) {
          const msg = (stderr || err.message || '').trim();
          logLine('rawPrint: FAILED to', printerName, '-', msg);
          resolve({ success: false, error: msg });
        } else {
          logLine('rawPrint: OK to', printerName, `(${data.length} bytes)`);
          resolve({ success: true });
        }
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
  if (configured) { logLine('printer: using configured', configured); return configured; }
  try {
    if (mainWindow) {
      const printers = await mainWindow.webContents.getPrintersAsync();
      logLine('printer: none configured; available', printers.map((p) => ({ name: p.name, default: p.isDefault })));
      const def = printers.find((p) => p.isDefault) || printers[0];
      if (def) { logLine('printer: falling back to', def.name); return def.name; }
    }
  } catch (e: any) { logLine('printer: resolve error', e?.message || String(e)); }
  logLine('printer: NONE resolved — receipt/drawer will not work until one is picked in Settings');
  return '';
}

// ---- IPC ----
ipcMain.handle('cashier:openDrawer', async () => {
  const printer = await resolvePrinterName();
  logLine('drawer: kick requested; printer', printer || '(none)');
  const r = await rawPrintWindows(printer, DRAWER_KICK);
  logLine('drawer: kick result', r);
  return r;
});

// Renderer-side diagnostic logging (POS actions, etc.).
ipcMain.handle('cashier:log', (_, msg: string) => { logLine('[ui]', String(msg)); return { success: true }; });

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
//   2. The window must actually paint before print() is called. A plain hidden
//      window (show:false) DOES paint (paintWhenInitiallyHidden), so we keep it
//      hidden and on-screen — NOT shown off-screen, because a fully off-screen
//      window isn't composited and prints blank.
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
    const winWidth = widthMm ? Math.ceil((widthMm * 96) / 25.4) + 24 : 800;
    win = new BrowserWindow({
      show: false, // stays hidden but still paints; do NOT show it off-screen
      width: winWidth,
      height: 1000,
      webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
    });

    logLine('print: start', { widthMm, htmlBytes: html.length });
    const doPrint = async () => {
      if (printing || !win) return; // guard: ready-to-show AND did-finish-load both fire
      printing = true;
      const deviceName = await resolvePrinterName();
      // Page size is owned by the document's CSS @page (roll width + auto
      // height) and the printer's media — we deliberately DON'T pass a pageSize
      // option, since forcing a second, pixel-computed size fought the driver
      // and pushed content onto a tall blank page that clipped the totals.
      const opts: any = { silent: true, printBackground: true, margins: { marginType: 'none' } };
      if (deviceName) opts.deviceName = deviceName;
      if (widthMm) {
        // For diagnostics only — does not affect the page size.
        try {
          const px = Number(await win.webContents.executeJavaScript('Math.ceil(document.body.scrollHeight)'));
          logLine('print: measured content height (px)', px, '(CSS @page drives the actual size)');
        } catch (e: any) { logLine('print: height measure failed', e?.message || String(e)); }
      }
      logLine('print: dispatch', { deviceName: deviceName || '(default)', widthMm: widthMm || null });
      try {
        win.webContents.print(opts, (success, failureReason) => {
          logLine('print: result', { success, failureReason: failureReason || null });
          finish({ success, error: success ? undefined : (failureReason || 'Printing failed') });
        });
      } catch (e: any) {
        logLine('print: threw', e?.message || String(e));
        finish({ success: false, error: e?.message || String(e) });
      }
    };

    // Print once the content has loaded and had a moment to paint. Both events
    // can fire; the `printing` guard makes doPrint run only once.
    win.webContents.once('did-finish-load', () => setTimeout(doPrint, 350));
    win.once('ready-to-show', () => setTimeout(doPrint, 350));
    win.webContents.once('did-fail-load', (_e, code, desc) => {
      logLine('print: did-fail-load', code, desc);
      finish({ success: false, error: desc || 'Failed to render receipt' });
    });
    // Safety net so a stuck print never leaks a hidden window/temp file.
    setTimeout(() => { if (!settled) logLine('print: TIMED OUT'); finish({ success: false, error: 'Print timed out' }); }, 25000);

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
// Open the cashier settings window from the UI (touchscreen kiosks have no
// keyboard, so the Ctrl+Shift+S shortcut isn't reachable).
ipcMain.handle('cashier:openSettings', () => { openSettingsWindow(); return { success: true }; });
ipcMain.handle('cashier:closeSettings', () => { settingsWindow?.close(); return { success: true }; });
