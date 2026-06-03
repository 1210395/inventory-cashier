<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('categories') }}</h1>
        <AppButton variant="primary" @click="openModal()">
          + {{ t('add') }} {{ t('category') }}
        </AppButton>
      </div>

      <!-- Error message -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
      </div>

      <!-- Category Tree -->
      <div v-if="!loading && treeCategories.length > 0" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <template v-for="cat in treeCategories" :key="cat.uuid">
          <!-- Parent row -->
          <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <div class="flex items-center gap-3">
              <button
                v-if="cat.children && cat.children.length > 0"
                class="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                @click="toggleExpand(cat.uuid)"
              >
                <svg class="w-4 h-4 transition-transform" :class="expandedIds.includes(cat.uuid) ? 'rotate-90' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <span v-else class="w-6"></span>
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ cat.name_en || cat.name_ar }}</p>
                <p v-if="cat.name_ar && cat.name_en" class="text-xs text-gray-400 dark:text-gray-500">{{ cat.name_ar }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-gray-400 dark:text-gray-500">
                {{ cat.products_count ?? (cat.products ? cat.products.length : 0) }} {{ t('product_count') }}
              </span>
              <AppButton size="sm" variant="ghost" @click="openModal(null, cat.uuid)">
                + {{ t('subcategory') }}
              </AppButton>
              <AppButton size="sm" variant="ghost" @click="openModal(cat)">
                {{ t('edit') }}
              </AppButton>
              <AppButton size="sm" variant="danger" @click="confirmDelete(cat)">
                {{ t('delete') }}
              </AppButton>
            </div>
          </div>
          <!-- Children rows -->
          <template v-if="expandedIds.includes(cat.uuid) && cat.children && cat.children.length > 0">
            <div
              v-for="child in cat.children"
              :key="child.uuid"
              class="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors bg-gray-50/50 dark:bg-gray-800/50"
            >
              <div class="flex items-center gap-3 pl-9">
                <div class="w-4 border-l-2 border-b-2 border-gray-300 dark:border-gray-600 h-4 -mt-2 rounded-bl-sm"></div>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ child.name_en || child.name_ar }}</p>
                  <p v-if="child.name_ar && child.name_en" class="text-xs text-gray-400 dark:text-gray-500">{{ child.name_ar }}</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs text-gray-400 dark:text-gray-500">
                  {{ child.products_count ?? (child.products ? child.products.length : 0) }} {{ t('product_count') }}
                </span>
                <AppButton size="sm" variant="ghost" @click="openModal(child)">
                  {{ t('edit') }}
                </AppButton>
                <AppButton size="sm" variant="danger" @click="confirmDelete(child)">
                  {{ t('delete') }}
                </AppButton>
              </div>
            </div>
          </template>
        </template>
      </div>

      <div v-if="!loading && treeCategories.length === 0" class="text-center py-16">
        <div class="text-6xl mb-4">&#x1F4C1;</div>
        <h3 class="text-lg font-medium text-gray-500 dark:text-gray-400">{{ t('no_categories_yet') || 'No categories yet' }}</h3>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">{{ t('add_first_category') || 'Add your first category to organize products' }}</p>
        <AppButton variant="primary" class="mt-4" @click="openModal()">+ {{ t('add') }} {{ t('category') }}</AppButton>
      </div>

      <!-- Success message -->
      <div v-if="successMsg" class="mt-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
        {{ successMsg }}
      </div>

      <!-- Add/Edit Modal -->
      <AppModal :show="showFormModal" :title="editingItem ? t('edit') + ' ' + t('category') : t('add') + ' ' + t('category')" size="md" @close="showFormModal = false">
        <div class="space-y-4">
          <AppInput
            v-model="form.name_en"
            :label="t('name_en')"
            :placeholder="t('name_en')"
            :error="formErrors.name_en"
          />
          <AppInput
            v-model="form.name_ar"
            :label="t('name_ar')"
            :placeholder="t('name_ar')"
            :error="formErrors.name_ar"
          />
          <p class="text-xs text-gray-400 -mt-2">{{ t('name_required_either') || 'Enter a name in English or Arabic (one is enough).' }}</p>
          <AppSelect
            v-model="form.parent_uuid"
            :label="t('parent_category')"
            :options="parentOptions"
            placeholder="None"
          />
        </div>
        <template #footer>
          <AppButton variant="secondary" @click="showFormModal = false">{{ t('cancel') }}</AppButton>
          <AppButton variant="primary" :loading="submitting" @click="submitForm">{{ t('save') }}</AppButton>
        </template>
      </AppModal>

      <!-- Delete confirmation modal -->
      <AppModal :show="showDeleteModal" :title="t('confirm_delete')" size="sm" @close="showDeleteModal = false">
        <p class="text-gray-700 dark:text-gray-300">{{ t('confirm_delete') }}</p>
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
import AppSelect from '../../components/base/AppSelect.vue';
import AppModal from '../../components/base/AppModal.vue';

