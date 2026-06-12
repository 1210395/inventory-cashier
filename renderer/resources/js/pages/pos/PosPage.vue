<template>
  <AppLayout>
    <div>
      <!-- POS Header -->
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('pos') }}</h1>
      </div>

      <!-- Error message -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Two-panel desktop layout -->
      <div class="flex gap-6" style="min-height: calc(100vh - 180px);">
        <!-- LEFT PANEL: Product Search + Cart (60%) -->
        <div class="w-3/5 flex flex-col space-y-4">
          <!-- Category drill-down: breadcrumb + current level (tap to go deeper) -->
          <div class="space-y-2">
            <div class="flex items-center gap-1 flex-wrap text-sm">
              <button class="crumb" :class="catPath.length ? 'crumb-link' : 'crumb-cur'" @click="goToLevel(-1)">{{ t('all') }}</button>
              <template v-for="(c, i) in catPath" :key="c.uuid">
                <span class="opacity-40">{{ _isAr() ? '‹' : '›' }}</span>
                <button class="crumb" :class="i === catPath.length - 1 ? 'crumb-cur' : 'crumb-link'" @click="goToLevel(i)">{{ catName(c) }}</button>
              </template>
            </div>
            <div v-if="currentCategories.length" class="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2">
              <button
                v-for="cat in currentCategories"
                :key="cat.uuid"
                class="cat-tile"
                :class="selectedCategoryUuid === cat.uuid ? 'cat-on' : 'cat-off'"
                @click="drillInto(cat)"
              >
                <span class="cat-label">{{ catName(cat) }}</span>
                <span v-if="hasChildren(cat)" class="cat-caret">{{ _isAr() ? '‹' : '›' }}</span>
              </button>
            </div>
          </div>

          <!-- Product Search -->
          <div class="relative">
            <input
              v-model="productSearch"
              type="text"
              :placeholder="t('search_product_placeholder')"
              class="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-5 py-3.5 text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
              @input="onSearchInput"
              @focus="showResults = true"
              @blur="hideResultsDelayed"
            />
            <button
              v-if="productSearch"
              type="button"
              :title="t('clear') || 'Clear'"
              class="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-red-500 hover:text-white hover:bg-red-500 transition-colors"
              @mousedown.prevent="clearSearch"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              type="button"
              :title="t('scan_barcode') || 'Scan Barcode'"
              class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 hover:text-[#D4A843] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              @mousedown.prevent="showScanner = true"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h2M3 19a2 2 0 002 2h2m10-18h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 7h.01M7 12h10M7 17h.01" />
              </svg>
            </button>

            <!-- Search Results Dropdown -->
            <div
              v-if="showResults && searchResults.length > 0"
              class="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-64 overflow-y-auto"
            >
              <button
                v-for="product in searchResults"
                :key="product.uuid"
                class="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                @mousedown.prevent="addToCart(product)"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ product.name_en || product.name }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ product.sku || '' }} {{ product.barcode ? '| ' + product.barcode : '' }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-[#D4A843]">{{ formatCurrency(product.sell_price) }}</p>
                    <p class="text-xs text-gray-400">{{ t('in_stock') }}: {{ product.quantity }}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Filtered product grid (tap a tile to add to cart) -->
          <div v-if="searchResults.length > 0" class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2">
            <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 max-h-72 overflow-y-auto">
              <button
                v-for="product in searchResults"
                :key="product.uuid"
                class="prod-tile"
                :disabled="product.quantity <= 0"
                @click="addToCart(product)"
              >
                <span class="prod-name">{{ catName(product) }}</span>
                <span class="prod-price">{{ formatCurrency(product.sell_price) }}</span>
                <span class="prod-stock" :class="{ 'prod-out': product.quantity <= 0 }">
                  {{ product.quantity > 0 ? (t('in_stock') + ': ' + product.quantity) : (t('out_of_stock') || 'Out of stock') }}
                </span>
              </button>
            </div>
          </div>
          <div
            v-else-if="selectedCategoryUuid || productSearch"
            class="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center text-sm text-gray-400"
          >{{ _isAr() ? 'لا توجد منتجات هنا' : 'No products here' }}</div>

          <!-- Cart Table -->
          <div class="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
            <div class="px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
                {{ t('cart') }} ({{ cart.length }} {{ t('items') }})
              </h2>
            </div>

            <div class="flex-1 overflow-y-auto">
              <table v-if="cart.length > 0" class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 dark:border-gray-700">
                    <th class="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('products') }}</th>
                    <th class="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('unit_price') }}</th>
                    <th class="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('quantity') }}</th>
                    <th class="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('discount') }}</th>
                    <th class="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ t('total') }}</th>
                    <th class="px-2 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, idx) in cart"
                    :key="idx"
                    class="border-b border-gray-100 dark:border-gray-700/50"
                  >
                    <td class="px-4 py-3">
                      <p class="text-gray-900 dark:text-white font-medium">{{ item.product_name }}</p>
                      <p class="text-xs text-gray-400">{{ item.sku }}</p>
                    </td>
                    <td class="px-4 py-3">
                      <input
                        v-model.number="item.unit_price"
                        type="number"
                        step="0.01"
                        min="0"
                        class="w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#D4A843]"
                        @input="recalcCartItem(idx)"
                      />
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-center gap-2">
                        <button
                          class="w-11 h-11 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 active:scale-95 flex items-center justify-center text-2xl font-bold leading-none transition"
                          @click="decrementQty(idx)"
                        >−</button>
                        <input
                          v-model.number="item.quantity"
                          type="number"
                          min="1"
                          class="w-16 h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1 text-base font-semibold text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A843]"
                          @input="recalcCartItem(idx)"
                        />
                        <button
                          class="w-11 h-11 rounded-lg bg-[#D4A843] text-gray-900 hover:brightness-95 active:scale-95 flex items-center justify-center text-2xl font-bold leading-none transition"
                          @click="incrementQty(idx)"
                        >+</button>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          class="px-1.5 py-1 text-xs font-medium rounded transition-colors"
                          :class="item.discount_type === 'fixed' ? 'bg-[#D4A843] text-gray-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'"
                          @click="item.discount_type = 'fixed'; recalcCartItem(idx)"
                        >&#x20AA;</button>
                        <button
                          type="button"
                          class="px-1.5 py-1 text-xs font-medium rounded transition-colors"
                          :class="item.discount_type === 'percentage' ? 'bg-[#D4A843] text-gray-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'"
                          @click="item.discount_type = 'percentage'; recalcCartItem(idx)"
                        >%</button>
                        <input
                          v-model.number="item.discount"
                          type="number"
                          step="0.01"
                          min="0"
                          class="w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#D4A843]"
                          @input="recalcCartItem(idx)"
                        />
                      </div>
                    </td>
                    <td class="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {{ formatCurrency(item.line_total) }}
                    </td>
                    <td class="px-2 py-3">
                      <button
                        class="w-11 h-11 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition"
                        :title="t('delete')"
                        @click="removeFromCart(idx)"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                <svg class="w-16 h-16 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                <p class="text-sm">{{ t('cart_empty') }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT PANEL: Checkout Summary (40%) -->
        <div class="w-2/5 flex flex-col space-y-4">
          <!-- Customer Picker -->
          <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <div class="flex items-end gap-2">
              <div class="flex-1">
                <AppSelect
                  v-model="selectedCustomerUuid"
                  :label="t('customer')"
                  :options="customerOptions"
                  :placeholder="t('walk_in')"
                />
              </div>
              <button
                class="flex-shrink-0 w-12 h-12 rounded-lg bg-[#D4A843] text-gray-900 hover:bg-[#c49a3a] active:scale-95 flex items-center justify-center transition"
                :title="t('add') + ' ' + t('customer')"
                @click="showNewCustomerModal = true"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Summary -->
          <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex-1 flex flex-col">
            <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">{{ t('summary') }}</h2>

            <div class="space-y-3 flex-1">
              <div class="flex justify-between text-sm">
                <span class="text-gray-500 dark:text-gray-400">{{ t('subtotal') }}</span>
                <span class="text-gray-900 dark:text-white font-medium">{{ formatCurrency(cartSubtotal) }}</span>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('discount') }}</label>
                <div class="flex items-center gap-2">
                  <div class="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                    <button
                      type="button"
                      class="px-3 py-1.5 text-xs font-medium transition-colors"
                      :class="cartDiscountType === 'fixed' ? 'bg-[#D4A843] text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'"
                      @click="cartDiscountType = 'fixed'"
                    >&#x20AA;</button>
                    <button
                      type="button"
                      class="px-3 py-1.5 text-xs font-medium transition-colors"
                      :class="cartDiscountType === 'percentage' ? 'bg-[#D4A843] text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'"
                      @click="cartDiscountType = 'percentage'"
                    >%</button>
                  </div>
                  <input
                    v-model.number="cartDiscountValue"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
                  />
                </div>
                <p v-if="cartDiscountType === 'percentage' && cartDiscountValue > 0" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  = {{ formatCurrency(cartDiscountAmount) }}
                </p>
              </div>

              <!-- Tax line -->
              <div v-if="uiStore.settings.tax_enabled && taxAmount > 0" class="flex justify-between text-sm">
                <span class="text-gray-500 dark:text-gray-400">
                  {{ uiStore.settings.tax_name || t('tax') }}
                  ({{ uiStore.settings.tax_rate }}%)
                  <span v-if="uiStore.settings.tax_inclusive" class="text-xs">({{ t('tax_inclusive') }})</span>
                </span>
                <span class="text-gray-900 dark:text-white font-medium">{{ formatCurrency(taxAmount) }}</span>
              </div>

              <div class="flex justify-between items-center text-2xl font-extrabold pt-3 border-t border-gray-200 dark:border-gray-700">
                <span class="text-gray-900 dark:text-white">{{ t('total') }}</span>
                <span class="text-[#D4A843]">{{ formatCurrency(cartTotal) }}</span>
              </div>

              <!-- Payment Method Segmented Buttons -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('payment_method') }}</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="method in paymentMethods"
                    :key="method.value"
                    class="rounded-lg border px-3 py-3 text-sm font-semibold transition-colors"
                    :class="paymentMethod === method.value
                      ? 'bg-[#D4A843] text-gray-900 border-[#D4A843]'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                    @click="paymentMethod = method.value"
                  >
                    {{ method.label }}
                  </button>
                </div>
              </div>

              <!-- Paid Amount -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('paid') }}</label>
                <input
                  v-model.number="paidAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent"
                />
              </div>

              <!-- Remaining -->
              <div class="flex justify-between text-sm">
                <span class="text-gray-500 dark:text-gray-400">{{ t('remaining') }}</span>
                <span
                  class="font-medium"
                  :class="changeAmount < 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'"
                >
                  {{ changeAmount < 0 ? formatCurrency(Math.abs(changeAmount)) + ' ' + t('remaining') : formatCurrency(changeAmount) + ' ' + t('change') }}
                </span>
              </div>
            </div>

            <!-- Complete Sale Button -->
            <AppButton
              variant="primary"
              size="lg"
              class="w-full mt-6 !bg-green-600 hover:!bg-green-700 !text-white !min-h-[68px] !text-lg !font-bold"
              :loading="completing"
              :disabled="cart.length === 0"
              @click="completeSale"
            >
              {{ t('complete_sale') }}<span v-if="cart.length"> · {{ formatCurrency(cartTotal) }}</span>
            </AppButton>
          </div>
        </div>
      </div>

      <!-- Cheque Selection Modal -->
      <AppModal :show="showChequeModal" :title="t('cheques')" size="md" @close="showChequeModal = false">
        <div class="space-y-4">
          <!-- Toggle: existing vs new -->
          <div v-if="unassignedCheques.length > 0" class="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            <button
              class="flex-1 px-3 py-2 text-sm font-medium transition-colors"
              :class="chequeMode === 'existing' ? 'bg-[#D4A843] text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'"
              @click="chequeMode = 'existing'"
            >
              {{ t('select_existing') || 'Select Existing' }}
            </button>
            <button
              class="flex-1 px-3 py-2 text-sm font-medium transition-colors"
              :class="chequeMode === 'new' ? 'bg-[#D4A843] text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'"
              @click="chequeMode = 'new'"
            >
              {{ t('create_new') || 'Create New' }}
            </button>
          </div>

          <!-- Existing cheque selection -->
          <div v-if="chequeMode === 'existing' && unassignedCheques.length > 0">
            <AppSelect
              v-model="selectedChequeUuid"
              :label="t('cheques')"
              :options="unassignedChequeOptions"
              placeholder="Select a cheque..."
            />
            <div v-if="selectedChequeDetail" class="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm space-y-1">
              <p><span class="text-gray-500">{{ t('amount') }}:</span> <span class="font-medium">{{ formatCurrency(selectedChequeDetail.amount) }}</span></p>
              <p><span class="text-gray-500">{{ t('due_date') || 'Due' }}:</span> <span class="font-medium">{{ selectedChequeDetail.due_date }}</span></p>
              <p><span class="text-gray-500">{{ t('bank') || 'Bank' }}:</span> <span class="font-medium">{{ selectedChequeDetail.bank_name }}</span></p>
            </div>
          </div>

          <!-- New cheque form -->
          <div v-if="chequeMode === 'new'" class="space-y-3">
            <AppInput v-model="chequeForm.cheque_number" :label="t('cheque_number') || 'Cheque Number'" required />
            <AppInput v-model="chequeForm.bank_name" :label="t('bank') || 'Bank Name'" />
            <AppInput v-model="chequeForm.due_date" :label="t('due_date') || 'Due Date'" type="date" />
          </div>
        </div>
        <template #footer>
          <AppButton variant="secondary" @click="skipCheque">{{ t('skip') || 'Skip' }}</AppButton>
          <AppButton variant="primary" :loading="savingCheque" @click="saveCheque">{{ t('save') }}</AppButton>
        </template>
      </AppModal>

      <!-- New Customer Modal -->
      <AppModal :show="showNewCustomerModal" :title="t('add') + ' ' + t('customer')" size="sm" @close="showNewCustomerModal = false">
        <div class="space-y-4">
          <AppInput v-model="newCustomerForm.name" :label="t('name')" :placeholder="t('name')" required />
          <AppInput v-model="newCustomerForm.phone" :label="t('phone')" :placeholder="t('phone')" />
        </div>
        <template #footer>
          <AppButton variant="secondary" @click="showNewCustomerModal = false">{{ t('cancel') }}</AppButton>
          <AppButton variant="primary" :loading="savingNewCustomer" @click="saveNewCustomer">{{ t('save') }}</AppButton>
        </template>
      </AppModal>

      <!-- Success Receipt Modal -->
      <AppModal :show="showReceiptModal" :title="t('sale_completed')" size="md" @close="closeReceipt">
        <div class="text-center py-4">
          <div class="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">{{ t('sale_completed') }}</h3>
          <p class="text-xs text-gray-400 mb-4">{{ receiptData.invoice_number }}</p>
          <div class="text-4xl font-extrabold text-[#D4A843] mb-4">{{ formatCurrency(receiptData.total) }}</div>
          <div class="mx-auto max-w-xs space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
            <div class="flex justify-between"><span>{{ t('items') }}</span><span class="font-medium text-gray-900 dark:text-white">{{ receiptData.items_count }}</span></div>
            <div class="flex justify-between"><span>{{ t('paid') }}</span><span class="font-medium text-green-600 dark:text-green-400">{{ formatCurrency(receiptData.paid) }}</span></div>
            <div v-if="receiptData.paid > receiptData.total" class="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1.5 text-base font-bold">
              <span class="text-gray-900 dark:text-white">{{ t('change') }}</span>
              <span class="text-green-600 dark:text-green-400">{{ formatCurrency(receiptData.paid - receiptData.total) }}</span>
            </div>
          </div>
          <div v-if="drawerError" class="mx-auto max-w-xs mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            {{ drawerError }}
          </div>
        </div>
        <template #footer>
          <AppButton variant="secondary" @click="printReceipt">{{ t('print_receipt') }}</AppButton>
          <AppButton variant="primary" class="!min-h-[60px] !text-lg !font-bold !px-8" @click="closeReceipt">{{ t('new_sale') }}</AppButton>
        </template>
      </AppModal>

      <!-- Barcode Scanner -->
      <BarcodeScanner :show="showScanner" @detected="onScanDetected" @close="showScanner = false" />
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue';
import { formatMoney } from '../../composables/currency.js';
import api from '../../composables/useApi.js';
import { t } from '../../i18n/index.js';
import { useUiStore } from '../../stores/ui.js';
import AppLayout from '../../components/layout/AppLayout.vue';
import AppButton from '../../components/base/AppButton.vue';
import AppInput from '../../components/base/AppInput.vue';
import AppSelect from '../../components/base/AppSelect.vue';
import AppModal from '../../components/base/AppModal.vue';
import BarcodeScanner from '../../components/base/BarcodeScanner.vue';
import { printReceipt as printReceiptDoc } from '../../composables/print.js';

