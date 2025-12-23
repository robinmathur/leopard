import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    strictPort: false,
    // Allow all subdomains (any tenant can be added dynamically)
    allowedHosts: [
      '.localhost', // Matches *.localhost and localhost
      '.immigrate.localhost', // Matches *.immigrate.localhost
      'leopard.logiclucent.in',
    ],
  }
});

