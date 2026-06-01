<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('invoices') }}</h1>
        <div class="flex items-center gap-3">
          <AppButton variant="primary" @click="$router.push('/invoices/new?type=sale')">
            + {{ t('new_sale_invoice') }}
          </AppButton>
          <AppButton variant="secondary" @click="$router.push('/invoices/new?type=purchase')">
            + {{ t('new_purchase_invoice') }}
          </AppButton>
        </div>
      </div>

      <!-- Tabs: All / Sales / Purchases -->
      <div class="flex items-center gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          v-for="tab in typeTabs"
          :key="tab.value"
          class="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
          :class="activeTypeTab === tab.value
            ? 'border-[#D4A843] text-[#D4A843]'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
          @click="activeTypeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Filters Row -->
      <div class="flex items-center gap-4 mb-4 flex-wrap">
        <input
          v-model="search"
          type="text"
          :placeholder="t('search_invoice_number')"
          class="w-full max-w-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
        />
        <AppSelect
          v-model="statusFilter"
          :options="statusOptions"
          :placeholder="t('status')"
          class="w-48"
        />
        <AppSelect
          v-model="customerFilter"
          :options="customerFilterOptions"
          :placeholder="t('customer')"
          class="w-48"
        />
      </div>

      <!-- Error message -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Success message -->
      <div v-if="successMsg" class="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
        {{ successMsg }}
      </div>

      <!-- Data Table -->
      <AppDataTable
        :columns="columns"
        :data="filteredInvoices"
        :loading="loading"
        :empty-message="t('no_data')"
      >
        <template #empty>
          <div class="text-center py-16">
            <div class="text-6xl mb-4">&#x1F9FE;</div>
            <h3 class="text-lg font-medium text-gray-500 dark:text-gray-400">{{ t('no_invoices_yet') || 'No invoices yet' }}</h3>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">{{ t('create_first_invoice') || 'Create your first invoice to get started' }}</p>
            <div class="flex items-center justify-center gap-3 mt-4">
              <AppButton variant="primary" @click="$router.push('/invoices/new?type=sale')">+ {{ t('new_sale_invoice') }}</AppButton>
            </div>
          </div>
        </template>
        <template #cell-invoice_number="{ item }">
          <button
            class="text-[#D4A843] hover:underline font-medium text-left"
            @click="$router.push('/invoices/' + item.uuid)"
          >
            {{ item.invoice_number }}
          </button>
        </template>

        <template #cell-type="{ item }">
          <AppBadge
            :variant="item.type === 'sale' ? 'info' : 'neutral'"
            :text="t(item.type)"
          />
        </template>

        <template #cell-party="{ item }">
          <button
            v-if="item.type === 'sale' && item.customer?.uuid"
            class="text-[#D4A843] hover:underline font-medium text-left"
            @click.stop="$router.push('/customers/' + item.customer.uuid + '/statement')"
          >
            {{ item.customer?.name || item.customer?.name_en || '-' }}
          </button>
          <button
            v-else-if="item.type === 'purchase' && item.supplier?.uuid"
            class="text-[#D4A843] hover:underline font-medium text-left"
            @click.stop="$router.push('/suppliers/' + item.supplier.uuid + '/statement')"
          >
            {{ item.supplier?.name || item.supplier?.name_en || '-' }}
          </button>
          <span v-else>{{ item.type === 'sale' ? (item.customer?.name || item.customer?.name_en || '-') : (item.supplier?.name || item.supplier?.name_en || '-') }}</span>
        </template>

        <template #cell-total="{ item }">
          {{ formatCurrency(item.total) }}
        </template>

        <template #cell-paid_amount="{ item }">
          {{ formatCurrency(item.paid_amount) }}
        </template>

        <template #cell-remaining="{ item }">
          <span :class="(parseFloat(item.total) - parseFloat(item.paid_amount)) > 0 ? 'text-red-500 dark:text-red-400 font-medium' : ''">
            {{ formatCurrency(parseFloat(item.total) - parseFloat(item.paid_amount)) }}
          </span>
        </template>

        <template #cell-status="{ item }">
          <AppBadge
            :variant="statusVariant(item.status)"
            :text="t(item.status)"
          />
        </template>

        <template #cell-date="{ item }">
          {{ formatDate(item.created_at) }}
        </template>

        <template #cell-actions="{ item }">
          <div class="flex items-center gap-2">
            <AppButton size="sm" variant="ghost" @click.stop="$router.push('/invoices/' + item.uuid)">
              {{ t('view') }}
            </AppButton>
            <AppButton size="sm" variant="danger" @click.stop="confirmDelete(item)">
              {{ t('delete') }}
            </AppButton>
          </div>
        </template>
      </AppDataTable>

      <!-- Delete confirmation modal -->
      <AppModal :show="showDeleteModal" :title="t('confirm_delete')" size="sm" @close="showDeleteModal = false">
        <p class="text-gray-700 dark:text-gray-300">{{ t('confirm_delete') }}</p>
        <template #footer>
          <AppButton variant="secondary" @click="showDeleteModal = false">{{ t('cancel') }}</AppButton>
          <AppButton variant="danger" :loading="deleting" @click="deleteInvoice">{{ t('yes') }}</AppButton>
        </template>
      </AppModal>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../../composables/useApi.js';
