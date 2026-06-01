<template>
  <AppLayout>
      <div>
        <!-- Page Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('dashboard') }}</h1>
        </div>

        <!-- KPI Cards -->
        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <div v-for="i in 7" :key="i" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 animate-pulse">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
              <div class="flex-1 space-y-2">
                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <div class="cursor-pointer" @click="router.push('/products')">
            <KpiCard
              :icon="'&#x1F4E6;'"
              :label="t('total_products')"
              :value="String(data.total_products ?? 0)"
              color="blue"
            />
          </div>
          <KpiCard
            :icon="'&#x1F4B0;'"
            :label="t('inventory_value')"
            :value="formatCurrency(data.inventory_value ?? 0)"
            color="green"
          />
          <div class="cursor-pointer" @click="router.push('/products?low_stock=true')">
            <KpiCard
              :icon="'&#x26A0;&#xFE0F;'"
              :label="t('low_stock')"
              :value="String(data.low_stock ?? 0)"
              color="red"
            />
          </div>
          <div class="cursor-pointer" @click="router.push('/customers')">
            <KpiCard
              :icon="'&#x1F465;'"
              :label="t('total_customers')"
              :value="String(data.total_customers ?? 0)"
              color="purple"
            />
          </div>
          <div class="cursor-pointer" @click="router.push('/suppliers')">
            <KpiCard
              :icon="'&#x1F69A;'"
              :label="t('total_suppliers')"
              :value="String(data.total_suppliers ?? 0)"
              color="indigo"
            />
          </div>
          <div class="cursor-pointer" @click="router.push('/invoices?status=unpaid')">
            <KpiCard
              :icon="'&#x1F4B3;'"
              :label="t('receivable')"
              :value="formatCurrency(data.receivable ?? 0)"
              color="yellow"
            />
          </div>
          <KpiCard
            :icon="'&#x1F4C5;'"
            :label="t('upcoming_cheques')"
            :value="String(data.upcoming_cheques ?? 0)"
            color="orange"
          />
        </div>

        <!-- Charts Section -->
        <div v-if="!loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <!-- Sales Trend Chart (Last 7 Days) -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('sales_trend') }}</h2>
            <div v-if="chartsLoading" class="space-y-3">
              <div v-for="i in 7" :key="i" class="flex items-center gap-3">
                <div class="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div class="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div v-else-if="salesByDay.length > 0" class="space-y-2">
              <div v-for="day in salesByDay" :key="day.date" class="flex items-center gap-3">
                <span class="text-sm text-gray-500 dark:text-gray-400 w-16 text-right flex-shrink-0">{{ day.label }}</span>
                <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-7 relative overflow-hidden">
                  <div
                    class="bg-yellow-500 h-7 rounded-full flex items-center px-2 transition-all duration-500"
                    :style="{ width: maxDaySale > 0 ? Math.max((day.total / maxDaySale * 100), day.total > 0 ? 8 : 0) + '%' : '0%' }"
                  >
                    <span v-if="day.total > 0" class="text-xs text-white font-medium whitespace-nowrap">{{ formatCurrency(day.total) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8 text-gray-400 dark:text-gray-500">
              <div class="text-4xl mb-2">&#x1F4CA;</div>
              <p class="text-sm">{{ t('no_sales_data') }}</p>
            </div>
          </div>

          <!-- Expense Breakdown -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ t('expense_breakdown') }}</h2>
            <div v-if="chartsLoading" class="space-y-3">
              <div v-for="i in 5" :key="i" class="flex items-center gap-3">
                <div class="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div class="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div v-else-if="expenseBreakdown.length > 0" class="space-y-3">
              <div v-for="(cat, idx) in expenseBreakdown" :key="cat.category" class="flex items-center gap-3">
                <span class="text-sm text-gray-500 dark:text-gray-400 w-24 text-right flex-shrink-0 capitalize">{{ cat.category }}</span>
                <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-7 relative overflow-hidden">
                  <div
                    :class="expenseColors[idx % expenseColors.length]"
                    class="h-7 rounded-full flex items-center justify-between px-2 transition-all duration-500"
                    :style="{ width: maxExpense > 0 ? Math.max((cat.total / maxExpense * 100), cat.total > 0 ? 12 : 0) + '%' : '0%' }"
                  >
                    <span class="text-xs text-white font-medium whitespace-nowrap">{{ formatCurrency(cat.total) }}</span>
                    <span class="text-xs text-white/80 whitespace-nowrap ml-1">{{ cat.percentage }}%</span>
                  </div>
                </div>
              </div>
              <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm">
                <span class="text-gray-500 dark:text-gray-400">{{ t('total') }}</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(totalExpenseAmount) }}</span>
              </div>
            </div>
            <div v-else class="text-center py-8 text-gray-400 dark:text-gray-500">
              <div class="text-4xl mb-2">&#x1F4B8;</div>
              <p class="text-sm">{{ t('no_expenses_data') }}</p>
            </div>
          </div>
        </div>
      </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../composables/useApi.js';
