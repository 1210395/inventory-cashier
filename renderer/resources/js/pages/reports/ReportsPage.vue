<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('reports') || 'Reports' }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ t('reports_desc') || 'View analytics and business insights' }}</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12 text-gray-400 dark:text-gray-500">
        {{ t('loading') || 'Loading...' }}
      </div>

      <!-- KPI Summary -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <!-- Low Stock -->
        <router-link to="/products?low_stock=true" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-red-300 dark:hover:border-red-700 transition-colors cursor-pointer block">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-lg">
              !
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('low_stock') || 'Low Stock Items' }}</p>
              <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ lowStockCount }}</p>
            </div>
          </div>
        </router-link>

        <!-- Stock Value -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-lg">
              &#x20AA;
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('stock_value') || 'Total Stock Value' }}</p>
              <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ formatCurrency(stockValue) }}</p>
            </div>
          </div>
        </div>

        <!-- Total Products -->
        <router-link to="/products" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-[#D4A843] transition-colors cursor-pointer block">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-[#D4A843]/20 flex items-center justify-center text-lg text-[#D4A843]">
              #
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('total_products') || 'Total Products' }}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalProducts }}</p>
            </div>
          </div>
        </router-link>
      </div>

      <!-- Expiring Soon Section -->
      <div v-if="expiringProducts.length > 0" class="mb-8">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">{{ t('expiring_soon') }}</h2>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-orange-200 dark:border-orange-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/20">
                <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('product') }}</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('sku') }}</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('expiry_date') }}</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('days') }}</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('quantity') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in expiringProducts" :key="p.uuid" class="border-b border-gray-100 dark:border-gray-700/50">
                <td class="px-4 py-2 text-gray-900 dark:text-white font-medium">{{ localizedName(p) || '-' }}</td>
                <td class="px-4 py-2 text-gray-500 dark:text-gray-400">{{ p.sku || '-' }}</td>
                <td class="px-4 py-2 text-gray-700 dark:text-gray-300">{{ p.expiry_date }}</td>
                <td class="px-4 py-2">
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="p.daysUntilExpiry <= 0
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : p.daysUntilExpiry <= 7
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'"
                  >
                    {{ p.daysUntilExpiry <= 0 ? t('expired') : p.daysUntilExpiry + ' ' + t('days') }}
                  </span>
                </td>
                <td class="px-4 py-2 text-gray-700 dark:text-gray-300">{{ p.quantity ?? '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Report Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <router-link
          v-for="report in reportCards"
          :key="report.route"
          :to="report.route"
          class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-[#D4A843] dark:hover:border-[#D4A843] transition-colors group cursor-pointer block"
        >
          <div class="text-3xl mb-3">{{ report.icon }}</div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-[#D4A843] transition-colors">
            {{ report.title }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ report.description }}</p>
        </router-link>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../../composables/useApi.js';
import { t, localizedName } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';

const loading = ref(true);
const lowStockCount = ref(0);
const stockValue = ref(0);
const totalProducts = ref(0);
const allProducts = ref([]);

const expiringProducts = computed(() => {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return allProducts.value
    .filter((p) => {
      if (!p.expiry_date) return false;
      const expDate = new Date(p.expiry_date);
      return expDate <= thirtyDaysFromNow;
    })
    .map((p) => {
      const expDate = new Date(p.expiry_date);
      const daysUntilExpiry = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
      return { ...p, daysUntilExpiry };
    })
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    .slice(0, 20);
});

const reportCards = [
  {
    icon: '\uD83D\uDCC8',
    title: t('sold_items') || 'Sold Items',
    description: t('sold_items_desc') || 'View sales by product',
    route: '/reports/sold',
  },
  {
    icon: '\uD83D\uDCC9',
    title: t('bought_items') || 'Bought Items',
    description: t('bought_items_desc') || 'View purchases by product',
    route: '/reports/bought',
  },
  {
    icon: '\uD83D\uDCB0',
    title: t('profit_loss') || 'Profit & Loss',
    description: t('profit_loss_desc') || 'Revenue vs costs analysis',
    route: '/reports/profit-loss',
  },
  {
    icon: '\uD83C\uDFEA',
    title: t('cash_shifts') || 'Cash Shifts',
    description: t('cash_shifts_desc') || 'Daily register reports',
    route: '/reports/cash-shifts',
  },
  {
    icon: '\u26A0\uFE0F',
    title: t('low_stock') || 'Low Stock',
    description: t('low_stock_desc') || 'Products running low on inventory',
    route: '/reports/low-stock',
  },
  {
    icon: '\uD83D\uDCE6',
    title: t('stock_value') || 'Stock Value',
    description: t('stock_value_desc') || 'Inventory value breakdown by category',
    route: '/reports/stock-value',
  },
  {
    icon: '\uD83D\uDCB3',
    title: t('debt_summary') || 'Debt Summary',
    description: t('debt_summary_desc') || 'Customer receivables & supplier payables',
    route: '/reports/debt-summary',
  },
  {
    icon: '\u23F3',
    title: t('aging_report') || 'Aging Report',
    description: t('aging_report_desc') || 'Overdue payments by age buckets',
    route: '/reports/aging',
  },
  {
    icon: '\uD83D\uDCC5',
    title: t('daily_reconciliation') || 'Daily Reconciliation',
    description: t('daily_reconciliation_desc') || 'Daily cash flow and payment summary',
    route: '/reports/daily-reconciliation',
  },
];

function formatCurrency(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchDashboardData() {
  loading.value = true;
  try {
    const res = await api.get('/products');
    const products = res.data.data || res.data;
    allProducts.value = products;
    totalProducts.value = products.length;
    lowStockCount.value = products.filter(
      (p) => (p.quantity ?? 0) <= (p.min_quantity ?? 0)
    ).length;
    stockValue.value = products.reduce((sum, p) => {
      const qty = p.quantity ?? 0;
      const price = parseFloat(p.cost_price) || 0;
      return sum + qty * price;
    }, 0);
  } catch {
    // Silently fail
  } finally {
    loading.value = false;
  }
}

onMounted(fetchDashboardData);
</script>
