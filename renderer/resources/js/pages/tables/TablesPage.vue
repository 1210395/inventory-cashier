<template>
  <AppLayout>
    <div>
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('tables') || 'Restaurant Tables' }}</h1>
        <AppButton variant="primary" @click="openTableForm()">+ {{ t('add') }} {{ t('table') || 'Table' }}</AppButton>
      </div>

      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">{{ error }}</div>

      <div v-if="loading" class="text-gray-500 dark:text-gray-400">{{ t('loading') || 'Loading…' }}</div>
      <div v-else-if="tables.length === 0" class="text-gray-500 dark:text-gray-400">{{ t('no_data') || 'No tables yet.' }}</div>

      <!-- Floor grouped by section -->
      <div v-for="section in sections" :key="section" class="mb-8">
        <h2 class="text-base font-semibold uppercase tracking-wider text-gray-500 mb-3">{{ section || (t('general') || 'General') }}</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <button
            v-for="table in tablesBySection(section)"
            :key="table.uuid"
            class="rounded-2xl border-2 p-5 text-left transition-all hover:shadow-lg active:scale-[0.98] min-h-[130px] flex flex-col"
            :class="statusClass(table.status)"
            @click="openTableModal(table)"
          >
            <div class="flex items-start justify-between">
              <span class="font-bold text-xl text-gray-900 dark:text-white">{{ table.name }}</span>
              <AppBadge :variant="statusVariant(table.status)" :text="t(table.status) || table.status" />
            </div>
            <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              &#x1F465; {{ table.capacity || '-' }}
            </div>
            <div class="mt-auto pt-2">
              <span v-if="table.current_invoice" class="text-2xl font-extrabold text-[#D4A843]">
                {{ formatCurrency(table.current_invoice.total) }}
              </span>
              <span v-else class="text-sm font-medium text-green-600 dark:text-green-400">
                {{ t('available') || 'Available' }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- Table action modal -->
      <AppModal :show="showTableModal" :title="selectedTable ? selectedTable.name : ''" size="lg" @close="showTableModal = false">
        <div v-if="selectedTable" class="space-y-4">
          <div class="flex items-center gap-2">
            <AppBadge :variant="statusVariant(selectedTable.status)" :text="t(selectedTable.status) || selectedTable.status" />
            <span class="text-sm text-gray-500">{{ t('capacity') || 'Seats' }}: {{ selectedTable.capacity }}</span>
          </div>

          <!-- Occupied: show current tab -->
          <div v-if="selectedTable.status === 'occupied' && selectedTable.current_invoice">
            <div class="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
              <div v-for="it in selectedTable.current_invoice.items || []" :key="it.uuid" class="flex justify-between px-3 py-2 text-sm">
                <span>{{ it.product?.name || it.product_uuid }} &times; {{ it.quantity }}</span>
                <span>{{ formatCurrency(it.total) }}</span>
              </div>
              <div class="flex justify-between px-3 py-2 text-sm font-bold">
                <span>{{ t('total') || 'Total' }}</span>
                <span>{{ formatCurrency(selectedTable.current_invoice.total) }}</span>
              </div>
            </div>
          </div>

          <!-- Add-item row (open or occupied) -->
          <div class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 space-y-2">
            <div class="text-xs font-semibold text-gray-500 uppercase">{{ t('add_items') || 'Add Items' }}</div>
            <div v-for="(line, i) in itemLines" :key="i" class="grid grid-cols-12 gap-2 items-center">
              <div class="col-span-6">
                <AppSelect v-model="line.product_uuid" :options="productOptions" :placeholder="t('product')" @update:modelValue="onProductPick(line)" />
              </div>
              <input v-model.number="line.quantity" type="number" min="1" class="col-span-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm" :placeholder="t('quantity') || 'Qty'" />
              <input v-model.number="line.unit_price" type="number" min="0" step="0.01" class="col-span-3 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm" :placeholder="t('price') || 'Price'" />
              <button class="col-span-1 text-red-500 hover:text-red-700" @click="itemLines.splice(i, 1)">&times;</button>
            </div>
            <AppButton size="sm" variant="secondary" @click="addItemLine">+ {{ t('add') }}</AppButton>
          </div>

          <!-- Customer (when opening) -->
          <AppSelect
            v-if="selectedTable.status !== 'occupied'"
            v-model="openCustomerUuid"
            :label="t('customer') || 'Customer (optional)'"
            :options="customerOptions"
            :placeholder="t('select') + ' ' + t('customer')"
          />

          <!-- Transfer target (occupied) -->
          <AppSelect
            v-if="selectedTable.status === 'occupied'"
            v-model="transferTarget"
            :label="t('transfer_to') || 'Transfer to table'"
            :options="availableTableOptions"
            :placeholder="t('select') || 'Select…'"
          />

          <!-- Close payment (occupied) -->
          <AppInput
            v-if="selectedTable.status === 'occupied'"
            v-model="closePaid"
            :label="t('paid_amount') || 'Paid amount (optional)'"
            type="number"
          />
        </div>

        <template #footer>
          <AppButton variant="secondary" @click="showTableModal = false">{{ t('cancel') }}</AppButton>

          <template v-if="selectedTable && selectedTable.status !== 'occupied'">
            <AppButton variant="primary" :disabled="busy" @click="doOpen">{{ t('open_tab') || 'Open Tab' }}</AppButton>
          </template>
          <template v-else-if="selectedTable">
            <AppButton variant="secondary" :disabled="busy || !itemLines.length" @click="doAddItems">{{ t('add_items') || 'Add Items' }}</AppButton>
            <AppButton variant="secondary" :disabled="busy || !transferTarget" @click="doTransfer">{{ t('transfer') || 'Transfer' }}</AppButton>
            <AppButton variant="secondary" :disabled="busy" @click="doDetach">{{ t('detach') || 'Detach' }}</AppButton>
            <AppButton variant="primary" :disabled="busy" @click="doClose">{{ t('close_tab') || 'Close Tab' }}</AppButton>
          </template>
        </template>
      </AppModal>

      <!-- Table create/edit modal -->
      <AppModal :show="showFormModal" :title="(editing ? t('edit') : t('add')) + ' ' + (t('table') || 'Table')" @close="showFormModal = false">
        <div class="space-y-4">
          <AppInput v-model="tableForm.name" :label="t('name') || 'Name'" :error="formErrors.name" required />
          <AppInput v-model="tableForm.capacity" :label="t('capacity') || 'Capacity'" type="number" />
          <AppInput v-model="tableForm.section" :label="t('section') || 'Section'" />
          <AppInput v-model="tableForm.notes" :label="t('notes') || 'Notes'" />
        </div>
        <template #footer>
          <AppButton variant="secondary" @click="showFormModal = false">{{ t('cancel') }}</AppButton>
          <AppButton v-if="editing" variant="danger" :disabled="busy" @click="deleteTable">{{ t('delete') }}</AppButton>
          <AppButton variant="primary" :disabled="busy" @click="saveTable">{{ t('save') }}</AppButton>
        </template>
      </AppModal>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../../composables/useApi.js';
import { t } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppInput from '../../components/base/AppInput.vue';
import AppSelect from '../../components/base/AppSelect.vue';
import AppModal from '../../components/base/AppModal.vue';
import AppBadge from '../../components/base/AppBadge.vue';

const loading = ref(true);
const busy = ref(false);
const error = ref('');
const tables = ref([]);
const products = ref([]);
const customers = ref([]);

const showTableModal = ref(false);
const selectedTable = ref(null);
const itemLines = ref([]);
const openCustomerUuid = ref('');
const transferTarget = ref('');
const closePaid = ref('');

const showFormModal = ref(false);
const editing = ref(false);
const tableForm = ref({ uuid: null, name: '', capacity: 4, section: '', notes: '' });
const formErrors = ref({});

const productOptions = computed(() => products.value.map((p) => ({ value: p.uuid, label: p.name })));
const customerOptions = computed(() => customers.value.map((c) => ({ value: c.uuid, label: c.name })));
const availableTableOptions = computed(() =>
  tables.value
    .filter((tb) => tb.status !== 'occupied' && tb.uuid !== selectedTable.value?.uuid)
    .map((tb) => ({ value: tb.uuid, label: tb.name }))
);

const sections = computed(() => {
  const set = new Set(tables.value.map((tb) => tb.section || ''));
  return Array.from(set).sort();
});
function tablesBySection(section) {
  return tables.value.filter((tb) => (tb.section || '') === section);
}

function statusVariant(status) {
  return { available: 'success', occupied: 'danger', reserved: 'warning', cleaning: 'neutral' }[status] || 'neutral';
}
function statusClass(status) {
  return {
    available: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10',
    occupied: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10',
    reserved: 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10',
    cleaning: 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800',
  }[status] || 'border-gray-300 dark:border-gray-700';
}

function formatCurrency(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '-';
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function addItemLine() {
  itemLines.value.push({ product_uuid: '', quantity: 1, unit_price: 0 });
}
function onProductPick(line) {
  const p = products.value.find((x) => x.uuid === line.product_uuid);
  if (p && (!line.unit_price || line.unit_price === 0)) line.unit_price = Number(p.sell_price ?? p.price ?? 0);
}
function validItemLines() {
  return itemLines.value
    .filter((l) => l.product_uuid && l.quantity > 0)
    .map((l) => ({ product_uuid: l.product_uuid, quantity: Number(l.quantity), unit_price: Number(l.unit_price) }));
}

function openTableModal(table) {
  selectedTable.value = table;
  itemLines.value = [];
  openCustomerUuid.value = '';
  transferTarget.value = '';
  closePaid.value = '';
  showTableModal.value = true;
}

async function doOpen() {
  busy.value = true;
  try {
    await api.post(`/tables/${selectedTable.value.uuid}/open`, {
      customer_uuid: openCustomerUuid.value || null,
      items: validItemLines(),
    });
    showTableModal.value = false;
    await fetchTables();
  } catch (err) { error.value = err.response?.data?.message || 'Failed to open tab.'; }
  finally { busy.value = false; }
}

async function doAddItems() {
  const items = validItemLines();
  if (!items.length) return;
  busy.value = true;
  try {
    await api.post(`/tables/${selectedTable.value.uuid}/items`, { items });
    showTableModal.value = false;
    await fetchTables();
  } catch (err) { error.value = err.response?.data?.message || 'Failed to add items.'; }
  finally { busy.value = false; }
}

async function doClose() {
  busy.value = true;
  try {
    const body = {};
    if (closePaid.value !== '') body.paid_amount = Number(closePaid.value);
    await api.post(`/tables/${selectedTable.value.uuid}/close`, body);
    showTableModal.value = false;
    await fetchTables();
  } catch (err) { error.value = err.response?.data?.message || 'Failed to close tab.'; }
  finally { busy.value = false; }
}

async function doTransfer() {
  if (!transferTarget.value) return;
  busy.value = true;
  try {
    await api.post(`/tables/${selectedTable.value.uuid}/transfer`, { target_table_uuid: transferTarget.value });
    showTableModal.value = false;
    await fetchTables();
  } catch (err) { error.value = err.response?.data?.message || 'Failed to transfer.'; }
  finally { busy.value = false; }
}

async function doDetach() {
  busy.value = true;
  try {
    await api.post(`/tables/${selectedTable.value.uuid}/detach`);
    showTableModal.value = false;
    await fetchTables();
  } catch (err) { error.value = err.response?.data?.message || 'Failed to detach.'; }
  finally { busy.value = false; }
}

// --- Table CRUD ---
function openTableForm(table = null) {
  formErrors.value = {};
  if (table) {
    editing.value = true;
    tableForm.value = { uuid: table.uuid, name: table.name, capacity: table.capacity, section: table.section || '', notes: table.notes || '' };
  } else {
    editing.value = false;
    tableForm.value = { uuid: null, name: '', capacity: 4, section: '', notes: '' };
  }
  showFormModal.value = true;
}

async function saveTable() {
  if (!tableForm.value.name) { formErrors.value = { name: t('required') || 'Required' }; return; }
  busy.value = true;
  try {
    const payload = { name: tableForm.value.name, capacity: Number(tableForm.value.capacity) || 0, section: tableForm.value.section || null, notes: tableForm.value.notes || null };
    if (editing.value) await api.put(`/tables/${tableForm.value.uuid}`, payload);
    else await api.post('/tables', payload);
    showFormModal.value = false;
    await fetchTables();
  } catch (err) {
    if (err.response?.status === 422) {
      formErrors.value = Object.fromEntries(Object.entries(err.response.data.errors || {}).map(([k, v]) => [k, v[0]]));
    } else { error.value = err.response?.data?.message || 'Failed to save table.'; }
  } finally { busy.value = false; }
}

async function deleteTable() {
  if (!confirm(t('confirm_delete') || 'Delete this table?')) return;
  busy.value = true;
  try {
    await api.delete(`/tables/${tableForm.value.uuid}`);
    showFormModal.value = false;
    await fetchTables();
  } catch (err) { error.value = err.response?.data?.message || 'Failed to delete table.'; }
  finally { busy.value = false; }
}

async function fetchTables() {
  loading.value = true;
  error.value = '';
  try {
    const res = await api.get('/tables');
    tables.value = res.data.data || res.data;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load tables.';
    tables.value = [];
  } finally { loading.value = false; }
}

async function fetchDropdowns() {
  try {
    const [p, c] = await Promise.all([api.get('/products'), api.get('/customers')]);
    products.value = p.data.data || p.data;
    customers.value = c.data.data || c.data;
  } catch { /* ignore */ }
}

onMounted(() => { fetchTables(); fetchDropdowns(); });
</script>
