<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('import_data') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Import customers, products, and more from JSON or CSV files</p>
      </div>

      <!-- Wizard Steps -->
      <div class="flex items-center gap-2 mb-8">
        <div
          v-for="(stepLabel, idx) in stepLabels"
          :key="idx"
          class="flex items-center gap-2"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
            :class="step > idx
              ? 'bg-green-500 text-white'
              : step === idx
                ? 'bg-[#D4A843] text-gray-900'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'"
          >
            <svg v-if="step > idx" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span v-else>{{ idx + 1 }}</span>
          </div>
          <span class="text-sm font-medium" :class="step >= idx ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'">{{ stepLabel }}</span>
          <svg v-if="idx < stepLabels.length - 1" class="w-5 h-5 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Step 1: Upload -->
      <div v-if="step === 0" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('upload_file') }}</h2>

        <!-- File upload -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload JSON or CSV file</label>
          <div
            class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-[#D4A843] transition-colors cursor-pointer"
            @click="$refs.fileInput.click()"
            @dragover.prevent
            @drop.prevent="handleDrop"
          >
            <input ref="fileInput" type="file" accept=".json,.csv" class="hidden" @change="handleFileSelect" />
            <svg class="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p class="text-sm text-gray-500 dark:text-gray-400">Click to upload or drag and drop</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">JSON or CSV files supported</p>
          </div>
          <p v-if="fileName" class="mt-2 text-sm text-green-600 dark:text-green-400">Selected: {{ fileName }}</p>
        </div>

        <!-- Or paste JSON -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Or paste JSON data</label>
          <textarea
            v-model="pastedJson"
            rows="8"
            placeholder='{"customers": [...], "products": [...]}'
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent font-mono"
          ></textarea>
        </div>

        <div class="flex justify-end">
          <AppButton variant="primary" @click="parseInput">{{ t('apply') }}</AppButton>
        </div>
      </div>

      <!-- Step 2: Field Mapping Preview -->
      <div v-if="step === 1" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('field_mapping') }}</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div v-for="(count, key) in previewCounts" :key="key" class="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <p class="text-sm text-gray-500 dark:text-gray-400 capitalize">{{ key }}</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ count }}</p>
          </div>
        </div>

        <!-- CSV column mapping -->
        <div v-if="csvMode && csvHeaders.length > 0" class="mb-6">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Map CSV columns to data type</h3>
          <div class="space-y-3">
            <div class="flex items-center gap-4">
              <label class="text-sm text-gray-600 dark:text-gray-400 w-32">Import as:</label>
              <select
                v-model="csvImportType"
                class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A843]"
              >
                <option value="customers">Customers</option>
                <option value="products">Products</option>
                <option value="suppliers">Suppliers</option>
              </select>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr>
                    <th class="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">CSV Column</th>
                    <th class="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Maps to Field</th>
                    <th class="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Sample Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(header, idx) in csvHeaders" :key="idx" class="border-t border-gray-100 dark:border-gray-700">
                    <td class="py-2 px-3 font-medium text-gray-900 dark:text-white">{{ header }}</td>
                    <td class="py-2 px-3">
                      <select
                        v-model="csvMapping[header]"
                        class="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                      >
                        <option value="">-- skip --</option>
                        <option v-for="field in availableFields" :key="field" :value="field">{{ field }}</option>
                      </select>
                    </td>
                    <td class="py-2 px-3 text-gray-500 dark:text-gray-400">{{ csvPreviewRow[header] || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- JSON preview -->
        <div v-if="!csvMode && parsedData" class="mb-6">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Data Preview</h3>
          <div class="max-h-64 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
            <pre class="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ JSON.stringify(parsedData, null, 2).substring(0, 3000) }}</pre>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <AppButton variant="secondary" @click="step = 0">{{ t('back') }}</AppButton>
          <AppButton variant="primary" @click="step = 2">{{ t('confirm_import') }}</AppButton>
        </div>
      </div>

      <!-- Step 3: Confirm and Import -->
      <div v-if="step === 2" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('confirm_import') }}</h2>
        <p class="text-gray-500 dark:text-gray-400 mb-6">
          You are about to import the following data. This action cannot be undone.
        </p>
        <div class="flex justify-center gap-4 mb-6">
          <div v-for="(count, key) in previewCounts" :key="key" class="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <p class="text-2xl font-bold text-[#D4A843]">{{ count }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 capitalize">{{ key }}</p>
          </div>
        </div>
        <div class="flex items-center justify-center gap-3">
          <AppButton variant="secondary" @click="step = 1">{{ t('back') }}</AppButton>
          <AppButton variant="primary" :loading="importing" @click="runImport">{{ t('confirm_import') }}</AppButton>
        </div>
      </div>

      <!-- Step 4: Results -->
      <div v-if="step === 3" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('import_results') }}</h2>
        <div class="flex justify-center gap-4 mb-6">
          <div v-for="(count, key) in importResults" :key="key" class="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ count }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 capitalize">{{ key }}</p>
          </div>
        </div>
        <AppButton variant="primary" @click="resetWizard">Import More</AppButton>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue';
