<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-yellow-900">
    <div class="w-full max-w-md">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        <!-- Logo / Title -->
        <div class="text-center mb-8">
          <img :src="logo" alt="Hisab" class="mx-auto block w-16 h-16 rounded-2xl mb-4" />
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Hisab</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ t('app_tagline') }}</p>
        </div>

        <!-- Error Message -->
        <div
          v-if="error"
          class="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm"
        >
          {{ error }}
        </div>

        <!-- PIN LOGIN (default when this terminal has a saved account + PIN) -->
        <div v-if="mode === 'pin'">
          <p class="text-center text-sm text-gray-500 dark:text-gray-400 mb-1">{{ isAr ? 'أدخل رمز PIN' : 'Enter your PIN' }}</p>
          <p v-if="saved?.name || saved?.email" class="text-center text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">
            {{ saved.name || saved.email }}
          </p>

          <div class="flex justify-center gap-3 mb-6">
            <span v-for="i in 4" :key="i"
              class="w-4 h-4 rounded-full border-2"
              :class="entry.length >= i ? 'bg-yellow-500 border-yellow-500' : 'border-gray-400 dark:border-gray-500'"></span>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" type="button"
              class="h-16 rounded-xl text-2xl font-semibold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white active:bg-yellow-500 active:text-gray-900"
              @click="tap(n)" :disabled="loading">{{ n }}</button>
            <button type="button" class="h-16 rounded-xl text-lg font-medium bg-gray-100 dark:bg-gray-700 text-gray-500"
              @click="entry = ''" :disabled="loading">C</button>
            <button type="button" class="h-16 rounded-xl text-2xl font-semibold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white active:bg-yellow-500 active:text-gray-900"
              @click="tap(0)" :disabled="loading">0</button>
            <button type="button" class="h-16 rounded-xl text-xl bg-gray-100 dark:bg-gray-700 text-gray-500"
              @click="entry = entry.slice(0, -1)" :disabled="loading">&#x232B;</button>
          </div>

          <button type="button" class="w-full mt-6 text-sm text-gray-500 dark:text-gray-400 underline"
            @click="switchToPassword">
            {{ isAr ? 'الدخول بالبريد وكلمة المرور' : 'Use email & password' }}
          </button>
        </div>

        <!-- EMAIL / PASSWORD LOGIN -->
        <form v-else @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('email') }}
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="w-full px-4 py-4 text-lg rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition"
              :placeholder="t('email')"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('password') }}
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              class="w-full px-4 py-4 text-lg rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition"
              :placeholder="t('password')"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-4 px-4 text-lg bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-gray-900 font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="inline-flex items-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Loading...
            </span>
            <span v-else>{{ t('login') }}</span>
          </button>

          <button v-if="canUsePin" type="button" class="w-full text-sm text-gray-500 dark:text-gray-400 underline"
            @click="switchToPin">
            {{ isAr ? 'الدخول برمز PIN' : 'Use PIN' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import logo from '../../assets/logo.png';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.js';
import { t, locale } from '../../i18n/index.js';
import { hasPin, verifyPin } from '../../composables/pin.js';
import { getSavedAccount, saveAccount } from '../../composables/savedAccount.js';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const entry = ref('');

const isAr = computed(() => locale.value === 'ar');
const saved = ref(getSavedAccount());
// PIN login is possible only when this device has both a saved account and a PIN.
const canUsePin = computed(() => !!saved.value && hasPin());
const mode = ref(canUsePin.value ? 'pin' : 'password');

function switchToPassword() { mode.value = 'password'; entry.value = ''; error.value = ''; }
function switchToPin() { mode.value = 'pin'; entry.value = ''; error.value = ''; }

function tap(n) {
  if (loading.value || entry.value.length >= 4) return;
  entry.value += String(n);
  if (entry.value.length === 4) submitPin();
}

async function submitPin() {
  error.value = '';
  if (!(await verifyPin(entry.value))) {
    error.value = isAr.value ? 'رمز خاطئ' : 'Wrong PIN';
    entry.value = '';
    return;
  }
  const acct = saved.value;
  if (!acct) { switchToPassword(); return; }
  loading.value = true;
  try {
    await auth.login(acct.email, acct.password);
    router.push('/pos');
  } catch (e) {
    // Saved password may be stale (changed on the server) — fall back to form.
    error.value = isAr.value ? 'تعذّر الدخول بالـ PIN، استخدم البريد وكلمة المرور' : "Couldn't sign in with PIN — use email & password";
    entry.value = '';
    mode.value = 'password';
  } finally {
    loading.value = false;
  }
}

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    // Remember this account so it can sign in with the device PIN next time.
    saveAccount(email.value, password.value, auth.user?.name || '');
    router.push('/pos');
  } catch (e) {
    if (e.response && e.response.status === 422) {
      const errors = e.response.data.errors;
      error.value = errors ? Object.values(errors).flat().join(' ') : t('invalid_credentials');
    } else if (e.response && e.response.status === 401) {
      error.value = t('invalid_credentials');
    } else {
      error.value = t('login_error');
    }
  } finally {
    loading.value = false;
  }
}
</script>