const treeCategories = ref([]);
const flatCategories = ref([]);
const expandedIds = ref([]);
const loading = ref(true);
const error = ref('');
const successMsg = ref('');

function showSuccess(msg) {
  successMsg.value = msg;
  setTimeout(() => successMsg.value = '', 3000);
}

const showFormModal = ref(false);
const editingItem = ref(null);
const form = ref({ name_en: '', name_ar: '', parent_uuid: '' });
const formErrors = ref({});
const submitting = ref(false);

const showDeleteModal = ref(false);
const deleteTarget = ref(null);
const deleting = ref(false);

const parentOptions = computed(() => {
  // Only top-level categories (no parent) can be parents
  return flatCategories.value
    .filter((c) => !c.parent_uuid && (!editingItem.value || c.uuid !== editingItem.value.uuid))
    .map((c) => ({ value: c.uuid, label: c.name_en || c.name_ar }));
});

function toggleExpand(uuid) {
  const idx = expandedIds.value.indexOf(uuid);
  if (idx >= 0) {
    expandedIds.value.splice(idx, 1);
  } else {
    expandedIds.value.push(uuid);
  }
}

function openModal(item = null, defaultParentUuid = '') {
  editingItem.value = item;
  formErrors.value = {};
  if (item) {
    form.value = { name_en: item.name_en || '', name_ar: item.name_ar || '', parent_uuid: item.parent_uuid || '' };
  } else {
    form.value = { name_en: '', name_ar: '', parent_uuid: defaultParentUuid };
  }
  showFormModal.value = true;
}

function confirmDelete(item) {
  deleteTarget.value = item;
  showDeleteModal.value = true;
}

async function submitForm() {
  const e = {};
  if (!form.value.name_en && !form.value.name_ar) e.name_en = t('name_required_either') || 'Enter a name (English or Arabic)';
  formErrors.value = e;
  if (Object.keys(e).length > 0) return;

  submitting.value = true;
  error.value = '';
  try {
    if (editingItem.value) {
      await api.put('/categories/' + editingItem.value.uuid, form.value);
    } else {
      await api.post('/categories', form.value);
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
      error.value = err.response?.data?.message || 'Failed to save category.';
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
    await api.delete('/categories/' + deleteTarget.value.uuid);
    showDeleteModal.value = false;
    showSuccess(t('deleted') || 'Deleted successfully');
    await fetchData();
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to delete category.';
    showDeleteModal.value = false;
  } finally {
    deleting.value = false;
  }
}

async function fetchData() {
  loading.value = true;
  try {
    const res = await api.get('/categories');
    const raw = res.data.data || res.data;
    // raw is a tree: each item may have children[]
    treeCategories.value = raw;
    // Build flat list for parent options
    const flat = [];
    raw.forEach((c) => {
      flat.push(c);
      if (c.children && c.children.length > 0) {
        c.children.forEach((child) => flat.push(child));
      }
    });
    flatCategories.value = flat;
    // Auto-expand categories that have children
    expandedIds.value = raw.filter((c) => c.children && c.children.length > 0).map((c) => c.uuid);
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load categories.';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>
