<template>
  <div class="app-container">
    <NavBar v-if="$route.path !== '/'" />
    <CookieBanner v-if="!consentGiven" @consent-given="handleConsent" />
    <main class="main-content">
      <router-view />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import NavBar from '@/components/NavBar.vue';
import Footer from '@/components/Footer.vue';
import CookieBanner from '@/components/CookieBanner.vue'; // New import
import { ref } from 'vue';
import { analytics } from '@top-x/shared'; // Assuming this is where analytics is imported

document.documentElement.setAttribute('data-theme', 'dark');

const route = useRoute();
const consentGiven = ref(!!localStorage.getItem('cookieConsent'));
const handleConsent = (level: string) => {
  consentGiven.value = true;
  if (level === 'all') {
    // Enable analytics if accepted all
    // Assuming Firebase analytics is opt-in; you may need to init or enable here if not always on
    console.log('Analytics enabled');
  }
};
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* background: #121212; Matches TOP-X dark theme */
}
.main-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 1rem;
  box-sizing: border-box;
}
</style>