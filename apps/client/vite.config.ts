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

    // Enable prerender only when explicitly requested
    ...(process.env.PRERENDER === '1'
      ? [prerender({
          routes: [
            // Static pages
            '/',
            '/about',
            '/faq',
            '/contact',
            '/profile',
            '/build',
            '/terms',
            '/privacy',
            // Game routes
            '/games/info',
            '/games/trivia',
            '/games/ZoneReveal',
            '/games/PyramidTier',
            '/games/Pacman',
            '/games/FisherGame',
            // Redirect routes (prerender for SEO)
            '/PrezPyramid',
            '/FootballStarsIL',
          ],
          staticDir: path.resolve(__dirname, 'dist'),
          waitUntil: 'domcontentloaded',
          timeout: 90_000,
          settleDelay: 800,
          renderAfterDocumentEvent: 'prerender-ready',
          debug: process.env.PRERENDER_DEBUG === '1',
        })]
      : [])
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@top-x/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@top-x/shared/types': path.resolve(__dirname, '../../packages/shared/src/types')
    },
    dedupe: [
      'firebase',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/functions',
      'firebase/analytics',
      '@firebase/app',
      '@firebase/auth',
      '@firebase/firestore',
      '@firebase/functions',
      '@firebase/analytics',
    ],
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
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions', 'firebase/analytics'],
    esbuildOptions: {
      // Ensure a single optimized instance of Firebase
      keepNames: true,
    },
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