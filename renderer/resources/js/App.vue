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
</style>
