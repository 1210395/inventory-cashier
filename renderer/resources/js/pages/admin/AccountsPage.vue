<template>
  <AppLayout>
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Accounts</h1>
        <AppButton variant="primary" @click="openCreate">+ Add Account</AppButton>
      </div>

      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">{{ error }}</div>

      <AppDataTable :columns="columns" :data="users" :loading="loading" empty-message="No accounts">
        <template #cell-is_admin="{ item }">
          <AppBadge :variant="item.is_admin ? 'info' : 'neutral'" :text="item.is_admin ? 'Admin' : 'User'" />
        </template>
        <template #cell-is_active="{ item }">
          <AppBadge :variant="item.is_active ? 'success' : 'danger'" :text="item.is_active ? 'Active' : 'Inactive'" />
        </template>
        <template #cell-actions="{ item }">
          <div class="flex items-center gap-2">
            <AppButton size="sm" variant="secondary" @click="openEdit(item)">Edit</AppButton>
            <AppButton size="sm" variant="secondary" @click="openPassword(item)">Password</AppButton>
            <AppButton size="sm" :variant="item.is_active ? 'danger' : 'primary'" :disabled="item.uuid === me" @click="toggleActive(item)">
              {{ item.is_active ? 'Deactivate' : 'Activate' }}
            </AppButton>
          </div>
        </template>
      </AppDataTable>

      <!-- Create / Edit -->
      <AppModal :show="showForm" :title="editing ? 'Edit Account' : 'Add Account'" @close="showForm = false">
        <div class="space-y-4">
          <AppInput v-model="form.name" label="Name" :error="formErrors.name" required />
          <AppInput v-model="form.email" label="Email" type="email" :error="formErrors.email" required />
          <AppInput v-if="!editing" v-model="form.password" label="Password" type="password" :error="formErrors.password" required />
          <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" v-model="form.is_admin" :disabled="editing && editing.uuid === me" /> Administrator
          </label>
        </div>
        <template #footer>
          <AppButton variant="secondary" @click="showForm = false">Cancel</AppButton>
          <AppButton variant="primary" :disabled="busy" @click="save">Save</AppButton>
        </template>
      </AppModal>

      <!-- Reset password -->
      <AppModal :show="showPw" :title="'Reset password — ' + (pwUser?.name || '')" @close="showPw = false">
        <AppInput v-model="newPassword" label="New password" type="password" :error="pwError" required />
        <template #footer>
          <AppButton variant="secondary" @click="showPw = false">Cancel</AppButton>
          <AppButton variant="primary" :disabled="busy" @click="savePassword">Save</AppButton>
        </template>
      </AppModal>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../composables/useApi.js';
import { useAuthStore } from '../../stores/auth.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppInput from '../../components/base/AppInput.vue';
import AppDataTable from '../../components/base/AppDataTable.vue';
import AppModal from '../../components/base/AppModal.vue';
import AppBadge from '../../components/base/AppBadge.vue';

const auth = useAuthStore();
const me = auth.user?.uuid;
const users = ref([]);
const loading = ref(false);
const busy = ref(false);
const error = ref('');

const showForm = ref(false);
const editing = ref(null);
const form = ref({ name: '', email: '', password: '', is_admin: false });
const formErrors = ref({});

const showPw = ref(false);
const pwUser = ref(null);
const newPassword = ref('');
const pwError = ref('');

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'is_admin', label: 'Role' },
  { key: 'is_active', label: 'Status' },
  { key: 'actions', label: 'Actions', class: 'text-right' },
];

async function load() {
  loading.value = true; error.value = '';
  try { users.value = (await api.get('/accounts')).data; }
  catch (e) { error.value = e.response?.status === 403 ? 'Admin access required.' : 'Failed to load accounts.'; }
  finally { loading.value = false; }
}
onMounted(load);

function openCreate() { editing.value = null; form.value = { name: '', email: '', password: '', is_admin: false }; formErrors.value = {}; showForm.value = true; }
function openEdit(u) { editing.value = u; form.value = { name: u.name, email: u.email, password: '', is_admin: !!u.is_admin }; formErrors.value = {}; showForm.value = true; }

async function save() {
  formErrors.value = {};
  busy.value = true;
  try {
    if (editing.value) {
      await api.put(`/accounts/${editing.value.uuid}`, { name: form.value.name, email: form.value.email, is_admin: form.value.is_admin });
    } else {
      await api.post('/accounts', { name: form.value.name, email: form.value.email, password: form.value.password, is_admin: form.value.is_admin });
    }
    showForm.value = false; load();
  } catch (e) {
    if (e.response?.status === 422) formErrors.value = Object.fromEntries(Object.entries(e.response.data.errors || {}).map(([k, v]) => [k, v[0]]));
    else error.value = e.response?.data?.message || 'Save failed.';
  } finally { busy.value = false; }
}

function openPassword(u) { pwUser.value = u; newPassword.value = ''; pwError.value = ''; showPw.value = true; }
async function savePassword() {
  if (!newPassword.value || newPassword.value.length < 6) { pwError.value = 'Min 6 characters'; return; }
  busy.value = true;
  try { await api.post(`/accounts/${pwUser.value.uuid}/password`, { password: newPassword.value }); showPw.value = false; }
  catch (e) { pwError.value = e.response?.data?.message || 'Failed.'; }
  finally { busy.value = false; }
}

async function toggleActive(u) {
  if (!confirm(`${u.is_active ? 'Deactivate' : 'Activate'} ${u.name}?`)) return;
  try { await api.post(`/accounts/${u.uuid}/active`, { is_active: !u.is_active }); load(); }
  catch (e) { error.value = e.response?.data?.message || 'Failed.'; }
}
</script>
