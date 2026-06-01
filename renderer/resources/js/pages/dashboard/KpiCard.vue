<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
    <div class="flex items-center gap-4">
      <div
        class="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
        :class="colorClasses"
      >
        <span v-html="icon"></span>
      </div>
      <div class="min-w-0">
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
          {{ label }}
        </p>
        <p class="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
          {{ value }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: String, required: true },
  color: { type: String, default: 'blue' },
});

const colorMap = {
  blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
};

const colorClasses = computed(() => colorMap[props.color] || colorMap.blue);
</script>