const uiStore = useUiStore();

// State
const posCategories = ref([]);
const selectedCategoryUuid = ref('');
const catPath = ref([]); // breadcrumb of drilled-into categories

const _isAr = () => localStorage.getItem('locale') === 'ar';
function catName(cat) {
  return _isAr() ? (cat.name_ar || cat.name_en) : (cat.name_en || cat.name_ar);
}
const topCategories = computed(() => posCategories.value.filter((c) => !c.parent_uuid));
function hasChildren(cat) {
  return posCategories.value.some((c) => c.parent_uuid === cat.uuid);
}
// Categories shown at the current drill level: children of the last crumb,
// or the top-level categories when at the root.
const currentCategories = computed(() => {
  const parent = catPath.value[catPath.value.length - 1];
  return parent
    ? posCategories.value.filter((c) => c.parent_uuid === parent.uuid)
    : topCategories.value;
});
// All descendants of a category (so a parent shows everything beneath it).
function descendantUuids(uuid) {
  const seen = new Set([uuid]);
  let frontier = [uuid];
  while (frontier.length) {
    const next = [];
    for (const c of posCategories.value) {
      if (c.parent_uuid && frontier.includes(c.parent_uuid) && !seen.has(c.uuid)) {
        seen.add(c.uuid);
        next.push(c.uuid);
      }
    }
    frontier = next;
  }
  return [...seen];
}
function effectiveCategoryUuids() {
  return selectedCategoryUuid.value ? descendantUuids(selectedCategoryUuid.value) : [];
}
// Tap a category: filter products by it (+ all descendants) and, if it has
// children, drill one level deeper so the user can keep narrowing.
function drillInto(cat) {
  selectedCategoryUuid.value = cat.uuid;
  if (hasChildren(cat)) catPath.value = [...catPath.value, cat];
  triggerSearch();
}
function goToLevel(index) {
  if (index < 0) {
    catPath.value = [];
    selectedCategoryUuid.value = '';
  } else {
    catPath.value = catPath.value.slice(0, index + 1);
    selectedCategoryUuid.value = catPath.value[index]?.uuid || '';
  }
  triggerSearch();
}
const productSearch = ref('');
const searchResults = ref([]);
const showScanner = ref(false);
const showResults = ref(false);
const cart = ref([]);
const customers = ref([]);
const selectedCustomerUuid = ref('');
const cartDiscountType = ref('fixed');
const cartDiscountValue = ref(0);
const paymentMethod = ref('cash');
const paidAmount = ref(0);
const completing = ref(false);
const error = ref('');
const drawerError = ref('');
const showReceiptModal = ref(false);
const receiptData = reactive({
  invoice_number: '',
  items_count: 0,
  total: 0,
  paid: 0,
  lines: [],
  subtotal: 0,
  discount: 0,
  tax: 0,
  payment_method: 'cash',
});

