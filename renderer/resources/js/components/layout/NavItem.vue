<template>
  <router-link
    :to="to"
    :title="collapsed ? label : null"
    class="flex items-center gap-3 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors duration-150"
    :class="[
      collapsed ? 'px-0 justify-center' : 'px-5',
      isActive
        ? 'bg-yellow-500/15 text-yellow-500'
        : 'text-gray-300 hover:bg-gray-700/60 hover:text-gray-100',
    ]"
  >
    <span class="w-6 flex items-center justify-center flex-shrink-0" v-html="icon"></span>
    <span v-show="!collapsed">{{ label }}</span>
  </router-link>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUiStore } from '../../stores/ui.js';

const props = defineProps({
  to: { type: String, required: true },
  icon: { type: String, required: true },
  label: { type: String, required: true },
});

const ui = useUiStore();
const collapsed = computed(() => !ui.sidebarOpen);
const route = useRoute();
const isActive = computed(() => {
  if (props.to === '/dashboard') return route.path === '/dashboard';
  return route.path.startsWith(props.to);
});
</script>