import api from '../../composables/useApi.js';
import { t } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';

const step = ref(0);
const error = ref('');
const fileName = ref('');
const pastedJson = ref('');
const parsedData = ref(null);
const csvMode = ref(false);
const csvHeaders = ref([]);
const csvRows = ref([]);
const csvMapping = ref({});
const csvImportType = ref('customers');
const csvPreviewRow = ref({});
const importing = ref(false);
const importResults = ref({});

const stepLabels = [t('upload_file'), t('field_mapping'), t('confirm_import'), t('import_results')];

const availableFields = computed(() => {
  const maps = {
    customers: ['name', 'phone', 'email', 'address', 'notes'],
    products: ['name_en', 'name_ar', 'sku', 'barcode', 'cost_price', 'sell_price', 'quantity', 'min_quantity', 'description'],
    suppliers: ['name', 'phone', 'email', 'address'],
  };
  return maps[csvImportType.value] || maps.customers;
});

const previewCounts = computed(() => {
  if (csvMode.value) {
    return { [csvImportType.value]: csvRows.value.length };
  }
  if (!parsedData.value) return {};
  const counts = {};
  for (const key of ['customers', 'products', 'suppliers', 'categories']) {
    if (parsedData.value[key] && Array.isArray(parsedData.value[key])) {
      counts[key] = parsedData.value[key].length;
    }
  }
  return counts;
});

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) processFile(file);
}

function handleDrop(event) {
  const file = event.dataTransfer.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  fileName.value = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    if (file.name.endsWith('.csv')) {
      parseCSV(text);
    } else {
      pastedJson.value = text;
    }
  };
  reader.readAsText(file);
}

function parseCSV(text) {
  csvMode.value = true;
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) {
    error.value = 'CSV file must have at least a header row and one data row.';
    return;
  }
  csvHeaders.value = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  csvRows.value = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    csvHeaders.value.forEach((h, idx) => {
      row[h] = vals[idx] || '';
    });
    csvRows.value.push(row);
  }
  csvPreviewRow.value = csvRows.value[0] || {};
  // Auto-map columns with matching names
  const mapping = {};
  csvHeaders.value.forEach((h) => {
    const lower = h.toLowerCase().replace(/\s+/g, '_');
    if (availableFields.value.includes(lower)) {
      mapping[h] = lower;
    } else {
      mapping[h] = '';
    }
  });
  csvMapping.value = mapping;
}

function parseInput() {
  error.value = '';
  if (csvMode.value && csvRows.value.length > 0) {
    step.value = 1;
    return;
  }
  const text = pastedJson.value.trim();
  if (!text) {
    error.value = 'Please upload a file or paste JSON data.';
    return;
  }
  try {
    parsedData.value = JSON.parse(text);
    csvMode.value = false;
    step.value = 1;
  } catch (e) {
    error.value = 'Invalid JSON format. Please check your data.';
  }
}

function buildImportPayload() {
  if (csvMode.value) {
    const mapped = csvRows.value.map((row) => {
      const obj = {};
      for (const [csvCol, field] of Object.entries(csvMapping.value)) {
        if (field) obj[field] = row[csvCol];
      }
      return obj;
    });
    return { [csvImportType.value]: mapped };
  }
  return parsedData.value;
}

async function runImport() {
  importing.value = true;
  error.value = '';
  try {
    const payload = buildImportPayload();
    const res = await api.post('/import', payload);
    importResults.value = res.data.data || res.data || {};
    step.value = 3;
  } catch (e) {
    error.value = e.response?.data?.message || 'Import failed. Please check your data.';
  } finally {
    importing.value = false;
  }
}

function resetWizard() {
  step.value = 0;
  error.value = '';
  fileName.value = '';
  pastedJson.value = '';
  parsedData.value = null;
  csvMode.value = false;
  csvHeaders.value = [];
  csvRows.value = [];
  csvMapping.value = {};
  importResults.value = {};
}
</script>
