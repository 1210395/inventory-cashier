<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('products') }}</h1>
        <div class="flex items-center gap-2">
          <AppButton :variant="selectMode ? 'primary' : 'secondary'" size="sm" @click="toggleSelectMode">
            {{ selectMode ? t('cancel') : t('select') }}
          </AppButton>
          <AppButton variant="primary" @click="$router.push('/products/new')">
            + {{ t('add') }} {{ t('products') }}
          </AppButton>
        </div>
      </div>

      <!-- Bulk action bar -->
      <div v-if="selectMode && selectedUuids.size > 0"
           class="bg-yellow-500 text-black px-4 py-3 rounded-lg flex items-center gap-4 mb-4">
        <span class="font-medium">{{ selectedUuids.size }} {{ t('selected') }}</span>
        <button class="text-sm underline" @click="toggleSelectAll">
          {{ selectedUuids.size === sortedProducts.length ? t('deselect_all') : t('select_all') }}
        </button>
        <div class="flex-1"></div>
        <AppButton size="sm" @click="bulkPrintLabels">{{ t('print_labels') }}</AppButton>
        <AppButton size="sm" @click="showBulkPriceModal = true">{{ t('update_price') }}</AppButton>
        <AppButton size="sm" variant="danger" @click="bulkDelete">{{ t('bulk_delete') }}</AppButton>
      </div>

      <!-- Category filter: POS-style drill-down (breadcrumb + tap to go deeper) -->
      <div class="mb-4">
        <CategoryFilter :categories="allCategories" v-model="selectedCategoryUuids" />
      </div>

      <!-- Search bar + Low Stock toggle + Sort -->
      <div class="mb-4 flex items-center gap-3 flex-wrap">
        <input
          v-model="search"
          type="text"
          :placeholder="t('search')"
          class="w-full max-w-md rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
        />
        <button
          class="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="lowStockFilter
            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-transparent'"
          @click="lowStockFilter = !lowStockFilter"
        >
          {{ t('low_stock') }}
        </button>
        <select
          v-model="sortOption"
          class="flex-shrink-0 px-3 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
        >
          <option value="">{{ t('sort_by') || 'Sort by' }}</option>
          <option value="name_asc">{{ t('name') }} A-Z</option>
          <option value="name_desc">{{ t('name') }} Z-A</option>
          <option value="price_asc">{{ t('sell_price') }} &#x2191;</option>
          <option value="price_desc">{{ t('sell_price') }} &#x2193;</option>
          <option value="qty_asc">{{ t('quantity') }} &#x2191;</option>
          <option value="qty_desc">{{ t('quantity') }} &#x2193;</option>
        </select>
      </div>

      <!-- Success message -->
      <div v-if="successMsg" class="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
        {{ successMsg }}
      </div>

      <!-- Error message -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Data Table -->
      <AppDataTable
        :columns="columns"
        :data="sortedProducts"
        :loading="loading"
        :empty-message="t('no_data')"
      >
        <template #empty>
          <div class="text-center py-16">
            <div class="text-6xl mb-4">&#x1F4E6;</div>
            <h3 class="text-lg font-medium text-gray-500 dark:text-gray-400">{{ t('no_products_yet') || 'No products yet' }}</h3>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">{{ t('add_first_product') || 'Add your first product to get started' }}</p>
            <AppButton variant="primary" class="mt-4" @click="$router.push('/products/new')">+ {{ t('add') }} {{ t('products') }}</AppButton>
          </div>
        </template>
        <template #cell-select="{ item }" v-if="selectMode">
          <input type="checkbox" :checked="selectedUuids.has(item.uuid)" @change="toggleSelect(item.uuid)" class="rounded border-gray-300 text-[#D4A843] focus:ring-[#D4A843]" />
        </template>
        <template #cell-name_en="{ item }">
          <div class="flex items-center gap-2">
            <div v-if="selectMode" class="flex-shrink-0">
              <input type="checkbox" :checked="selectedUuids.has(item.uuid)" @change="toggleSelect(item.uuid)" class="rounded border-gray-300 text-[#D4A843] focus:ring-[#D4A843]" />
            </div>
            <div v-if="item.image" class="w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700">
              <img :src="item.image" class="w-full h-full object-cover" />
            </div>
            <button
              class="text-[#D4A843] hover:underline font-medium text-left"
              @click="$router.push('/products/' + item.uuid)"
            >
              {{ localizedName(item) }}
            </button>
          </div>
        </template>

        <template #cell-category="{ item }">
          <div class="flex flex-wrap gap-1">
            <span
              v-for="cat in (item.categories || (item.category ? [item.category] : []))"
              :key="cat.uuid"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#D4A843]/15 text-[#D4A843] dark:bg-[#D4A843]/25 dark:text-[#D4A843]"
            >
              {{ localizedName(cat) }}
            </span>
            <span v-if="!(item.categories?.length || item.category)" class="text-gray-400">-</span>
          </div>
        </template>

        <template #cell-cost_price="{ item }">
          {{ formatCurrency(item.cost_price) }}
        </template>

        <template #cell-sell_price="{ item }">
          {{ formatCurrency(item.sell_price) }}
        </template>

        <template #cell-quantity="{ item }">
          {{ item.quantity }}
        </template>

        <template #cell-status="{ item }">
          <div class="flex items-center gap-1">
            <AppBadge
              v-if="item.quantity <= (item.min_quantity || 0)"
              variant="danger"
              :text="t('low_stock')"
            />
            <AppBadge
              v-else
              variant="success"
              text="OK"
            />
            <span
              v-if="isExpiringSoon(item)"
              class="inline-flex items-center text-yellow-500 dark:text-yellow-400"
              :title="t('expiring_soon') + ': ' + item.expiry_date"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </span>
            <span
              v-if="isExpired(item)"
              class="inline-flex items-center text-red-500 dark:text-red-400"
              :title="t('expired') + ': ' + item.expiry_date"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </span>
          </div>
        </template>

        <template #cell-actions="{ item }">
          <div class="flex items-center gap-2">
            <button
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
              :title="t('stock') + ' +'"
              @click.stop="openStockInModal(item)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <AppButton size="sm" variant="ghost" @click.stop="$router.push('/products/' + item.uuid)">
              {{ t('edit') }}
            </AppButton>
            <AppButton size="sm" variant="danger" @click.stop="confirmDelete(item)">
              {{ t('delete') }}
            </AppButton>
          </div>
        </template>
      </AppDataTable>

      <!-- Stock In Modal -->
      <AppModal :show="showStockInModal" :title="t('stock') + ' +'" size="sm" @close="showStockInModal = false">
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">{{ stockInTarget?.name_en }}</p>
          <AppInput
            v-model.number="stockInQty"
            :label="t('quantity')"
            type="number"
            min="1"
            placeholder="1"
            required
          />
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('notes') }}</label>
            <textarea
              v-model="stockInReason"
              rows="2"
              :placeholder="t('notes')"
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
            ></textarea>
          </div>
        </div>
        <template #footer>
          <AppButton variant="secondary" @click="showStockInModal = false">{{ t('cancel') }}</AppButton>
          <AppButton variant="primary" :loading="stockInSaving" @click="submitStockIn">{{ t('save') }}</AppButton>
        </template>
      </AppModal>

      <!-- Delete confirmation modal -->
      <AppModal :show="showDeleteModal" :title="t('confirm_delete')" size="sm" @close="showDeleteModal = false">
        <p class="text-gray-700 dark:text-gray-300">{{ t('confirm_delete') }}</p>
        <template #footer>
          <AppButton variant="secondary" @click="showDeleteModal = false">{{ t('cancel') }}</AppButton>
          <AppButton variant="danger" :loading="deleting" @click="deleteProduct">{{ t('yes') }}</AppButton>
        </template>
      </AppModal>

      <!-- Bulk Price Update Modal -->
      <AppModal :show="showBulkPriceModal" :title="t('update_price')" size="sm" @close="showBulkPriceModal = false">
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">{{ selectedUuids.size }} {{ t('selected') }}</p>
          <AppInput
            v-model.number="bulkPricePercent"
            :label="t('price_change')"
            type="number"
            placeholder="e.g. 10 for +10%, -5 for -5%"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400">Positive = increase, negative = decrease</p>
        </div>
        <template #footer>
          <AppButton variant="secondary" @click="showBulkPriceModal = false">{{ t('cancel') }}</AppButton>
          <AppButton variant="primary" :loading="bulkUpdating" @click="bulkUpdatePrice">{{ t('save') }}</AppButton>
        </template>
      </AppModal>

    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../../composables/useApi.js';
