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
            &larr; {{ t('back') }}
          </router-link>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('stock_value') }}</h1>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('total_cost_value') }}</p>
          <p class="text-2xl font-bold text-[#D4A843] mt-1">{{ formatCurrency(totalCostValue) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('total_sell_value') }}</p>
          <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{{ formatCurrency(totalSellValue) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('potential_profit') }}</p>
          <p class="text-2xl font-bold mt-1" :class="potentialProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
            {{ formatCurrency(potentialProfit) }}
          </p>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- By Category Breakdown -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('value_by_category') }}</h2>
        <AppDataTable
          :columns="categoryColumns"
          :data="categoryBreakdown"
          :loading="loading"
          :empty-message="t('no_data')"
        >
          <template #cell-cost_value="{ item }">
            <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(item.cost_value) }}</span>
          </template>
          <template #cell-sell_value="{ item }">
            {{ formatCurrency(item.sell_value) }}
          </template>
          <template #cell-margin="{ item }">
            <span :class="item.margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ formatCurrency(item.margin) }}
            </span>
          </template>
        </AppDataTable>
      </div>

      <!-- Product Detail Table -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('product_detail') }}</h2>
        <AppDataTable
          :columns="productColumns"
          :data="productList"
          :loading="loading"
          :empty-message="t('no_data')"
        >
          <template #cell-cost_value="{ item }">
            {{ formatCurrency(item.cost_value) }}
          </template>
          <template #cell-sell_value="{ item }">
            {{ formatCurrency(item.sell_value) }}
          </template>
        </AppDataTable>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../../composables/useApi.js';
import { t } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppDataTable from '../../components/base/AppDataTable.vue';

const loading = ref(true);
const error = ref('');
const rawData = ref(null);
const products = ref([]);

const categoryColumns = [
  { key: 'category_name', label: t('category'), sortable: true },
  { key: 'product_count', label: t('product_count'), sortable: true },
  { key: 'total_qty', label: t('quantity'), sortable: true },
  { key: 'cost_value', label: t('cost_price'), sortable: true },
  { key: 'sell_value', label: t('sell_price'), sortable: true },
  { key: 'margin', label: t('margin'), sortable: true },
];

const productColumns = [
  { key: 'name', label: t('products'), sortable: true },
  { key: 'sku', label: t('sku'), sortable: true },
  { key: 'quantity', label: t('quantity'), sortable: true },
  { key: 'cost_price', label: t('cost_price'), sortable: true },
  { key: 'sell_price', label: t('sell_price'), sortable: true },
  { key: 'cost_value', label: t('total_cost_value'), sortable: true },
  { key: 'sell_value', label: t('total_sell_value'), sortable: true },
];

const categoryBreakdown = computed(() => {
  if (rawData.value?.categories) return rawData.value.categories;

  // Fallback: compute from products
  const catMap = {};
  products.value.forEach((p) => {
    const cats = p.categories || (p.category ? [p.category] : []);
    const catName = cats.length > 0 ? (cats[0].name_en || cats[0].name || 'Uncategorized') : 'Uncategorized';
    if (!catMap[catName]) {
      catMap[catName] = { category_name: catName, product_count: 0, total_qty: 0, cost_value: 0, sell_value: 0 };
    }
    const qty = p.quantity ?? 0;
    catMap[catName].product_count++;
    catMap[catName].total_qty += qty;
    catMap[catName].cost_value += qty * (parseFloat(p.cost_price) || 0);
    catMap[catName].sell_value += qty * (parseFloat(p.sell_price) || 0);
  });
  return Object.values(catMap).map((c) => ({
    ...c,
    margin: c.sell_value - c.cost_value,
  })).sort((a, b) => b.cost_value - a.cost_value);
});

const productList = computed(() => {
  if (rawData.value?.products) return rawData.value.products;

  return products.value.map((p) => {
    const qty = p.quantity ?? 0;
    const costVal = qty * (parseFloat(p.cost_price) || 0);
    const sellVal = qty * (parseFloat(p.sell_price) || 0);
    return {
      name: p.name_en || p.name,
      sku: p.sku || '-',
      quantity: qty,
      cost_price: parseFloat(p.cost_price) || 0,
      sell_price: parseFloat(p.sell_price) || 0,
      cost_value: costVal,
      sell_value: sellVal,
    };
  }).sort((a, b) => b.cost_value - a.cost_value);
});

const totalCostValue = computed(() =>
  productList.value.reduce((sum, p) => sum + (p.cost_value || 0), 0)
);

const totalSellValue = computed(() =>
  productList.value.reduce((sum, p) => sum + (p.sell_value || 0), 0)
);

const potentialProfit = computed(() => totalSellValue.value - totalCostValue.value);

function formatCurrency(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2,
  }).format(num);
}

async function fetchData() {
  loading.value = true;
  error.value = '';
  try {
    const res = await api.get('/reports/stock-value');
    rawData.value = res.data.data || res.data;
  } catch (err) {
    // Fallback: compute from products
    try {
      const prodRes = await api.get('/products');
      products.value = prodRes.data.data || prodRes.data;
    } catch (fallbackErr) {
      error.value = err.response?.data?.message || 'Failed to load stock value data.';
    }
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>
