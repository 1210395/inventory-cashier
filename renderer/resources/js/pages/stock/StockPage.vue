<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('stock') }}</h1>
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

      <!-- Success/Error Messages -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>
      <div v-if="success" class="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-700 dark:text-green-400">
        {{ success }}
      </div>

      <!-- Stock Count Tab -->
      <div v-if="activeTab === 'count'" class="space-y-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('stock_count') }}</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ t('stock_count_desc') }}</p>
          <!-- Search -->
          <AppInput v-model="countSearch" :placeholder="t('search')" class="mb-4" />
          <!-- Products table for counting -->
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('product') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('sku') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('system_qty') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('counted_qty') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('difference') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in filteredCountProducts" :key="p.uuid" class="border-b border-gray-100 dark:border-gray-700/50">
                  <td class="px-3 py-2 text-gray-900 dark:text-white font-medium">{{ localizedName(p) || '-' }}</td>
                  <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{{ p.sku || '-' }}</td>
                  <td class="px-3 py-2 text-gray-700 dark:text-gray-300">{{ p.quantity ?? 0 }}</td>
                  <td class="px-3 py-2">
                    <input
                      v-model.number="countedQuantities[p.uuid]"
                      type="number"
                      min="0"
                      class="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A843]"
                    />
                  </td>
                  <td class="px-3 py-2">
                    <span v-if="countedQuantities[p.uuid] !== undefined && countedQuantities[p.uuid] !== ''"
                      :class="(countedQuantities[p.uuid] - (p.quantity ?? 0)) === 0
                        ? 'text-gray-400'
                        : (countedQuantities[p.uuid] - (p.quantity ?? 0)) > 0
                          ? 'text-green-600 dark:text-green-400 font-semibold'
                          : 'text-red-600 dark:text-red-400 font-semibold'"
                    >
                      {{ (countedQuantities[p.uuid] - (p.quantity ?? 0)) > 0 ? '+' : '' }}{{ countedQuantities[p.uuid] - (p.quantity ?? 0) }}
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="flex items-center gap-3 mt-4">
            <AppButton variant="primary" :loading="savingCount" @click="saveStockCount">
              {{ t('save') }}
            </AppButton>
            <span v-if="countSaved" class="text-sm text-green-600 dark:text-green-400">{{ t('saved') }}</span>
          </div>
        </div>
      </div>

      <!-- Desktop: Form left, History right -->
      <div v-if="activeTab !== 'count'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Form Section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {{ activeTab === 'in' ? (t('stock_in') || 'Stock In') : (t('stock_out') || 'Stock Out') }}
          </h2>
          <div class="space-y-4">
            <!-- Product Search -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ t('product') }} <span class="text-red-500 ml-0.5">*</span>
              </label>
              <input
                v-model="productSearch"
                type="text"
                :placeholder="t('search') + ' ' + t('product') + '...'"
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
                @focus="showProductDropdown = true"
              />
              <div
                v-if="showProductDropdown && filteredProducts.length > 0"
                class="absolute z-20 mt-1 w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
              >
                <button
                  v-for="p in filteredProducts"
                  :key="p.uuid"
                  class="w-full text-left px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  @click="selectProduct(p)"
                >
                  {{ localizedName(p) || p.name }} <span class="text-gray-400 text-xs">({{ t('stock') }}: {{ p.quantity ?? '-' }})</span>
                </button>
              </div>
              <p v-if="formErrors.product_uuid" class="mt-1 text-sm text-red-500">{{ formErrors.product_uuid }}</p>
              <p v-if="selectedProduct" class="mt-1 text-xs text-[#D4A843]">
                {{ t('selected') || 'Selected' }}: {{ localizedName(selectedProduct) || selectedProduct.name }}
              </p>
            </div>

            <AppInput
              v-model="form.quantity"
              :label="t('quantity')"
              type="number"
              :placeholder="t('quantity')"
              :error="formErrors.quantity"
              required
            />

            <AppInput
              v-model="form.reason"
              :label="t('reason') || 'Reason'"
              :placeholder="t('reason') || 'Reason for stock movement'"
              :error="formErrors.reason"
              required
            />

            <AppSelect
              v-if="activeTab === 'out'"
              v-model="form.customer_uuid"
              :label="t('customer') + ' (' + (t('optional') || 'Optional') + ')'"
              :options="customerOptions"
              :placeholder="t('select') + ' ' + t('customer')"
            />

            <AppButton
              variant="primary"
              :loading="submitting"
              class="w-full"
              @click="submitStock"
            >
              {{ activeTab === 'in' ? (t('stock_in') || 'Stock In') : (t('stock_out') || 'Stock Out') }}
            </AppButton>
          </div>
        </div>

        <!-- History Section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {{ t('history') || 'Movement History' }}
          </h2>
          <div v-if="!selectedProduct" class="text-center py-12 text-gray-400 dark:text-gray-500">
            {{ t('select_product_hint') || 'Select a product to view movement history' }}
          </div>
          <div v-else-if="historyLoading" class="text-center py-12 text-gray-400 dark:text-gray-500">
            {{ t('loading') || 'Loading...' }}
          </div>
          <div v-else>
            <AppDataTable
              :columns="historyColumns"
              :data="history"
              :loading="false"
              :empty-message="t('no_data') || 'No movements yet'"
            >
              <template #cell-type="{ item }">
                <AppBadge
                  :variant="item.type === 'in' ? 'success' : 'danger'"
                  :text="item.type === 'in' ? (t('stock_in') || 'In') : (t('stock_out') || 'Out')"
                />
              </template>
              <template #cell-created_at="{ item }">
                {{ formatDate(item.created_at) }}
              </template>
            </AppDataTable>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import api from '../../composables/useApi.js';
