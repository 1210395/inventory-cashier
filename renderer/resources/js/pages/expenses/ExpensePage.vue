<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('expenses') || 'Expenses' }}</h1>
        <AppButton variant="primary" @click="openModal()">
          + {{ t('add') }} {{ t('expense') || 'Expense' }}
        </AppButton>
      </div>

      <!-- Error message -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Date Range Filter -->
      <div class="flex items-center gap-2 mb-6 flex-wrap">
        <button
          v-for="preset in datePresets"
          :key="preset.value"
          class="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
          :class="activePreset === preset.value
            ? 'bg-[#D4A843] text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
          @click="setDatePreset(preset.value)"
        >
          {{ preset.label }}
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- Total -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('total') || 'Total Expenses' }}</p>
          <p class="text-2xl font-bold text-[#D4A843] mt-1">{{ formatCurrency(totalExpenses) }}</p>
        </div>
        <!-- Category Breakdown -->
        <div
          v-for="cat in topCategories"
          :key="cat.category"
          class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
        >
          <p class="text-sm text-gray-500 dark:text-gray-400 capitalize">{{ cat.category }}</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(cat.total) }}</p>
        </div>
      </div>

      <!-- Success message -->
      <div v-if="successMsg" class="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
        {{ successMsg }}
      </div>

      <!-- Data Table -->
      <AppDataTable
        :columns="columns"
        :data="filteredExpenses"
        :loading="loading"
        :empty-message="t('no_data') || 'No expenses recorded'"
      >
        <template #empty>
          <div class="text-center py-16">
            <div class="text-6xl mb-4">&#x1F4B8;</div>
            <h3 class="text-lg font-medium text-gray-500 dark:text-gray-400">{{ t('no_expenses_yet') || 'No expenses yet' }}</h3>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">{{ t('add_first_expense') || 'Add your first expense to start tracking' }}</p>
            <AppButton variant="primary" class="mt-4" @click="openModal()">+ {{ t('add') }} {{ t('expense') || 'Expense' }}</AppButton>
          </div>
        </template>
        <template #cell-category="{ item }">
          <AppBadge :variant="categoryBadgeVariant(item.category)" :text="item.category" />
        </template>
        <template #cell-amount="{ item }">
          <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(item.amount) }}</span>
        </template>
        <template #cell-expense_date="{ item }">
          {{ formatDate(item.expense_date) }}
        </template>
        <template #cell-actions="{ item }">
          <div class="flex items-center gap-2">
            <AppButton size="sm" variant="ghost" @click="editExpense(item)">{{ t('edit') }}</AppButton>
            <AppButton size="sm" variant="danger" @click="removeExpense(item)">{{ t('delete') }}</AppButton>
          </div>
        </template>
      </AppDataTable>

      <!-- Add/Edit Modal -->
      <AppModal :show="showFormModal" :title="editingItem ? (t('edit') + ' ' + (t('expense') || 'Expense')) : (t('add') + ' ' + (t('expense') || 'Expense'))" size="md" @close="showFormModal = false">
        <div class="space-y-4">
          <AppSelect
            v-model="form.category"
            :label="t('category') || 'Category'"
            :options="categoryOptions"
            :error="formErrors.category"
            required
          />
          <AppInput
            v-model="form.description"
            :label="t('description') || 'Description'"
            :placeholder="t('description') || 'Expense description'"
            :error="formErrors.description"
            required
          />
          <AppInput
            v-model="form.amount"
            :label="t('amount')"
            type="number"
            :placeholder="t('amount')"
            :error="formErrors.amount"
            required
          />
          <AppInput
            v-model="form.expense_date"
            :label="t('date')"
            type="date"
            :error="formErrors.expense_date"
            required
          />
          <div>
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
          <AppButton variant="primary" @click="saveExpense">{{ t('save') }}</AppButton>
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
import AppDataTable from '../../components/base/AppDataTable.vue';
import AppModal from '../../components/base/AppModal.vue';
import AppBadge from '../../components/base/AppBadge.vue';

const expenses = ref([]);
const loading = ref(true);
const error = ref('');
const successMsg = ref('');
const activePreset = ref('this_month');
const showFormModal = ref(false);
const editingItem = ref(null);
const formErrors = ref({});

function showSuccess(msg) {
  successMsg.value = msg;
  setTimeout(() => successMsg.value = '', 3000);
}

const form = ref(emptyForm());

