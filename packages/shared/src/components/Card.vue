<!-- Basic dark-themed card container component -->
<template>
  <div class="card">
    <div class="card-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
// Simple wrapper component to provide a dark themed card container.
</script>

<style scoped>
/* Dark card styling used throughout the app */
.card {
  background-color: #2a2a2a;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  margin-bottom: 1rem;
  color: #ffffff;
}

.card-content {
  padding: 1.5rem;
}
</style>