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

const userStore = useUserStore();

function login() {
  userStore.loginWithX();
}
</script>

<style scoped>
.result-screen {
  padding: 20px;
}
</style>