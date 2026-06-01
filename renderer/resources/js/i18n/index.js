import { ref, computed } from 'vue';
import en from './en.js';
import ar from './ar.js';

const messages = { en, ar };

const locale = ref(localStorage.getItem('locale') || 'en');

const isRtl = computed(() => locale.value === 'ar');

function t(key) {
  const dict = messages[locale.value] || messages.en;
  return dict[key] || key;
}

function setLocale(loc) {
  locale.value = loc;
  localStorage.setItem('locale', loc);
  document.documentElement.lang = loc;
  document.documentElement.dir = loc === 'ar' ? 'rtl' : 'ltr';
}

export { locale, t, setLocale, isRtl };
