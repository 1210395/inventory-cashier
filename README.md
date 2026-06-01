# Hisab Cashier

Touchscreen cashier desktop app (Windows kiosk) for the Hisab / VaultStock inventory platform.

It is an **Electron kiosk shell** whose renderer is the Hisab **web Vue SPA** (forked from
`inventory-management-app/backend/resources/js`), so it has **all the web pages/features** and
talks to the live API at `inventory.olive-dev.com/api`. On top of the web app it adds the native
cashier features:

- **Custom on-screen keyboard** — Arabic + English + numeric layouts, docks at the bottom,
  auto-opens on field focus, pads the page so it never covers the focused input, and keeps focus
  while typing (updates Vue `v-model`). Toggle with the floating ⌨ button.
- **ESC/POS cash drawer** — raw drawer-kick to a USB Windows printer; fires automatically on cash
  sales, plus a floating 💵 button and a Test button in settings.
- **Fullscreen kiosk** (1366×768, responsive), admin hotkeys: `Ctrl+Shift+S` settings,
  `Ctrl+Shift+R` reload, `Ctrl+Shift+Q` quit, `F12` devtools.
- **Settings window** to choose the receipt printer and toggle auto-drawer.

## Structure

- `src/main/` — Electron main process (kiosk window, ESC/POS raw printing, settings) + preload bridge (`window.cashier`).
- `renderer/` — standalone Vite build of the Hisab Vue SPA (hash router, `VITE_API_URL` → live API).
- `assets/` — icon + settings window HTML.

## Build

```bash
npm install
(cd renderer && npm install)
npm run build      # builds renderer (vite) + main (tsc)
npm run package    # electron-builder --win  → release/  (NSIS installer + portable)
```

The API base is set in `renderer/.env` (`VITE_API_URL`).
