// Mirrors selected localStorage keys to the Electron main process (electron-store
// on disk) so they survive an app relaunch. localStorage on a file:// page is
// NOT reliably persisted across restarts, which previously wiped the PIN/login.
export function durableSet(key, value) {
  try { window.cashier && window.cashier.secureSet && window.cashier.secureSet(key, value); } catch (e) { /* web context */ }
}

export function durableDelete(key) {
  try { window.cashier && window.cashier.secureDelete && window.cashier.secureDelete(key); } catch (e) { /* web context */ }
}

// Restore durable values into localStorage at startup (only fills keys that are
// missing, so a value set this session is never clobbered).
export async function hydrateDurable() {
  try {
    if (!(window.cashier && window.cashier.secureGetAll)) return;
    const data = await window.cashier.secureGetAll();
    if (data && typeof data === 'object') {
      for (const [k, v] of Object.entries(data)) {
        if (v != null && localStorage.getItem(k) === null) localStorage.setItem(k, String(v));
      }
    }
  } catch (e) { /* ignore */ }
}
