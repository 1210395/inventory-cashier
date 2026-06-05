import '../css/app.css';
import './bootstrap';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import { setLocale } from './i18n';
import { hydrateDurable } from './composables/durable.js';
import App from './App.vue';

// Restore durable state (PIN, saved account, auth token/user) from the main
// process BEFORE anything reads localStorage, so a relaunch keeps the session
// and PIN even though file:// localStorage isn't reliably persisted.
hydrateDurable().finally(() => {
  const app = createApp(App);
  const pinia = createPinia();

  app.use(pinia);
  app.use(router);

  // Initialize theme from localStorage
  const savedDark = localStorage.getItem('darkMode') === 'true';
  if (savedDark) {
    document.documentElement.classList.add('dark');
  }

  // Initialize locale from localStorage
  const savedLocale = localStorage.getItem('locale') || 'en';
  setLocale(savedLocale);

  app.mount('#app');
});
