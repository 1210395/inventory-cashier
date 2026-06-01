<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Sidebar overlay for mobile -->
    <div
      v-if="ui.sidebarOpen"
      class="fixed inset-0 bg-black/40 z-20 lg:hidden"
      @click="ui.toggleSidebar()"
    ></div>

    <!-- Main content area -->
    <div
      class="transition-all duration-300"
      :class="ui.sidebarOpen ? 'lg:ltr:ml-64 lg:rtl:mr-64' : ''"
    >
      <!-- Topbar -->
      <Topbar />

      <!-- Page content -->
      <main class="p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import Sidebar from './Sidebar.vue';
import Topbar from './Topbar.vue';
import { useUiStore } from '../../stores/ui.js';

const ui = useUiStore();
</script>
