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
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('sold_items') || 'Sold Items Report' }}</h1>
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

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('total_items_sold') || 'Total Items Sold' }}</p>
          <p class="text-2xl font-bold text-[#D4A843] mt-1">{{ totalQtySold }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('total_revenue') || 'Total Revenue' }}</p>
          <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{{ formatCurrency(totalRevenue) }}</p>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Data Table -->
      <AppDataTable
        :columns="columns"
        :data="soldItems"
        :loading="loading"
        :empty-message="t('no_data') || 'No sold items found'"
      >
        <template #cell-total_revenue="{ item }">
          <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(item.total_revenue) }}</span>
        </template>
        <template #cell-avg_unit_price="{ item }">
          {{ formatCurrency(item.avg_unit_price) }}
        </template>
      </AppDataTable>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { formatMoney } from '../../composables/currency.js';
import api from '../../composables/useApi.js';
import { t } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppDataTable from '../../components/base/AppDataTable.vue';

const loading = ref(true);
const error = ref('');
const invoices = ref([]);
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

const columns = [
  { key: 'product_name', label: t('product') || 'Product Name', sortable: true },
  { key: 'qty_sold', label: t('qty_sold') || 'Qty Sold', sortable: true },
  { key: 'total_revenue', label: t('total_revenue') || 'Total Revenue', sortable: true },
  { key: 'avg_unit_price', label: t('avg_unit_price') || 'Avg Unit Price', sortable: true },
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

const soldItems = computed(() => {
  const { start, end } = getDateRange(activePreset.value);
  const productMap = {};

  invoices.value.forEach((inv) => {
    const invDate = new Date(inv.date || inv.created_at);
    if (invDate < start || invDate > end) return;

    const items = inv.items || inv.invoice_items || [];
    items.forEach((item) => {
      const name = item.product?.name_en || item.product?.name || item.product_name || 'Unknown';
      const qty = Number(item.quantity || 0);
      const total = Number(item.total || item.subtotal || qty * Number(item.unit_price || item.price || 0));

      if (!productMap[name]) {
        productMap[name] = { product_name: name, qty_sold: 0, total_revenue: 0 };
      }
      productMap[name].qty_sold += qty;
      productMap[name].total_revenue += total;
    });
  });

  return Object.values(productMap).map((p) => ({
    ...p,
    avg_unit_price: p.qty_sold > 0 ? p.total_revenue / p.qty_sold : 0,
  })).sort((a, b) => b.total_revenue - a.total_revenue);
});

const totalQtySold = computed(() =>
  soldItems.value.reduce((sum, i) => sum + i.qty_sold, 0)
);

const totalRevenue = computed(() =>
  soldItems.value.reduce((sum, i) => sum + i.total_revenue, 0)
);

function formatCurrency(value) {
  return formatMoney(value);
}

async function fetchInvoices() {
  loading.value = true;
  error.value = '';
  try {
    const res = await api.get('/invoices', { params: { type: 'sale' } });
    invoices.value = res.data.data || res.data;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load sales data.';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchInvoices);
</script>