import { t } from '../../i18n/index.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import KpiCard from './KpiCard.vue';

const router = useRouter();

const loading = ref(true);
const chartsLoading = ref(true);
const data = ref({});
const salesByDay = ref([]);
const expenseBreakdown = ref([]);
const totalExpenseAmount = ref(0);

const expenseColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-red-500',
];

const maxDaySale = computed(() => {
  if (salesByDay.value.length === 0) return 0;
  return Math.max(...salesByDay.value.map((d) => d.total));
});

const maxExpense = computed(() => {
  if (expenseBreakdown.value.length === 0) return 0;
  return Math.max(...expenseBreakdown.value.map((c) => c.total));
});

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getDayLabel(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return t('today');
  if (d.getTime() === yesterday.getTime()) return t('yesterday') || 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

async function loadChartData() {
  chartsLoading.value = true;
  try {
    // Fetch recent invoices for sales trend
    const [invoicesRes, expensesRes] = await Promise.all([
      api.get('/invoices', { params: { per_page: 200 } }).catch(() => ({ data: { data: [] } })),
      api.get('/expenses').catch(() => ({ data: { data: [] } })),
    ]);

    // Process sales by day (last 7 days)
    const invoices = invoicesRes.data.data || invoicesRes.data || [];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({
        date: d.toISOString().split('T')[0],
        label: getDayLabel(d),
        total: 0,
      });
    }
    for (const inv of invoices) {
      if (inv.type !== 'sale') continue;
      const invDate = (inv.created_at || inv.date || '').split('T')[0];
      const dayEntry = days.find((d) => d.date === invDate);
      if (dayEntry) {
        dayEntry.total += parseFloat(inv.total) || 0;
      }
    }
    salesByDay.value = days;

    // Process expense breakdown (current month)
    const expenses = expensesRes.data.data || expensesRes.data || [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const catMap = {};
    let expTotal = 0;
    for (const exp of expenses) {
      const expDate = new Date(exp.expense_date);
      if (expDate >= monthStart && expDate <= now) {
        const amt = parseFloat(exp.amount) || 0;
        catMap[exp.category] = (catMap[exp.category] || 0) + amt;
        expTotal += amt;
      }
    }
    totalExpenseAmount.value = expTotal;
    expenseBreakdown.value = Object.entries(catMap)
      .map(([category, total]) => ({
        category,
        total,
        percentage: expTotal > 0 ? Math.round((total / expTotal) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  } catch (e) {
    console.error('Failed to load chart data:', e);
  } finally {
    chartsLoading.value = false;
  }
}

onMounted(async () => {
  try {
    const response = await api.get('/dashboard');
    const d = response.data;
    data.value = {
      total_products: d.total_products ?? 0,
      inventory_value: d.total_inventory_value ?? d.inventory_value ?? 0,
      low_stock: d.low_stock_count ?? d.low_stock ?? 0,
      total_customers: d.total_customers ?? 0,
      total_suppliers: d.total_suppliers ?? 0,
      receivable: d.total_receivable ?? d.receivable ?? 0,
      upcoming_cheques: d.upcoming_cheques_7days ?? d.upcoming_cheques ?? 0,
    };
  } catch (e) {
    console.error('Failed to load dashboard data:', e);
  } finally {
    loading.value = false;
  }
  loadChartData();
});
</script>
