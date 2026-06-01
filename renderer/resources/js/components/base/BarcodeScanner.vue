<template>
  <div v-if="show" class="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" @click.self="close">
    <div class="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden w-full max-w-md shadow-2xl">
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 class="font-semibold text-gray-900 dark:text-white">{{ t('scan_barcode') || 'Scan Barcode' }}</h3>
        <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="close">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div class="relative bg-black aspect-[4/3] flex items-center justify-center">
        <video ref="video" class="w-full h-full object-cover" playsinline muted></video>
        <div v-if="!supported" class="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/90">
          {{ t('scanner_unsupported') || 'Camera scanning is not supported in this browser. Use a USB barcode scanner into the search box instead.' }}
        </div>
        <div v-else class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div class="w-3/4 h-1/3 border-2 border-[#D4A843] rounded-lg"></div>
        </div>
      </div>
      <div v-if="error" class="px-4 py-2 text-sm text-red-600 dark:text-red-400">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { t } from '../../i18n/index.js';

const props = defineProps({ show: { type: Boolean, default: false } });
const emit = defineEmits(['detected', 'close']);

const video = ref(null);
const supported = ref(true);
const error = ref('');
let stream = null;
let detector = null;
let rafId = null;
let stopped = false;

async function start() {
  error.value = '';
  stopped = false;
  if (!('BarcodeDetector' in window)) { supported.value = false; return; }
  supported.value = true;
  try {
    detector = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code', 'itf'],
    });
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (video.value) {
      video.value.srcObject = stream;
      await video.value.play();
      scanLoop();
    }
  } catch (e) {
    error.value = (e && e.message) ? e.message : String(e);
  }
}

async function scanLoop() {
  if (stopped || !detector || !video.value) return;
  try {
    const codes = await detector.detect(video.value);
    if (codes && codes.length > 0 && codes[0].rawValue) {
      emit('detected', codes[0].rawValue);
      close();
      return;
    }
  } catch (_) { /* frame not ready */ }
  rafId = requestAnimationFrame(scanLoop);
}

function stop() {
  stopped = true;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if (stream) {
    stream.getTracks().forEach((tr) => tr.stop());
    stream = null;
  }
  if (video.value) video.value.srcObject = null;
}

function close() {
  stop();
  emit('close');
}

watch(() => props.show, (v) => {
  if (v) start();
  else stop();
});

onBeforeUnmount(stop);
</script>