import { t, localizedName } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppInput from '../../components/base/AppInput.vue';
import AppSelect from '../../components/base/AppSelect.vue';
import AppDataTable from '../../components/base/AppDataTable.vue';
import AppBadge from '../../components/base/AppBadge.vue';

const activeTab = ref('in');
const products = ref([]);
const customers = ref([]);
const loading = ref(true);
const error = ref('');
const success = ref('');
const submitting = ref(false);
const formErrors = ref({});

const productSearch = ref('');
const showProductDropdown = ref(false);
const selectedProduct = ref(null);
const history = ref([]);
const historyLoading = ref(false);

const form = ref({
  quantity: '',
  reason: '',
  customer_uuid: '',
});

// Stock count
const countSearch = ref('');
const countedQuantities = ref({});
const savingCount = ref(false);
const countSaved = ref(false);

const filteredCountProducts = computed(() => {
  if (!countSearch.value) return products.value;
  const q = countSearch.value.toLowerCase();
  return products.value.filter((p) =>
    (p.name_en || p.name || '').toLowerCase().includes(q) ||
    (p.name_ar || '').toLowerCase().includes(q) ||
    (p.sku || '').toLowerCase().includes(q)
  );
});

async function saveStockCount() {
  savingCount.value = true;
  countSaved.value = false;
  try {
    const adjustments = [];
    for (const [uuid, counted] of Object.entries(countedQuantities.value)) {
      if (counted === undefined || counted === '') continue;
      const product = products.value.find((p) => p.uuid === uuid);
      if (!product) continue;
      const diff = Number(counted) - (product.quantity ?? 0);
      if (diff === 0) continue;
      adjustments.push({
        product_uuid: uuid,
        quantity: Math.abs(diff),
        type: diff > 0 ? 'in' : 'out',
        reason: t('stock_count') + ' adjustment',
      });
    }
    for (const adj of adjustments) {
      await api.post('/stock/' + adj.type, {
        product_uuid: adj.product_uuid,
        quantity: adj.quantity,
        reason: adj.reason,
      });
    }
    // Refresh product data
    const prodRes = await api.get('/products');
    products.value = prodRes.data.data || prodRes.data;
    countedQuantities.value = {};
    countSaved.value = true;
    setTimeout(() => { countSaved.value = false; }, 3000);
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to save stock count.';
  } finally {
    savingCount.value = false;
  }
}

