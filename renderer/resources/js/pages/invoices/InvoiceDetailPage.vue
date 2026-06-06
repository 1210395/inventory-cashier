<template>
  <AppLayout>
    <div>
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <svg class="animate-spin h-8 w-8 text-[#D4A843]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="ml-3 text-gray-500 dark:text-gray-400">{{ t('loading') }}</span>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
        <AppButton variant="secondary" size="sm" class="mt-2" @click="$router.push('/invoices')">{{ t('back') }}</AppButton>
      </div>

      <template v-else-if="invoice">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ invoice.invoice_number }}</h1>
              <AppBadge :variant="invoice.type === 'sale' ? 'info' : 'neutral'" :text="t(invoice.type)" />
              <AppBadge :variant="statusVariant(invoice.status)" :text="t(invoice.status)" />
            </div>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ formatDate(invoice.created_at) }}</p>
          </div>
          <div class="flex items-center gap-3">
            <AppButton variant="secondary" @click="$router.push('/invoices')">
              {{ t('back') }}
            </AppButton>
            <AppButton variant="primary" @click="$router.push('/invoices/' + uuid + '/edit')">
              {{ t('edit_invoice') }}
            </AppButton>
            <AppButton variant="secondary" @click="printInvoice">
              {{ t('print_receipt') }}
            </AppButton>
            <AppButton variant="secondary" @click="shareInvoice">
              {{ t('share') }}
            </AppButton>
            <AppButton variant="danger" @click="confirmDelete">
              {{ t('delete_invoice') }}
            </AppButton>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left column: Party info + Items -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Customer / Supplier Info -->
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                {{ invoice.type === 'sale' ? t('customer') : t('supplier') }}
              </h2>
              <div class="text-gray-900 dark:text-white">
                <button
                  v-if="partyUuid"
                  class="font-medium text-lg text-[#D4A843] hover:underline text-left"
                  @click="router.push((invoice.type === 'sale' ? '/customers/' : '/suppliers/') + partyUuid + '/statement')"
                >
                  {{ partyName }}
                </button>
                <p v-else class="font-medium text-lg">{{ partyName }}</p>
                <p v-if="partyPhone" class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ partyPhone }}</p>
                <p v-if="partyAddress" class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ partyAddress }}</p>
              </div>
            </div>

            <!-- Line Items -->
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">{{ t('items') }}</h2>
              <AppDataTable
                :columns="itemColumns"
                :data="invoice.items || []"
                :empty-message="t('no_data')"
              >
                <template #cell-product="{ item }">
                  <button
                    v-if="item.product?.uuid"
                    class="text-[#D4A843] hover:underline font-medium text-left"
                    @click="router.push('/products/' + item.product.uuid)"
                  >
                    {{ item.product?.name_en || item.product?.name || '-' }}
                  </button>
                  <span v-else>{{ item.product?.name_en || item.product?.name || '-' }}</span>
                </template>
                <template #cell-unit_price="{ item }">
                  {{ formatCurrency(item.unit_price) }}
                </template>
                <template #cell-total="{ item }">
                  {{ formatCurrency(item.total) }}
                </template>
              </AppDataTable>
            </div>

            <!-- Payment History -->
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <div class="flex items-center justify-between mb-3">
                <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('payment_history') }}</h2>
                <AppButton
                  v-if="remainingAmount > 0"
                  variant="primary"
                  size="sm"
                  @click="showPaymentModal = true"
                >
                  + {{ t('record_payment') }}
                </AppButton>
              </div>
              <AppDataTable
                :columns="paymentColumns"
                :data="payments"
                :loading="paymentsLoading"
                :empty-message="t('no_payments_yet')"
              >
                <template #cell-amount="{ item }">
                  {{ formatCurrency(item.amount) }}
                </template>
                <template #cell-method="{ item }">
                  {{ t(item.method) }}
                </template>
                <template #cell-payment_date="{ item }">
                  {{ formatDate(item.payment_date) }}
                </template>
              </AppDataTable>
            </div>
          </div>

          <!-- Right column: Financial Summary -->
          <div class="space-y-6">
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">{{ t('summary') }}</h2>
              <div class="space-y-3">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500 dark:text-gray-400">{{ t('subtotal') }}</span>
                  <span class="text-gray-900 dark:text-white">{{ formatCurrency(invoice.subtotal) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500 dark:text-gray-400">{{ t('tax') }}</span>
                  <span class="text-gray-900 dark:text-white">{{ formatCurrency(invoice.tax_amount) }}</span>
                </div>
                <div v-if="invoice.discount_amount" class="flex justify-between text-sm">
                  <span class="text-gray-500 dark:text-gray-400">{{ t('discount') }}</span>
                  <span class="text-red-500">-{{ formatCurrency(invoice.discount_amount) }}</span>
                </div>
                <div class="flex justify-between text-base font-bold pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span class="text-gray-900 dark:text-white">{{ t('total') }}</span>
                  <span class="text-[#D4A843]">{{ formatCurrency(invoice.total) }}</span>
                </div>
                <div class="flex justify-between text-sm pt-2">
                  <span class="text-gray-500 dark:text-gray-400">{{ t('paid') }}</span>
                  <span class="text-green-600 dark:text-green-400 font-medium">{{ formatCurrency(invoice.paid_amount) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500 dark:text-gray-400">{{ t('remaining') }}</span>
                  <span
                    class="font-medium"
                    :class="remainingAmount > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'"
                  >
                    {{ formatCurrency(remainingAmount) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Due Date & Notes -->
            <div v-if="invoice.due_date || invoice.notes" class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <div v-if="invoice.due_date" class="mb-3">
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('due_date') }}:</span>
                <span class="text-sm text-gray-900 dark:text-white ml-2">{{ formatDate(invoice.due_date) }}</span>
              </div>
              <div v-if="invoice.notes">
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('notes') }}:</span>
                <p class="text-sm text-gray-700 dark:text-gray-300 mt-1">{{ invoice.notes }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Record Payment Modal -->
      <AppModal :show="showPaymentModal" :title="t('record_payment')" size="md" @close="showPaymentModal = false">
        <div class="space-y-4">
          <AppInput
            v-model.number="paymentForm.amount"
            :label="t('amount')"
            type="number"
            step="0.01"
            min="0"
            :max="remainingAmount"
            :placeholder="`Max: ${formatCurrency(remainingAmount)}`"
            required
          />
          <AppSelect
            v-model="paymentForm.method"
            :label="t('payment_method')"
            :options="paymentMethodOptions"
            required
          />
          <AppInput
            v-model="paymentForm.payment_date"
            :label="t('payment_date')"
            type="date"
            required
          />
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('notes') }}</label>
            <textarea
              v-model="paymentForm.notes"
              rows="2"
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
            />
          </div>
        </div>
        <template #footer>
          <AppButton variant="secondary" @click="showPaymentModal = false">{{ t('cancel') }}</AppButton>
          <AppButton variant="primary" :loading="paymentSaving" @click="recordPayment">{{ t('save') }}</AppButton>
        </template>
      </AppModal>

      <!-- Delete Confirmation Modal -->
      <AppModal :show="showDeleteModal" :title="t('confirm_delete')" size="sm" @close="showDeleteModal = false">
        <p class="text-gray-700 dark:text-gray-300">{{ t('confirm_delete') }}</p>
        <template #footer>
          <AppButton variant="secondary" @click="showDeleteModal = false">{{ t('cancel') }}</AppButton>
          <AppButton variant="danger" :loading="deleting" @click="deleteInvoice">{{ t('yes') }}</AppButton>
        </template>
      </AppModal>
      <!-- Print-friendly invoice (hidden, shown only in print) -->
      <div id="print-invoice" class="hidden print:block print-invoice-content" v-if="invoice">
        <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h1 style="text-align: center; font-size: 24px; margin-bottom: 5px;">{{ t('invoice') }}</h1>
          <p style="text-align: center; color: #666; margin-bottom: 20px;">{{ invoice.invoice_number }}</p>
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div>
              <strong>{{ invoice.type === 'sale' ? t('customer') : t('supplier') }}:</strong><br/>
              {{ partyName }}<br/>
              <span v-if="partyPhone">{{ partyPhone }}</span>
            </div>
            <div style="text-align: right;">
              <strong>{{ t('date') }}:</strong> {{ formatDate(invoice.created_at) }}<br/>
              <strong>{{ t('status') }}:</strong> {{ t(invoice.status) }}<br/>
              <span v-if="invoice.due_date"><strong>{{ t('due_date') }}:</strong> {{ formatDate(invoice.due_date) }}</span>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="border-bottom: 2px solid #333;">
                <th style="text-align: left; padding: 8px;">{{ t('products') }}</th>
                <th style="text-align: center; padding: 8px;">{{ t('quantity') }}</th>
                <th style="text-align: right; padding: 8px;">{{ t('unit_price') }}</th>
                <th style="text-align: right; padding: 8px;">{{ t('total') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in invoice.items" :key="item.uuid || item.product_uuid" style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;">{{ item.product?.name_en || item.product?.name || '-' }}</td>
                <td style="text-align: center; padding: 8px;">{{ item.quantity }}</td>
                <td style="text-align: right; padding: 8px;">{{ formatCurrency(item.unit_price) }}</td>
                <td style="text-align: right; padding: 8px;">{{ formatCurrency(item.total) }}</td>
              </tr>
            </tbody>
          </table>
          <div style="text-align: right;">
            <p>{{ t('subtotal') }}: {{ formatCurrency(invoice.subtotal) }}</p>
            <p v-if="invoice.tax_amount">{{ t('tax') }}: {{ formatCurrency(invoice.tax_amount) }}</p>
            <p v-if="invoice.discount_amount">{{ t('discount') }}: -{{ formatCurrency(invoice.discount_amount) }}</p>
            <p style="font-size: 18px; font-weight: bold;">{{ t('total') }}: {{ formatCurrency(invoice.total) }}</p>
            <p>{{ t('paid') }}: {{ formatCurrency(invoice.paid_amount) }}</p>
            <p>{{ t('remaining') }}: {{ formatCurrency(remainingAmount) }}</p>
          </div>
          <p v-if="invoice.notes" style="margin-top: 20px; color: #666;">{{ t('notes') }}: {{ invoice.notes }}</p>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style>
@media print {
  body * { visibility: hidden !important; }
  #print-invoice, #print-invoice * { visibility: visible !important; }
  #print-invoice { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
  .print-invoice-content { display: block !important; }
}
</style>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { formatMoney } from '../../composables/currency.js';
import { useRouter, useRoute } from 'vue-router';
import api from '../../composables/useApi.js';
import { t } from '../../i18n/index.js';
import { useUiStore } from '../../stores/ui.js';
import { printInvoice as printInvoiceDoc } from '../../composables/print.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppBadge from '../../components/base/AppBadge.vue';
import AppDataTable from '../../components/base/AppDataTable.vue';
import AppModal from '../../components/base/AppModal.vue';
import AppInput from '../../components/base/AppInput.vue';
import AppSelect from '../../components/base/AppSelect.vue';

const router = useRouter();
const route = useRoute();
const uuid = computed(() => route.params.uuid);

const invoice = ref(null);
const payments = ref([]);
const loading = ref(true);
const paymentsLoading = ref(false);
const error = ref('');
const showPaymentModal = ref(false);
const showDeleteModal = ref(false);
const paymentSaving = ref(false);
const deleting = ref(false);

const paymentForm = reactive({
  amount: 0,
  method: 'cash',
  payment_date: new Date().toISOString().slice(0, 10),
  notes: '',
});

const paymentMethodOptions = [
  { value: 'cash', label: t('cash') },
  { value: 'cheque', label: t('cheques') },
  { value: 'bank_transfer', label: t('bank_transfer') },
];

const itemColumns = [
  { key: 'product', label: t('products') },
  { key: 'quantity', label: t('quantity') },
  { key: 'unit_price', label: t('unit_price') },
  { key: 'total', label: t('total') },
];

const paymentColumns = [
  { key: 'payment_date', label: t('payment_date') },
  { key: 'amount', label: t('amount') },
  { key: 'method', label: t('payment_method') },
  { key: 'notes', label: t('notes') },
];

const remainingAmount = computed(() => {
  if (!invoice.value) return 0;
  return Math.max(0, (parseFloat(invoice.value.total) || 0) - (parseFloat(invoice.value.paid_amount) || 0));
});

const partyName = computed(() => {
  if (!invoice.value) return '-';
  if (invoice.value.type === 'sale') {
    return invoice.value.customer?.name || invoice.value.customer?.name_en || '-';
  }
  return invoice.value.supplier?.name || invoice.value.supplier?.name_en || '-';
});

const partyPhone = computed(() => {
  if (!invoice.value) return '';
  const party = invoice.value.type === 'sale' ? invoice.value.customer : invoice.value.supplier;
  return party?.phone || '';
});

const partyAddress = computed(() => {
  if (!invoice.value) return '';
  const party = invoice.value.type === 'sale' ? invoice.value.customer : invoice.value.supplier;
  return party?.address || '';
});

const partyUuid = computed(() => {
  if (!invoice.value) return '';
  const party = invoice.value.type === 'sale' ? invoice.value.customer : invoice.value.supplier;
  return party?.uuid || '';
});

function statusVariant(status) {
  const map = { paid: 'success', partial: 'warning', unpaid: 'danger' };
  return map[status] || 'neutral';
}

function formatCurrency(value) {
  return formatMoney(value);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

async function fetchInvoice() {
  loading.value = true;
  error.value = '';
  try {
    const response = await api.get('/invoices/' + uuid.value);
    invoice.value = response.data.data || response.data;
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load invoice.';
  } finally {
    loading.value = false;
  }
}

async function fetchPayments() {
  paymentsLoading.value = true;
  try {
    const response = await api.get('/payments/invoice/' + uuid.value);
    payments.value = response.data.data || response.data;
  } catch (e) {
    // Silently fail for payments
    payments.value = [];
  } finally {
    paymentsLoading.value = false;
  }
}

async function recordPayment() {
  if (!paymentForm.amount || paymentForm.amount <= 0) return;
  if (paymentForm.amount > remainingAmount.value) {
    paymentForm.amount = remainingAmount.value;
  }

  paymentSaving.value = true;
  try {
    await api.post('/payments', {
      invoice_uuid: uuid.value,
      amount: paymentForm.amount,
      method: paymentForm.method,
      payment_date: paymentForm.payment_date,
      notes: paymentForm.notes || null,
    });

    showPaymentModal.value = false;
    paymentForm.amount = 0;
    paymentForm.notes = '';

    // Refresh data
    await Promise.all([fetchInvoice(), fetchPayments()]);
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to record payment.';
  } finally {
    paymentSaving.value = false;
  }
}

const ui = useUiStore();

async function shareInvoice() {
  if (!invoice.value) return;
  const inv = invoice.value;
  const biz = ui.settings.business_name || '';
  const lines = (inv.items || []).map(
    (it) => `• ${it.product?.name_en || it.product?.name || '-'} ×${it.quantity} = ${ui.formatPrice(it.total)}`
  ).join('\n');
  const text = `${biz ? biz + '\n' : ''}${t('invoice')} ${inv.invoice_number}\n${partyName.value}\n\n${lines}\n\n${t('total')}: ${ui.formatPrice(inv.total)}\n${t('paid')}: ${ui.formatPrice(inv.paid_amount)}\n${t('remaining')}: ${ui.formatPrice(remainingAmount.value)}`;
  const shareData = { title: `${t('invoice')} ${inv.invoice_number}`, text };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  // Fallback: WhatsApp (or copy to clipboard)
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(wa, '_blank');
}

function printInvoice() {
  if (!invoice.value) return;
  printInvoiceDoc({
    invoice: invoice.value,
    settings: ui.settings,
    fmt: (v) => ui.formatPrice(v),
    t,
    partyName: partyName.value,
    partyPhone: partyPhone.value,
  });
}

function confirmDelete() {
  showDeleteModal.value = true;
}

async function deleteInvoice() {
  deleting.value = true;
  try {
    await api.delete('/invoices/' + uuid.value);
    router.push('/invoices');
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to delete invoice.';
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  await fetchInvoice();
  if (invoice.value) {
    fetchPayments();
  }
});
</script>