import { t } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppBadge from '../../components/base/AppBadge.vue';
import AppDataTable from '../../components/base/AppDataTable.vue';
import AppModal from '../../components/base/AppModal.vue';
import AppSelect from '../../components/base/AppSelect.vue';

const router = useRouter();
const route = useRoute();

const invoices = ref([]);
const customers = ref([]);
const loading = ref(true);
const error = ref('');
const search = ref('');
const activeTypeTab = ref('all');
const statusFilter = ref('');
const customerFilter = ref('');
const successMsg = ref('');
const showDeleteModal = ref(false);
const deleteTarget = ref(null);
const deleting = ref(false);

function showSuccess(msg) {
  successMsg.value = msg;
  setTimeout(() => successMsg.value = '', 3000);
}

const typeTabs = [
  { value: 'all', label: t('all') },
  { value: 'sale', label: t('sales') },
  { value: 'purchase', label: t('purchases') },
];

const statusOptions = [
  { value: '', label: t('all') },
  { value: 'unpaid', label: t('unpaid') },
  { value: 'partial', label: t('partial') },
  { value: 'paid', label: t('paid') },
];

const columns = [
  { key: 'invoice_number', label: t('invoice_number'), sortable: true },
  { key: 'type', label: t('type') },
  { key: 'party', label: t('customer') + ' / ' + t('supplier') },
  { key: 'total', label: t('total'), sortable: true },
  { key: 'paid_amount', label: t('paid'), sortable: true },
  { key: 'remaining', label: t('remaining') },
  { key: 'status', label: t('status') },
  { key: 'date', label: t('date') },
  { key: 'actions', label: t('actions'), class: 'text-right' },
];

const customerFilterOptions = computed(() => {
  const opts = [{ value: '', label: t('all') }];
  for (const c of customers.value) {
    opts.push({ value: c.uuid, label: c.name || c.name_en || c.phone || '-' });
  }
  return opts;
});

const filteredInvoices = computed(() => {
  let result = invoices.value;
  if (activeTypeTab.value !== 'all') {
    result = result.filter((inv) => inv.type === activeTypeTab.value);
  }
  if (statusFilter.value) {
    result = result.filter((inv) => inv.status === statusFilter.value);
  }
  if (customerFilter.value) {
    result = result.filter((inv) => inv.customer_uuid === customerFilter.value || inv.customer?.uuid === customerFilter.value);
  }
  if (search.value) {
    const q = search.value.toLowerCase();
    result = result.filter((inv) =>
      (inv.invoice_number || '').toLowerCase().includes(q)
    );
  }
  return result;
});

function statusVariant(status) {
  const map = { paid: 'success', partial: 'warning', unpaid: 'danger' };
  return map[status] || 'neutral';
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2,
  }).format(parseFloat(value) || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function confirmDelete(item) {
  deleteTarget.value = item;
  showDeleteModal.value = true;
}

async function deleteInvoice() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await api.delete('/invoices/' + deleteTarget.value.uuid);
    invoices.value = invoices.value.filter((inv) => inv.uuid !== deleteTarget.value.uuid);
    showDeleteModal.value = false;
    showSuccess(t('deleted') || 'Deleted successfully');
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to delete invoice.';
  } finally {
    deleting.value = false;
  }
}

async function fetchInvoices() {
  loading.value = true;
  error.value = '';
  try {
    const response = await api.get('/invoices');
    invoices.value = response.data.data || response.data;
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load invoices.';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  // Check for status query param
  if (route.query.status) {
    statusFilter.value = route.query.status;
  }
  // Fetch customers for filter dropdown
  try {
    const custRes = await api.get('/customers');
    customers.value = custRes.data.data || custRes.data;
  } catch (e) {
    // Silently fail
  }
  fetchInvoices();
});
</script>
