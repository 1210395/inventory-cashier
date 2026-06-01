<template>
  <router-view />
  <OnScreenKeyboard />
  <button
    v-if="hasDrawer"
    class="cashier-drawer-fab"
    @click="openDrawer"
    title="Open cash drawer"
  >💵</button>
</template>

<script setup>
import { ref } from 'vue';
import OnScreenKeyboard from './components/OnScreenKeyboard.vue';

const hasDrawer = ref(typeof window !== 'undefined' && !!window.cashier);

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
</style>
