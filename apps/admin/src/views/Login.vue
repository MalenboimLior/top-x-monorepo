<template>
  <section class="section">
    <div class="container">
      <div class="columns is-centered">
        <div class="column is-one-third">
          <div class="box">
            <h1 class="title">Admin Login</h1>
            <button class="button is-dark" @click="login">
              <font-awesome-icon icon="x-twitter" /> Login with X
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';

const userStore = useUserStore();
const router = useRouter();

const login = async () => {
  await userStore.login();
  if (userStore.user?.isAdmin) {
    router.push('/');
  } else {
    alert('Access denied: Admin privileges required.');
    await userStore.logout();
  }
};
</script>