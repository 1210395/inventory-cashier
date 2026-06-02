import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import api from '../composables/useApi.js';

// Lazy-loaded page components
const LoginPage = () => import('../pages/auth/LoginPage.vue');
const DashboardPage = () => import('../pages/dashboard/DashboardPage.vue');
const ProductListPage = () => import('../pages/products/ProductListPage.vue');
const ProductFormPage = () => import('../pages/products/ProductFormPage.vue');
const ProductDetailPage = () => import('../pages/products/ProductDetailPage.vue');
const CategoryListPage = () => import('../pages/categories/CategoryListPage.vue');
const CustomerListPage = () => import('../pages/customers/CustomerListPage.vue');
const SupplierListPage = () => import('../pages/suppliers/SupplierListPage.vue');
const InvoiceListPage = () => import('../pages/invoices/InvoiceListPage.vue');
const InvoiceFormPage = () => import('../pages/invoices/InvoiceFormPage.vue');
const InvoiceDetailPage = () => import('../pages/invoices/InvoiceDetailPage.vue');
const PosPage = () => import('../pages/pos/PosPage.vue');
const TablesPage = () => import('../pages/tables/TablesPage.vue');
const ChequeListPage = () => import('../pages/cheques/ChequeListPage.vue');
const StockPage = () => import('../pages/stock/StockPage.vue');
const ReturnPage = () => import('../pages/returns/ReturnPage.vue');
const ExpensePage = () => import('../pages/expenses/ExpensePage.vue');
const ReportsPage = () => import('../pages/reports/ReportsPage.vue');
const SoldItemsPage = () => import('../pages/reports/SoldItemsPage.vue');
const BoughtItemsPage = () => import('../pages/reports/BoughtItemsPage.vue');
const ProfitLossPage = () => import('../pages/reports/ProfitLossPage.vue');
const CashShiftsPage = () => import('../pages/reports/CashShiftsPage.vue');
const LowStockPage = () => import('../pages/reports/LowStockPage.vue');
const StockValuePage = () => import('../pages/reports/StockValuePage.vue');
const DebtSummaryPage = () => import('../pages/reports/DebtSummaryPage.vue');
const AgingReportPage = () => import('../pages/reports/AgingReportPage.vue');
const DailyReconciliationPage = () => import('../pages/reports/DailyReconciliationPage.vue');
const CustomerStatementPage = () => import('../pages/customers/CustomerStatementPage.vue');
const SupplierStatementPage = () => import('../pages/suppliers/SupplierStatementPage.vue');
const ImportPage = () => import('../pages/import/ImportPage.vue');
const RecipeListPage = () => import('../pages/recipes/RecipeListPage.vue');
const SettingsPage = () => import('../pages/settings/SettingsPage.vue');
const AccountsPage = () => import('../pages/admin/AccountsPage.vue');

// Placeholder component factory
function placeholder(name) {
  return {
    name,
    template: `<div class="p-8"><h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">${name}</h1><p class="mt-2 text-gray-500 dark:text-gray-400">This page is under construction.</p></div>`,
  };
}

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/products',
    name: 'ProductList',
    component: ProductListPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/products/new',
    name: 'ProductNew',
    component: ProductFormPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/products/:uuid',
    name: 'ProductDetail',
    component: ProductDetailPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/products/:uuid/edit',
    name: 'ProductEdit',
    component: ProductFormPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/categories',
    name: 'CategoryList',
    component: CategoryListPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/recipes',
    name: 'RecipeList',
    component: RecipeListPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/customers',
    name: 'CustomerList',
    component: CustomerListPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/customers/:uuid/statement',
    name: 'CustomerStatement',
    component: CustomerStatementPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/suppliers',
    name: 'SupplierList',
    component: SupplierListPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/suppliers/:uuid/statement',
    name: 'SupplierStatement',
    component: SupplierStatementPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/invoices',
    name: 'InvoiceList',
    component: InvoiceListPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/invoices/new',
    name: 'InvoiceNew',
    component: InvoiceFormPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/invoices/:uuid',
    name: 'InvoiceDetail',
    component: InvoiceDetailPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/invoices/:uuid/edit',
    name: 'InvoiceEdit',
    component: InvoiceFormPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/pos',
    name: 'POS',
    component: PosPage,
    meta: { requiresAuth: true, requiresShift: true },
  },
  {
    path: '/tables',
    name: 'Tables',
    component: TablesPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/cheques',
    name: 'ChequeList',
    component: ChequeListPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/stock',
    name: 'Stock',
    component: StockPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/returns',
    name: 'Returns',
    component: ReturnPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/expenses',
    name: 'Expenses',
    component: ExpensePage,
    meta: { requiresAuth: true },
  },
  {
    path: '/reports',
    name: 'Reports',
    component: ReportsPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/reports/sold',
    name: 'SoldItems',
    component: SoldItemsPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/reports/bought',
    name: 'BoughtItems',
    component: BoughtItemsPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/reports/profit-loss',
    name: 'ProfitLoss',
    component: ProfitLossPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/reports/cash-shifts',
    name: 'CashShifts',
    component: CashShiftsPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/reports/low-stock',
    name: 'LowStock',
    component: LowStockPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/reports/stock-value',
    name: 'StockValue',
    component: StockValuePage,
    meta: { requiresAuth: true },
  },
  {
    path: '/reports/debt-summary',
    name: 'DebtSummary',
    component: DebtSummaryPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/reports/aging',
    name: 'AgingReport',
    component: AgingReportPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/reports/daily-reconciliation',
    name: 'DailyReconciliation',
    component: DailyReconciliationPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/import',
    name: 'Import',
    component: ImportPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/accounts',
    name: 'Accounts',
    component: AccountsPage,
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();

  if (to.meta.requiresAuth !== false && !auth.isAuthenticated) {
    // Try to fetch user first (session might still be valid)
    if (!auth.user) {
      await auth.fetchUser();
    }
    if (!auth.isAuthenticated) {
      return next({ name: 'Login' });
    }
  }

  // If logged in and going to login page, redirect to dashboard
  if (to.name === 'Login' && auth.isAuthenticated) {
    return next({ name: 'Dashboard' });
  }

  // The POS (till) cannot be opened without an active cash-register shift.
  if (to.meta.requiresShift) {
    try {
      await api.get('/cash-shifts/current'); // 200 = a shift is open
    } catch (e) {
      if (e.response && e.response.status === 404) {
        return next({ path: '/reports/cash-shifts', query: { need_shift: '1' } });
      }
      // Network/other error: don't lock the till over a transient failure.
    }
  }

  next();
});

export default router;
