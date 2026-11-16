import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const BACKEND = 'http://localhost:3001';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'VOX — анонимные чаты',
        short_name: 'VOX',
        description: 'Анонимные чаты с 4 необычными режимами. Без регистрации.',
        lang: 'ru',
        theme_color: '#0B0F17',
        background_color: '#0B0F17',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Server-rendered pages and API must never be answered by the app shell.
        navigateFallbackDenylist: [/^\/api/, /^\/story/, /^\/socket\.io/],
      },
    }),
  ],
  server: {
    port: 3000,
    fs: { allow: ['..'] },
    proxy: {
      '/socket.io': { target: BACKEND, ws: true },
      '/api': BACKEND,
      '/story': BACKEND,
    },
  },
});
