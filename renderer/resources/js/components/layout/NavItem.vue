<template>
  <router-link
    :to="to"
    class="flex items-center gap-3 px-5 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors duration-150"
    :class="isActive
      ? 'bg-yellow-500/15 text-yellow-500'
      : 'text-gray-300 hover:bg-gray-700/60 hover:text-gray-100'"
  >
    <span class="text-base w-5 text-center" v-html="icon"></span>
    <span>{{ label }}</span>
  </router-link>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
  to: { type: String, required: true },
  icon: { type: String, required: true },
  label: { type: String, required: true },
});

const route = useRoute();
const isActive = computed(() => {
  if (props.to === '/dashboard') return route.path === '/dashboard';
  return route.path.startsWith(props.to);
});
</script>
