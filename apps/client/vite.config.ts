import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import prerender from 'vite-plugin-prerender';
import path from 'path';
import dotenv from 'dotenv';
import { existsSync, rmSync } from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Custom plugin to remove zonereveal folder from dist after build
function excludeZonerevealPlugin() {
  return {
    name: 'exclude-zonereveal',
    closeBundle() {
      // Remove zonereveal folder from dist after build completes
      const zonerevealPath = path.resolve(__dirname, 'dist/assets/zonereveal');
      if (existsSync(zonerevealPath)) {
        console.log('Removing zonereveal assets from build output...');
        rmSync(zonerevealPath, { recursive: true, force: true });
        console.log('✓ ZoneReveal assets excluded from build');
      }
    }
  };
}

export default defineConfig({
  base: '/',
  plugins: [
    vue(),
    // Exclude zonereveal assets from build
    excludeZonerevealPlugin(),

    // Enable prerender only when explicitly requested
    ...(process.env.PRERENDER === '1'
      ? [        prerender({
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
            '/cookies',
            '/guidelines',
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
          concurrency: 4, // Process 4 routes in parallel (adjust based on your needs)
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
      },
      output: {
        manualChunks: (id) => {
          // Separate vendor chunks for better caching
          if (id.includes('node_modules')) {
            // Firebase SDK chunk
            if (id.includes('firebase') || id.includes('@firebase')) {
              return 'vendor-firebase';
            }
            // Phaser game engine chunk (large library)
            if (id.includes('phaser')) {
              return 'vendor-phaser';
            }
            // FontAwesome chunk
            if (id.includes('@fortawesome')) {
              return 'vendor-fontawesome';
            }
            // Vue ecosystem chunk
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
              return 'vendor-vue';
            }
            // Other vendor libraries
            return 'vendor';
          }
        }
      }
    },
    // Enable source maps for production debugging (optional, remove if bundle size is critical)
    sourcemap: false,
    // Optimize minification (esbuild is faster than terser)
    minify: 'esbuild',
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Target modern browsers for smaller bundles
    target: 'esnext',
  }
});