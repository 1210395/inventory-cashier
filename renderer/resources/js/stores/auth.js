import { defineStore } from 'pinia';
import api, { setToken, clearToken, getToken } from '../composables/useApi.js';
import { durableSet } from '../composables/durable.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user && !!getToken(),
  },

  actions: {
    async login(email, password) {
      this.loading = true;
      try {
        const response = await api.post('/login', {
          email,
          password,
          device_name: 'web_app',
        });
        this.user = response.data.user;
        setToken(response.data.token);
        const userJson = JSON.stringify(response.data.user);
        localStorage.setItem('auth_user', userJson);
        durableSet('auth_user', userJson);
        return response;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      try {
        await api.post('/logout');
      } catch {
        // Ignore errors on logout
      } finally {
        this.user = null;
        clearToken();
        // Hash route so it works under file:// in the Electron cashier shell.
        window.location.hash = '#/login';
      }
    },

    async fetchUser() {
      if (!getToken()) {
        this.user = null;
        return;
      }
      try {
        const response = await api.get('/user');
        this.user = response.data;
        const userJson = JSON.stringify(response.data);
        localStorage.setItem('auth_user', userJson);
        durableSet('auth_user', userJson);
      } catch {
        this.user = null;
        clearToken();
      }
    },
  },
});
