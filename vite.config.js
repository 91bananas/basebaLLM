import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/basebaLLM/',
  server: {
    open: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
