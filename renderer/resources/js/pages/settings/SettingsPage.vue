<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('settings') || 'Settings' }}</h1>
      </div>

      <div class="max-w-2xl space-y-6">
        <!-- Business Info Section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('business_info') }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppInput v-model="localSettings.business_name" :label="t('business_name')" />
            <AppInput v-model="localSettings.business_phone" :label="t('phone')" />
            <AppInput v-model="localSettings.business_address" :label="t('address')" />
            <AppInput v-model="localSettings.business_tax_id" :label="t('tax_id')" :placeholder="t('tax_id')" />
          </div>
        </div>

        <!-- Currency Settings Section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('currency_settings') }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AppSelect v-model="localSettings.currency_code" :label="t('currency_code')"
              :options="currencyOptions" />
            <AppInput v-model="localSettings.currency_symbol" :label="t('currency_symbol')" />
            <AppSelect v-model="localSettings.currency_position" :label="t('position')"
              :options="[{value:'before',label:'Before ($100)'},{value:'after',label:'After (100$)'}]" />
          </div>
        </div>

        <!-- Tax Settings Section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('tax_settings') }}</h2>
          <div class="flex items-center gap-4 mb-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" v-model="localSettings.tax_enabled" class="rounded border-gray-300 text-[#D4A843] focus:ring-[#D4A843]" />
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ t('enable_tax') }}</span>
            </label>
          </div>
          <div v-if="localSettings.tax_enabled" class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AppInput v-model="localSettings.tax_name" :label="t('tax_name')" placeholder="VAT" />
            <AppInput v-model="localSettings.tax_rate" :label="t('tax_rate')" type="number" placeholder="16" />
            <label class="flex items-center gap-2 mt-6 cursor-pointer">
              <input type="checkbox" v-model="localSettings.tax_inclusive" class="rounded border-gray-300 text-[#D4A843] focus:ring-[#D4A843]" />
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ t('tax_inclusive') }}</span>
            </label>
          </div>
        </div>

        <!-- Save Settings Button -->
        <div class="flex items-center gap-3">
          <AppButton variant="primary" :loading="savingSettings" @click="saveSettings">
            {{ t('save') }}
          </AppButton>
          <span v-if="settingsSaved" class="text-sm text-green-600 dark:text-green-400">{{ t('saved') }}</span>
        </div>

        <!-- Appearance Section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('appearance') || 'Appearance' }}</h2>
          <div class="space-y-4">
            <!-- Dark Mode Toggle -->
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ t('dark_mode') || 'Dark Mode' }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('dark_mode_desc') || 'Switch between light and dark theme' }}</p>
              </div>
              <button
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                :class="uiStore.darkMode ? 'bg-[#D4A843]' : 'bg-gray-300 dark:bg-gray-600'"
                @click="uiStore.toggleDarkMode()"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="uiStore.darkMode ? 'translate-x-6' : 'translate-x-1'"
                ></span>
              </button>
            </div>

            <!-- Language Selector -->
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ t('language') || 'Language' }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('language_desc') || 'Choose your preferred language' }}</p>
              </div>
              <div class="flex gap-2">
                <button
                  class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                  :class="currentLocale === 'en'
                    ? 'bg-[#D4A843] text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
                  @click="changeLocale('en')"
                >
                  English
                </button>
                <button
                  class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                  :class="currentLocale === 'ar'
                    ? 'bg-[#D4A843] text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
                  @click="changeLocale('ar')"
                >
                  العربية
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Account Section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('account') || 'Account' }}</h2>
          <div class="space-y-4">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-[#D4A843]/20 flex items-center justify-center">
                <span class="text-lg font-bold text-[#D4A843]">{{ userInitials }}</span>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ authStore.user?.name || '-' }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ authStore.user?.email || '-' }}</p>
              </div>
            </div>
            <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
              <AppButton variant="danger" @click="handleLogout" :loading="loggingOut">
                {{ t('logout') || 'Logout' }}
              </AppButton>
            </div>
          </div>
        </div>

        <!-- About Section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('about') || 'About' }}</h2>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ t('app_name') || 'Application' }}</span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">Hisab</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ t('version') || 'Version' }}</span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">1.0.0</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ t('platform') || 'Platform' }}</span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">Web Dashboard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { t, setLocale, locale } from '../../i18n/index.js';