// New customer state
const showNewCustomerModal = ref(false);
const savingNewCustomer = ref(false);
const newCustomerForm = reactive({ name: '', phone: '' });

// Cheque state
const showChequeModal = ref(false);
const chequeMode = ref('new'); // 'existing' or 'new'
const unassignedCheques = ref([]);
const selectedChequeUuid = ref('');
const chequeForm = reactive({ cheque_number: '', bank_name: '', due_date: '' });
const savingCheque = ref(false);
let pendingInvoiceUuid = null;

const unassignedChequeOptions = computed(() =>
  unassignedCheques.value.map((c) => ({
    value: c.uuid,
    label: `${c.cheque_number} - ${c.bank_name} (${formatCurrency(c.amount)})`,
  }))
);

const selectedChequeDetail = computed(() =>
  unassignedCheques.value.find((c) => c.uuid === selectedChequeUuid.value) || null
);

let searchTimeout = null;

const paymentMethods = [
  { value: 'cash', label: t('cash') },
  { value: 'card', label: t('card') },
  { value: 'cheque', label: t('cheques') },
  { value: 'bank_transfer', label: t('bank_transfer') || 'Bank Transfer' },
];

const customerOptions = computed(() =>
  customers.value.map((c) => ({
    value: c.uuid,
    label: c.name || c.name_en || c.phone || '-',
  }))
);