import { t, localizedName } from '../../i18n/index.js';
import { printLabels } from '../../composables/print.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppBadge from '../../components/base/AppBadge.vue';
import AppDataTable from '../../components/base/AppDataTable.vue';
import AppModal from '../../components/base/AppModal.vue';
import AppInput from '../../components/base/AppInput.vue';
import CategoryFilter from '../../components/base/CategoryFilter.vue';

const router = useRouter();
const route = useRoute();

const products = ref([]);
const allCategories = ref([]);
// Effective category uuids from the drill-down filter (selected + descendants);
// empty array means "All".
const selectedCategoryUuids = ref([]);
const loading = ref(true);
const error = ref('');
const search = ref('');
const sortOption = ref('');
const successMsg = ref('');
const showDeleteModal = ref(false);
const deleteTarget = ref(null);
const deleting = ref(false);

function showSuccess(msg) {
  successMsg.value = msg;
  setTimeout(() => successMsg.value = '', 3000);
}

// Stock-in modal state
const showStockInModal = ref(false);
const stockInTarget = ref(null);
const stockInQty = ref(1);
const stockInReason = ref('');
const stockInSaving = ref(false);

// Low stock filter from query param
const lowStockFilter = ref(false);

// Bulk action state
const selectMode = ref(false);
const selectedUuids = ref(new Set());
const showBulkPriceModal = ref(false);
const bulkPricePercent = ref(0);
const bulkUpdating = ref(false);

