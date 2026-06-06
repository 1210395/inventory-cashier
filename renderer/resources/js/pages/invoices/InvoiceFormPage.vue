<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ isEditMode ? t('edit_invoice') : (invoiceType === 'sale' ? t('new_sale_invoice') : t('new_purchase_invoice')) }}
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ form.invoice_number }}
          </p>
        </div>
        <AppBadge
          :variant="invoiceType === 'sale' ? 'info' : 'neutral'"
          :text="t(invoiceType)"
        />
      </div>

      <!-- Error message -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Two-column desktop layout -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <!-- LEFT: Items (3 cols) -->
        <div class="lg:col-span-3 space-y-6">
          <!-- Customer / Supplier picker -->
          <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <AppSelect
              v-if="invoiceType === 'sale'"
              v-model="form.customer_uuid"
              :label="t('customer')"
              :options="customerOptions"
              :placeholder="t('select_customer')"
              required
            />
            <AppSelect
              v-else
              v-model="form.supplier_uuid"
              :label="t('supplier')"
              :options="supplierOptions"
              :placeholder="t('select_supplier')"
              required
            />
          </div>

          <!-- Line Items -->
          <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('items') }}</h2>

            <!-- Add item row -->
            <div class="mb-4">
              <!-- Toggle: Existing vs New Product (only for purchase invoices) -->
              <div v-if="invoiceType === 'purchase'" class="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 mb-3 w-fit">
                <button
                  type="button"
                  class="px-4 py-1.5 text-xs font-medium transition-colors"
                  :class="!newProductMode ? 'bg-[#D4A843] text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'"
                  @click="newProductMode = false"
                >{{ t('existing_product') }}</button>
                <button
                  type="button"
                  class="px-4 py-1.5 text-xs font-medium transition-colors"
                  :class="newProductMode ? 'bg-[#D4A843] text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'"
                  @click="newProductMode = true"
                >{{ t('new_product') }}</button>
              </div>

              <!-- Existing product selector -->
              <div v-if="!newProductMode" class="flex items-end gap-3">
                <div class="flex-1">
                  <AppSelect
                    v-model="selectedProductUuid"
                    :label="t('products')"
                    :options="productOptions"
                    :placeholder="t('select_product')"
                  />
                </div>
                <AppButton variant="primary" :disabled="!selectedProductUuid" @click="addItem">
                  + {{ t('add_item') }}
                </AppButton>
              </div>

              <!-- New product inline form (purchase only) -->
              <div v-else class="space-y-3 p-4 rounded-lg border border-dashed border-[#D4A843] bg-[#D4A843]/5 dark:bg-[#D4A843]/10">
                <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('new_product') }}</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AppInput v-model="newProduct.name_en" :label="t('name_en')" :placeholder="t('name_en')" />
                  <AppInput v-model="newProduct.name_ar" :label="t('name_ar')" :placeholder="t('name_ar')" />
                  <AppInput v-model="newProduct.sku" :label="t('sku')" :placeholder="t('sku')" />
                  <AppInput v-model="newProduct.sell_price" :label="t('sell_price')" type="number" placeholder="0.00" />
                </div>
                <p v-if="newProductError" class="text-xs text-red-500">{{ newProductError }}</p>
                <AppButton variant="primary" :loading="creatingProduct" @click="createAndAddProduct">
                  + {{ t('create_and_add') }}
                </AppButton>
              </div>
            </div>

            <!-- Items table -->
            <div class="overflow-x-auto">
              <table class="w-full text-sm" v-if="form.items.length > 0">
                <thead>
                  <tr class="border-b border-gray-200 dark:border-gray-700">
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('products') }}</th>
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('quantity') }}</th>
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('unit_price') }}</th>
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('total') }}</th>
                    <th class="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, idx) in form.items"
                    :key="idx"
                    class="border-b border-gray-100 dark:border-gray-700/50"
                  >
                    <td class="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {{ item.product_name }}
                    </td>
                    <td class="px-3 py-2">
                      <input
                        v-model.number="item.quantity"
                        type="number"
                        min="1"
                        class="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A843]"
                        @input="recalcLineTotal(idx)"
                      />
                    </td>
                    <td class="px-3 py-2">
                      <input
                        v-model.number="item.unit_price"
                        type="number"
                        step="0.01"
                        min="0"
                        class="w-28 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A843]"
                        @input="recalcLineTotal(idx)"
                      />
                    </td>
                    <td class="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium">
                      {{ formatCurrency(item.total) }}
                    </td>
                    <td class="px-3 py-2">
                      <button
                        class="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors p-1"
                        @click="removeItem(idx)"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-else class="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                {{ t('no_items_added') }}
              </p>
            </div>
          </div>
        </div>

        <!-- RIGHT: Summary + Payment (2 cols) -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Summary -->
          <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('summary') }}</h2>

            <div class="space-y-3">
              <div class="flex justify-between text-sm">
                <span class="text-gray-500 dark:text-gray-400">{{ t('subtotal') }}</span>
                <span class="text-gray-900 dark:text-white font-medium">{{ formatCurrency(subtotal) }}</span>
              </div>

              <AppInput
                v-model.number="form.tax_amount"
                :label="t('tax')"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('discount') }}</label>
                <div class="flex items-center gap-2">
                  <div class="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                    <button
                      type="button"
                      class="px-3 py-1.5 text-xs font-medium transition-colors"
                      :class="form.discount_type === 'fixed' ? 'bg-[#D4A843] text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'"
                      @click="form.discount_type = 'fixed'"
                    >&#x20AA;</button>
                    <button
                      type="button"
                      class="px-3 py-1.5 text-xs font-medium transition-colors"
                      :class="form.discount_type === 'percentage' ? 'bg-[#D4A843] text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'"
                      @click="form.discount_type = 'percentage'"
                    >%</button>
                  </div>
                  <input
                    v-model.number="form.discount_value"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
                  />
                </div>
                <p v-if="form.discount_type === 'percentage' && form.discount_value > 0" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  = {{ formatCurrency(computedDiscountAmount) }}
                </p>
              </div>

              <div class="flex justify-between text-base font-bold pt-3 border-t border-gray-200 dark:border-gray-700">
                <span class="text-gray-900 dark:text-white">{{ t('total') }}</span>
                <span class="text-[#D4A843]">{{ formatCurrency(grandTotal) }}</span>
              </div>
            </div>
          </div>

          <!-- Payment -->
          <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('payments') }}</h2>

            <div class="space-y-3">
              <AppInput
                v-model.number="form.paid_amount"
                :label="t('paid')"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />

              <AppSelect
                v-model="form.payment_method"
                :label="t('payment_method')"
                :options="paymentMethodOptions"
              />

              <AppInput
                v-model="form.due_date"
                :label="t('due_date')"
                type="date"
              />
            </div>
          </div>

          <!-- Notes -->
          <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('notes') }}</label>
            <textarea
              v-model="form.notes"
              rows="3"
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
              :placeholder="t('notes')"
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3">
            <AppButton variant="primary" size="lg" :loading="saving" class="flex-1" @click="saveInvoice">
              {{ t('save') }}
            </AppButton>
            <AppButton variant="secondary" size="lg" @click="$router.push('/invoices')">
              {{ t('cancel') }}
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { formatMoney } from '../../composables/currency.js';
import { useRouter, useRoute } from 'vue-router';
import api from '../../composables/useApi.js';
import { t, localizedName } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppBadge from '../../components/base/AppBadge.vue';
import AppInput from '../../components/base/AppInput.vue';
import AppSelect from '../../components/base/AppSelect.vue';

