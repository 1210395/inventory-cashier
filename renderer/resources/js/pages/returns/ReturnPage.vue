<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('returns') || 'Returns & Disposal' }}</h1>
        <AppButton variant="primary" @click="openModal()">
          + {{ t('add') }} {{ t('return') || 'Return' }}
        </AppButton>
      </div>

      <!-- Tabs -->
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

      <!-- Data Table -->
      <AppDataTable
        :columns="columns"
        :data="filteredReturns"
        :loading="loading"
        :empty-message="t('no_data') || 'No returns recorded'"
      >
        <template #cell-type="{ item }">
          <AppBadge
            :variant="item.type === 'customer_return' ? 'info' : item.type === 'supplier_return' ? 'warning' : 'danger'"
            :text="item.type === 'customer_return' ? 'Customer' : item.type === 'supplier_return' ? 'Supplier' : 'Disposal'"
          />
        </template>
        <template #cell-refund_amount="{ item }">
          {{ item.refund_amount ? formatCurrency(item.refund_amount) : '-' }}
        </template>
        <template #cell-status="{ item }">
          <AppBadge :variant="statusBadgeVariant(item.status)" :text="item.status" />
        </template>
        <template #cell-created_at="{ item }">
          {{ formatDate(item.created_at) }}
        </template>
        <template #cell-actions="{ item }">
          <div class="flex items-center gap-2">
            <select
              class="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#D4A843]"
              :value="item.status"
              @change="updateReturnStatus(item, ($event.target).value)"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
            <AppButton size="sm" variant="danger" @click="removeReturn(item)">{{ t('delete') }}</AppButton>
          </div>
        </template>
      </AppDataTable>

      <!-- Add Return Modal -->
      <AppModal :show="showFormModal" :title="t('add') + ' ' + (t('return') || 'Return')" size="lg" @close="showFormModal = false">
        <div class="grid grid-cols-2 gap-4">
          <AppSelect
            v-model="form.type"
            :label="t('type')"
            :options="typeOptions"
            :error="formErrors.type"
            required
          />
          <AppSelect
            v-model="form.product_uuid"
            :label="t('product')"
            :options="productOptions"
            :placeholder="t('select') + ' ' + t('product')"
            :error="formErrors.product_uuid"
            required
          />
          <AppInput
            v-model="form.quantity"
            :label="t('quantity')"
            type="number"
            :placeholder="t('quantity')"
            :error="formErrors.quantity"
            required
          />
          <AppSelect
            v-model="form.reason"
            :label="t('reason') || 'Reason'"
            :options="reasonOptions"
            :error="formErrors.reason"
            required
          />
          <AppInput
            v-model="form.reason_detail"
            :label="t('details') || 'Reason Detail'"
            :placeholder="t('details') || 'Additional details'"
          />
          <AppSelect
            v-if="form.type === 'customer_return'"
            v-model="form.customer_uuid"
            :label="t('customer')"
            :options="customerOptions"
            :placeholder="t('select') + ' ' + t('customer')"
          />
          <AppSelect
            v-if="form.type === 'supplier_return'"
            v-model="form.supplier_uuid"
            :label="t('supplier')"
            :options="supplierOptions"
            :placeholder="t('select') + ' ' + t('supplier')"
          />
          <AppInput
            v-model="form.refund_amount"
            :label="t('refund_amount') || 'Refund Amount'"
            type="number"
            :placeholder="t('amount')"
          />
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
          <AppButton variant="primary" @click="addReturn">{{ t('save') }}</AppButton>
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

const activeTab = ref('customer_return');
const returns = ref([]);
const products = ref([]);
const customers = ref([]);
const suppliers = ref([]);
const loading = ref(false);

const showFormModal = ref(false);
const formErrors = ref({});

const form = ref(emptyForm());

function emptyForm() {
  return {
    type: 'customer_return',
    product_uuid: '',
    quantity: '',
    reason: '',
    reason_detail: '',
    customer_uuid: '',
    supplier_uuid: '',
    refund_amount: '',
    notes: '',
  };
}

const tabs = [
  { value: 'customer_return', label: t('customer_returns') || 'Customer Returns' },
  { value: 'supplier_return', label: t('supplier_returns') || 'Supplier Returns' },
  { value: 'disposal', label: t('disposal') || 'Disposal' },
];

const typeOptions = [
  { value: 'customer_return', label: t('customer_returns') || 'Customer Return' },
  { value: 'supplier_return', label: t('supplier_returns') || 'Supplier Return' },
  { value: 'disposal', label: t('disposal') || 'Disposal' },
];

const reasonOptions = [
  { value: 'defective', label: 'Defective' },
  { value: 'expired', label: 'Expired' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'customer_changed_mind', label: t('customer_changed_mind') || 'Customer Changed Mind' },
  { value: 'overstock', label: t('overstock') || 'Overstock' },
  { value: 'other', label: 'Other' },
];