const cartSubtotal = computed(() =>
  cart.value.reduce((sum, item) => sum + (item.line_total || 0), 0)
);

const cartDiscountAmount = computed(() => {
  if (cartDiscountType.value === 'percentage') {
    return (cartSubtotal.value * (cartDiscountValue.value || 0)) / 100;
  }
  return cartDiscountValue.value || 0;
});

const taxAmount = computed(() => {
  if (!uiStore.settings.tax_enabled || !uiStore.settings.tax_rate) return 0;
  const afterDiscount = Math.max(0, cartSubtotal.value - cartDiscountAmount.value);
  if (uiStore.settings.tax_inclusive) {
    // Tax is already included in price, extract it
    return afterDiscount - (afterDiscount / (1 + parseFloat(uiStore.settings.tax_rate) / 100));
  }
  return afterDiscount * (parseFloat(uiStore.settings.tax_rate) / 100);
});

const cartTotal = computed(() => {
  const afterDiscount = Math.max(0, cartSubtotal.value - cartDiscountAmount.value);
  if (uiStore.settings.tax_enabled && !uiStore.settings.tax_inclusive) {
    return afterDiscount + taxAmount.value;
  }
  return afterDiscount;
});

const changeAmount = computed(() =>
  (paidAmount.value || 0) - cartTotal.value
);

