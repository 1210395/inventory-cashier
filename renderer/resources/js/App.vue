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
import { ref, onMounted } from 'vue';
import OnScreenKeyboard from './components/OnScreenKeyboard.vue';
import PinLock from './components/PinLock.vue';

const hasNative = ref(typeof window !== 'undefined' && !!window.cashier);
const isFs = ref(true);

onMounted(async () => {
  if (!hasNative.value) return;
  try { const r = await window.cashier.isFullscreen(); isFs.value = !!r?.fullscreen; } catch { /* noop */ }
});

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
