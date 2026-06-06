<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ isEdit ? t('edit') + ' ' + t('products') : t('add') + ' ' + t('products') }}
        </h1>
        <AppButton variant="ghost" @click="$router.push('/products')">
          {{ t('cancel') }}
        </AppButton>
      </div>

      <!-- Loading state -->
      <div v-if="pageLoading" class="space-y-4">
        <div v-for="i in 6" :key="i" class="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>

      <!-- Error message -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Form -->
      <form v-if="!pageLoading" @submit.prevent="submitForm" class="space-y-6">
        <!-- Image Upload Section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('product_image') }}</label>
          <div class="flex items-center gap-4">
            <div class="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden cursor-pointer"
                 @click="$refs.imageInput.click()">
              <img v-if="form.image" :src="form.image" class="w-full h-full object-cover" />
              <div v-else class="text-center text-gray-400">
                <div class="text-3xl">&#x1F4F7;</div>
                <div class="text-xs mt-1">Add Photo</div>
              </div>
            </div>
            <input ref="imageInput" type="file" accept="image/*" class="hidden" @change="onImageSelect" />
            <button v-if="form.image" type="button" @click="form.image = null" class="text-red-500 text-sm hover:text-red-700">Remove</button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Left column: Names & Identifiers -->
          <div class="space-y-4 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Basic Information</h2>
            <AppInput
              v-model="form.name_en"
              :label="t('name_en')"
              :placeholder="t('name_en')"
              :error="errors.name_en"
            />
            <AppInput
              v-model="form.name_ar"
              :label="t('name_ar')"
              :placeholder="t('name_ar')"
              :error="errors.name_ar"
            />
            <p v-if="errors.name_required" class="text-xs text-red-500 -mt-2">{{ errors.name_required }}</p>
            <AppInput
              v-model="form.sku"
              :label="t('sku')"
              :placeholder="t('sku')"
              :error="errors.sku"
            />
            <!-- Multi-barcode list. The first row is the primary barcode
                 (mirrors the legacy `barcode` column). Click + to add another;
                 click the X to remove an extra. 2026-06-06. -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('barcode') }}</label>
              <div
                v-for="(_, bi) in form.barcodes"
                :key="bi"
                class="flex items-end gap-2 mb-2"
              >
                <div class="flex-1">
                  <AppInput
                    :model-value="form.barcodes[bi]"
                    @update:modelValue="(v) => form.barcodes[bi] = v"
                    :placeholder="bi === 0 ? t('barcode') : (t('barcode') + ' #' + (bi + 1))"
                    :error="bi === 0 ? errors.barcode : ''"
                  />
                </div>
                <button
                  type="button"
                  :title="t('scan_barcode') || 'Scan Barcode'"
                  class="mb-1 p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:text-[#D4A843] hover:border-[#D4A843] transition-colors"
                  @click="openScannerForRow(bi)"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h2M3 19a2 2 0 002 2h2m10-18h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 7h.01M7 12h10M7 17h.01" />
                  </svg>
                </button>
                <button
                  v-if="form.barcodes.length > 1"
                  type="button"
                  :title="t('remove') || 'Remove'"
                  class="mb-1 p-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  @click="form.barcodes.splice(bi, 1)"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                class="text-xs px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:text-[#D4A843] hover:border-[#D4A843] transition-colors"
                @click="form.barcodes.push('')"
              >+ {{ t('add_another_barcode') || 'Add another barcode' }}</button>
            </div>
            <!-- Multi-category tag picker -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('categories') }}</label>
              <div class="flex flex-wrap gap-2 p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 min-h-[42px]">
                <button
                  v-for="cat in categoryOptions"
                  :key="cat.value"
                  type="button"
                  class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors"
                  :class="form.category_uuids.includes(cat.value)
                    ? 'bg-[#D4A843] text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
                  @click="toggleCategory(cat.value)"
                >
                  {{ cat.label }}
                  <svg v-if="form.category_uuids.includes(cat.value)" class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
              <p v-if="errors.category_uuids" class="mt-1 text-xs text-red-500">{{ errors.category_uuids }}</p>
            </div>
            <AppSelect
              v-model="form.supplier_uuid"
              :label="t('supplier')"
              :options="supplierOptions"
              :placeholder="t('supplier')"
              :error="errors.supplier_uuid"
            />
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('description') }}</label>
              <textarea
                v-model="form.description"
                rows="3"
                :placeholder="t('description')"
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
              ></textarea>
            </div>
          </div>

          <!-- Right column: Pricing & Stock -->
          <div class="space-y-4 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Pricing & Stock</h2>
            <AppInput
              v-model="form.cost_price"
              :label="t('cost_price')"
              type="number"
              :placeholder="t('cost_price')"
              :error="errors.cost_price"
              required
            />
            <AppInput
              v-model="form.sell_price"
              :label="t('sell_price')"
              type="number"
              :placeholder="t('sell_price')"
              :error="errors.sell_price"
              required
            />
            <AppInput
              v-model="form.quantity"
              :label="t('quantity')"
              type="number"
              :placeholder="t('quantity')"
              :error="errors.quantity"
              required
            />
            <AppInput
              v-model="form.min_quantity"
              :label="t('min_quantity')"
              type="number"
              :placeholder="t('min_quantity')"
              :error="errors.min_quantity"
            />
            <AppInput
              v-model="form.expiry_date"
              :label="t('expiry_date')"
              type="date"
              :placeholder="t('expiry_date')"
              :error="errors.expiry_date"
            />

            <!-- Show on POS toggle -->
            <div class="flex items-center gap-3 mt-2">
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="form.show_on_pos" class="sr-only peer" />
                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#D4A843] dark:peer-focus:ring-[#D4A843] rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-[#D4A843]"></div>
              </label>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('show_on_pos') }}</span>
            </div>

            <!-- Margin preview -->
            <div v-if="form.cost_price && form.sell_price" class="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Margin: <span class="font-semibold text-gray-900 dark:text-white">{{ marginDisplay }}</span>
              </p>
            </div>

            <!-- Serial Numbers (edit mode only) -->
            <div v-if="isEdit" class="mt-6">
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{{ t('serial_numbers') }}</h3>
              <div v-if="existingSerials.length > 0" class="space-y-1 mb-3">
                <div
                  v-for="(serial, idx) in existingSerials"
                  :key="idx"
                  class="flex items-center justify-between px-3 py-1.5 rounded bg-gray-50 dark:bg-gray-700/50 text-sm"
                >
                  <span class="text-gray-900 dark:text-white">{{ serial.serial_number }}</span>
                  <span
                    class="text-xs px-2 py-0.5 rounded-full"
                    :class="serial.status === 'sold'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'"
                  >{{ serial.status === 'sold' ? t('sold') : t('available') }}</span>
                </div>
              </div>
              <p v-else class="text-sm text-gray-400 dark:text-gray-500 mb-3">{{ t('no_data') }}</p>
              <div class="flex items-center gap-2">
                <input
                  v-model="newSerial"
                  type="text"
                  :placeholder="t('add_serial')"
                  class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
                  @keydown.enter.prevent="addSerial"
                />
                <AppButton type="button" variant="primary" size="sm" @click="addSerial">{{ t('add') }}</AppButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Submit buttons -->
        <div class="flex items-center gap-3 pt-2">
          <AppButton type="submit" variant="primary" :loading="submitting">
            {{ t('save') }}
          </AppButton>
          <AppButton variant="secondary" @click="$router.push('/products')">
            {{ t('cancel') }}
          </AppButton>
        </div>
      </form>

      <BarcodeScanner :show="showScanner" @detected="onScanDetected" @close="showScanner = false" />
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api, { cachedGet } from '../../composables/useApi.js';
import { t } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppInput from '../../components/base/AppInput.vue';
import AppSelect from '../../components/base/AppSelect.vue';
import BarcodeScanner from '../../components/base/BarcodeScanner.vue';

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => !!route.params.uuid);
const pageLoading = ref(false);
const submitting = ref(false);
const error = ref('');
const errors = ref({});
const showScanner = ref(false);
// Which barcode row should receive the next scan. -1 = none open.
const scannerTargetRow = ref(-1);
function openScannerForRow(rowIndex) {
  scannerTargetRow.value = rowIndex;
  showScanner.value = true;
}
function onScanDetected(code) {
  if (code && scannerTargetRow.value >= 0) {
    // Set into the targeted barcode row instead of clobbering the primary.
    if (form.value.barcodes.length <= scannerTargetRow.value) {
      form.value.barcodes.push(code);
    } else {
      form.value.barcodes[scannerTargetRow.value] = code;
    }
  } else if (code) {
    // Fallback for the legacy single-barcode case
    if (form.value.barcodes.length === 0) form.value.barcodes.push(code);
    else form.value.barcodes[0] = code;
  }
  scannerTargetRow.value = -1;
  showScanner.value = false;
}

