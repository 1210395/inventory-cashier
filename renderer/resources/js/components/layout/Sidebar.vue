<template>
  <aside
    class="fixed inset-y-0 z-30 bg-gray-800 dark:bg-gray-900 text-gray-100 flex flex-col transition-all duration-300 overflow-y-auto overflow-x-hidden ltr:left-0 rtl:right-0"
    :class="sidebarOpen ? 'w-64' : 'w-16'"
  >
    <!-- Branding -->
    <div class="flex items-center gap-3 py-5 border-b border-gray-700" :class="sidebarOpen ? 'px-5' : 'px-0 justify-center'">
      <img :src="logo" alt="Hisab" class="w-9 h-9 rounded-lg flex-shrink-0" />
      <span v-show="sidebarOpen" class="text-lg font-bold text-yellow-500 tracking-wide">Hisab</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 py-4 space-y-1 overflow-y-auto">
      <!-- Sales (the cashier's daily tools) -->
      <div v-show="sidebarOpen" class="px-4 mb-1">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{{ t('sales') }}</span>
      </div>
      <NavItem to="/pos" :icon="ICON.pos" :label="t('pos')" />
      <NavItem to="/reports/cash-shifts" :icon="ICON.register" :label="t('cash_register') || t('cash_shifts')" />
      <NavItem to="/tables" :icon="ICON.tables" :label="t('tables') || 'Tables'" />
      <NavItem to="/invoices" :icon="ICON.invoices" :label="t('invoices')" />
      <NavItem to="/customers" :icon="ICON.customers" :label="t('customers')" />
      <NavItem to="/returns" :icon="ICON.returns" :label="t('returns')" />

      <!-- Catalog -->
      <div v-show="sidebarOpen" class="px-4 mt-4 mb-1">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{{ t('catalog') }}</span>
      </div>
      <NavItem to="/products" :icon="ICON.products" :label="t('products')" />
      <NavItem to="/categories" :icon="ICON.categories" :label="t('categories')" />
      <NavItem to="/recipes" :icon="ICON.recipes" :label="t('recipes')" />

      <!-- Back office -->
      <div v-show="sidebarOpen" class="px-4 mt-4 mb-1">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{{ t('back_office') }}</span>
      </div>
      <NavItem to="/dashboard" :icon="ICON.dashboard" :label="t('dashboard')" />
      <NavItem to="/reports" :icon="ICON.reports" :label="t('reports')" />
      <NavItem to="/stock" :icon="ICON.stock" :label="t('stock')" />
      <NavItem to="/suppliers" :icon="ICON.suppliers" :label="t('suppliers')" />
      <NavItem to="/cheques" :icon="ICON.cheques" :label="t('cheques')" />
      <NavItem to="/expenses" :icon="ICON.expenses" :label="t('expenses')" />
      <NavItem to="/import" :icon="ICON.import" :label="t('import_data')" />

      <!-- System -->
      <div v-show="sidebarOpen" class="px-4 mt-4 mb-1">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{{ t('settings') }}</span>
      </div>
      <NavItem to="/settings" :icon="ICON.settings" :label="t('settings')" />

      <!-- Admin (only for admin accounts) -->
      <template v-if="isAdmin">
        <div v-show="sidebarOpen" class="px-4 mt-4 mb-1">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Admin</span>
        </div>
        <NavItem to="/accounts" :icon="ICON.accounts" :label="'Accounts'" />
      </template>
    </nav>

    <!-- User Info -->
    <div class="py-3 border-t border-gray-700 text-sm text-gray-400" :class="sidebarOpen ? 'px-4' : 'px-0'">
      <div class="flex items-center gap-2" :class="{ 'justify-center': !sidebarOpen }">
        <div class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0" :title="!sidebarOpen ? userName : null">
          {{ userInitial }}
        </div>
        <div v-show="sidebarOpen" class="truncate">
          <div class="text-gray-200 text-sm font-medium truncate">{{ userName }}</div>
          <div class="text-gray-500 text-xs truncate">{{ userEmail }}</div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth.js';
import { useUiStore } from '../../stores/ui.js';
import { t } from '../../i18n/index.js';
import NavItem from './NavItem.vue';
import logo from '../../assets/logo.png';

const auth = useAuthStore();
const ui = useUiStore();

const sidebarOpen = computed(() => ui.sidebarOpen);
const userName = computed(() => auth.user?.name || 'User');
const userEmail = computed(() => auth.user?.email || '');
const userInitial = computed(() => (auth.user?.name?.[0] || 'U').toUpperCase());
const isAdmin = computed(() => !!auth.user?.is_admin);

// Clean line-icon set (Lucide-style). Rendered via v-html in NavItem; each uses
// stroke="currentColor" so it inherits the active (gold) / inactive colours.
const svg = (paths) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const ICON = {
  pos: svg('<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>'),
  register: svg('<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>'),
  tables: svg('<path d="M3 2v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>'),
  invoices: svg('<path d="M16 2H8a2 2 0 0 0-2 2v18l3-2 3 2 3-2 3 2V4a2 2 0 0 0-2-2Z"/><path d="M9 7h6M9 11h6M9 15h4"/>'),
  customers: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  returns: svg('<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>'),
  products: svg('<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>'),
  categories: svg('<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2 2 0 0 0 2.828 0l6.58-6.58a2 2 0 0 0 0-2.828z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none"/>'),
  recipes: svg('<path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><path d="M6 17h12"/>'),
  dashboard: svg('<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>'),
  reports: svg('<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>'),
  stock: svg('<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>'),
  suppliers: svg('<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M14 9h4l4 4v4a1 1 0 0 1-1 1h-1"/><circle cx="7.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/>'),
  cheques: svg('<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>'),
  expenses: svg('<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>'),
  import: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>'),
  settings: svg('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
  accounts: svg('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/>'),
};
</script>
