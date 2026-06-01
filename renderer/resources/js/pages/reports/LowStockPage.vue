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
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('low_stock') }}</h1>
        </div>
      </div>

      <!-- Summary Card -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('low_stock_items_count') }}</p>
          <p class="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{{ items.length }}</p>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Data Table -->
      <AppDataTable
        :columns="columns"
        :data="items"
        :loading="loading"
        :empty-message="t('no_data')"
      >
        <template #cell-product_name="{ item }">
          <button
            class="text-[#D4A843] hover:underline font-medium text-left"
            @click="$router.push('/products/' + item.uuid)"
          >
            {{ item.name_en || item.name || item.product_name || '-' }}
          </button>
        </template>
        <template #cell-quantity="{ item }">
          <span class="font-semibold" :class="item.quantity <= 0 ? 'text-red-600 dark:text-red-400' : 'text-orange-500 dark:text-orange-400'">
            {{ item.quantity ?? 0 }}
          </span>
        </template>
        <template #cell-min_quantity="{ item }">
          {{ item.min_quantity ?? 0 }}
        </template>
        <template #cell-deficit="{ item }">
          <span class="text-red-600 dark:text-red-400 font-medium">
            {{ Math.max(0, (item.min_quantity ?? 0) - (item.quantity ?? 0)) }}
          </span>
        </template>
        <template #cell-status="{ item }">
          <AppBadge
            v-if="(item.quantity ?? 0) <= 0"
            variant="danger"
            :text="t('out_of_stock')"
          />
          <AppBadge
            v-else
            variant="warning"
            :text="t('low_stock')"
          />
        </template>
      </AppDataTable>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../composables/useApi.js';
import { t } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppDataTable from '../../components/base/AppDataTable.vue';
import AppBadge from '../../components/base/AppBadge.vue';

const loading = ref(true);
const error = ref('');
const items = ref([]);

const columns = [
  { key: 'product_name', label: t('products'), sortable: true },
  { key: 'sku', label: t('sku'), sortable: true },
  { key: 'quantity', label: t('quantity'), sortable: true },
  { key: 'min_quantity', label: t('min_quantity'), sortable: true },
  { key: 'deficit', label: t('deficit') },
  { key: 'status', label: t('status') },
];

async function fetchData() {
  loading.value = true;
  error.value = '';
  try {
    const res = await api.get('/reports/low-stock');
    items.value = res.data.data || res.data;
  } catch (err) {
    // Fallback: try loading from products endpoint
    try {
      const prodRes = await api.get('/products');
      const products = prodRes.data.data || prodRes.data;
      items.value = products.filter(
        (p) => (p.quantity ?? 0) <= (p.min_quantity ?? 0)
      );
    } catch (fallbackErr) {
      error.value = err.response?.data?.message || 'Failed to load low stock data.';
    }
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>