const tabs = [
  { value: 'in', label: t('stock_in') || 'Stock In' },
  { value: 'out', label: t('stock_out') || 'Stock Out' },
  { value: 'count', label: t('stock_count') || 'Stock Count' },
];

const historyColumns = [
  { key: 'created_at', label: t('date') || 'Date', sortable: true },
  { key: 'type', label: t('type') || 'Type' },
  { key: 'quantity', label: t('quantity') || 'Quantity', sortable: true },
  { key: 'reason', label: t('reason') || 'Reason' },
  { key: 'user_name', label: t('user') || 'User' },
];

const customerOptions = computed(() =>
  customers.value.map((c) => ({ value: c.uuid, label: c.name }))
);

const filteredProducts = computed(() => {
  if (!productSearch.value) return products.value.slice(0, 20);
  const q = productSearch.value.toLowerCase();
  return products.value.filter((p) =>
    (p.name_en || p.name || '').toLowerCase().includes(q) ||
    (p.sku || '').toLowerCase().includes(q)
  ).slice(0, 20);
});

function selectProduct(product) {
  selectedProduct.value = product;
  productSearch.value = product.name_en || product.name;
  showProductDropdown.value = false;
  fetchHistory(product.uuid);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString();
}

async function fetchHistory(productUuid) {
  historyLoading.value = true;
  try {
    const res = await api.get('/stock/history/' + productUuid);
    history.value = res.data.data || res.data;
  } catch {
    history.value = [];
  } finally {
    historyLoading.value = false;
  }
}

async function submitStock() {
  const e = {};
  if (!selectedProduct.value) e.product_uuid = t('required') || 'Required';
  if (!form.value.quantity || Number(form.value.quantity) <= 0) e.quantity = t('required') || 'Must be greater than 0';
  if (!form.value.reason) e.reason = t('required') || 'Required';
  formErrors.value = e;
  if (Object.keys(e).length > 0) return;

  submitting.value = true;
  error.value = '';
  success.value = '';
  try {
    const payload = {
      product_uuid: selectedProduct.value.uuid,
      quantity: Number(form.value.quantity),
      reason: form.value.reason,
    };
    if (activeTab.value === 'out' && form.value.customer_uuid) {
      payload.customer_uuid = form.value.customer_uuid;
    }
    await api.post('/stock/' + activeTab.value, payload);
    success.value = (activeTab.value === 'in' ? (t('stock_in') || 'Stock in') : (t('stock_out') || 'Stock out')) + ' ' + (t('saved') || 'recorded successfully.');
    setTimeout(() => { success.value = ''; }, 3000);
    form.value = { quantity: '', reason: '', customer_uuid: '' };
    if (selectedProduct.value) {
      fetchHistory(selectedProduct.value.uuid);
    }
  } catch (err) {
    if (err.response?.status === 422 && err.response.data?.errors) {
      const mapped = {};
      for (const key in err.response.data.errors) {
        mapped[key] = err.response.data.errors[key][0];
      }
      formErrors.value = mapped;
    } else {
      error.value = err.response?.data?.message || 'Failed to record stock movement.';
    }
  } finally {
    submitting.value = false;
  }
}

async function fetchData() {
  loading.value = true;
  try {
    const [prodRes, custRes] = await Promise.all([
      api.get('/products'),
      api.get('/customers'),
    ]);
    products.value = prodRes.data.data || prodRes.data;
    customers.value = custRes.data.data || custRes.data;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load data.';
  } finally {
    loading.value = false;
  }
}

// Close product dropdown when clicking outside
function handleClickOutside(event) {
  if (!event.target.closest('[data-product-search]')) {
    showProductDropdown.value = false;
  }
}

onMounted(() => {
  fetchData();
  document.addEventListener('click', handleClickOutside);
});
</script>
