<template>
  <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
    <table class="w-full text-sm">
      <!-- Header -->
      <thead>
        <tr class="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
          <th
            v-for="col in columns"
            :key="col.key"
            :class="col.class || ''"
            class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
            :style="col.sortable ? 'cursor: pointer; user-select: none;' : ''"
            @click="col.sortable && toggleSort(col.key)"
          >
            <span class="inline-flex items-center gap-1">
              {{ col.label }}
              <template v-if="col.sortable">
                <svg
                  v-if="sortKey === col.key"
                  class="w-3.5 h-3.5"
                  :class="sortDir === 'asc' ? '' : 'rotate-180'"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
                <svg
                  v-else
                  class="w-3.5 h-3.5 opacity-30"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </template>
            </span>
          </th>
        </tr>
      </thead>

      <!-- Loading state -->
      <tbody v-if="loading">
        <tr
          v-for="row in 5"
          :key="'skel-' + row"
          class="border-b border-gray-100 dark:border-gray-700/50"
        >
          <td v-for="col in columns" :key="col.key" class="px-4 py-3">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style="width: 70%"></div>
          </td>
        </tr>
      </tbody>

      <!-- Data rows -->
      <tbody v-else-if="sortedData.length > 0">
        <tr
          v-for="(item, idx) in sortedData"
          :key="idx"
          class="border-b border-gray-100 dark:border-gray-700/50 transition-colors
                 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          :class="idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            :class="col.class || ''"
            class="px-4 py-3 text-gray-700 dark:text-gray-300"
          >
            <slot :name="'cell-' + col.key" :item="item" :column="col" :value="item[col.key]">
              {{ item[col.key] }}
            </slot>
          </td>
        </tr>
      </tbody>

      <!-- Empty state -->
      <tbody v-else>
        <tr>
          <td :colspan="columns.length" class="px-4 py-2">
            <slot name="empty">
              <div class="py-12 text-center text-gray-400 dark:text-gray-500">
                {{ emptyMessage }}
              </div>
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
  data: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  emptyMessage: {
    type: String,
    default: 'No data available',
  },
});

const sortKey = ref('');
const sortDir = ref('asc');

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = 'asc';
  }
}

const sortedData = computed(() => {
  if (!sortKey.value) return props.data;
  return [...props.data].sort((a, b) => {
    const valA = a[sortKey.value];
    const valB = b[sortKey.value];
    if (valA == null) return 1;
    if (valB == null) return -1;
    const cmp = typeof valA === 'number' ? valA - valB : String(valA).localeCompare(String(valB));
    return sortDir.value === 'asc' ? cmp : -cmp;
  });
});
</script>
