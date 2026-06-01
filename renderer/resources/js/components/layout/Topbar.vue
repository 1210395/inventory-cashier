<template>
  <header class="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 sticky top-0 z-20">
    <!-- Left -->
    <div class="flex items-center gap-4">
      <!-- Sidebar toggle -->
      <button
        @click="ui.toggleSidebar()"
        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <!-- Page title -->
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">
        <slot name="title">{{ pageTitle }}</slot>
      </h2>
    </div>

    <!-- Right -->
    <div class="flex items-center gap-3">
      <!-- Notification Bell -->
      <div class="relative" ref="notifRef">
        <button
          @click="showNotifications = !showNotifications"
          class="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span
            v-if="notificationCount > 0"
            class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
          >
            {{ notificationCount > 99 ? '99+' : notificationCount }}
          </span>
        </button>

        <!-- Notification Dropdown -->
        <div
          v-if="showNotifications"
          class="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
        >
          <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('notifications') || 'Notifications' }}</h3>
          </div>
          <div class="max-h-80 overflow-y-auto">
            <div v-if="notifLoading" class="p-4 text-center text-sm text-gray-400">{{ t('loading') }}</div>
            <div v-else-if="notifications.length === 0" class="p-6 text-center text-sm text-gray-400 dark:text-gray-500">
              {{ t('no_notifications') || 'No notifications' }}
            </div>
            <template v-else>
              <div
                v-for="(notif, idx) in notifications"
                :key="idx"
                class="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                @click="handleNotifClick(notif)"
              >
                <div class="flex items-start gap-3">
                  <span class="text-xl flex-shrink-0">{{ notif.icon }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ notif.title }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ notif.message }}</p>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Language toggle -->
      <button
        @click="toggleLocale"
        class="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        {{ ui.locale === 'en' ? '\u0639\u0631' : 'EN' }}
      </button>

      <!-- Dark mode toggle -->
      <button
        @click="ui.toggleDarkMode()"
        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
      >
        <!-- Sun icon (shown in dark mode) -->
        <svg v-if="ui.darkMode" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <!-- Moon icon (shown in light mode) -->
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>

      <!-- User dropdown -->
      <div class="relative" ref="dropdownRef">
        <button
          @click="showDropdown = !showDropdown"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <div class="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold text-gray-900">
            {{ userInitial }}
          </div>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">{{ userName }}</span>
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Dropdown menu -->
        <div
          v-if="showDropdown"
          class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
        >
          <button
            @click="handleLogout"
            class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            {{ t('logout') }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.js';
import { useUiStore } from '../../stores/ui.js';
import { t, setLocale } from '../../i18n/index.js';
import api from '../../composables/useApi.js';

const auth = useAuthStore();
const ui = useUiStore();
const route = useRoute();
const router = useRouter();

const showDropdown = ref(false);
const dropdownRef = ref(null);
const notifRef = ref(null);
const showNotifications = ref(false);
const notifLoading = ref(false);
const notifications = ref([]);

const notificationCount = computed(() => notifications.value.length);

const userName = computed(() => auth.user?.name || 'User');
const userInitial = computed(() => (auth.user?.name?.[0] || 'U').toUpperCase());

const pageTitle = computed(() => {
  const name = route.name || '';
  return t(name.toLowerCase()) || name;
});

function toggleLocale() {
  const newLocale = ui.locale === 'en' ? 'ar' : 'en';
  ui.setLocale(newLocale);
  setLocale(newLocale);
}

async function handleLogout() {
  showDropdown.value = false;
  await auth.logout();
}

function handleNotifClick(notif) {
  showNotifications.value = false;
  if (notif.route) router.push(notif.route);
}

async function loadNotifications() {
  notifLoading.value = true;
  const notifs = [];
  try {
    // Fetch dashboard data for low stock & upcoming cheques
    const dashRes = await api.get('/dashboard').catch(() => null);
    if (dashRes?.data) {
      const d = dashRes.data;
      const lowStock = d.low_stock_count ?? d.low_stock ?? 0;
      if (lowStock > 0) {
        notifs.push({
          icon: '\u26A0\uFE0F',
          title: t('low_stock'),
          message: lowStock + ' ' + (t('products') || 'products').toLowerCase() + ' ' + (t('low_stock') || 'low stock').toLowerCase(),
          route: '/products?low_stock=true',
        });
      }
      const upcoming = d.upcoming_cheques_7days ?? d.upcoming_cheques ?? 0;
      if (upcoming > 0) {
        notifs.push({
          icon: '\uD83D\uDCC5',
          title: t('upcoming_cheques'),
          message: upcoming + ' ' + (t('cheques') || 'cheques').toLowerCase() + ' ' + (t('due_within_7_days') || 'due within 7 days'),
          route: '/cheques',
        });
      }
      const receivable = d.total_receivable ?? d.receivable ?? 0;
      if (receivable > 0) {
        notifs.push({
          icon: '\uD83D\uDCB3',
          title: t('receivable'),
          message: (t('unpaid_invoices_total') || 'Unpaid invoices total') + ': $' + Math.round(receivable).toLocaleString(),
          route: '/invoices?status=unpaid',
        });
      }
    }
  } catch (e) {
    // Silently fail
  }
  notifications.value = notifs;
  notifLoading.value = false;
}

// Close dropdown on outside click
function onClickOutside(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    showDropdown.value = false;
  }
  if (notifRef.value && !notifRef.value.contains(e.target)) {
    showNotifications.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside);
  loadNotifications();
});
onUnmounted(() => document.removeEventListener('click', onClickOutside));
</script>
