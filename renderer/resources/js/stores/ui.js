import { defineStore } from 'pinia';
import { setCurrency } from '../composables/currency.js';

export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarOpen: localStorage.getItem('sidebarOpen') !== 'false',
    darkMode: localStorage.getItem('darkMode') === 'true',
    locale: localStorage.getItem('locale') || 'en',
    settings: {
      currency_code: 'ILS',
      currency_symbol: '\u20AA',
      currency_position: 'before',
      tax_rate: 0,
      tax_name: 'Tax',
      tax_enabled: false,
      tax_inclusive: false,
      business_name: '',
      business_phone: '',
      business_address: '',
      business_tax_id: '',
    },
  }),

  getters: {
    formatPrice() {
      return (amount) => {
        const num = parseFloat(amount) || 0;
        const formatted = num.toFixed(2);
        if (this.settings.currency_position === 'after') {
          return `${formatted}${this.settings.currency_symbol}`;
        }
        return `${this.settings.currency_symbol}${formatted}`;
      };
    },
  },

  actions: {
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
      localStorage.setItem('sidebarOpen', String(this.sidebarOpen));
    },

    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      localStorage.setItem('darkMode', this.darkMode);
      if (this.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },

    setLocale(loc) {
      this.locale = loc;
      localStorage.setItem('locale', loc);
      document.documentElement.lang = loc;
      document.documentElement.dir = loc === 'ar' ? 'rtl' : 'ltr';
    },

    setSettings(s) {
      if (s && typeof s === 'object') {
        Object.assign(this.settings, s);
      }
      localStorage.setItem('appSettings', JSON.stringify(this.settings));
      setCurrency(this.settings.currency_symbol, this.settings.currency_position);
    },

    loadSettingsFromStorage() {
      try {
        const stored = localStorage.getItem('appSettings');
        if (stored) {
          Object.assign(this.settings, JSON.parse(stored));
        }
      } catch (e) {
        // ignore
      }
      setCurrency(this.settings.currency_symbol, this.settings.currency_position);
    },
  },
});
