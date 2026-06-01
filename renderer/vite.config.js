import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// Standalone build of the Hisab Vue SPA for the cashier Electron app.
// base './' so assets resolve under file:// in Electron.
export default defineConfig({
  base: './',
  plugins: [
    vue({
      template: { transformAssetUrls: { base: null, includeAbsolute: false } },
    }),
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'resources/js') },
  },
  build: {
    outDir: resolve(__dirname, '../dist/renderer'),
    emptyOutDir: true,
  },
});
