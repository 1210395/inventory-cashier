<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('cheques') }}</h1>
        <AppButton variant="primary" @click="openModal()">
          + {{ t('add') }} {{ t('cheque') }}
        </AppButton>
      </div>

      <!-- Tabs: Incoming / Outgoing -->
      <div class="flex border-b border-gray-200 dark:border-gray-700 mb-4">
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

      <!-- Status Filter -->
      <div class="flex items-center gap-2 mb-4 flex-wrap">
        <button
          v-for="sf in statusFilters"
          :key="sf.value"
          class="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
          :class="statusFilter === sf.value
            ? 'bg-[#D4A843] text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
          @click="statusFilter = sf.value"
        >
          {{ sf.label }}
        </button>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Success -->
      <div v-if="success" class="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-700 dark:text-green-400">
        {{ success }}
      </div>

      <!-- Data Table -->
      <AppDataTable
        :columns="columns"
        :data="filteredCheques"
        :loading="loading"
        :empty-message="t('no_data')"
      >
        <template #empty>
          <div class="text-center py-16">
            <div class="text-6xl mb-4">&#x1F4DD;</div>
            <h3 class="text-lg font-medium text-gray-500 dark:text-gray-400">{{ t('no_cheques_yet') || 'No cheques yet' }}</h3>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">{{ t('add_first_cheque') || 'Add your first cheque to get started' }}</p>
            <AppButton variant="primary" class="mt-4" @click="openModal()">+ {{ t('add') }} {{ t('cheque') }}</AppButton>
          </div>
        </template>
        <template #cell-amount="{ item }">
          <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(item.amount) }}</span>
        </template>
        <template #cell-status="{ item }">
          <AppBadge :variant="statusBadgeVariant(item.status)" :text="item.status" />
        </template>
        <template #cell-party="{ item }">
          <button
            v-if="item.customer?.uuid"
            class="text-[#D4A843] hover:underline font-medium text-left"
            @click.stop="$router.push('/customers/' + item.customer.uuid + '/statement')"
          >
            {{ item.customer?.name || '-' }}
          </button>
          <button
            v-else-if="item.supplier?.uuid"
            class="text-[#D4A843] hover:underline font-medium text-left"
            @click.stop="$router.push('/suppliers/' + item.supplier.uuid + '/statement')"
          >
            {{ item.supplier?.name || '-' }}
          </button>
          <span v-else>-</span>
        </template>
        <template #cell-invoice="{ item }">
          <button
            v-if="item.invoice_uuid"
            class="text-[#D4A843] hover:underline font-medium text-left"
            @click.stop="$router.push('/invoices/' + item.invoice_uuid)"
          >
            {{ item.invoice?.invoice_number || item.invoice_uuid.slice(0, 8) + '...' }}
          </button>
          <span v-else>-</span>
        </template>
        <template #cell-actions="{ item }">
          <div class="flex items-center gap-2">
            <select
              class="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#D4A843]"
              :value="item.status"
              @change="updateStatus(item, $event.target.value)"
            >
              <option value="pending">Pending</option>
              <option value="deposited">Deposited</option>
              <option value="cleared">Cleared</option>
              <option value="bounced">Bounced</option>
            </select>
            <AppButton size="sm" variant="ghost" @click="openModal(item)">{{ t('edit') }}</AppButton>
            <AppButton size="sm" variant="danger" @click="confirmDelete(item)">{{ t('delete') }}</AppButton>
          </div>
        </template>
      </AppDataTable>

      <!-- Add/Edit Modal -->
      <AppModal :show="showFormModal" :title="editingItem ? t('edit') + ' ' + t('cheque') : t('add') + ' ' + t('cheque')" size="lg" @close="showFormModal = false">
        <div class="grid grid-cols-2 gap-4">
          <AppInput v-model="form.cheque_number" :label="t('cheque_number')" :placeholder="t('cheque_number')" :error="formErrors.cheque_number" required />
          <AppInput v-model="form.bank_name" :label="t('bank_name')" :placeholder="t('bank_name')" :error="formErrors.bank_name" required />
          <AppInput v-model="form.amount" :label="t('amount')" type="number" :placeholder="t('amount')" :error="formErrors.amount" required />
          <AppSelect v-model="form.type" :label="t('type')" :options="typeOptions" :error="formErrors.type" required />
          <AppInput v-model="form.issue_date" :label="t('issue_date')" type="date" :error="formErrors.issue_date" required />
          <AppInput v-model="form.due_date" :label="t('due_date')" type="date" :error="formErrors.due_date" required />
          <AppSelect v-model="form.customer_uuid" :label="t('customer')" :options="customerOptions" :placeholder="t('select') + ' ' + t('customer')" />
          <AppSelect v-model="form.supplier_uuid" :label="t('supplier')" :options="supplierOptions" :placeholder="t('select') + ' ' + t('supplier')" />
          <AppSelect v-model="form.status" :label="t('status')" :options="statusOptions" :error="formErrors.status" required />
          <AppInput v-model="form.invoice_uuid" :label="t('invoice') + ' UUID'" :placeholder="t('invoice') + ' UUID (' + t('optional') + ')'" />
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('notes') }}</label>
            <textarea
              v-model="form.notes"
              rows="3"
              :placeholder="t('notes')"
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
            ></textarea>
          </div>
        </div>
        <template #footer>
          <AppButton variant="secondary" @click="showFormModal = false">{{ t('cancel') }}</AppButton>
          <AppButton variant="primary" :loading="submitting" @click="submitForm">{{ t('save') }}</AppButton>
        </template>
      </AppModal>

      <!-- Delete confirmation -->
      <AppModal :show="showDeleteModal" :title="t('confirm_delete')" size="sm" @close="showDeleteModal = false">
        <p class="text-gray-700 dark:text-gray-300">{{ t('confirm_delete') }}</p>
        <template #footer>
          <AppButton variant="secondary" @click="showDeleteModal = false">{{ t('cancel') }}</AppButton>
          <AppButton variant="danger" :loading="deleting" @click="deleteItem">{{ t('yes') }}</AppButton>
        </template>
      </AppModal>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { formatMoney } from '../../composables/currency.js';
