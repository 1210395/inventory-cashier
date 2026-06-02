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
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('cash_shifts') || 'Cash Shifts' }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <AppButton v-if="!currentShift" variant="primary" @click="openShiftModal">
            {{ t('open_shift') || 'Open Shift' }}
          </AppButton>
          <AppButton v-else variant="danger" @click="openCloseModal">
            {{ t('close_shift') || 'Close Shift' }}
          </AppButton>
        </div>
      </div>

      <!-- Redirected from POS without an open shift -->
      <div v-if="$route.query.need_shift && !currentShift" class="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800 p-4 text-sm font-medium text-amber-800 dark:text-amber-300">
        {{ needShiftMsg }}
      </div>

      <!-- Current open shift card -->
      <div v-if="currentShift" class="mb-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-semibold text-green-700 dark:text-green-400">{{ t('open_shift') || 'Open Shift' }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ t('opened_at') || 'Opened' }}: {{ formatDateTime(currentShift.opened_at) }}
            </div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><div class="text-gray-500">{{ t('opening_amount') || 'Opening' }}</div><div class="font-semibold">{{ formatCurrency(currentShift.open_amount) }}</div></div>
            <div><div class="text-gray-500">{{ t('cash_sales') || 'Cash Sales' }}</div><div class="font-semibold">{{ formatCurrency(currentShift.cash_sales) }}</div></div>
            <div><div class="text-gray-500">{{ t('total_sales') || 'Total Sales' }}</div><div class="font-semibold">{{ formatCurrency(currentShift.total_sales) }}</div></div>
            <div><div class="text-gray-500">{{ t('expected') || 'Expected' }}</div><div class="font-semibold">{{ formatCurrency(expectedCash(currentShift)) }}</div></div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Data Table -->
      <AppDataTable
        :columns="columns"
        :data="shifts"
        :loading="loading"
        :empty-message="t('no_cash_shifts') || 'No cash shift records found.'"
      >
        <template #cell-opened_at="{ item }">
          {{ formatDateTime(item.opened_at) }}
        </template>
        <template #cell-closed_at="{ item }">
          <span v-if="item.closed_at">{{ formatDateTime(item.closed_at) }}</span>
          <AppBadge v-else variant="warning" text="Open" />
        </template>
        <template #cell-open_amount="{ item }">
          {{ formatCurrency(item.open_amount) }}
        </template>
        <template #cell-cash_sales="{ item }">
          {{ formatCurrency(item.cash_sales) }}
        </template>
        <template #cell-total_sales="{ item }">
          {{ formatCurrency(item.total_sales) }}
        </template>
        <template #cell-expected_cash="{ item }">
          {{ formatCurrency(item.expected_cash ?? expectedCash(item)) }}
        </template>
        <template #cell-close_amount="{ item }">
          {{ item.close_amount != null ? formatCurrency(item.close_amount) : '-' }}
        </template>
        <template #cell-difference="{ item }">
          <span
            v-if="item.difference != null"
            :class="Number(item.difference) === 0
              ? 'text-gray-500'
              : Number(item.difference) > 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'"
            class="font-semibold"
          >
            {{ formatCurrency(item.difference) }}
          </span>
          <span v-else>-</span>
        </template>
      </AppDataTable>

      <!-- Open Shift Modal -->
      <AppModal :show="showOpenModal" :title="t('open_shift') || 'Open Shift'" @close="showOpenModal = false">
        <div class="space-y-4">
          <AppInput
            v-model="openForm.open_amount"
            :label="t('opening_amount') || 'Opening Cash Amount'"
            type="number"
            :error="openErrors.open_amount"
            required
          />
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('notes') }}</label>
            <textarea v-model="openForm.notes" rows="2"
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A843]"></textarea>
          </div>
        </div>
        <template #footer>
          <AppButton variant="secondary" @click="showOpenModal = false">{{ t('cancel') }}</AppButton>
          <AppButton variant="primary" :disabled="saving" @click="submitOpen">{{ t('save') }}</AppButton>
        </template>
      </AppModal>

      <!-- Close Shift Modal -->
      <AppModal :show="showCloseModal" :title="t('close_shift') || 'Close Shift'" @close="showCloseModal = false">
        <div v-if="currentShift" class="space-y-4">
          <div class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-sm space-y-1">
            <div class="flex justify-between"><span class="text-gray-500">{{ t('opening_amount') || 'Opening' }}</span><span>{{ formatCurrency(currentShift.open_amount) }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">{{ t('cash_sales') || 'Cash Sales' }}</span><span>{{ formatCurrency(currentShift.cash_sales) }}</span></div>
            <div class="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-700 pt-1"><span>{{ t('expected') || 'Expected in drawer' }}</span><span>{{ formatCurrency(expectedCash(currentShift)) }}</span></div>
          </div>
          <AppInput
            v-model="closeForm.close_amount"
            :label="t('actual') || 'Counted Cash Amount'"
            type="number"
            :error="closeErrors.close_amount"
            required
          />
          <div v-if="closeForm.close_amount !== ''" class="text-sm">
            <span class="text-gray-500">{{ t('difference') || 'Difference' }}: </span>
            <span :class="closeDifference === 0 ? 'text-gray-600' : closeDifference > 0 ? 'text-green-600' : 'text-red-600'" class="font-semibold">
              {{ formatCurrency(closeDifference) }}
            </span>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('notes') }}</label>
            <textarea v-model="closeForm.notes" rows="2"
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A843]"></textarea>
          </div>
        </div>
        <template #footer>
          <AppButton variant="secondary" @click="showCloseModal = false">{{ t('cancel') }}</AppButton>
          <AppButton variant="danger" :disabled="saving" @click="submitClose">{{ t('close_shift') || 'Close Shift' }}</AppButton>
        </template>
      </AppModal>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../../composables/useApi.js';