const router = useRouter();
const route = useRoute();

const isEditMode = computed(() => !!route.params.uuid);
const invoiceType = computed(() => form.type || route.query.type || 'sale');

function generateInvoiceNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${date}-${rand}`;
}

const form = reactive({
  invoice_number: generateInvoiceNumber(),
  customer_uuid: '',
  supplier_uuid: '',
  type: '',
  tax_amount: 0,
  discount_amount: 0,
  discount_type: 'fixed',
  discount_value: 0,
  paid_amount: 0,
  payment_method: 'cash',
  due_date: '',
  notes: '',
  items: [],
});

const products = ref([]);
const customers = ref([]);
const suppliers = ref([]);
const selectedProductUuid = ref('');
const loading = ref(true);
const saving = ref(false);
const error = ref('');

// New product creation (purchase invoices)
const newProductMode = ref(false);
const creatingProduct = ref(false);
const newProductError = ref('');
const newProduct = reactive({
  name_en: '',
  name_ar: '',
  sku: '',
  sell_price: '',
});

const productOptions = computed(() =>
  products.value.map((p) => ({
    value: p.uuid,
    label: `${localizedName(p) || p.name} (${p.sku || '-'})`,
  }))
);

const customerOptions = computed(() =>
  customers.value.map((c) => ({
    value: c.uuid,
    label: c.name || c.name_en || c.phone || '-',
  }))
);

const supplierOptions = computed(() =>
  suppliers.value.map((s) => ({
    value: s.uuid,
    label: s.name || s.name_en || s.phone || '-',
  }))
);

const paymentMethodOptions = [
  { value: 'cash', label: t('cash') },
  { value: 'cheque', label: t('cheques') },
  { value: 'bank_transfer', label: t('bank_transfer') },
];

const subtotal = computed(() =>
  form.items.reduce((sum, item) => sum + (item.total || 0), 0)
);

const computedDiscountAmount = computed(() => {
  if (form.discount_type === 'percentage') {
    return (subtotal.value * (form.discount_value || 0)) / 100;
  }
  return form.discount_value || 0;
});

const grandTotal = computed(() =>
  subtotal.value + (form.tax_amount || 0) - computedDiscountAmount.value
);

function addItem() {
  const product = products.value.find((p) => p.uuid === selectedProductUuid.value);
  if (!product) return;

  const unitPrice = invoiceType.value === 'sale'
    ? (parseFloat(product.sell_price) || 0)
    : (parseFloat(product.cost_price) || 0);

  form.items.push({
    product_uuid: product.uuid,
    product_name: product.name_en || product.name,
    quantity: 1,
    unit_price: unitPrice,
    total: unitPrice,
  });

  selectedProductUuid.value = '';
}

async function createAndAddProduct() {
  if (!newProduct.name_en && !newProduct.name_ar) {
    newProductError.value = t('at_least_one_name_required');
    return;
  }
  creatingProduct.value = true;
  newProductError.value = '';
  try {
    const payload = {
      name_en: newProduct.name_en || '',
      name_ar: newProduct.name_ar || '',
      sku: newProduct.sku || '',
      sell_price: parseFloat(newProduct.sell_price) || 0,
      cost_price: 0,
      quantity: 0,
    };
    const res = await api.post('/products', payload);
    const created = res.data.data || res.data;
    products.value.push(created);

    // Add to invoice items with quantity 1, let user set cost price
    form.items.push({
      product_uuid: created.uuid,
      product_name: created.name_en || created.name_ar || '-',
      quantity: 1,
      unit_price: 0,
      total: 0,
    });

    // Reset
    newProduct.name_en = '';
    newProduct.name_ar = '';
    newProduct.sku = '';
    newProduct.sell_price = '';
    newProductMode.value = false;
  } catch (e) {
    newProductError.value = e.response?.data?.message || 'Failed to create product.';
  } finally {
    creatingProduct.value = false;
  }
}

function removeItem(idx) {
  form.items.splice(idx, 1);
}

function recalcLineTotal(idx) {
  const item = form.items[idx];
  item.total = (item.quantity || 0) * (item.unit_price || 0);
}

function formatCurrency(value) {
  return formatMoney(value);
}

function computeStatus() {
  if (form.paid_amount >= grandTotal.value && grandTotal.value > 0) return 'paid';
  if (form.paid_amount > 0) return 'partial';
  return 'unpaid';
}

async function saveInvoice() {
  if (form.items.length === 0) {
    error.value = t('no_items_added');
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    const payload = {
      invoice_number: form.invoice_number,
      customer_uuid: invoiceType.value === 'sale' ? form.customer_uuid : null,
      supplier_uuid: invoiceType.value === 'purchase' ? form.supplier_uuid : null,
      type: invoiceType.value,
      subtotal: subtotal.value,
      tax_amount: form.tax_amount || 0,
      discount_amount: computedDiscountAmount.value,
      total: grandTotal.value,
      paid_amount: form.paid_amount || 0,
      status: computeStatus(),
      due_date: form.due_date || null,
      notes: form.notes || null,
      items: form.items.map((item) => ({
        product_uuid: item.product_uuid,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      })),
    };

    let response;
    if (isEditMode.value) {
      response = await api.put('/invoices/' + route.params.uuid, payload);
    } else {
      response = await api.post('/invoices', payload);
    }

    // If there's a payment (only on create), record it
    if (!isEditMode.value && form.paid_amount > 0) {
      try {
        await api.post('/payments', {
          invoice_uuid: response.data.data?.uuid || response.data.uuid,
          amount: form.paid_amount,
          method: form.payment_method,
          payment_date: new Date().toISOString().slice(0, 10),
          notes: null,
        });
      } catch (payErr) {
        // Payment recording failed but invoice was created
        console.error('Payment recording failed:', payErr);
      }
    }

    router.push('/invoices');
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to save invoice.';
  } finally {
    saving.value = false;
  }
}

async function fetchInvoiceForEdit() {
  try {
    const response = await api.get('/invoices/' + route.params.uuid);
    const inv = response.data.data || response.data;
    form.invoice_number = inv.invoice_number;
    form.customer_uuid = inv.customer_uuid || '';
    form.supplier_uuid = inv.supplier_uuid || '';
    form.type = inv.type || 'sale';
    form.tax_amount = parseFloat(inv.tax_amount) || 0;
    form.discount_amount = parseFloat(inv.discount_amount) || 0;
    form.discount_type = 'fixed';
    form.discount_value = parseFloat(inv.discount_amount) || 0;
    form.paid_amount = parseFloat(inv.paid_amount) || 0;
    form.due_date = inv.due_date ? inv.due_date.slice(0, 10) : '';
    form.notes = inv.notes || '';
    form.items = (inv.items || []).map((item) => ({
      product_uuid: item.product_uuid,
      product_name: item.product?.name_en || item.product?.name || '-',
      quantity: item.quantity,
      unit_price: parseFloat(item.unit_price) || 0,
      total: parseFloat(item.total) || 0,
    }));
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load invoice.';
  }
}

onMounted(async () => {
  try {
    const [productsRes, customersRes, suppliersRes] = await Promise.all([
      api.get('/products'),
      api.get('/customers'),
      api.get('/suppliers'),
    ]);
    products.value = productsRes.data.data || productsRes.data;
    customers.value = customersRes.data.data || customersRes.data;
    suppliers.value = suppliersRes.data.data || suppliersRes.data;

    // If editing, fetch existing invoice data
    if (isEditMode.value) {
      await fetchInvoiceForEdit();
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load data.';
  } finally {
    loading.value = false;
  }
});
</script>
