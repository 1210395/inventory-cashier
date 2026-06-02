<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main content area (shifted by the sidebar rail; collapses to an icon rail) -->
    <div
      class="transition-all duration-300"
      :class="ui.sidebarOpen ? 'ltr:ml-64 rtl:mr-64' : 'ltr:ml-16 rtl:mr-16'"
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