import { t, locale } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppDataTable from '../../components/base/AppDataTable.vue';
import AppBadge from '../../components/base/AppBadge.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppInput from '../../components/base/AppInput.vue';
import AppModal from '../../components/base/AppModal.vue';

const loading = ref(true);
const saving = ref(false);
const error = ref('');
const shifts = ref([]);
const currentShift = ref(null);

const showOpenModal = ref(false);
const showCloseModal = ref(false);
const openForm = ref({ open_amount: '', notes: '' });
const closeForm = ref({ close_amount: '', notes: '' });
const openErrors = ref({});
const closeErrors = ref({});

const columns = [
  { key: 'opened_at', label: t('opened_at') || 'Opened At', sortable: true },
  { key: 'closed_at', label: t('closed_at') || 'Closed At', sortable: true },
  { key: 'open_amount', label: t('opening_amount') || 'Opening' },
  { key: 'cash_sales', label: t('cash_sales') || 'Cash Sales' },
  { key: 'total_sales', label: t('total_sales') || 'Total Sales' },
  { key: 'transaction_count', label: t('transactions') || 'Transactions', sortable: true },
  { key: 'expected_cash', label: t('expected') || 'Expected' },
  { key: 'close_amount', label: t('actual') || 'Counted' },
  { key: 'difference', label: t('difference') || 'Difference' },
];

function expectedCash(s) {
  return Number(s.open_amount || 0) + Number(s.cash_sales || 0) + Number(s.cash_in || 0) - Number(s.cash_out || 0);
}

const needShiftMsg = computed(() =>
  locale.value === 'ar'
    ? 'افتح وردية صندوق لبدء البيع على نقطة البيع.'
    : 'Open a cash shift to start selling on the POS.');

const closeDifference = computed(() => {
  if (!currentShift.value || closeForm.value.close_amount === '') return 0;
  return Number(closeForm.value.close_amount) - expectedCash(currentShift.value);
});

function formatCurrency(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '-';
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

function openShiftModal() {
  openErrors.value = {};
  openForm.value = { open_amount: '', notes: '' };
  showOpenModal.value = true;
}

function openCloseModal() {
  closeErrors.value = {};
  closeForm.value = { close_amount: '', notes: '' };
  showCloseModal.value = true;
}

async function submitOpen() {
  if (openForm.value.open_amount === '' || Number(openForm.value.open_amount) < 0) {
    openErrors.value = { open_amount: t('required') || 'Required' };
    return;
  }
  saving.value = true;
  try {
    await api.post('/cash-shifts', {
      open_amount: Number(openForm.value.open_amount),
      notes: openForm.value.notes || null,
    });
    showOpenModal.value = false;
    await refresh();
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to open shift.';
  } finally {
    saving.value = false;
  }
}

async function submitClose() {
  if (closeForm.value.close_amount === '' || Number(closeForm.value.close_amount) < 0) {
    closeErrors.value = { close_amount: t('required') || 'Required' };
    return;
  }
  saving.value = true;
  try {
    await api.post(`/cash-shifts/${currentShift.value.uuid}/close`, {
      close_amount: Number(closeForm.value.close_amount),
      notes: closeForm.value.notes || null,
    });
    showCloseModal.value = false;
    await refresh();
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to close shift.';
  } finally {
    saving.value = false;
  }
}

async function fetchCurrent() {
  try {
    const res = await api.get('/cash-shifts/current');
    currentShift.value = res.data.data || res.data;
  } catch (err) {
    if (err.response?.status === 404) currentShift.value = null;
  }
}

async function fetchShifts() {
  loading.value = true;
  error.value = '';
  try {
    const res = await api.get('/cash-shifts', { params: { per_page: 100 } });
    shifts.value = res.data.data || res.data;
  } catch (err) {
    if (err.response?.status !== 404) {
      error.value = err.response?.data?.message || 'Failed to load cash shift data.';
    }
    shifts.value = [];
  } finally {
    loading.value = false;
  }
}

async function refresh() {
  await Promise.all([fetchCurrent(), fetchShifts()]);
}

onMounted(refresh);
</script>