const form = ref({
  name_en: '',
  name_ar: '',
  sku: '',
  // barcodes[0] is the primary (sent to BE as `barcode` for legacy lookups).
  // Always has at least one row so the UI doesn't render zero inputs.
  barcodes: [''],
  description: '',
  category_uuids: [],
  supplier_uuid: '',
  cost_price: '',
  sell_price: '',
  quantity: '',
  min_quantity: '',
  expiry_date: '',
  show_on_pos: true,
  image: null,
});

function onImageSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { form.value.image = reader.result; };
  reader.readAsDataURL(file);
}

const existingSerials = ref([]);
const newSerial = ref('');

async function addSerial() {
  if (!newSerial.value.trim()) return;
  try {
    await api.post('/products/' + route.params.uuid + '/serials', { serial_number: newSerial.value.trim() });
    existingSerials.value.push({ serial_number: newSerial.value.trim(), status: 'available' });
    newSerial.value = '';
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to add serial number.';
  }
}

// child-uuid → parent-uuid map, built when categories are flattened. Used by
// toggleCategory so that selecting a subcategory automatically pulls the
// parent main category into the selection (and removing the parent drops
// the children too). 2026-06-06.
const categoryParentMap = ref(new Map());

function toggleCategory(uuid) {
  const idx = form.value.category_uuids.indexOf(uuid);
  if (idx >= 0) {
    // Removing the parent → also drop any of its currently-selected children.
    form.value.category_uuids.splice(idx, 1);
    const childrenOfRemoved = [];
    for (const [childUuid, parentUuid] of categoryParentMap.value.entries()) {
      if (parentUuid === uuid) childrenOfRemoved.push(childUuid);
    }
    form.value.category_uuids = form.value.category_uuids.filter(
      (u) => !childrenOfRemoved.includes(u)
    );
  } else {
    form.value.category_uuids.push(uuid);
    // If this is a subcategory, ensure its parent is also selected.
    const parentUuid = categoryParentMap.value.get(uuid);
    if (parentUuid && !form.value.category_uuids.includes(parentUuid)) {
      form.value.category_uuids.push(parentUuid);
    }
  }
}