function emptyForm() {
  return {
    category: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
  };
}

const datePresets = [
  { value: 'today', label: t('today') || 'Today' },
  { value: 'this_week', label: t('this_week') || 'This Week' },
  { value: 'this_month', label: t('this_month') || 'This Month' },
  { value: 'this_year', label: t('this_year') || 'This Year' },
];

const categoryOptions = [
  { value: 'rent', label: 'Rent' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'transport', label: 'Transport' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'taxes_fees', label: t('taxes_fees') || 'Taxes & Fees' },
  { value: 'insurance', label: t('insurance') || 'Insurance' },
  { value: 'other', label: 'Other' },
];

const columns = [
  { key: 'expense_date', label: t('date') || 'Date', sortable: true },
  { key: 'category', label: t('category') || 'Category', sortable: true },
  { key: 'description', label: t('description') || 'Description' },
  { key: 'amount', label: t('amount') || 'Amount', sortable: true },
  { key: 'actions', label: t('actions') || 'Actions', class: 'text-right' },
];

function getDateRange(preset) {
  const now = new Date();
  const start = new Date();
  switch (preset) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'this_week': {
      const day = now.getDay();
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'this_month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'this_year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }
  return { start, end: now };
}

function setDatePreset(preset) {
  activePreset.value = preset;
}

const filteredExpenses = computed(() => {
  const { start, end } = getDateRange(activePreset.value);
  return expenses.value.filter((e) => {
    const d = new Date(e.expense_date);
    return d >= start && d <= end;
  });
});

const totalExpenses = computed(() =>
  filteredExpenses.value.reduce((sum, e) => sum + Number(e.amount || 0), 0)
);

const topCategories = computed(() => {
  const map = {};
  filteredExpenses.value.forEach((e) => {
    if (!map[e.category]) map[e.category] = 0;
    map[e.category] += Number(e.amount || 0);
  });
  return Object.entries(map)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);
});

function categoryBadgeVariant(category) {
  const map = {
    rent: 'info',
    salaries: 'warning',
    utilities: 'neutral',
    transport: 'info',
    supplies: 'success',
    marketing: 'warning',
    maintenance: 'danger',
    other: 'neutral',
  };
  return map[category] || 'neutral';
}

function formatCurrency(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString();
}

function openModal() {
  editingItem.value = null;
  formErrors.value = {};
  form.value = emptyForm();
  showFormModal.value = true;
}

function editExpense(item) {
  editingItem.value = item;
  formErrors.value = {};
  form.value = {
    category: item.category,
    description: item.description,
    amount: item.amount,
    expense_date: item.expense_date,
    notes: item.notes || '',
  };
  showFormModal.value = true;
}

async function saveExpense() {
  const e = {};
  if (!form.value.category) e.category = t('required') || 'Required';
  if (!form.value.description) e.description = t('required') || 'Required';
  if (!form.value.amount || Number(form.value.amount) <= 0) e.amount = t('required') || 'Required';
  if (!form.value.expense_date) e.expense_date = t('required') || 'Required';
  formErrors.value = e;
  if (Object.keys(e).length > 0) return;

  error.value = '';
  try {
    if (editingItem.value) {
      await api.put('/expenses/' + editingItem.value.uuid, form.value);
    } else {
      await api.post('/expenses', form.value);
    }
    showFormModal.value = false;
    showSuccess(editingItem.value ? (t('saved') || 'Saved successfully') : (t('saved') || 'Created successfully'));
    await fetchExpenses();
  } catch (err) {
    if (err.response?.status === 422 && err.response.data?.errors) {
      const mapped = {};
      for (const key in err.response.data.errors) {
        mapped[key] = err.response.data.errors[key][0];
      }
      formErrors.value = mapped;
    } else {
      error.value = err.response?.data?.message || 'Failed to save expense.';
      showFormModal.value = false;
    }
  }
}

async function removeExpense(item) {
  error.value = '';
  try {
    await api.delete('/expenses/' + (item.uuid || item.id));
    showSuccess(t('deleted') || 'Deleted successfully');
    await fetchExpenses();
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to delete expense.';
  }
}

async function fetchExpenses() {
  loading.value = true;
  try {
    const res = await api.get('/expenses');
    expenses.value = res.data.data || res.data || [];
  } catch (err) {
    // If API not available yet, fall back to empty
    expenses.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(fetchExpenses);
</script>
