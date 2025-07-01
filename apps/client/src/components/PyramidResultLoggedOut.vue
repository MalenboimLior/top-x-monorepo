<!-- Final pyramid result for anonymous players -->
<template>
  <div class="result-screen">
    <h2 class="title has-text-white">Game Over</h2>
    <Card>
      <p class="has-text-white">Log in to save your pyramid and see stats.</p>
      <CustomButton type="is-primary" label="Login with X" @click="login" />
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useUserStore } from '@/stores/user';
import { useHead } from '@vueuse/head';

const userStore = useUserStore();

useHead({
  title: 'Pyramid Result - TOP-X',
  meta: [
    { name: 'description', content: 'Log in to save your pyramid results on TOP-X.' },
  ],
});

function login() {
  userStore.loginWithX();
}
</script>

<style scoped>
.result-screen {
  padding: 20px;
}
</style>