<template>
  <aside
    class="fixed inset-y-0 z-30 w-64 bg-gray-800 dark:bg-gray-900 text-gray-100 flex flex-col transition-transform duration-300 overflow-y-auto ltr:left-0 rtl:right-0"
    :class="{ 'ltr:-translate-x-full rtl:translate-x-full': !sidebarOpen }"
  >
    <!-- Branding -->
    <div class="flex items-center gap-3 px-5 py-5 border-b border-gray-700">
      <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
        <span class="text-sm font-bold text-gray-900">VS</span>
      </div>
      <span class="text-lg font-bold text-yellow-500 tracking-wide">Hisab</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 py-4 space-y-1 overflow-y-auto">
      <!-- Main -->
      <div class="px-4 mb-1">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{{ t('dashboard') }}</span>
      </div>
      <NavItem to="/dashboard" icon="&#x1F4CA;" :label="t('dashboard')" />
      <NavItem to="/pos" icon="&#x1F6D2;" :label="t('pos')" />
      <NavItem to="/tables" icon="&#x1F37D;&#xFE0F;" :label="t('tables') || 'Tables'" />

      <!-- Inventory -->
      <div class="px-4 mt-4 mb-1">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Inventory</span>
      </div>
      <NavItem to="/products" icon="&#x1F4E6;" :label="t('products')" />
      <NavItem to="/categories" icon="&#x1F3F7;&#xFE0F;" :label="t('categories')" />
      <NavItem to="/recipes" icon="&#x1F372;" :label="t('recipes')" />

      <!-- People -->
      <div class="px-4 mt-4 mb-1">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">People</span>
      </div>
      <NavItem to="/customers" icon="&#x1F465;" :label="t('customers')" />
      <NavItem to="/suppliers" icon="&#x1F69A;" :label="t('suppliers')" />

      <!-- Finance -->
      <div class="px-4 mt-4 mb-1">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Finance</span>
      </div>
      <NavItem to="/invoices" icon="&#x1F9FE;" :label="t('invoices')" />
      <NavItem to="/cheques" icon="&#x1F4B3;" :label="t('cheques')" />
      <NavItem to="/expenses" icon="&#x1F4B8;" :label="t('expenses')" />

      <!-- Operations -->
      <div class="px-4 mt-4 mb-1">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Operations</span>
      </div>
      <NavItem to="/stock" icon="&#x1F4E5;" :label="t('stock')" />
      <NavItem to="/returns" icon="&#x1F504;" :label="t('returns')" />

      <!-- Analysis -->
      <div class="px-4 mt-4 mb-1">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Analysis</span>
      </div>
      <NavItem to="/reports" icon="&#x1F4C8;" :label="t('reports')" />

      <!-- Tools -->
      <div class="px-4 mt-4 mb-1">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{{ t('tools') || 'Tools' }}</span>
      </div>
      <NavItem to="/import" icon="&#x1F4E5;" :label="t('import_data')" />

      <!-- System -->
      <div class="px-4 mt-4 mb-1">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">System</span>
      </div>
      <NavItem to="/settings" icon="&#x2699;&#xFE0F;" :label="t('settings')" />

      <!-- Admin (only for admin accounts) -->
      <template v-if="isAdmin">
        <div class="px-4 mt-4 mb-1">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Admin</span>
        </div>
        <NavItem to="/accounts" icon="&#x1F465;" :label="'Accounts'" />
      </template>
    </nav>

    <!-- User Info -->
    <div class="px-4 py-3 border-t border-gray-700 text-sm text-gray-400">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white">
          {{ userInitial }}
        </div>
        <div class="truncate">
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

const auth = useAuthStore();
const ui = useUiStore();

const sidebarOpen = computed(() => ui.sidebarOpen);
const userName = computed(() => auth.user?.name || 'User');
const userEmail = computed(() => auth.user?.email || '');
const userInitial = computed(() => (auth.user?.name?.[0] || 'U').toUpperCase());
const isAdmin = computed(() => !!auth.user?.is_admin);
</script>
