import '../css/app.css';
import './bootstrap';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import { setLocale } from './i18n';
import App from './App.vue';

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