import api from '../../composables/useApi.js';
import { t } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppInput from '../../components/base/AppInput.vue';
import AppSelect from '../../components/base/AppSelect.vue';
import AppDataTable from '../../components/base/AppDataTable.vue';
import AppModal from '../../components/base/AppModal.vue';
import AppBadge from '../../components/base/AppBadge.vue';

const cheques = ref([]);
const customers = ref([]);
const suppliers = ref([]);
const loading = ref(true);
const error = ref('');
const success = ref('');

const activeTab = ref('received');
const statusFilter = ref('all');

const showFormModal = ref(false);
const editingItem = ref(null);
const submitting = ref(false);
const formErrors = ref({});

const showDeleteModal = ref(false);
const deleteTarget = ref(null);
const deleting = ref(false);

const form = ref(emptyForm());

function emptyForm() {
  return {
    cheque_number: '',
    bank_name: '',
    amount: '',
    type: 'received',
    issue_date: '',
    due_date: '',
    customer_uuid: '',
    supplier_uuid: '',
    invoice_uuid: '',
    status: 'pending',
    notes: '',
  };
}

const tabs = [
  { value: 'received', label: t('incoming') || 'Incoming (Received)' },
  { value: 'issued', label: t('outgoing') || 'Outgoing (Issued)' },
];

const statusFilters = [
  { value: 'all', label: t('all') || 'All' },
  { value: 'pending', label: t('pending') || 'Pending' },
  { value: 'deposited', label: t('deposited') || 'Deposited' },
  { value: 'cleared', label: t('cleared') || 'Cleared' },
  { value: 'bounced', label: t('bounced') || 'Bounced' },
];

const typeOptions = [
  { value: 'received', label: t('incoming') || 'Received' },
  { value: 'issued', label: t('outgoing') || 'Issued' },
];

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'deposited', label: 'Deposited' },
  { value: 'cleared', label: 'Cleared' },
  { value: 'bounced', label: 'Bounced' },
];

const columns = [
  { key: 'cheque_number', label: t('cheque_number') || 'Cheque #', sortable: true },
  { key: 'bank_name', label: t('bank_name') || 'Bank', sortable: true },
  { key: 'amount', label: t('amount') || 'Amount', sortable: true },
  { key: 'issue_date', label: t('issue_date') || 'Issue Date', sortable: true },
  { key: 'due_date', label: t('due_date') || 'Due Date', sortable: true },
  { key: 'status', label: t('status') || 'Status' },
  { key: 'party', label: t('customer') + '/' + t('supplier') },
  { key: 'invoice', label: t('invoice') || 'Invoice' },
  { key: 'actions', label: t('actions') || 'Actions', class: 'text-right' },
];

