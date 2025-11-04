import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import prerender from 'vite-plugin-prerender';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  base: '/',
  plugins: [
    vue(),

    prerender({
      routes: [
        '/', '/about', '/faq', '/contactus',
        '/profile', '/build', '/termsofuse', '/privacypolicy'
      ],
      staticDir: path.resolve(__dirname, 'dist'),
      timeout: 90_000,                     // correct option
      renderAfterDocumentEvent: 'prerender-ready',
      postProcess({ html }) {
        return {
          html: html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
          route: undefined
        };
      }
    })
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@top-x/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@top-x/shared/types': path.resolve(__dirname, '../../packages/shared/src/types')
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
  },

  define: {
    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(process.env.VITE_FIREBASE_API_KEY),
    'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN),
    'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID),
    'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.VITE_FIREBASE_STORAGE_BUCKET),
    'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(process.env.VITE_FIREBASE_APP_ID),
    'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(process.env.VITE_FIREBASE_MEASUREMENT_ID),
    'import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID': JSON.stringify(process.env.VITE_GOOGLE_ADS_CLIENT_ID),
    'import.meta.env.VITE_GOOGLE_ADS_SLOT_ID': JSON.stringify(process.env.VITE_GOOGLE_ADS_SLOT_ID)
  },

  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions', 'firebase/analytics']
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      onwarn(warning, handler) {
        if (warning.message.includes('.DS_Store')) return;
        handler(warning);
      }
    }
  }
});