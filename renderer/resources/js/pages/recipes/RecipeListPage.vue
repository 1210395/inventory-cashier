<template>
  <AppLayout>
    <div>
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('recipes') }}</h1>
        <AppButton variant="primary" @click="openModal()">{{ t('add') }} {{ t('recipe') }}</AppButton>
      </div>

      <!-- Error message -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>

      <!-- Recipes Table -->
      <div v-else-if="recipes.length > 0" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('name') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('output_product') }}</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('sell_price') }}</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('cost') }}</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('margin') }}</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('ingredients') }}</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="recipe in recipes"
              :key="recipe.uuid"
              class="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td class="px-4 py-3">
                <p class="font-medium text-gray-900 dark:text-white">{{ localizedName(recipe) }}</p>
                <p v-if="recipe.name_ar && recipe.name_en" class="text-xs text-gray-400">{{ recipe.name_ar }}</p>
              </td>
              <td class="px-4 py-3">
                <button
                  v-if="recipe.output_product_uuid"
                  class="text-[#D4A843] hover:underline font-medium text-left"
                  @click="router.push('/products/' + recipe.output_product_uuid)"
                >
                  {{ getProductName(recipe.output_product_uuid) }}
                </button>
                <span v-else class="text-gray-600 dark:text-gray-400">-</span>
              </td>
              <td class="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                {{ formatCurrency(recipe.sell_price) }}
              </td>
              <td class="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                {{ formatCurrency(recipeCost(recipe)) }}
              </td>
              <td class="px-4 py-3 text-right">
                <span
                  class="text-sm font-medium"
                  :class="recipeMargin(recipe) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'"
                >
                  {{ recipeMargin(recipe).toFixed(1) }}%
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {{ (recipe.ingredients || []).length }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button
                    v-if="recipe.output_product_uuid"
                    class="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors text-xs font-medium disabled:opacity-40"
                    :disabled="producingUuid === recipe.uuid"
                    @click="produceRecipe(recipe)"
                  >{{ producingUuid === recipe.uuid ? '…' : (t('produce') || 'Produce') }}</button>
                  <button
                    class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors text-xs font-medium"
                    @click="openModal(recipe)"
                  >{{ t('edit') }}</button>
                  <button
                    class="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors text-xs font-medium"
                    @click="deleteRecipe(recipe)"
                  >{{ t('delete') }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-16">
        <div class="text-6xl mb-4">&#x1F373;</div>
        <h3 class="text-lg font-medium text-gray-500 dark:text-gray-400">{{ t('no_recipes_yet') || 'No recipes yet' }}</h3>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">{{ t('add_first_recipe') || 'Add your first recipe to get started' }}</p>
        <AppButton variant="primary" class="mt-4" @click="openModal()">{{ t('add') }} {{ t('recipe') }}</AppButton>
      </div>

      <!-- Success message -->
      <div v-if="successMsg" class="fixed top-4 right-4 z-50 rounded-lg bg-green-50 dark:bg-green-900/90 border border-green-200 dark:border-green-800 p-4 text-sm text-green-700 dark:text-green-400 flex items-center gap-2 shadow-lg">
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
        {{ successMsg }}
      </div>

      <!-- Create/Edit Modal -->
      <AppModal :show="showModal" :title="editingRecipe ? t('edit') + ' ' + t('recipe') : t('add') + ' ' + t('recipe')" size="lg" @close="closeModal">
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppInput v-model="form.name_en" :label="t('name_en')" :placeholder="t('name_en')" />
            <AppInput v-model="form.name_ar" :label="t('name_ar')" :placeholder="t('name_ar')" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppSelect
              v-model="form.output_product_uuid"
              :label="t('output_product')"
              :options="productOptions"
              :placeholder="t('output_product')"
            />
            <AppInput v-model="form.sell_price" :label="t('sell_price')" type="number" :placeholder="t('sell_price')" />
          </div>

          <!-- Ingredients -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ t('ingredients') }}</label>
              <button
                type="button"
                class="text-sm font-medium text-[#D4A843] hover:text-yellow-600 transition-colors"
                @click="addIngredient"
              >
                + {{ t('add_ingredient') }}
              </button>
            </div>
            <div v-for="(ing, idx) in form.ingredients" :key="idx" class="flex items-center gap-2 mb-2">
              <div class="flex-1">
                <AppSelect
                  v-model="ing.product_uuid"
                  :options="productOptions"
                  :placeholder="t('select_product')"
                />
              </div>
              <div class="w-28">
                <input
                  v-model.number="ing.quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  :placeholder="t('quantity')"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
                />
              </div>
              <button
                type="button"
                class="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors p-1"
                @click="form.ingredients.splice(idx, 1)"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div v-if="form.ingredients.length > 0" class="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
              <span class="text-gray-500 dark:text-gray-400">{{ t('cost') }}:</span>
              <span class="font-semibold text-gray-900 dark:text-white ml-1">{{ formatCurrency(formCost) }}</span>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('notes') }}</label>
            <textarea
              v-model="form.notes"
              rows="2"
              :placeholder="t('notes')"
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
            ></textarea>
          </div>
        </div>
        <template #footer>
          <AppButton variant="secondary" @click="closeModal">{{ t('cancel') }}</AppButton>
          <AppButton variant="primary" :loading="saving" @click="saveRecipe">{{ t('save') }}</AppButton>
        </template>
      </AppModal>

      <!-- Delete Confirmation Modal -->
      <AppModal :show="showDeleteModal" :title="t('confirm_delete')" size="sm" @close="showDeleteModal = false">
        <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('confirm_delete') }}</p>
        <template #footer>
          <AppButton variant="secondary" @click="showDeleteModal = false">{{ t('cancel') }}</AppButton>
          <AppButton variant="primary" class="!bg-red-600 hover:!bg-red-700" :loading="deleting" @click="confirmDelete">{{ t('delete') }}</AppButton>
        </template>
      </AppModal>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { formatMoney } from '../../composables/currency.js';
