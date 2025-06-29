<!-- Root component for the client game portal -->
<template>
  <NavBar />
  <router-view />
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar.vue';
document.documentElement.setAttribute('data-theme', 'dark');

</script>