<template>
  <!-- Floating toggle (always reachable) -->
  <button
    class="osk-fab"
    :style="{ bottom: (visible && docked) ? oskHeight + 12 + 'px' : '12px' }"
    @mousedown.prevent
    @click="toggle"
    title="Keyboard"
  >⌨</button>

  <div
    v-if="visible"
    ref="kb"
    :class="['osk', docked ? 'osk-docked' : 'osk-floating']"
    :style="floatStyle"
    @mousedown.prevent
  >
    <!-- Title / drag bar -->
    <div class="osk-bar" @pointerdown="startDrag">
      <button :class="['osk-tab', layout==='en' && 'on']" @pointerdown.prevent="layout='en'">EN</button>
      <button :class="['osk-tab', layout==='ar' && 'on']" @pointerdown.prevent="layout='ar'">ع</button>
      <button :class="['osk-tab', layout==='sym' && 'on']" @pointerdown.prevent="layout='sym'">@#!</button>
      <button :class="['osk-tab', layout==='num' && 'on']" @pointerdown.prevent="layout='num'">123</button>
      <span class="osk-grip" v-if="!docked">⠿ {{ Math.round(scale*100) }}%</span>
      <span style="flex:1"></span>
      <button class="osk-tab" @pointerdown.prevent="smaller" title="Smaller">－</button>
      <button class="osk-tab" @pointerdown.prevent="bigger" title="Bigger">＋</button>
      <button class="osk-tab" @pointerdown.prevent="toggleDock" :title="docked ? 'Pop out / move' : 'Dock to bottom'">{{ docked ? '⤢' : '▭' }}</button>
      <button class="osk-tab" @pointerdown.prevent="hide" title="Close">✕</button>
    </div>

    <div class="osk-keys" :style="keysStyle">
      <div v-for="(row, ri) in rows" :key="ri" class="osk-row">
        <button
          v-for="(k, ki) in row"
          :key="ki"
          class="osk-key"
          @pointerdown.prevent="press(k)"
        >{{ display(k) }}</button>
      </div>

      <div class="osk-row">
        <button class="osk-key osk-fn" @pointerdown.prevent="toggleShift" v-if="layout==='en'" :class="{ on: shift }">⇧</button>
        <button class="osk-key osk-fn" @pointerdown.prevent="backspace">⌫</button>
        <button class="osk-key osk-space" @pointerdown.prevent="press(' ')">␣</button>
        <button class="osk-key osk-fn" @pointerdown.prevent="enter">⏎</button>
      </div>
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

// --- Persisted layout prefs (docked vs floating, position, scale) ---
const docked = ref(localStorage.getItem('osk_docked') !== 'false'); // default docked
const scale = ref(parseFloat(localStorage.getItem('osk_scale') || '1') || 1);
const pos = ref((() => {
  try { return JSON.parse(localStorage.getItem('osk_pos')) || { x: 60, y: 120 }; }
  catch { return { x: 60, y: 120 }; }
})());

function savePrefs() {
  localStorage.setItem('osk_docked', String(docked.value));
  localStorage.setItem('osk_scale', String(scale.value));
  localStorage.setItem('osk_pos', JSON.stringify(pos.value));
}

const floatStyle = computed(() => {
  if (docked.value) return {};
  return {
    left: pos.value.x + 'px',
    top: pos.value.y + 'px',
    transform: `scale(${scale.value})`,
    transformOrigin: 'top left',
  };
});
// In docked mode let the keys grow/shrink with scale via font/height vars.
const keysStyle = computed(() => docked.value ? { '--osk-k': (56 * scale.value) + 'px' } : {});

// US English (ANSI) — number row on top, then the QWERTY rows, matching a
// physical keyboard so numbers/symbols are exactly where the user expects.
const EN = [
  ['1','2','3','4','5','6','7','8','9','0','-','='],
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m',',','.','/'],
];
// Shifted faces for the number row + punctuation (US layout).
const EN_SHIFT = {
  '1':'!','2':'@','3':'#','4':'$','5':'%','6':'^','7':'&','8':'*','9':'(','0':')','-':'_','=':'+',
  ',':'<','.':'>','/':'?',
};
// Arabic 101 — same digit row on top, then the standard Arabic 101 letter rows.
const AR = [
  ['1','2','3','4','5','6','7','8','9','0','-','='],
  ['ض','ص','ث','ق','ف','غ','ع','ه','خ','ح','ج'],
  ['ش','س','ي','ب','ل','ا','ت','ن','م','ك','ط'],
  ['ئ','ء','ؤ','ر','ى','ة','و','ز','ظ','د','ذ'],
];
// Full numeric keypad (calculator-style) for fast price/quantity entry.
const NUM = [
  ['7','8','9'],
  ['4','5','6'],
  ['1','2','3'],
  ['0','.','-'],
];
// Dedicated symbols layout so @ ! # … are always one tap away (works in any
// language, and doesn't depend on Shift).
const SYM = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['!','@','#','$','%','^','&','*','(',')'],
  ['-','_','=','+','/','\\',':',';','"','\''],
  ['?','.',',','<','>','[',']','{','}','~'],
];

const rows = computed(() => {
  switch (layout.value) {
    case 'ar': return AR;
    case 'num': return NUM;
    case 'sym': return SYM;
    default: return EN;
  }
});

function display(k) {
  if (layout.value === 'en' && shift.value) {
    if (/[a-z]/.test(k)) return k.toUpperCase();
    if (EN_SHIFT[k]) return EN_SHIFT[k];
  }
  return k;
}