// Watch cartTotal to auto-update paid amount
watch(cartTotal, (val) => {
  paidAmount.value = val;
});

function formatCurrency(value) {
  return formatMoney(value);
}

function selectCategory(uuid) {
  selectedCategoryUuid.value = uuid;
  // Auto-search when category is selected (even without text)
  triggerSearch();
}

function onSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => triggerSearch(), 300);
}

function clearSearch() {
  productSearch.value = '';
  showResults.value = false;
  if (searchTimeout) clearTimeout(searchTimeout);
  // Re-run so the grid falls back to the selected category (or empties).
  triggerSearch();
}

async function triggerSearch() {
  if (!productSearch.value && !selectedCategoryUuid.value) {
    searchResults.value = [];
    return;
  }
  try {
    const params = {};
    if (productSearch.value) {
      params.search = productSearch.value;
    }
    const catUuids = effectiveCategoryUuids();
    if (catUuids.length) {
      params['category_uuid[]'] = catUuids;
    }
    const response = await api.get('/products', { params });
    const allProducts = response.data.data || response.data;
    searchResults.value = allProducts.filter((p) => p.show_on_pos !== false && p.show_on_pos !== 0);
    // Only show the overlay dropdown while typing; category taps fill the grid.
    showResults.value = !!productSearch.value;
  } catch (e) {
    searchResults.value = [];
  }
}

