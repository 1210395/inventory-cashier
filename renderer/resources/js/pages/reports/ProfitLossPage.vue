<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <router-link
            to="/reports"
            class="text-gray-500 dark:text-gray-400 hover:text-[#D4A843] transition-colors"
          >
            &larr; {{ t('back') || 'Back' }}
          </router-link>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('profit_loss') || 'Profit & Loss Report' }}</h1>
        </div>
      </div>

      <!-- Date Range Filter -->
      <div class="flex items-center gap-2 mb-6 flex-wrap">
        <button
          v-for="preset in datePresets"
          :key="preset.value"
          class="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
          :class="activePreset === preset.value
            ? 'bg-[#D4A843] text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
          @click="setDatePreset(preset.value)"
        >
          {{ preset.label }}
        </button>
        <div class="flex items-center gap-2 ml-4">
          <input
            v-model="customFrom"
            type="date"
            class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#D4A843]"
            @change="activePreset = 'custom'"
          />
          <span class="text-gray-400 text-xs">{{ t('to') || 'to' }}</span>
          <input
            v-model="customTo"
            type="date"
            class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#D4A843]"
            @change="activePreset = 'custom'"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12 text-gray-400 dark:text-gray-500">
        {{ t('loading') || 'Loading...' }}
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Financial Statement -->
      <div v-if="!loading" class="max-w-2xl mx-auto">
        <!-- Revenue Section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            {{ t('revenue') || 'Revenue' }}
          </h2>
          <div class="flex items-center justify-between py-2">
            <span class="text-gray-600 dark:text-gray-400">{{ t('total_sales') || 'Total Sales Revenue' }}</span>
            <span class="text-lg font-semibold text-green-600 dark:text-green-400">{{ formatCurrency(revenue) }}</span>
          </div>
        </div>

        <!-- Cost of Goods Sold -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            {{ t('cogs') || 'Cost of Goods Sold' }}
          </h2>
          <div class="flex items-center justify-between py-2">
            <span class="text-gray-600 dark:text-gray-400">{{ t('total_purchases') || 'Total Purchase Cost' }}</span>
            <span class="text-lg font-semibold text-red-600 dark:text-red-400">{{ formatCurrency(cogs) }}</span>
          </div>
        </div>

        <!-- Gross Profit -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border-2 p-6 mb-4"
          :class="grossProfit >= 0 ? 'border-green-300 dark:border-green-700' : 'border-red-300 dark:border-red-700'"
        >
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">{{ t('gross_profit') || 'Gross Profit' }}</h2>
            <span class="text-2xl font-bold" :class="grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ formatCurrency(grossProfit) }}
            </span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ t('revenue') || 'Revenue' }} - {{ t('cogs') || 'COGS' }}
          </p>
        </div>

        <!-- Expenses Section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            {{ t('expenses') || 'Operating Expenses' }}
          </h2>
          <div class="flex items-center justify-between py-2">
            <span class="text-gray-600 dark:text-gray-400">{{ t('total_expenses') || 'Total Expenses' }}</span>
            <span class="text-lg font-semibold text-gray-500 dark:text-gray-400">{{ formatCurrency(expenses) }}</span>
          </div>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
            {{ t('expenses_placeholder_note') || 'Expense tracking not yet connected to backend' }}
          </p>
        </div>

        <!-- Cash vs Accrual Breakdown -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            {{ t('cash_vs_accrual') }}
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 text-center">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">{{ t('cash_collected') }}</p>
              <p class="text-xl font-bold text-green-600 dark:text-green-400">{{ formatCurrency(cashCollected) }}</p>
            </div>
            <div class="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4 text-center">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">{{ t('unpaid_debts') }}</p>
              <p class="text-xl font-bold text-yellow-600 dark:text-yellow-400">{{ formatCurrency(unpaidDebts) }}</p>
            </div>
            <div class="rounded-lg p-4 text-center" :class="actualCashProfit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">{{ t('actual_cash_profit') }}</p>
              <p class="text-xl font-bold" :class="actualCashProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                {{ formatCurrency(actualCashProfit) }}
              </p>
            </div>
          </div>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-3 italic">
            {{ t('cash_vs_accrual_note') }}
          </p>
        </div>

        <!-- Net Profit -->
        <div class="rounded-xl border-2 p-6"
          :class="netProfit >= 0
            ? 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600'
            : 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600'"
        >
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('net_profit') || 'Net Profit' }}</h2>
            <span class="text-3xl font-bold" :class="netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ formatCurrency(netProfit) }}
            </span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ t('gross_profit') || 'Gross Profit' }} - {{ t('expenses') || 'Expenses' }}
          </p>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { formatMoney } from '../../composables/currency.js';
import api from '../../composables/useApi.js';
import { t } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';

const loading = ref(true);
const error = ref('');
const salesInvoices = ref([]);
const purchaseInvoices = ref([]);
const activePreset = ref('this_month');
const customFrom = ref('');
const customTo = ref('');

const datePresets = [
  { value: 'today', label: t('today') || 'Today' },
  { value: 'this_week', label: t('this_week') || 'This Week' },
  { value: 'this_month', label: t('this_month') || 'This Month' },
  { value: 'this_year', label: t('this_year') || 'This Year' },
  { value: 'custom', label: t('custom') || 'Custom' },
];

function getDateRange(preset) {
  const now = new Date();
  const start = new Date();
  switch (preset) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'this_week': {
      const day = now.getDay();
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'this_month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'this_year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'custom':
      return {
        start: customFrom.value ? new Date(customFrom.value) : new Date(0),
        end: customTo.value ? new Date(customTo.value + 'T23:59:59') : now,
      };
  }
  return { start, end: now };
}

function setDatePreset(preset) {
  activePreset.value = preset;
}

function sumInvoices(list) {
  const { start, end } = getDateRange(activePreset.value);
  return list
    .filter((inv) => {
      const d = new Date(inv.date || inv.created_at);
      return d >= start && d <= end;
    })
    .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
}

const revenue = computed(() => sumInvoices(salesInvoices.value));
const cogs = computed(() => sumInvoices(purchaseInvoices.value));
const expenses = computed(() => 0); // Placeholder
const grossProfit = computed(() => revenue.value - cogs.value);
const netProfit = computed(() => grossProfit.value - expenses.value);

// Cash vs Accrual breakdown
function sumPaidInvoices(list) {
  const { start, end } = getDateRange(activePreset.value);
  return list
    .filter((inv) => {
      const d = new Date(inv.date || inv.created_at);
      return d >= start && d <= end;
    })
    .reduce((sum, inv) => sum + (parseFloat(inv.paid_amount) || 0), 0);
}

const cashCollected = computed(() => sumPaidInvoices(salesInvoices.value));
const unpaidDebts = computed(() => revenue.value - cashCollected.value);
const actualCashProfit = computed(() => cashCollected.value - cogs.value - expenses.value);

function formatCurrency(value) {
  return formatMoney(value);
}

async function fetchData() {
  loading.value = true;
  error.value = '';
  try {
    const [salesRes, purchaseRes] = await Promise.all([
      api.get('/invoices', { params: { type: 'sale' } }),
      api.get('/invoices', { params: { type: 'purchase' } }),
    ]);
    salesInvoices.value = salesRes.data.data || salesRes.data;
    purchaseInvoices.value = purchaseRes.data.data || purchaseRes.data;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load financial data.';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>
