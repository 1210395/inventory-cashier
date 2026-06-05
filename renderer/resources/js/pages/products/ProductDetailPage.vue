<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <AppButton variant="ghost" @click="$router.push('/products')">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            {{ t('products') }}
          </AppButton>
        </div>
        <div v-if="product" class="flex items-center gap-2">
          <AppButton variant="primary" @click="$router.push('/products/' + product.uuid + '/edit')">
            {{ t('edit') }}
          </AppButton>
          <AppButton variant="danger" @click="showDeleteModal = true">
            {{ t('delete') }}
          </AppButton>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 4" :key="i" class="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
      </div>

      <!-- Error -->
      <div v-if="error" class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Product detail cards -->
      <div v-if="product && !loading" class="space-y-6">
        <!-- Product title + image -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center gap-5">
            <div v-if="product.image" class="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700">
              <img :src="product.image" class="w-full h-full object-cover" />
            </div>
            <div>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ localizedName(product) }}</h2>
              <p v-if="(isRtl ? product.name_en : product.name_ar)" class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ isRtl ? product.name_en : product.name_ar }}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Basic Info -->
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Basic Info</h3>
            <dl class="space-y-3">
              <div>
                <dt class="text-xs text-gray-400 dark:text-gray-500">{{ t('sku') }}</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ product.sku || '-' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400 dark:text-gray-500">{{ t('barcode') }}</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ product.barcode || '-' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400 dark:text-gray-500">{{ t('categories') }}</dt>
                <dd class="flex flex-wrap gap-1 mt-1">
                  <span
                    v-for="cat in (product.categories || (product.category ? [product.category] : []))"
                    :key="cat.uuid"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#D4A843]/15 text-[#D4A843] dark:bg-[#D4A843]/25 dark:text-[#D4A843]"
                  >
                    {{ localizedName(cat) }}
                  </span>
                  <span v-if="!(product.categories?.length || product.category)" class="text-sm text-gray-400">-</span>
                </dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400 dark:text-gray-500">{{ t('supplier') }}</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ product.supplier?.name || product.supplier?.name_en || '-' }}</dd>
              </div>
              <div v-if="product.description">
                <dt class="text-xs text-gray-400 dark:text-gray-500">{{ t('description') }}</dt>
                <dd class="text-sm text-gray-700 dark:text-gray-300">{{ product.description }}</dd>
              </div>
              <div v-if="product.expiry_date">
                <dt class="text-xs text-gray-400 dark:text-gray-500">{{ t('expiry_date') }}</dt>
                <dd class="flex items-center gap-2 mt-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{{ new Date(product.expiry_date).toLocaleDateString() }}</span>
                  <AppBadge v-if="isExpired" variant="danger" :text="t('expired')" />
                  <AppBadge v-else-if="isExpiringSoon" variant="warning" :text="t('expiring_soon')" />
                </dd>
              </div>
            </dl>
          </div>

          <!-- Pricing -->
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Pricing</h3>
            <dl class="space-y-3">
              <div>
                <dt class="text-xs text-gray-400 dark:text-gray-500">{{ t('cost_price') }}</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ formatCurrency(product.cost_price) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400 dark:text-gray-500">{{ t('sell_price') }}</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ formatCurrency(product.sell_price) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400 dark:text-gray-500">Margin</dt>
                <dd class="text-sm font-semibold" :class="margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                  {{ margin.toFixed(1) }}%
                </dd>
              </div>
            </dl>
          </div>

          <!-- Stock -->
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">{{ t('stock') }}</h3>
            <dl class="space-y-3">
              <div>
                <dt class="text-xs text-gray-400 dark:text-gray-500">{{ t('quantity') }}</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ product.quantity ?? 0 }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400 dark:text-gray-500">{{ t('min_quantity') }}</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ product.min_quantity ?? 0 }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400 dark:text-gray-500">{{ t('status') }}</dt>
                <dd>
                  <AppBadge
                    v-if="product.quantity <= (product.min_quantity || 0)"
                    variant="danger"
                    :text="t('low_stock')"
                  />
                  <AppBadge v-else variant="success" text="In Stock" />
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Invoice History -->
        <div v-if="invoiceHistory.length > 0" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Invoice History</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('invoice_number') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('type') }}</th>
                  <th class="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('quantity') }}</th>
                  <th class="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('unit_price') }}</th>
                  <th class="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('total') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('date') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="inv in invoiceHistory"
                  :key="inv.uuid"
                  class="border-b border-gray-100 dark:border-gray-700/50"
                >
                  <td class="px-3 py-2">
                    <button
                      class="text-[#D4A843] hover:underline font-medium"
                      @click="router.push('/invoices/' + inv.uuid)"
                    >
                      {{ inv.invoice_number }}
                    </button>
                  </td>
                  <td class="px-3 py-2">
                    <AppBadge :variant="inv.type === 'sale' ? 'info' : 'neutral'" :text="t(inv.type)" />
                  </td>
                  <td class="px-3 py-2 text-right">{{ inv.item_quantity }}</td>
                  <td class="px-3 py-2 text-right">{{ formatCurrency(inv.item_unit_price) }}</td>
                  <td class="px-3 py-2 text-right">{{ formatCurrency(inv.item_total) }}</td>
                  <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{{ new Date(inv.created_at).toLocaleDateString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Serial Numbers -->
        <div v-if="serials.length > 0" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">{{ t('serial_numbers') }}</h3>
          <div class="space-y-2">
            <div
              v-for="serial in serials"
              :key="serial.serial_number"
              class="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
            >
              <span class="text-sm font-medium text-gray-900 dark:text-white font-mono">{{ serial.serial_number }}</span>
              <AppBadge
                :variant="serial.status === 'sold' ? 'danger' : 'success'"
                :text="serial.status === 'sold' ? t('sold') : t('available')"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Delete confirmation modal -->
      <AppModal :show="showDeleteModal" :title="t('confirm_delete')" size="sm" @close="showDeleteModal = false">
        <p class="text-gray-700 dark:text-gray-300">{{ t('confirm_delete') }}</p>
        <template #footer>
          <AppButton variant="secondary" @click="showDeleteModal = false">{{ t('cancel') }}</AppButton>
          <AppButton variant="danger" :loading="deleting" @click="deleteProduct">{{ t('yes') }}</AppButton>
        </template>
      </AppModal>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../composables/useApi.js';
import { t, localizedName, isRtl } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppBadge from '../../components/base/AppBadge.vue';
import AppModal from '../../components/base/AppModal.vue';

const route = useRoute();
const router = useRouter();

const product = ref(null);
const loading = ref(true);
const error = ref('');
const showDeleteModal = ref(false);
const deleting = ref(false);
const serials = ref([]);
const invoiceHistory = ref([]);

const isExpired = computed(() => {
  if (!product.value?.expiry_date) return false;
  return new Date(product.value.expiry_date) < new Date();
});

const isExpiringSoon = computed(() => {
  if (!product.value?.expiry_date) return false;
  const expiry = new Date(product.value.expiry_date);
  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return expiry > now && (expiry - now) <= thirtyDays;
});

const margin = computed(() => {
  if (!product.value) return 0;
  const cost = parseFloat(product.value.cost_price) || 0;
  const sell = parseFloat(product.value.sell_price) || 0;
  if (cost === 0) return 0;
  return ((sell - cost) / cost) * 100;
});

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2,
  }).format(parseFloat(value) || 0);
}

