<!-- Root component for the client game portal -->
<template>
  <div class="app-container">
    <NavBar v-if="$route.path !== '/'" />
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

document.documentElement.setAttribute('data-theme', 'dark');

const route = useRoute();
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