// --- Scale / dock controls ---
function clampScale(v) { return Math.max(0.6, Math.min(1.6, Math.round(v * 10) / 10)); }
function smaller() { scale.value = clampScale(scale.value - 0.1); applyDockPadding(); savePrefs(); }
function bigger() { scale.value = clampScale(scale.value + 0.1); applyDockPadding(); savePrefs(); }
function toggleDock() {
  docked.value = !docked.value;
  if (!docked.value) {
    // Popping out: clear the body padding used by the docked bar.
    document.body.style.paddingBottom = '';
    document.documentElement.style.setProperty('--osk-height', '0px');
    // Make sure it's on-screen.
    pos.value = {
      x: Math.min(pos.value.x, window.innerWidth - 200),
      y: Math.min(pos.value.y, window.innerHeight - 200),
    };
  } else {
    nextTick(applyDockPadding);
  }
  savePrefs();
}

// --- Drag (pointer = mouse + touch). Ignore drags that start on a button. ---
// Pointer capture + touch-action:none (in CSS) keep the drag continuous on
// touchscreens, where the browser would otherwise hijack the gesture for
// scrolling and cancel the pointer stream mid-drag (the "stutter" bug).
let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, dragEl = null, dragId = null;
function startDrag(e) {
  if (docked.value) return;            // only draggable when floating
  if (e.target.closest('button')) return;
  dragging = true;
  sx = e.clientX; sy = e.clientY; ox = pos.value.x; oy = pos.value.y;
  dragEl = e.currentTarget; dragId = e.pointerId;
  try { dragEl.setPointerCapture(dragId); } catch {}
  // Listen on the captured element so every move/up for this pointer is ours.
  dragEl.addEventListener('pointermove', onDrag);
  dragEl.addEventListener('pointerup', endDrag);
  dragEl.addEventListener('pointercancel', endDrag);
}
function onDrag(e) {
  if (!dragging) return;
  const nx = ox + (e.clientX - sx);
  const ny = oy + (e.clientY - sy);
  pos.value = {
    x: Math.max(0, Math.min(nx, window.innerWidth - 80)),
    y: Math.max(0, Math.min(ny, window.innerHeight - 60)),
  };
}
function endDrag() {
  dragging = false;
  if (dragEl) {
    try { dragEl.releasePointerCapture(dragId); } catch {}
    dragEl.removeEventListener('pointermove', onDrag);
    dragEl.removeEventListener('pointerup', endDrag);
    dragEl.removeEventListener('pointercancel', endDrag);
    dragEl = null; dragId = null;
  }
  savePrefs();
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

function applyDockPadding() {
  if (docked.value && visible.value) {
    oskHeight.value = kb.value ? kb.value.offsetHeight : 0;
    document.body.style.paddingBottom = oskHeight.value + 'px';
    // Tell keyboard-aware overlays (modals) how much bottom space to reserve.
    document.documentElement.style.setProperty('--osk-height', oskHeight.value + 'px');
  } else {
    document.body.style.paddingBottom = '';
    document.documentElement.style.setProperty('--osk-height', '0px');
  }
}

function show() {
  visible.value = true;
  nextTick(() => { applyDockPadding(); scrollIntoView(); });
}
function hide() {
  visible.value = false;
  document.body.style.paddingBottom = '';
  document.documentElement.style.setProperty('--osk-height', '0px');
}
function toggle() { visible.value ? hide() : show(); }

function scrollIntoView() {
  if (!docked.value) return; // floating keyboard can be moved out of the way
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
    const pos2 = s + ch.length;
    try { el.setSelectionRange(pos2, pos2); } catch {}
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
onBeforeUnmount(() => {
  document.removeEventListener('focusin', onFocusIn);
  document.body.style.paddingBottom = '';
  document.documentElement.style.setProperty('--osk-height', '0px');
  if (dragging) endDrag();
});
</script>

<style>
.osk-fab {
  position: fixed; right: 12px; z-index: 2147483000;
  width: 52px; height: 52px; border-radius: 50%;
  background: #D4A843; color: #1a1a1a; border: none; font-size: 24px;
  box-shadow: 0 4px 14px rgba(0,0,0,.35); cursor: pointer;
}
.osk {
  background: #1f2937; padding: 8px; box-shadow: 0 -6px 20px rgba(0,0,0,.4);
  user-select: none; z-index: 2147482000;
}
/* Docked: full-width bar at the bottom */
.osk-docked { position: fixed; left: 0; right: 0; bottom: 0; }
/* Floating: positioned, draggable, scalable panel */
.osk-floating {
  position: fixed; width: 720px; max-width: 96vw;
  border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.5);
}
.osk-bar { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; cursor: grab; touch-action: none; }
.osk-floating .osk-bar { cursor: grab; }
.osk-grip { color: #9ca3af; font-size: 13px; padding: 0 6px; }
.osk-tab {
  min-width: 44px; height: 40px; border-radius: 8px; border: none;
  background: #374151; color: #e5e7eb; font-size: 16px; font-weight: 600; cursor: pointer;
}
.osk-tab.on { background: #D4A843; color: #1a1a1a; }
.osk-row { display: flex; gap: 6px; justify-content: center; margin-bottom: 6px; }
.osk-key {
  flex: 1; max-width: 9%; height: var(--osk-k, 56px); border-radius: 8px; border: none;
  background: #374151; color: #fff; font-size: 20px; cursor: pointer;
}
.osk-key:active { background: #D4A843; color: #1a1a1a; }
.osk-key.on { background: #D4A843; color: #1a1a1a; }
.osk-fn { max-width: 14%; background: #4b5563; font-size: 22px; }
.osk-space { max-width: 50%; }
@media (max-width: 1100px) { .osk-docked .osk-key { height: 48px; font-size: 18px; } }
</style>