const columns = [
  { key: 'product_name', label: t('product') || 'Product', sortable: true },
  { key: 'type', label: t('type') || 'Type' },
  { key: 'quantity', label: t('quantity') || 'Qty', sortable: true },
  { key: 'reason', label: t('reason') || 'Reason' },
  { key: 'refund_amount', label: t('refund_amount') || 'Refund' },
  { key: 'status', label: t('status') || 'Status' },
  { key: 'created_at', label: t('date') || 'Date', sortable: true },
  { key: 'actions', label: t('actions') || 'Actions', class: 'text-right' },
];

const productOptions = computed(() =>
  products.value.map((p) => ({ value: p.uuid, label: p.name }))
);
const customerOptions = computed(() =>
  customers.value.map((c) => ({ value: c.uuid, label: c.name }))
);
const supplierOptions = computed(() =>
  suppliers.value.map((s) => ({ value: s.uuid, label: s.name }))
);

const filteredReturns = computed(() =>
  returns.value.filter((r) => r.type === activeTab.value)
);

function statusBadgeVariant(status) {
  const map = { pending: 'warning', approved: 'info', completed: 'success' };
  return map[status] || 'neutral';
}

function formatCurrency(value) {
  return formatMoney(value);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString();
}

function openModal() {
  formErrors.value = {};
  form.value = emptyForm();
  form.value.type = activeTab.value;
  showFormModal.value = true;
}

// Map an API ProductReturn resource to a flat row the table can render.
function decorate(r) {
  return { ...r, product_name: r.product?.name || r.product_uuid };
}

async function addReturn() {
  const e = {};
  if (!form.value.product_uuid) e.product_uuid = t('required') || 'Required';
  if (!form.value.quantity || Number(form.value.quantity) <= 0) e.quantity = t('required') || 'Required';
  if (!form.value.reason) e.reason = t('required') || 'Required';
  formErrors.value = e;
  if (Object.keys(e).length > 0) return;

  const payload = {
    type: form.value.type,
    product_uuid: form.value.product_uuid,
    quantity: Number(form.value.quantity),
    reason: form.value.reason,
    reason_detail: form.value.reason_detail || null,
    customer_uuid: form.value.type === 'customer_return' ? (form.value.customer_uuid || null) : null,
    supplier_uuid: form.value.type === 'supplier_return' ? (form.value.supplier_uuid || null) : null,
    refund_amount: form.value.refund_amount !== '' ? Number(form.value.refund_amount) : null,
    notes: form.value.notes || null,
  };

  try {
    const res = await api.post('/product-returns', payload);
    const created = res.data.data || res.data;
    returns.value.unshift(decorate(created));
    showFormModal.value = false;
  } catch (err) {
    if (err.response?.status === 422) {
      formErrors.value = Object.fromEntries(
        Object.entries(err.response.data.errors || {}).map(([k, v]) => [k, v[0]])
      );
    } else {
      alert(t('error') || 'Failed to save return');
    }
  }
}

async function updateReturnStatus(item, newStatus) {
  const prev = item.status;
  item.status = newStatus; // optimistic
  try {
    // Update endpoint re-validates the full record, so resend the required fields.
    await api.put(`/product-returns/${item.uuid}`, {
      type: item.type,
      product_uuid: item.product_uuid,
      quantity: item.quantity,
      reason: item.reason,
      reason_detail: item.reason_detail ?? null,
      customer_uuid: item.customer_uuid ?? null,
      supplier_uuid: item.supplier_uuid ?? null,
      refund_amount: item.refund_amount ?? null,
      status: newStatus,
      notes: item.notes ?? null,
    });
  } catch {
    item.status = prev; // revert on failure
    alert(t('error') || 'Failed to update status');
  }
}

async function removeReturn(item) {
  if (!confirm((t('confirm_delete') || 'Delete this return?'))) return;
  try {
    await api.delete(`/product-returns/${item.uuid}`);
    returns.value = returns.value.filter((r) => r.uuid !== item.uuid);
  } catch {
    alert(t('error') || 'Failed to delete return');
  }
}

async function fetchReturns() {
  loading.value = true;
  try {
    const res = await api.get('/product-returns', { params: { per_page: 1000 } });
    const rows = res.data.data || res.data;
    returns.value = rows.map(decorate);
  } catch {
    returns.value = [];
  } finally {
    loading.value = false;
  }
}

async function fetchDropdowns() {
  try {
    const [prodRes, custRes, suppRes] = await Promise.all([
      api.get('/products'),
      api.get('/customers'),
      api.get('/suppliers'),
    ]);
    products.value = prodRes.data.data || prodRes.data;
    customers.value = custRes.data.data || custRes.data;
    suppliers.value = suppRes.data.data || suppRes.data;
  } catch {
    // Silently fail
  }
}

onMounted(() => {
  fetchDropdowns();
  fetchReturns();
});
</script>
