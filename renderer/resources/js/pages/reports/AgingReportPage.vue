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
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('aging_report') }}</h1>
        </div>
      </div>

      <!-- Tabs: Receivables / Payables -->
      <div class="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px"
          :class="activeTab === tab.value
            ? 'border-[#D4A843] text-[#D4A843]'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Aging Summary Buckets -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">{{ t('current') }}</p>
          <p class="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{{ formatCurrency(bucketTotals.current) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">1-30 {{ t('days') }}</p>
          <p class="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{{ formatCurrency(bucketTotals.days30) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">31-60 {{ t('days') }}</p>
          <p class="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">{{ formatCurrency(bucketTotals.days60) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">90+ {{ t('days') }}</p>
          <p class="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{{ formatCurrency(bucketTotals.days90) }}</p>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Aging Table -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <AppDataTable
          :columns="columns"
          :data="currentData"
          :loading="loading"
          :empty-message="t('no_data')"
        >
          <template #cell-party_name="{ item }">
            <span class="font-medium text-gray-900 dark:text-white">{{ item.party_name || item.name || '-' }}</span>
          </template>
          <template #cell-current="{ item }">
            <span v-if="item.current > 0" class="text-green-600 dark:text-green-400">{{ formatCurrency(item.current) }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>
          <template #cell-days_30="{ item }">
            <span v-if="item.days_30 > 0" class="text-yellow-600 dark:text-yellow-400">{{ formatCurrency(item.days_30) }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>
          <template #cell-days_60="{ item }">
            <span v-if="item.days_60 > 0" class="text-orange-600 dark:text-orange-400">{{ formatCurrency(item.days_60) }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>
          <template #cell-days_90="{ item }">
            <span v-if="item.days_90 > 0" class="text-red-600 dark:text-red-400 font-semibold">{{ formatCurrency(item.days_90) }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>
          <template #cell-total="{ item }">
            <span class="font-bold text-gray-900 dark:text-white">{{ formatCurrency(item.total) }}</span>
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
const activeTab = ref('receivables');
const receivablesData = ref([]);
const payablesData = ref([]);

const tabs = [
  { value: 'receivables', label: t('customer_receivables') },
  { value: 'payables', label: t('supplier_payables') },
];

const columns = [
  { key: 'party_name', label: activeTab.value === 'receivables' ? t('customer') : t('supplier'), sortable: true },
  { key: 'current', label: t('current'), sortable: true },
  { key: 'days_30', label: '1-30 ' + t('days'), sortable: true },
  { key: 'days_60', label: '31-60 ' + t('days'), sortable: true },
  { key: 'days_90', label: '90+ ' + t('days'), sortable: true },
  { key: 'total', label: t('total'), sortable: true },
];

const currentData = computed(() =>
  activeTab.value === 'receivables' ? receivablesData.value : payablesData.value
);

const bucketTotals = computed(() => {
  const data = currentData.value;
  return {
    current: data.reduce((s, r) => s + (r.current || 0), 0),
    days30: data.reduce((s, r) => s + (r.days_30 || 0), 0),
    days60: data.reduce((s, r) => s + (r.days_60 || 0), 0),
    days90: data.reduce((s, r) => s + (r.days_90 || 0), 0),
  };
});

function formatCurrency(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '\u20AA0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2,
  }).format(num);
}

function daysBetween(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

function bucketForDays(days) {
  if (days <= 0) return 'current';
  if (days <= 30) return 'days_30';
  if (days <= 60) return 'days_60';
  return 'days_90';
}

async function fetchData() {
  loading.value = true;
  error.value = '';
  try {
    const res = await api.get('/reports/aging');
    const data = res.data.data || res.data;
    receivablesData.value = data.receivables || [];
    payablesData.value = data.payables || [];
  } catch (err) {
    // Fallback: compute from invoices
    try {
      const invRes = await api.get('/invoices');
      const invoices = invRes.data.data || invRes.data;
      const custMap = {};
      const suppMap = {};

      invoices.forEach((inv) => {
        const remaining = (parseFloat(inv.total) || 0) - (parseFloat(inv.paid_amount) || 0);
        if (remaining <= 0) return;

        const age = daysBetween(inv.due_date || inv.created_at);
        const bucket = bucketForDays(age);

        if (inv.type === 'sale') {
          const name = inv.customer?.name || inv.customer?.name_en || 'Unknown';
          const key = inv.customer_uuid || name;
          if (!custMap[key]) {
            custMap[key] = { party_name: name, current: 0, days_30: 0, days_60: 0, days_90: 0, total: 0 };
          }
          custMap[key][bucket] += remaining;
          custMap[key].total += remaining;
        } else if (inv.type === 'purchase') {
          const name = inv.supplier?.name || inv.supplier?.name_en || 'Unknown';
          const key = inv.supplier_uuid || name;
          if (!suppMap[key]) {
            suppMap[key] = { party_name: name, current: 0, days_30: 0, days_60: 0, days_90: 0, total: 0 };
          }
          suppMap[key][bucket] += remaining;
          suppMap[key].total += remaining;
        }
      });

      receivablesData.value = Object.values(custMap).sort((a, b) => b.total - a.total);
      payablesData.value = Object.values(suppMap).sort((a, b) => b.total - a.total);
    } catch (fallbackErr) {
      error.value = err.response?.data?.message || 'Failed to load aging report.';
    }
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>
