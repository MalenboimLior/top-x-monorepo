<!-- Root component for the client game portal -->
<template>
  <NavBar />
  <router-view />
  <Footer />
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar.vue';
import Footer from '@/components/Footer.vue';

document.documentElement.setAttribute('data-theme', 'dark');

</script>