import { useRouter } from 'vue-router';
import api from '../../composables/useApi.js';
import { t, localizedName } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppInput from '../../components/base/AppInput.vue';
import AppSelect from '../../components/base/AppSelect.vue';
import AppModal from '../../components/base/AppModal.vue';

const router = useRouter();

const recipes = ref([]);
const products = ref([]);
const loading = ref(false);
const error = ref('');
const successMsg = ref('');
const showModal = ref(false);
const showDeleteModal = ref(false);
const saving = ref(false);
const deleting = ref(false);
const producingUuid = ref(null);
const editingRecipe = ref(null);
let deleteTarget = null;

function showSuccess(msg) {
  successMsg.value = msg;
  setTimeout(() => successMsg.value = '', 3000);
}

const form = reactive({
  name_en: '',
  name_ar: '',
  output_product_uuid: '',
  sell_price: '',
  notes: '',
  ingredients: [],
});

const productOptions = computed(() =>
  products.value.map((p) => ({
    value: p.uuid,
    label: p.name_en || p.name,
  }))
);

const formCost = computed(() => {
  let cost = 0;
  for (const ing of form.ingredients) {
    if (!ing.product_uuid) continue;
    const p = products.value.find((pr) => pr.uuid === ing.product_uuid);
    if (p) cost += (parseFloat(p.cost_price) || 0) * (ing.quantity || 0);
  }
  return cost;
});

function recipeCost(recipe) {
  let cost = 0;
  for (const ing of recipe.ingredients || []) {
    const p = products.value.find((pr) => pr.uuid === ing.product_uuid);
    if (p) cost += (parseFloat(p.cost_price) || 0) * (ing.quantity || 0);
  }
  return cost;
}

function recipeMargin(recipe) {
  const sell = parseFloat(recipe.sell_price) || 0;
  if (sell === 0) return 0;
  const cost = recipeCost(recipe);
  return ((sell - cost) / sell) * 100;
}

function getProductName(uuid) {
  if (!uuid) return '-';
  const p = products.value.find((pr) => pr.uuid === uuid);
  return p ? (p.name_en || p.name || '-') : '-';
}

function formatCurrency(value) {
  return formatMoney(value);
}

function addIngredient() {
  form.ingredients.push({ product_uuid: '', quantity: 1 });
}

function openModal(recipe = null) {
  editingRecipe.value = recipe;
  if (recipe) {
    form.name_en = recipe.name_en || '';
    form.name_ar = recipe.name_ar || '';
    form.output_product_uuid = recipe.output_product_uuid || '';
    form.sell_price = recipe.sell_price ?? '';
    form.notes = recipe.notes || '';
    form.ingredients = (recipe.ingredients || []).map((i) => ({
      product_uuid: i.product_uuid,
      quantity: i.quantity,
    }));
  } else {
    form.name_en = '';
    form.name_ar = '';
    form.output_product_uuid = '';
    form.sell_price = '';
    form.notes = '';
    form.ingredients = [];
  }
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingRecipe.value = null;
}

async function saveRecipe() {
  if (!form.name_en && !form.name_ar) { error.value = t('name_required_either') || 'Enter a name (English or Arabic).'; return; }
  saving.value = true;
  error.value = '';
  try {
    const payload = {
      name_en: form.name_en,
      name_ar: form.name_ar || null,
      output_product_uuid: form.output_product_uuid || null,
      sell_price: parseFloat(form.sell_price) || 0,
      notes: form.notes || null,
      ingredients: form.ingredients
        .filter((i) => i.product_uuid)
        .map((i) => ({
          product_uuid: i.product_uuid,
          quantity: parseFloat(i.quantity) || 0,
        })),
    };

    if (editingRecipe.value) {
      await api.put('/recipes/' + editingRecipe.value.uuid, payload);
    } else {
      await api.post('/recipes', payload);
    }
    closeModal();
    showSuccess(t('saved') || 'Saved successfully');
    await loadData();
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to save recipe.';
  } finally {
    saving.value = false;
  }
}

async function produceRecipe(recipe) {
  producingUuid.value = recipe.uuid;
  error.value = '';
  try {
    await api.post('/recipes/' + recipe.uuid + '/produce', { quantity: 1 });
    showSuccess(t('production_complete') || 'Production complete');
    await loadData();
  } catch (e) {
    error.value = e.response?.data?.message || (t('insufficient_ingredients') || 'Insufficient ingredients to produce.');
  } finally {
    producingUuid.value = null;
  }
}

function deleteRecipe(recipe) {
  deleteTarget = recipe;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!deleteTarget) return;
  deleting.value = true;
  error.value = '';
  try {
    await api.delete('/recipes/' + deleteTarget.uuid);
    showDeleteModal.value = false;
    deleteTarget = null;
    showSuccess(t('deleted') || 'Deleted successfully');
    await loadData();
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to delete recipe.';
  } finally {
    deleting.value = false;
  }
}

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    const [recipesRes, productsRes] = await Promise.all([
      api.get('/recipes'),
      api.get('/products', { params: { all: true } }),
    ]);
    recipes.value = recipesRes.data.data || recipesRes.data || [];
    products.value = productsRes.data.data || productsRes.data || [];
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load data.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => loadData());
</script>
