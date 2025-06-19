<!-- Root component for admin app layout and routing -->
<template>
  <div class="container is-fluid">
    <NavBar />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar.vue';
</script>

<style scoped>
.container {
  padding: 1rem;
}
</style>