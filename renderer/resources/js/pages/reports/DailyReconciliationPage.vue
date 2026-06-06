<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <AppButton variant="ghost" @click="$router.push('/reports')">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            {{ t('reports') }}
          </AppButton>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('daily_reconciliation') }}</h1>
      </div>

      <!-- Date Picker -->
      <div class="mb-6 flex items-center gap-4">
        <div>
          <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">{{ t('date') }}</label>
          <input
            v-model="selectedDate"
            type="date"
            class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
            @change="fetchData"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 4" :key="i" class="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <div v-if="!loading && data">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('sales_summary') }}</p>
            <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{{ formatCurrency(data.sales_total) }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('purchases_summary') }}</p>
            <p class="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{{ formatCurrency(data.purchases_total) }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('payments_received') }}</p>
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{{ formatCurrency(data.payments_received) }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('cash_flow') }}</p>
            <p class="text-2xl font-bold text-[#D4A843] mt-1">{{ formatCurrency(data.net_cash_flow) }}</p>
          </div>
        </div>

        <!-- Payment Method Breakdown -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('payment_method') }} {{ t('summary') }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('cash') }}</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(data.breakdown?.cash || 0) }}</p>
            </div>
            <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('cheque') }}</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(data.breakdown?.cheque || 0) }}</p>
            </div>
            <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('bank_transfer') }}</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(data.breakdown?.transfer || 0) }}</p>
            </div>
          </div>
        </div>

        <!-- Sales Breakdown -->
        <div v-if="data.sales_breakdown" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('sales_summary') }} - {{ t('summary') }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('cash') }}</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(data.sales_breakdown?.cash || 0) }}</p>
            </div>
            <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('cheque') }}</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(data.sales_breakdown?.cheque || 0) }}</p>
            </div>
            <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('bank_transfer') }}</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(data.sales_breakdown?.transfer || 0) }}</p>
            </div>
          </div>
        </div>

        <!-- Purchases Breakdown -->
        <div v-if="data.purchases_breakdown" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('purchases_summary') }} - {{ t('summary') }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('cash') }}</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(data.purchases_breakdown?.cash || 0) }}</p>
            </div>
            <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('cheque') }}</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(data.purchases_breakdown?.cheque || 0) }}</p>
            </div>
            <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('bank_transfer') }}</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(data.purchases_breakdown?.transfer || 0) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { formatMoney } from '../../composables/currency.js';
import api from '../../composables/useApi.js';
import { t } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';

const loading = ref(true);
const error = ref('');
const data = ref(null);
const selectedDate = ref(new Date().toISOString().split('T')[0]);

function formatCurrency(value) {
  return formatMoney(value);
}

async function fetchData() {
  loading.value = true;
  error.value = '';
  try {
    const res = await api.get('/reports/daily-reconciliation', { params: { date: selectedDate.value } });
    data.value = res.data.data || res.data;
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load reconciliation data.';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>
