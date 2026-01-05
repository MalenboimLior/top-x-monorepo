<template>
  <div class="app-container">
    <NavBar />
    <CookieBanner />
    <AccountConflictModal />
    <main class="main-content">
      <router-view />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import NavBar from '@/components/NavBar.vue';
import Footer from '@/components/Footer.vue';
import AccountConflictModal from '@/components/AccountConflictModal.vue';
import { useHead } from '@vueuse/head';
import { useThemeStore } from '@/stores/theme';

import CookieBanner from '@/components/CookieBanner.vue';
useHead({
  title: "TOP-X: Viral Challenges, Rankings & Games on X | Who's on Top?",
  meta: [
    { name: 'description', content: "Join TOP-X for exciting viral challenges, pyramid rankings, trivia games, and competitions on X. Build your top lists, challenge friends, and rise to the challenge! 99% Grok-powered. Who's on top? 🎯" },
    // { property: 'og:image', content: 'https://example.com/og-image.jpg' },
    // // { name: 'twitter:card', content: 'summary_large_image' },
    // { name: 'twitter:image', content: 'https://example.com/og-image.jpg' },
  ],
  link: [
    { rel: 'icon', type: 'image/png', href: '/favicon.png' },
  ],
});

// Initialize theme from store
const themeStore = useThemeStore();
const route = useRoute();

// Helper function to check if a route is a game route
function isGameRoute(path: string): boolean {
  return path.startsWith('/games/') && path !== '/games/info';
}

onMounted(() => {
  themeStore.initializeTheme();
  
  // If initial route is a game route, force dark mode
  if (isGameRoute(route.path)) {
    themeStore.forceDarkModeForGame();
  }
});


</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  /* min-height: 120vh; */
 /* min-height: -webkit-fill-available; /* Fix for iOS Safari viewport issues */
  /* background: #121212; Matches TOP-X dark theme */
}
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column; /* Change to column for top-aligned content */
  justify-content: flex-start; /* Align content to top */
  align-items: center;
  width: 100%;
  /* padding: 1rem;  removed by Lior manually*/
  box-sizing: border-box;
}
</style>
