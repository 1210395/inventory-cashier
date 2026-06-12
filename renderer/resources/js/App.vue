<template>
  <router-view />
  <OnScreenKeyboard />
  <PinLock />
  <button
    v-if="hasNative"
    class="cashier-fs-fab"
    @click="toggleFullscreen"
    :title="isFs ? 'Exit full screen' : 'Full screen'"
  >{{ isFs ? '🗗' : '⛶' }}</button>
  <button
    v-if="hasNative"
    class="cashier-settings-fab"
    @click="openSettings"
    title="Cashier settings (printer, drawer, PIN)"
  >
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  </button>
  <button
    v-if="hasNative"
    class="cashier-drawer-fab"
    @click="openDrawer"
    title="Open cash drawer"
  >💵</button>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import OnScreenKeyboard from './components/OnScreenKeyboard.vue';
import PinLock from './components/PinLock.vue';
import api from './composables/useApi.js';

const hasNative = ref(typeof window !== 'undefined' && !!window.cashier);
const isFs = ref(true);
let rolloverTimer = null;

onMounted(async () => {
  if (!hasNative.value) return;
  try { const r = await window.cashier.isFullscreen(); isFs.value = !!r?.fullscreen; } catch { /* noop */ }
  // Midnight auto close/reopen of the cash shift (local device time), if enabled.
  maybeRollover();
  rolloverTimer = setInterval(maybeRollover, 60000);
});

onBeforeUnmount(() => { if (rolloverTimer) clearInterval(rolloverTimer); });

async function maybeRollover() {
  if (localStorage.getItem('autoRolloverMidnight') !== 'true') return;
  const today = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
  const last = localStorage.getItem('lastRolloverDate');
  if (!last) { localStorage.setItem('lastRolloverDate', today); return; }
  if (last === today) return;
  // A new local day has started — roll the shift over.
  localStorage.setItem('lastRolloverDate', today); // set first to avoid re-entry
  try {
    const res = await api.get('/cash-shifts/current'); // 200 only if a shift is open
    const shift = res.data?.data || res.data;
    if (shift && shift.uuid) {
      const expected = Number(shift.open_amount || 0) + Number(shift.cash_sales || 0)
        + Number(shift.cash_in || 0) - Number(shift.cash_out || 0);
      await api.post(`/cash-shifts/${shift.uuid}/close`, { close_amount: expected, notes: 'Auto midnight rollover' });
      await api.post('/cash-shifts', { open_amount: expected, notes: 'Auto midnight rollover' });
    }
  } catch (e) { /* 404 = no open shift; other errors retried next day */ }
}

async function toggleFullscreen() {
  try { const r = await window.cashier?.toggleFullscreen(); isFs.value = !!r?.fullscreen; } catch { /* noop */ }
}

async function openSettings() {
  try { await window.cashier?.openSettings(); } catch { /* noop */ }
}

async function openDrawer() {
  try {
    const r = await window.cashier?.openDrawer();
    if (r && !r.success) alert(r.error || 'Could not open drawer');
  } catch (e) { /* noop */ }
}
</script>

<style>
.cashier-drawer-fab {
  position: fixed; right: 76px; bottom: 12px; z-index: 2147483000;
  width: 52px; height: 52px; border-radius: 50%;
  background: #2ECC71; color: #fff; border: none; font-size: 22px;
  box-shadow: 0 4px 14px rgba(0,0,0,.35); cursor: pointer;
}
.cashier-fs-fab {
  position: fixed; right: 12px; top: 12px; z-index: 2147483000;
  width: 44px; height: 44px; border-radius: 10px;
  background: rgba(31,41,55,.85); color: #fff; border: none; font-size: 20px;
  box-shadow: 0 4px 14px rgba(0,0,0,.35); cursor: pointer;
}
/* Touch-accessible Settings (kiosks have no keyboard for Ctrl+Shift+S). */
.cashier-settings-fab {
  position: fixed; right: 12px; top: 66px; z-index: 2147483000;
  width: 44px; height: 44px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(31,41,55,.85); color: #fff; border: none;
  box-shadow: 0 4px 14px rgba(0,0,0,.35); cursor: pointer;
}
</style>