function hideResultsDelayed() {
  setTimeout(() => {
    showResults.value = false;
  }, 200);
}

async function onScanDetected(code) {
  showScanner.value = false;
  if (!code) return;
  productSearch.value = code;
  await triggerSearch();
  // Auto-add if a product matches the scanned barcode/SKU exactly
  const match = searchResults.value.find(
    (p) => p.barcode === code || p.sku === code
  );
  if (match) {
    addToCart(match);
    productSearch.value = '';
    searchResults.value = [];
    showResults.value = false;
  } else {
    showResults.value = true;
  }
}

function addToCart(product) {
  // Check if already in cart
  const existing = cart.value.find((item) => item.product_uuid === product.uuid);
  if (existing) {
    existing.quantity += 1;
    const gross = existing.quantity * existing.unit_price;
    const disc = existing.discount_type === 'percentage' ? gross * (existing.discount || 0) / 100 : (existing.discount || 0);
    existing.line_total = Math.max(0, gross - disc);
  } else {
    cart.value.push({
      product_uuid: product.uuid,
      product_name: catName(product) || product.name_en || product.name,
      name_en: product.name_en || '',
      name_ar: product.name_ar || '',
      sku: product.sku || '',
      unit_price: parseFloat(product.sell_price) || 0,
      quantity: 1,
      discount: 0,
      discount_type: 'fixed',
      line_total: parseFloat(product.sell_price) || 0,
    });
  }

  // Keep the category product grid populated so the cashier can tap several
  // items in a row; only the typed-search box/dropdown is reset after a pick.
  showResults.value = false;
  if (productSearch.value) {
    productSearch.value = '';
    if (selectedCategoryUuid.value) triggerSearch();
    else searchResults.value = [];
  }
}

function removeFromCart(idx) {
  cart.value.splice(idx, 1);
}

function recalcCartItem(idx) {
  const item = cart.value[idx];
  const gross = (item.quantity || 0) * (item.unit_price || 0);
  let disc = 0;
  if (item.discount_type === 'percentage') {
    disc = gross * (item.discount || 0) / 100;
  } else {
    disc = item.discount || 0;
  }
  item.line_total = Math.max(0, gross - disc);
}

function incrementQty(idx) {
  cart.value[idx].quantity += 1;
  recalcCartItem(idx);
}

function decrementQty(idx) {
  if (cart.value[idx].quantity > 1) {
    cart.value[idx].quantity -= 1;
    recalcCartItem(idx);
  }
}

function generateInvoiceNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${date}-${rand}`;
}

function computeStatus() {
  if (paidAmount.value >= cartTotal.value && cartTotal.value > 0) return 'paid';
  if (paidAmount.value > 0) return 'partial';
  return 'unpaid';
}

async function completeSale() {
  if (cart.value.length === 0) return;

  completing.value = true;
  error.value = '';
  drawerError.value = '';

  const invoiceNumber = generateInvoiceNumber();

  try {
    const payload = {
      invoice_number: invoiceNumber,
      customer_uuid: selectedCustomerUuid.value || null,
      supplier_uuid: null,
      type: 'sale',
      subtotal: cartSubtotal.value,
      tax_amount: taxAmount.value,
      discount_amount: cartDiscountAmount.value || 0,
      total: cartTotal.value,
      paid_amount: paidAmount.value || 0,
      status: computeStatus(),
      due_date: null,
      notes: null,
      items: cart.value.map((item) => ({
        product_uuid: item.product_uuid,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.line_total,
      })),
    };

    const response = await api.post('/invoices', payload);

    // Record payment if paid
    if (paidAmount.value > 0) {
      try {
        await api.post('/payments', {
          invoice_uuid: response.data.data?.uuid || response.data.uuid,
          amount: Math.min(paidAmount.value, cartTotal.value),
          method: paymentMethod.value,
          payment_date: new Date().toISOString().slice(0, 10),
          notes: null,
        });
      } catch (payErr) {
        console.error('Payment recording failed:', payErr);
      }
    }

    const invoiceUuid = response.data.data?.uuid || response.data.uuid;

    // If cheque payment, show cheque modal
    if (paymentMethod.value === 'cheque') {
      pendingInvoiceUuid = invoiceUuid;
      try {
        const chequeRes = await api.get('/cheques', { params: { unassigned: 1 } });
        unassignedCheques.value = chequeRes.data.data || chequeRes.data || [];
      } catch (e) {
        unassignedCheques.value = [];
      }
      chequeMode.value = unassignedCheques.value.length > 0 ? 'existing' : 'new';
      selectedChequeUuid.value = '';
      chequeForm.cheque_number = '';
      chequeForm.bank_name = '';
      chequeForm.due_date = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      showChequeModal.value = true;
    }

    // Show receipt — snapshot the cart/totals before the cart is reset
    receiptData.invoice_number = invoiceNumber;
    receiptData.items_count = cart.value.length;
    receiptData.total = cartTotal.value;
    receiptData.paid = paidAmount.value;
    receiptData.lines = cart.value.map((it) => ({
      name: it.product_name,
      name_en: it.name_en,
      name_ar: it.name_ar,
      quantity: it.quantity,
      unit_price: it.unit_price,
      line_total: it.line_total,
    }));
    receiptData.subtotal = cartSubtotal.value;
    receiptData.discount = cartDiscountAmount.value;
    receiptData.tax = taxAmount.value;
    receiptData.payment_method = paymentMethod.value;
    showReceiptModal.value = true;

    // Cashier terminal: kick the cash drawer on cash sales (Electron only),
    // unless the operator turned "open drawer on sale" off in Settings.
    if (paymentMethod.value === 'cash' && typeof window !== 'undefined' && window.cashier) {
      try {
        let kick = true;
        try { const s = await window.cashier.getSettings(); if (s && s.openDrawerOnSale === false) kick = false; } catch (e) { /* default to kicking */ }
        if (kick) {
          // Surface a failed kick so the operator knows to pick the receipt
          // printer in Settings (Ctrl+Shift+S) — previously this failed silently.
          const r = await window.cashier.openDrawer();
          if (r && r.success === false) {
            drawerError.value = r.error
              ? (t('drawer_failed') || 'Cash drawer did not open') + ': ' + r.error
              : (t('drawer_failed_hint') || 'Cash drawer did not open. Pick the receipt printer in Settings (Ctrl+Shift+S).');
          }
        }
      } catch (e) { /* noop */ }
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to complete sale.';
  } finally {
    completing.value = false;
  }
}

function skipCheque() {
  showChequeModal.value = false;
  pendingInvoiceUuid = null;
}

async function saveCheque() {
  if (!pendingInvoiceUuid) return;
  savingCheque.value = true;
  try {
    if (chequeMode.value === 'existing' && selectedChequeUuid.value) {
      // Link existing cheque to invoice
      await api.put('/cheques/' + selectedChequeUuid.value, {
        invoice_uuid: pendingInvoiceUuid,
      });
    } else if (chequeMode.value === 'new' && chequeForm.cheque_number) {
      // Create new cheque linked to invoice
      await api.post('/cheques', {
        cheque_number: chequeForm.cheque_number,
        bank_name: chequeForm.bank_name || '-',
        amount: cartTotal.value,
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: chequeForm.due_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        type: 'received',
        customer_uuid: selectedCustomerUuid.value || null,
        invoice_uuid: pendingInvoiceUuid,
        status: 'pending',
      });
    }
    showChequeModal.value = false;
    pendingInvoiceUuid = null;
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to save cheque.';
  } finally {
    savingCheque.value = false;
  }
}

async function saveNewCustomer() {
  if (!newCustomerForm.name) return;
  savingNewCustomer.value = true;
  try {
    const res = await api.post('/customers', {
      name: newCustomerForm.name,
      phone: newCustomerForm.phone || null,
    });
    const newCust = res.data.data || res.data;
    customers.value.push(newCust);
    selectedCustomerUuid.value = newCust.uuid;
    showNewCustomerModal.value = false;
    newCustomerForm.name = '';
    newCustomerForm.phone = '';
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to create customer.';
  } finally {
    savingNewCustomer.value = false;
  }
}

function printReceipt() {
  printReceiptDoc({
    lines: receiptData.lines,
    settings: uiStore.settings,
    fmt: (v) => uiStore.formatPrice(v),
    t,
    totals: {
      subtotal: receiptData.subtotal,
      discount: receiptData.discount,
      tax: receiptData.tax,
      total: receiptData.total,
    },
    paymentMethod: receiptData.payment_method,
  });
}

function closeReceipt() {
  showReceiptModal.value = false;
  drawerError.value = '';
  // Reset POS
  cart.value = [];
  selectedCustomerUuid.value = '';
  cartDiscountType.value = 'fixed';
  cartDiscountValue.value = 0;
  paidAmount.value = 0;
  paymentMethod.value = 'cash';
  productSearch.value = '';
}

onMounted(async () => {
  uiStore.loadSettingsFromStorage();
  try {
    const [custRes, catRes] = await Promise.all([
      api.get('/customers'),
      api.get('/categories', { params: { all: true } }),
    ]);
    customers.value = custRes.data.data || custRes.data;
    posCategories.value = catRes.data.data || catRes.data;
  } catch (e) {
    // Silently fail
  }
  // Try to load settings from API
  try {
    const res = await api.get('/settings');
    const data = res.data.data || res.data;
    if (data && typeof data === 'object') {
      const s = {};
      if (Array.isArray(data)) {
        data.forEach((item) => { s[item.key] = item.value; });
      } else {
        Object.assign(s, data);
      }
      if (s.tax_enabled === 'true' || s.tax_enabled === '1') s.tax_enabled = true;
      if (s.tax_enabled === 'false' || s.tax_enabled === '0') s.tax_enabled = false;
      if (s.tax_inclusive === 'true' || s.tax_inclusive === '1') s.tax_inclusive = true;
      if (s.tax_inclusive === 'false' || s.tax_inclusive === '0') s.tax_inclusive = false;
      if (s.tax_rate) s.tax_rate = parseFloat(s.tax_rate);
      uiStore.setSettings(s);
    }
  } catch (e) {
    // Use local settings
  }
});
</script>

<style scoped>
/* Touch-friendly category + product tiles */
.cat-tile, .subcat-tile {
  min-height: 60px;
  border-radius: 14px;
  padding: 8px 8px;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
  border: 1px solid transparent;
  transition: transform .06s ease, filter .12s ease;
}
.subcat-tile { min-height: 48px; font-size: 13px; font-weight: 600; border-radius: 12px; }
/* Let category names wrap to a couple of lines instead of being cut off. */
.cat-tile .cat-label, .subcat-tile .cat-label {
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.15;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cat-tile:active, .subcat-tile:active, .prod-tile:active { transform: scale(.97); filter: brightness(.95); }
.cat-on { background: #D4A843; color: #1a1a1a; box-shadow: 0 2px 8px rgba(212,168,67,.4); }
.cat-off { background: #f3f4f6; color: #374151; }
:global(.dark) .cat-off { background: #374151; color: #e5e7eb; }
.cat-caret { font-size: 16px; opacity: .7; font-weight: 700; }

/* Breadcrumb */
.crumb { padding: 6px 10px; border-radius: 8px; font-weight: 600; min-height: 40px; }
.crumb-cur { background: #D4A843; color: #1a1a1a; }
.crumb-link { background: #f3f4f6; color: #374151; }
:global(.dark) .crumb-link { background: #374151; color: #e5e7eb; }

.prod-tile {
  min-height: 86px;
  border-radius: 14px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  transition: transform .06s ease, filter .12s ease;
}
:global(.dark) .prod-tile { background: #1f2937; border-color: #374151; }
.prod-tile:disabled { opacity: .45; }
.prod-name { font-weight: 600; font-size: 14px; line-height: 1.2; text-align: start;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.prod-price { font-weight: 800; font-size: 16px; color: #D4A843; }
.prod-stock { font-size: 11px; color: #9ca3af; }
.prod-out { color: #ef4444; font-weight: 600; }
</style>