import { useAuthStore } from '../../stores/auth.js';
import { useUiStore } from '../../stores/ui.js';
import api from '../../composables/useApi.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppInput from '../../components/base/AppInput.vue';
import AppSelect from '../../components/base/AppSelect.vue';

const authStore = useAuthStore();
const uiStore = useUiStore();
const loggingOut = ref(false);
const savingSettings = ref(false);
const settingsSaved = ref(false);

const currencyOptions = [
  { value: 'USD', label: 'USD - $' },
  { value: 'JOD', label: 'JOD - JD' },
  { value: 'ILS', label: 'ILS - \u20AA' },
  { value: 'EUR', label: 'EUR - \u20AC' },
  { value: 'GBP', label: 'GBP - \u00A3' },
  { value: 'SAR', label: 'SAR - \uFDFC' },
  { value: 'AED', label: 'AED - \u062F.\u0625' },
  { value: 'EGP', label: 'EGP - E\u00A3' },
];

const symbolMap = { USD: '$', JOD: 'JD', ILS: '\u20AA', EUR: '\u20AC', GBP: '\u00A3', SAR: '\uFDFC', AED: '\u062F.\u0625', EGP: 'E\u00A3' };

const localSettings = reactive({
  currency_code: 'ILS',
  currency_symbol: '\u20AA',
  currency_position: 'before',
  tax_rate: 0,
  tax_name: 'Tax',
  tax_enabled: false,
  tax_inclusive: false,
  business_name: '',
  business_phone: '',
  business_address: '',
  business_tax_id: '',
});

// Auto-update symbol when code changes
import { watch } from 'vue';
watch(() => localSettings.currency_code, (code) => {
  if (symbolMap[code]) localSettings.currency_symbol = symbolMap[code];
});

async function loadSettings() {
  // Load from store/localStorage first
  uiStore.loadSettingsFromStorage();
  Object.assign(localSettings, uiStore.settings);
  // Try loading from API
  try {
    const res = await api.get('/settings');
    const data = res.data.data || res.data;
    if (data && typeof data === 'object') {
      // API may return flat key-value or object
      const s = {};
      if (Array.isArray(data)) {
        data.forEach((item) => { s[item.key] = item.value; });
      } else {
        Object.assign(s, data);
      }
      // Convert string booleans
      if (s.tax_enabled === 'true' || s.tax_enabled === '1') s.tax_enabled = true;
      if (s.tax_enabled === 'false' || s.tax_enabled === '0') s.tax_enabled = false;
      if (s.tax_inclusive === 'true' || s.tax_inclusive === '1') s.tax_inclusive = true;
      if (s.tax_inclusive === 'false' || s.tax_inclusive === '0') s.tax_inclusive = false;
      if (s.tax_rate) s.tax_rate = parseFloat(s.tax_rate);
      Object.assign(localSettings, s);
      uiStore.setSettings(localSettings);
    }
  } catch (e) {
    // API not available, use local storage
  }
}

async function saveSettings() {
  savingSettings.value = true;
  settingsSaved.value = false;
  try {
    await api.put('/settings', { ...localSettings });
  } catch (e) {
    // Save locally even if API fails
  }
  uiStore.setSettings({ ...localSettings });
  settingsSaved.value = true;
  setTimeout(() => settingsSaved.value = false, 3000);
  savingSettings.value = false;
}

onMounted(() => {
  loadSettings();
});

const currentLocale = computed(() => locale.value);

const userInitials = computed(() => {
  const name = authStore.user?.name || '';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

function changeLocale(loc) {
  setLocale(loc);
  uiStore.setLocale(loc);
}

async function handleLogout() {
  loggingOut.value = true;
  await authStore.logout();
}
</script>
