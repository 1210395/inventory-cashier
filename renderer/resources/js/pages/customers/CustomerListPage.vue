<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('customers') }}</h1>
        <AppButton variant="primary" @click="openModal()">
          + {{ t('add') }} {{ t('customer') }}
        </AppButton>
      </div>

      <!-- Search bar -->
      <div class="mb-4">
        <input
          v-model="search"
          type="text"
          :placeholder="t('search')"
          class="w-full max-w-md rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
        />
      </div>

      <!-- Error message -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Success message -->
      <div v-if="successMsg" class="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
        {{ successMsg }}
      </div>

      <!-- Data Table -->
      <AppDataTable
        :columns="columns"
        :data="filteredItems"
        :loading="loading"
        :empty-message="t('no_data')"
      >
        <template #empty>
          <div class="text-center py-16">
            <div class="text-6xl mb-4">&#x1F465;</div>
            <h3 class="text-lg font-medium text-gray-500 dark:text-gray-400">{{ t('no_customers_yet') || 'No customers yet' }}</h3>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">{{ t('add_first_customer') || 'Add your first customer to get started' }}</p>
            <AppButton variant="primary" class="mt-4" @click="openModal()">+ {{ t('add') }} {{ t('customer') }}</AppButton>
          </div>
        </template>
        <template #cell-actions="{ item }">
          <div class="flex items-center gap-2">
            <AppButton size="sm" variant="ghost" @click="$router.push('/customers/' + item.uuid + '/statement')">
              {{ t('statement') }}
            </AppButton>
            <AppButton size="sm" variant="ghost" @click="openModal(item)">
              {{ t('edit') }}
            </AppButton>
            <AppButton size="sm" variant="danger" @click="confirmDelete(item)">
              {{ t('delete') }}
            </AppButton>
          </div>
        </template>
      </AppDataTable>

      <!-- Add/Edit Modal -->
      <AppModal :show="showFormModal" :title="editingItem ? t('edit') + ' ' + t('customer') : t('add') + ' ' + t('customer')" size="md" @close="showFormModal = false">
        <div class="space-y-4">
          <AppInput
            v-model="form.name"
            :label="t('name')"
            :placeholder="t('name')"
            :error="formErrors.name"
            required
          />
          <AppInput
            v-model="form.phone"
            :label="t('phone')"
            :placeholder="t('phone')"
            :error="formErrors.phone"
          />
          <AppInput
            v-model="form.email"
            :label="t('email')"
            type="email"
            :placeholder="t('email')"
            :error="formErrors.email"
          />
          <AppInput
            v-model="form.address"
            :label="t('address')"
            :placeholder="t('address')"
            :error="formErrors.address"
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
          <AppButton variant="primary" :loading="submitting" @click="submitForm">{{ t('save') }}</AppButton>
        </template>
      </AppModal>

      <!-- Delete confirmation modal -->
      <AppModal :show="showDeleteModal" :title="t('confirm_delete')" size="sm" @close="showDeleteModal = false">
        <p class="text-gray-700 dark:text-gray-300">{{ t('confirm_delete_customer') }}</p>
        <div v-if="deleteTargetHasInvoices" class="mt-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-700 dark:text-yellow-400">
          {{ t('has_invoices_warning') }}
        </div>
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
import api from '../../composables/useApi.js';
import { t } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppInput from '../../components/base/AppInput.vue';
import AppDataTable from '../../components/base/AppDataTable.vue';
import AppModal from '../../components/base/AppModal.vue';

const items = ref([]);
const loading = ref(true);
const error = ref('');
const search = ref('');
const successMsg = ref('');

function showSuccess(msg) {
  successMsg.value = msg;
  setTimeout(() => successMsg.value = '', 3000);
}

const showFormModal = ref(false);
const editingItem = ref(null);
const form = ref({ name: '', phone: '', email: '', address: '', notes: '' });
const formErrors = ref({});
const submitting = ref(false);

const showDeleteModal = ref(false);
const deleteTarget = ref(null);
const deleteTargetHasInvoices = ref(false);
const deleting = ref(false);

const columns = [
  { key: 'name', label: t('name'), sortable: true },
  { key: 'phone', label: t('phone'), sortable: true },
  { key: 'email', label: t('email'), sortable: true },
  { key: 'address', label: t('address') },
  { key: 'actions', label: t('actions'), class: 'text-right' },
];

const filteredItems = computed(() => {
  if (!search.value) return items.value;
  const q = search.value.toLowerCase();
  return items.value.filter((c) =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.phone || '').toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q)
  );
});

function openModal(item = null) {
  editingItem.value = item;
  formErrors.value = {};
  if (item) {
    form.value = {
      name: item.name || '',
      phone: item.phone || '',
      email: item.email || '',
      address: item.address || '',
      notes: item.notes || '',
    };
  } else {
    form.value = { name: '', phone: '', email: '', address: '', notes: '' };
  }
  showFormModal.value = true;
}

async function confirmDelete(item) {
  deleteTarget.value = item;
  deleteTargetHasInvoices.value = false;
  try {
    const res = await api.get('/invoices', { params: { customer_uuid: item.uuid, per_page: 1 } });
    const data = res.data.data || res.data;
    if (data && data.length > 0) {
      deleteTargetHasInvoices.value = true;
    }
  } catch (e) {
    // Ignore - just show modal without warning
  }
  showDeleteModal.value = true;
}

async function submitForm() {
  const e = {};
  if (!form.value.name) e.name = 'Required';
  formErrors.value = e;
  if (Object.keys(e).length > 0) return;

  submitting.value = true;
  error.value = '';
  try {
    if (editingItem.value) {
      await api.put('/customers/' + editingItem.value.uuid, form.value);
    } else {
      await api.post('/customers', form.value);
    }
    showFormModal.value = false;
    showSuccess(editingItem.value ? (t('saved') || 'Saved successfully') : (t('saved') || 'Created successfully'));
    await fetchData();
  } catch (err) {
    if (err.response?.status === 422 && err.response.data?.errors) {
      const mapped = {};
      for (const key in err.response.data.errors) {
        mapped[key] = err.response.data.errors[key][0];
      }
      formErrors.value = mapped;
    } else {
      error.value = err.response?.data?.message || 'Failed to save customer.';
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
    await api.delete('/customers/' + deleteTarget.value.uuid);
    items.value = items.value.filter((c) => c.uuid !== deleteTarget.value.uuid);
    showDeleteModal.value = false;
    showSuccess(t('deleted') || 'Deleted successfully');
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to delete customer.';
    showDeleteModal.value = false;
  } finally {
    deleting.value = false;
  }
}

async function fetchData() {
  loading.value = true;
  try {
    const res = await api.get('/customers');
    items.value = res.data.data || res.data;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load customers.';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>