const selectedProducts = computed(() =>
  products.value.filter((p) => selectedUuids.value.has(p.uuid))
);

function toggleSelectMode() {
  selectMode.value = !selectMode.value;
  if (!selectMode.value) selectedUuids.value = new Set();
}

function toggleSelect(uuid) {
  const s = new Set(selectedUuids.value);
  if (s.has(uuid)) s.delete(uuid);
  else s.add(uuid);
  selectedUuids.value = s;
}

function toggleSelectAll() {
  if (selectedUuids.value.size === sortedProducts.value.length) {
    selectedUuids.value = new Set();
  } else {
    selectedUuids.value = new Set(sortedProducts.value.map((p) => p.uuid));
  }
}

function bulkPrintLabels() {
  if (selectedUuids.value.size === 0) return;
  // Clean standalone label document (not a screenshot of the page).
  printLabels({ products: selectedProducts.value, fmt: formatCurrency, t });
}

async function bulkDelete() {
  if (selectedUuids.value.size === 0) return;
  if (!confirm(t('confirm_delete'))) return;
  for (const uuid of selectedUuids.value) {
    try {
      await api.delete('/products/' + uuid);
      products.value = products.value.filter((p) => p.uuid !== uuid);
    } catch (e) {
      // continue with others
    }
  }
  selectedUuids.value = new Set();
  showSuccess(t('deleted') || 'Deleted successfully');
}

async function bulkUpdatePrice() {
  if (selectedUuids.value.size === 0 || !bulkPricePercent.value) return;
  bulkUpdating.value = true;
  const pct = bulkPricePercent.value / 100;
  for (const uuid of selectedUuids.value) {
    const p = products.value.find((pr) => pr.uuid === uuid);
    if (!p) continue;
    const newPrice = Math.max(0, parseFloat(p.sell_price || 0) * (1 + pct));
    try {
      await api.put('/products/' + uuid, { sell_price: parseFloat(newPrice.toFixed(2)) });
      p.sell_price = parseFloat(newPrice.toFixed(2));
    } catch (e) {
      // continue
    }
  }
  bulkUpdating.value = false;
  showBulkPriceModal.value = false;
  bulkPricePercent.value = 0;
  showSuccess(t('saved') || 'Prices updated');
}

