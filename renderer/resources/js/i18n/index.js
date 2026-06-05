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

// Locale-aware display name for bilingual records (categories, products, recipes):
// shows the current language's name, falling back to the other if it's missing.
function localizedName(obj) {
  if (!obj) return '';
  const ar = obj.name_ar || '';
  const en = obj.name_en || '';
  return locale.value === 'ar' ? (ar || en || obj.name || '') : (en || ar || obj.name || '');
}

export { locale, t, setLocale, isRtl, localizedName };
