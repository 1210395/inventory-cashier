<template>
  <!-- Lock button (only when logged in and unlocked) -->
  <button
    v-if="loggedIn && !locked"
    class="pin-fab"
    @click="lockNow"
    title="Lock terminal"
  >🔒</button>

  <!-- Lock / set-PIN overlay -->
  <div v-if="locked || setting" class="pin-overlay">
    <div class="pin-card">
      <div class="pin-title">{{ title }}</div>
      <div class="pin-dots">
        <span v-for="i in pinLength" :key="i" :class="['dot', entry.length >= i && 'filled']"></span>
      </div>
      <div v-if="error" class="pin-error">{{ error }}</div>
      <div class="pin-pad">
        <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" class="pin-key" @click="tap(n)">{{ n }}</button>
        <button class="pin-key pin-muted" @click="clear">C</button>
        <button class="pin-key" @click="tap(0)">0</button>
        <button class="pin-key pin-muted" @click="back">⌫</button>
      </div>
      <button v-if="locked" class="pin-logout" @click="logout">{{ logoutLabel }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import { t } from '../i18n/index.js';
import { PIN_LENGTH, hasPin as pinExists, hashPin, verifyPin, setPin as savePin } from '../composables/pin.js';

const pinLength = PIN_LENGTH;

const auth = useAuthStore();
const locked = ref(false);
const setting = ref(false);     // setting a new PIN
const confirming = ref(false);  // confirming the new PIN
const entry = ref('');
const firstPin = ref('');
const error = ref('');

const loggedIn = computed(() => !!localStorage.getItem('auth_token'));
const isArabic = () => (localStorage.getItem('locale') === 'ar');

const title = computed(() => {
  if (setting.value && !confirming.value) return isArabic() ? 'أدخل رمز PIN جديد' : 'Set a PIN';
  if (setting.value && confirming.value) return isArabic() ? 'أكد رمز PIN' : 'Confirm PIN';
  return isArabic() ? 'أدخل رمز PIN' : 'Enter PIN';
});
const logoutLabel = computed(() => isArabic() ? 'تبديل المستخدم / خروج' : 'Switch user / Log out');

function hasPin() { return pinExists(); }

function lockNow() {
  if (!hasPin()) { startSetPin(); return; }
  error.value = ''; entry.value = ''; locked.value = true;
}

function startSetPin() {
  setting.value = true; confirming.value = false; firstPin.value = ''; entry.value = ''; error.value = '';
}

function tap(n) {
  if (entry.value.length >= pinLength) return;
  entry.value += String(n);
  if (entry.value.length === pinLength) submit();
}
function back() { entry.value = entry.value.slice(0, -1); }
function clear() { entry.value = ''; }

async function submit() {
  const pin = entry.value;
  if (setting.value) {
    if (!confirming.value) {
      firstPin.value = pin; confirming.value = true; entry.value = ''; error.value = '';
      return;
    }
    if (pin !== firstPin.value) {
      error.value = isArabic() ? 'غير متطابق، حاول مجدداً' : "Didn't match, try again";
      confirming.value = false; firstPin.value = ''; entry.value = '';
      return;
    }
    await savePin(pin);
    setting.value = false; confirming.value = false; entry.value = '';
    locked.value = true; // lock immediately after setting
    return;
  }
  // unlocking
  if (await verifyPin(pin)) {
    locked.value = false; entry.value = ''; error.value = '';
  } else {
    error.value = isArabic() ? 'رمز خاطئ' : 'Wrong PIN';
    entry.value = '';
  }
}

async function logout() {
  locked.value = false; entry.value = '';
  await auth.logout();
}

onMounted(() => {
  // Open locked if a PIN is set and a session exists (terminal starts locked).
  if (loggedIn.value && hasPin()) locked.value = true;
});
</script>

<style>
.pin-fab {
  position: fixed; left: 12px; bottom: 12px; z-index: 2147483000;
  width: 52px; height: 52px; border-radius: 50%;
  background: #D4A843; color: #1a1a1a; border: 2px solid #fff; font-size: 22px;
  box-shadow: 0 4px 14px rgba(0,0,0,.45); cursor: pointer;
}
.pin-overlay {
  position: fixed; inset: 0; z-index: 2147483600;
  background: rgba(17,24,39,.97); display: flex; align-items: center; justify-content: center;
}
.pin-card { width: 320px; max-width: 90vw; text-align: center; color: #fff; }
.pin-title { font-size: 20px; font-weight: 600; margin-bottom: 18px; }
.pin-dots { display: flex; gap: 14px; justify-content: center; margin-bottom: 14px; }
.dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #9ca3af; }
.dot.filled { background: #D4A843; border-color: #D4A843; }
.pin-error { color: #f87171; margin-bottom: 10px; min-height: 18px; }
.pin-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.pin-key {
  height: 64px; border-radius: 12px; border: none; background: #374151; color: #fff;
  font-size: 26px; cursor: pointer;
}
.pin-key:active { background: #D4A843; color: #1a1a1a; }
.pin-muted { background: #4b5563; font-size: 20px; }
.pin-logout { margin-top: 18px; background: none; border: none; color: #9ca3af; font-size: 14px; cursor: pointer; text-decoration: underline; }
</style>
