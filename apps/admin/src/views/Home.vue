<!-- Admin dashboard landing page -->
<template>
  <section class="section">
    <div class="container">
      <h1 class="title has-text-white">Admin Dashboard</h1>
      <Card>
        <h2 class="subtitle has-text-white">Welcome, {{ userStore.user?.username ? `@${userStore.user.username}` : '@Anonymous' }}</h2>
        <p class="has-text-grey-light">Manage TOP-X games and configurations.</p>
        <router-link to="/game-management" class="button is-primary mt-3">
          Go to Game Management
        </router-link>
      </Card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import Card from '@top-x/shared/components/Card.vue';

const userStore = useUserStore();
console.log('Admin dashboard loaded, user:', {
  uid: userStore.user?.uid,
  username: userStore.user?.username,
  isAdmin: userStore.user?.isAdmin,
});
</script>

<style scoped>
.mt-3 {
  margin-top: 1rem;
}
</style>