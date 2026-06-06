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
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('debt_summary') }}</h1>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('total_receivables') }}</p>
          <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{{ formatCurrency(totalReceivables) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('total_payables') }}</p>
          <p class="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{{ formatCurrency(totalPayables) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('net_position') }}</p>
          <p class="text-2xl font-bold mt-1" :class="netPosition >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
            {{ formatCurrency(netPosition) }}
          </p>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Customer Receivables -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('customer_receivables') }}</h2>
          <AppDataTable
            :columns="receivableColumns"
            :data="receivables"
            :loading="loading"
            :empty-message="t('no_data')"
          >
            <template #cell-customer_name="{ item }">
              <span class="font-medium text-gray-900 dark:text-white">{{ item.customer_name || item.name || '-' }}</span>
            </template>
            <template #cell-total_owed="{ item }">
              <span class="text-green-600 dark:text-green-400 font-semibold">{{ formatCurrency(item.total_owed || item.remaining || 0) }}</span>
            </template>
            <template #cell-invoices_count="{ item }">
              {{ item.invoices_count || item.invoice_count || '-' }}
            </template>
          </AppDataTable>
        </div>

        <!-- Supplier Payables -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('supplier_payables') }}</h2>
          <AppDataTable
            :columns="payableColumns"
            :data="payables"
            :loading="loading"
            :empty-message="t('no_data')"
          >
            <template #cell-supplier_name="{ item }">
              <span class="font-medium text-gray-900 dark:text-white">{{ item.supplier_name || item.name || '-' }}</span>
            </template>
            <template #cell-total_owed="{ item }">
              <span class="text-red-600 dark:text-red-400 font-semibold">{{ formatCurrency(item.total_owed || item.remaining || 0) }}</span>
            </template>
            <template #cell-invoices_count="{ item }">
              {{ item.invoices_count || item.invoice_count || '-' }}
            </template>
          </AppDataTable>
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
import AppDataTable from '../../components/base/AppDataTable.vue';

const loading = ref(true);
const error = ref('');
const receivables = ref([]);
const payables = ref([]);

const receivableColumns = [
  { key: 'customer_name', label: t('customer'), sortable: true },
  { key: 'phone', label: t('phone') },
  { key: 'invoices_count', label: t('invoices'), sortable: true },
  { key: 'total_owed', label: t('amount_owed'), sortable: true },
];

const payableColumns = [
  { key: 'supplier_name', label: t('supplier'), sortable: true },
  { key: 'phone', label: t('phone') },
  { key: 'invoices_count', label: t('invoices'), sortable: true },
  { key: 'total_owed', label: t('amount_owed'), sortable: true },
];

const totalReceivables = computed(() =>
  receivables.value.reduce((sum, r) => sum + (parseFloat(r.total_owed || r.remaining) || 0), 0)
);

const totalPayables = computed(() =>
  payables.value.reduce((sum, p) => sum + (parseFloat(p.total_owed || p.remaining) || 0), 0)
);

const netPosition = computed(() => totalReceivables.value - totalPayables.value);

function formatCurrency(value) {
  return formatMoney(value);
}

async function fetchData() {
  loading.value = true;
  error.value = '';
  try {
    const res = await api.get('/reports/debt-summary');
    const data = res.data.data || res.data;
    receivables.value = data.receivables || data.customers || [];
    payables.value = data.payables || data.suppliers || [];
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

        if (inv.type === 'sale' && inv.customer) {
          const key = inv.customer.uuid || inv.customer_uuid;
          if (!custMap[key]) {
            custMap[key] = {
              customer_name: inv.customer.name || inv.customer.name_en || '-',
              phone: inv.customer.phone || '',
              invoices_count: 0,
              total_owed: 0,
            };
          }
          custMap[key].invoices_count++;
          custMap[key].total_owed += remaining;
        } else if (inv.type === 'purchase' && inv.supplier) {
          const key = inv.supplier.uuid || inv.supplier_uuid;
          if (!suppMap[key]) {
            suppMap[key] = {
              supplier_name: inv.supplier.name || inv.supplier.name_en || '-',
              phone: inv.supplier.phone || '',
              invoices_count: 0,
              total_owed: 0,
            };
          }
          suppMap[key].invoices_count++;
          suppMap[key].total_owed += remaining;
        }
      });

      receivables.value = Object.values(custMap).sort((a, b) => b.total_owed - a.total_owed);
      payables.value = Object.values(suppMap).sort((a, b) => b.total_owed - a.total_owed);
    } catch (fallbackErr) {
      error.value = err.response?.data?.message || 'Failed to load debt summary.';
    }
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>