async function deleteProduct() {
  deleting.value = true;
  try {
    await api.delete('/products/' + route.params.uuid);
    router.push('/products');
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to delete product.';
    showDeleteModal.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  try {
    const res = await api.get('/products/' + route.params.uuid);
    product.value = res.data.data || res.data;
    serials.value = product.value.serials || [];
    // Try to load serials from separate endpoint if not included
    if (!product.value.serials) {
      try {
        const serialRes = await api.get('/products/' + route.params.uuid + '/serials');
        serials.value = serialRes.data.data || serialRes.data || [];
      } catch (e) {
        // Serials endpoint may not exist yet
      }
    }
    // Fetch invoice history for this product
    try {
      const invRes = await api.get('/invoices');
      const allInvoices = invRes.data.data || invRes.data;
      const history = [];
      for (const inv of allInvoices) {
        const items = inv.items || [];
        for (const item of items) {
          if (item.product_uuid === route.params.uuid || item.product?.uuid === route.params.uuid) {
            history.push({
              uuid: inv.uuid,
              invoice_number: inv.invoice_number,
              type: inv.type,
              created_at: inv.created_at,
              item_quantity: item.quantity,
              item_unit_price: item.unit_price,
              item_total: item.total,
            });
          }
        }
      }
      invoiceHistory.value = history;
    } catch (e) {
      // Silently fail for invoice history
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load product.';
  } finally {
    loading.value = false;
  }
});
</script>
