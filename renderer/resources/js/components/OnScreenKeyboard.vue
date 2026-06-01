<template>
  <!-- Floating toggle (always reachable) -->
  <button
    class="osk-fab"
    :style="{ bottom: visible ? oskHeight + 12 + 'px' : '12px' }"
    @mousedown.prevent
    @click="toggle"
    :title="'Keyboard'"
  >⌨</button>

  <div v-if="visible" ref="kb" class="osk" @mousedown.prevent>
    <div class="osk-bar">
      <button :class="['osk-tab', layout==='en' && 'on']" @click="layout='en'">EN</button>
      <button :class="['osk-tab', layout==='ar' && 'on']" @click="layout='ar'">ع</button>
      <button :class="['osk-tab', layout==='num' && 'on']" @click="layout='num'">123</button>
      <span style="flex:1"></span>
      <button class="osk-tab" @click="hide">✕</button>
    </div>

    <div v-for="(row, ri) in rows" :key="ri" class="osk-row">
      <button
        v-for="(k, ki) in row"
        :key="ki"
        class="osk-key"
        @click="press(k)"
      >{{ display(k) }}</button>
    </div>

    <div class="osk-row">
      <button class="osk-key osk-fn" @click="toggleShift" v-if="layout==='en'" :class="{ on: shift }">⇧</button>
      <button class="osk-key osk-fn" @click="backspace">⌫</button>
      <button class="osk-key osk-space" @click="press(' ')">␣</button>
      <button class="osk-key osk-fn" @click="enter">⏎</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';

const visible = ref(false);
const layout = ref('en');
const shift = ref(false);
const kb = ref(null);
const oskHeight = ref(0);
let lastFocused = null;

const EN = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m','-','@','.'],
];
const AR = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['ض','ص','ث','ق','ف','غ','ع','ه','خ','ح','ج'],
  ['ش','س','ي','ب','ل','ا','ت','ن','م','ك','ط'],
  ['ئ','ء','ؤ','ر','ى','ة','و','ز','ظ','د','ذ'],
];
const NUM = [
  ['7','8','9'],
  ['4','5','6'],
  ['1','2','3'],
  ['0','.','-'],
];

const rows = computed(() => (layout.value === 'ar' ? AR : layout.value === 'num' ? NUM : EN));

function display(k) {
  if (layout.value === 'en' && shift.value && /[a-z]/.test(k)) return k.toUpperCase();
  return k;
}

function isEditable(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    return !['checkbox', 'radio', 'button', 'submit', 'range', 'color', 'file'].includes(type);
  }
  return tag === 'TEXTAREA' || el.isContentEditable;
}

function onFocusIn(e) {
  if (isEditable(e.target)) {
    lastFocused = e.target;
    if (!visible.value) show();
    nextTick(() => scrollIntoView());
  }
}

function show() {
  visible.value = true;
  nextTick(() => {
    oskHeight.value = kb.value ? kb.value.offsetHeight : 0;
    document.body.style.paddingBottom = oskHeight.value + 'px';
    scrollIntoView();
  });
}
function hide() {
  visible.value = false;
  document.body.style.paddingBottom = '';
}
function toggle() { visible.value ? hide() : show(); }

function scrollIntoView() {
  try { lastFocused?.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {}
}

function target() {
  const el = (lastFocused && document.contains(lastFocused)) ? lastFocused : document.activeElement;
  return isEditable(el) ? el : null;
}

function press(k) {
  const ch = display(k);
  const el = target();
  if (!el) return;
  if (el.isContentEditable) {
    document.execCommand('insertText', false, ch);
  } else {
    const s = el.selectionStart ?? el.value.length;
    const e = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, s) + ch + el.value.slice(e);
    const pos = s + ch.length;
    try { el.setSelectionRange(pos, pos); } catch {}
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  el.focus();
  if (shift.value && layout.value === 'en') shift.value = false;
}

function backspace() {
  const el = target();
  if (!el) return;
  if (el.isContentEditable) { document.execCommand('delete'); return; }
  const s = el.selectionStart ?? el.value.length;
  const e = el.selectionEnd ?? el.value.length;
  if (s === e && s === 0) return;
  if (s === e) {
    el.value = el.value.slice(0, s - 1) + el.value.slice(e);
    try { el.setSelectionRange(s - 1, s - 1); } catch {}
  } else {
    el.value = el.value.slice(0, s) + el.value.slice(e);
    try { el.setSelectionRange(s, s); } catch {}
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.focus();
}

function enter() {
  const el = target();
  if (!el) return;
  if (el.tagName === 'TEXTAREA') { press('\n'); return; }
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function toggleShift() { shift.value = !shift.value; }

onMounted(() => document.addEventListener('focusin', onFocusIn));
onBeforeUnmount(() => { document.removeEventListener('focusin', onFocusIn); document.body.style.paddingBottom = ''; });
</script>

<style>
.osk-fab {
  position: fixed; right: 12px; z-index: 2147483000;
  width: 52px; height: 52px; border-radius: 50%;
  background: #D4A843; color: #1a1a1a; border: none; font-size: 24px;
  box-shadow: 0 4px 14px rgba(0,0,0,.35); cursor: pointer;
}
.osk {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147482000;
  background: #1f2937; padding: 8px; box-shadow: 0 -6px 20px rgba(0,0,0,.4);
  user-select: none;
}
.osk-bar { display: flex; gap: 6px; margin-bottom: 6px; }
.osk-tab {
  min-width: 52px; height: 40px; border-radius: 8px; border: none;
  background: #374151; color: #e5e7eb; font-size: 16px; font-weight: 600; cursor: pointer;
}
.osk-tab.on { background: #D4A843; color: #1a1a1a; }
.osk-row { display: flex; gap: 6px; justify-content: center; margin-bottom: 6px; }
.osk-key {
  flex: 1; max-width: 9%; height: 56px; border-radius: 8px; border: none;
  background: #374151; color: #fff; font-size: 20px; cursor: pointer;
}
.osk-key:active { background: #D4A843; color: #1a1a1a; }
.osk-key.on { background: #D4A843; color: #1a1a1a; }
.osk-fn { max-width: 14%; background: #4b5563; font-size: 22px; }
.osk-space { max-width: 50%; }
@media (max-width: 1100px) { .osk-key { height: 48px; font-size: 18px; } }
</style>