const columns = [
  { key: 'name_en', label: t('name_en'), sortable: true },
  { key: 'sku', label: t('sku'), sortable: true },
  { key: 'category', label: t('category') },
  { key: 'cost_price', label: t('cost_price'), sortable: true },
  { key: 'sell_price', label: t('sell_price'), sortable: true },
  { key: 'quantity', label: t('quantity'), sortable: true },
  { key: 'status', label: t('status') },
  { key: 'actions', label: t('actions'), class: 'text-right' },
];

const filteredProducts = computed(() => {
  let result = products.value;
  if (lowStockFilter.value) {
    result = result.filter((p) => (p.quantity ?? 0) <= (p.min_quantity ?? 0));
  }
  if (selectedCategoryUuids.value.length) {
    const set = new Set(selectedCategoryUuids.value);
    result = result.filter((p) => {
      const cats = p.categories || (p.category ? [p.category] : []);
      return cats.some((c) => set.has(c.uuid));
    });
  }
  if (search.value) {
    const q = search.value.toLowerCase();
    result = result.filter((p) =>
      (p.name_en || '').toLowerCase().includes(q) ||
      (p.name_ar || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q) ||
      (Array.isArray(p.barcodes) && p.barcodes.some((b) => (b || '').toLowerCase().includes(q)))
    );
  }
  return result;
});

const sortedProducts = computed(() => {
  const list = [...filteredProducts.value];
  switch (sortOption.value) {
    case 'name_asc': return list.sort((a, b) => localizedName(a).localeCompare(localizedName(b)));
    case 'name_desc': return list.sort((a, b) => localizedName(b).localeCompare(localizedName(a)));
    case 'price_asc': return list.sort((a, b) => (parseFloat(a.sell_price) || 0) - (parseFloat(b.sell_price) || 0));
    case 'price_desc': return list.sort((a, b) => (parseFloat(b.sell_price) || 0) - (parseFloat(a.sell_price) || 0));
    case 'qty_asc': return list.sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
    case 'qty_desc': return list.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
    default: return list;
  }
});

function isExpiringSoon(item) {
  if (!item.expiry_date) return false;
  const expiry = new Date(item.expiry_date);
  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return expiry > now && (expiry - now) <= thirtyDays;
}

function isExpired(item) {
  if (!item.expiry_date) return false;
  return new Date(item.expiry_date) < new Date();
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2,
  }).format(parseFloat(value) || 0);
}

function confirmDelete(item) {
  deleteTarget.value = item;
  showDeleteModal.value = true;
}

async function deleteProduct() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await api.delete('/products/' + deleteTarget.value.uuid);
    products.value = products.value.filter((p) => p.uuid !== deleteTarget.value.uuid);
    showDeleteModal.value = false;
    showSuccess(t('deleted') || 'Deleted successfully');
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to delete product.';
  } finally {
    deleting.value = false;
  }
}

function openStockInModal(item) {
  stockInTarget.value = item;
  stockInQty.value = 1;
  stockInReason.value = '';
  showStockInModal.value = true;
}

async function submitStockIn() {
  if (!stockInTarget.value || stockInQty.value < 1) return;
  stockInSaving.value = true;
  try {
    await api.post('/stock/in', {
      product_uuid: stockInTarget.value.uuid,
      quantity: stockInQty.value,
      reason: stockInReason.value || null,
    });
    // Update local quantity
    const p = products.value.find((pr) => pr.uuid === stockInTarget.value.uuid);
    if (p) p.quantity = (p.quantity || 0) + stockInQty.value;
    showStockInModal.value = false;
    showSuccess(t('saved') || 'Stock updated successfully');
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to add stock.';
  } finally {
    stockInSaving.value = false;
  }
}

onMounted(async () => {
  // Check for low_stock query param
  if (route.query.low_stock === 'true') {
    lowStockFilter.value = true;
  }
  try {
    const [prodRes, catRes] = await Promise.all([
      api.get('/products'),
      api.get('/categories', { params: { all: true } }),
    ]);
    products.value = prodRes.data.data || prodRes.data;
    allCategories.value = catRes.data.data || catRes.data;
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load products.';
  } finally {
    loading.value = false;
  }
});
</script>