const categoryOptions = ref([]);
const supplierOptions = ref([]);

const marginDisplay = computed(() => {
  const cost = parseFloat(form.value.cost_price) || 0;
  const sell = parseFloat(form.value.sell_price) || 0;
  if (cost === 0) return '-';
  const margin = ((sell - cost) / cost) * 100;
  return margin.toFixed(1) + '%';
});

function validate() {
  const e = {};
  if (!form.value.name_en && !form.value.name_ar) {
    e.name_required = t('at_least_one_name_required');
  }
  if (!form.value.cost_price && form.value.cost_price !== 0) e.cost_price = 'Required';
  if (!form.value.sell_price && form.value.sell_price !== 0) e.sell_price = 'Required';
  if (!form.value.quantity && form.value.quantity !== 0) e.quantity = 'Required';
  errors.value = e;
  return Object.keys(e).length === 0;
}

async function submitForm() {
  if (!validate()) return;
  submitting.value = true;
  error.value = '';
  try {
    // Sanitize barcodes: trim + drop blanks. The BE re-runs the same
    // normalization, but doing it here keeps the legacy `barcode` field in
    // sync with what the user just typed.
    const cleanBarcodes = (form.value.barcodes || [])
      .map((b) => (typeof b === 'string' ? b.trim() : ''))
      .filter((b) => b !== '');
    const payload = {
      ...form.value,
      category_uuids: form.value.category_uuids,
      barcodes: cleanBarcodes,
      barcode: cleanBarcodes[0] || null,
    };
    delete payload.category_uuid;
    if (isEdit.value) {
      await api.put('/products/' + route.params.uuid, payload);
    } else {
      await api.post('/products', payload);
    }
    router.push('/products');
  } catch (e) {
    if (e.response?.status === 422 && e.response.data?.errors) {
      const serverErrors = e.response.data.errors;
      const mapped = {};
      for (const key in serverErrors) {
        mapped[key] = serverErrors[key][0];
      }
      errors.value = mapped;
    } else {
      error.value = e.response?.data?.message || 'Failed to save product.';
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  pageLoading.value = true;
  try {
    const [catRes, supRes] = await Promise.all([
      cachedGet('/categories', { params: { all: true } }),
      cachedGet('/suppliers'),
    ]);
    const rawCategories = catRes.data.data || catRes.data;
    // Flatten the category tree into a tag-picker list AND build the
    // child→parent map that toggleCategory uses to auto-select the parent
    // when a subcategory is picked.
    const flatCategories = [];
    const parentMap = new Map();
    rawCategories.forEach((c) => {
      flatCategories.push({ value: c.uuid, label: c.name_en });
      if (c.children && c.children.length > 0) {
        c.children.forEach((child) => {
          flatCategories.push({ value: child.uuid, label: `${c.name_en} > ${child.name_en}` });
          parentMap.set(child.uuid, c.uuid);
        });
      }
    });
    categoryOptions.value = flatCategories;
    categoryParentMap.value = parentMap;
    supplierOptions.value = (supRes.data.data || supRes.data).map((s) => ({
      value: s.uuid,
      label: s.name || s.name_en,
    }));

    if (isEdit.value) {
      const res = await api.get('/products/' + route.params.uuid);
      const p = res.data.data || res.data;
      // BE returns `barcodes` as an array; fall back to wrapping the legacy
      // single `barcode` for products that pre-date the migration. Empty array
      // → seed one empty row so the form renders an editable input.
      const loadedBarcodes = Array.isArray(p.barcodes) && p.barcodes.length > 0
        ? p.barcodes.map((b) => String(b))
        : (p.barcode ? [String(p.barcode)] : ['']);
      form.value = {
        name_en: p.name_en || '',
        name_ar: p.name_ar || '',
        sku: p.sku || '',
        barcodes: loadedBarcodes,
        description: p.description || '',
        category_uuids: p.categories ? p.categories.map((c) => c.uuid) : (p.category_uuid ? [p.category_uuid] : []),
        supplier_uuid: p.supplier_uuid || '',
        cost_price: p.cost_price ?? '',
        sell_price: p.sell_price ?? '',
        quantity: p.quantity ?? '',
        min_quantity: p.min_quantity ?? '',
        expiry_date: p.expiry_date || '',
        show_on_pos: p.show_on_pos !== false && p.show_on_pos !== 0,
        image: p.image || null,
      };
      existingSerials.value = p.serials || [];
      // Try to load serials from separate endpoint if not included
      if (!p.serials) {
        try {
          const serialRes = await api.get('/products/' + route.params.uuid + '/serials');
          existingSerials.value = serialRes.data.data || serialRes.data || [];
        } catch (e) {
          // Serials endpoint may not exist yet
        }
      }
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load form data.';
  } finally {
    pageLoading.value = false;
  }
});
</script>
