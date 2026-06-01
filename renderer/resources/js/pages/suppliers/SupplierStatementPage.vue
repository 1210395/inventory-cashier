<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <AppButton variant="ghost" @click="$router.push('/suppliers')">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            {{ t('suppliers') }}
          </AppButton>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('account_statement') }}</h1>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 4" :key="i" class="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <div v-if="!loading && statement">
        <!-- Supplier Info & Summary -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('supplier') }}</p>
            <p class="text-lg font-bold text-gray-900 dark:text-white mt-1">{{ statement.supplier?.name || '-' }}</p>
            <p v-if="statement.supplier?.phone" class="text-xs text-gray-400 mt-1">{{ statement.supplier.phone }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('debit') }}</p>
            <p class="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{{ formatCurrency(statement.total_debt) }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('credit') }}</p>
            <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{{ formatCurrency(statement.total_paid) }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('running_balance') }}</p>
            <p class="text-2xl font-bold text-[#D4A843] mt-1">{{ formatCurrency(statement.balance) }}</p>
          </div>
        </div>

        <!-- Date Range Filter -->
        <div class="flex items-center gap-4 mb-6 flex-wrap">
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">{{ t('from_date') }}</label>
            <input
              v-model="dateFrom"
              type="date"
              class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">{{ t('to_date') }}</label>
            <input
              v-model="dateTo"
              type="date"
              class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
            />
          </div>
          <div class="flex items-end">
            <AppButton variant="primary" @click="fetchStatement">{{ t('apply') }}</AppButton>
          </div>
        </div>

        <!-- Ledger Table -->
        <AppDataTable
          :columns="columns"
          :data="statement.entries || []"
          :loading="false"
          :empty-message="t('no_data')"
        >
          <template #cell-date="{ item }">
            {{ formatDate(item.date) }}
          </template>
          <template #cell-description="{ item }">
            <span>{{ item.description }}</span>
          </template>
          <template #cell-debit="{ item }">
            <span v-if="item.debit" class="text-red-600 dark:text-red-400 font-semibold">{{ formatCurrency(item.debit) }}</span>
            <span v-else class="text-gray-300 dark:text-gray-600">-</span>
          </template>
          <template #cell-credit="{ item }">
            <span v-if="item.credit" class="text-green-600 dark:text-green-400 font-semibold">{{ formatCurrency(item.credit) }}</span>
            <span v-else class="text-gray-300 dark:text-gray-600">-</span>
          </template>
          <template #cell-running_balance="{ item }">
            <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(item.running_balance) }}</span>
          </template>
        </AppDataTable>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../../composables/useApi.js';
import { t } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppDataTable from '../../components/base/AppDataTable.vue';

const route = useRoute();

const loading = ref(true);
const error = ref('');
const statement = ref(null);
const dateFrom = ref('');
const dateTo = ref('');

const columns = [
  { key: 'date', label: t('date'), sortable: true },
  { key: 'description', label: t('description') },
  { key: 'debit', label: t('debit'), sortable: true },
  { key: 'credit', label: t('credit'), sortable: true },
  { key: 'running_balance', label: t('running_balance') },
];

function formatCurrency(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString();
}

async function fetchStatement() {
  loading.value = true;
  error.value = '';
  try {
    const params = {};
    if (dateFrom.value) params.from = dateFrom.value;
    if (dateTo.value) params.to = dateTo.value;
    const res = await api.get('/suppliers/' + route.params.uuid + '/statement', { params });
    statement.value = res.data.data || res.data;
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load statement.';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchStatement);
</script>