const customerOptions = computed(() =>
  customers.value.map((c) => ({ value: c.uuid, label: c.name }))
);
const supplierOptions = computed(() =>
  suppliers.value.map((s) => ({ value: s.uuid, label: s.name }))
);

const filteredCheques = computed(() => {
  let list = cheques.value.filter((c) => c.type === activeTab.value);
  if (statusFilter.value !== 'all') {
    list = list.filter((c) => c.status === statusFilter.value);
  }
  return list;
});

function statusBadgeVariant(status) {
  const map = { pending: 'warning', deposited: 'info', cleared: 'success', bounced: 'danger' };
  return map[status] || 'neutral';
}

function formatCurrency(value) {
  return formatMoney(value);
}

function openModal(item = null) {
  editingItem.value = item;
  formErrors.value = {};
  if (item) {
    form.value = {
      cheque_number: item.cheque_number || '',
      bank_name: item.bank_name || '',
      amount: item.amount || '',
      type: item.type || 'received',
      issue_date: item.issue_date || '',
      due_date: item.due_date || '',
      customer_uuid: item.customer_uuid || '',
      supplier_uuid: item.supplier_uuid || '',
      invoice_uuid: item.invoice_uuid || '',
      status: item.status || 'pending',
      notes: item.notes || '',
    };
  } else {
    form.value = emptyForm();
    form.value.type = activeTab.value;
  }
  showFormModal.value = true;
}

function confirmDelete(item) {
  deleteTarget.value = item;
  showDeleteModal.value = true;
}

async function updateStatus(item, newStatus) {
  error.value = '';
  success.value = '';
  try {
    await api.patch('/cheques/' + item.uuid + '/status', { status: newStatus });
    item.status = newStatus;
    success.value = t('status_updated') || 'Status updated successfully.';
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to update status.';
  }
}

async function submitForm() {
  const e = {};
  if (!form.value.cheque_number) e.cheque_number = t('required') || 'Required';
  if (!form.value.bank_name) e.bank_name = t('required') || 'Required';
  if (!form.value.amount) e.amount = t('required') || 'Required';
  if (!form.value.issue_date) e.issue_date = t('required') || 'Required';
  if (!form.value.due_date) e.due_date = t('required') || 'Required';
  formErrors.value = e;
  if (Object.keys(e).length > 0) return;

  submitting.value = true;
  error.value = '';
  try {
    if (editingItem.value) {
      await api.put('/cheques/' + editingItem.value.uuid, form.value);
    } else {
      await api.post('/cheques', form.value);
    }
    showFormModal.value = false;
    success.value = t('saved') || 'Saved successfully.';
    setTimeout(() => { success.value = ''; }, 3000);
    await fetchCheques();
  } catch (err) {
    if (err.response?.status === 422 && err.response.data?.errors) {
      const mapped = {};
      for (const key in err.response.data.errors) {
        mapped[key] = err.response.data.errors[key][0];
      }
      formErrors.value = mapped;
    } else {
      error.value = err.response?.data?.message || 'Failed to save cheque.';
      showFormModal.value = false;
    }
  } finally {
    submitting.value = false;
  }
}

async function deleteItem() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await api.delete('/cheques/' + deleteTarget.value.uuid);
    cheques.value = cheques.value.filter((c) => c.uuid !== deleteTarget.value.uuid);
    showDeleteModal.value = false;
    success.value = t('deleted') || 'Deleted successfully.';
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to delete cheque.';
    showDeleteModal.value = false;
  } finally {
    deleting.value = false;
  }
}

async function fetchCheques() {
  loading.value = true;
  try {
    const res = await api.get('/cheques');
    cheques.value = res.data.data || res.data;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load cheques.';
  } finally {
    loading.value = false;
  }
}

async function fetchDropdowns() {
  try {
    const [custRes, suppRes] = await Promise.all([
      api.get('/customers'),
      api.get('/suppliers'),
    ]);
    customers.value = custRes.data.data || custRes.data;
    suppliers.value = suppRes.data.data || suppRes.data;
  } catch {
    // Silently fail for dropdowns
  }
}

onMounted(() => {
  fetchCheques();
  fetchDropdowns();
});
</script>
