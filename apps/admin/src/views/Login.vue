<template>
  <section class="section">
    <div class="container">
      <div class="columns is-centered">
        <div class="column is-one-third">
          <div class="box">
            <h1 class="title has-text-white">Admin Login</h1>
            <button class="button is-dark" @click="login" :disabled="isLoggingIn">
              <font-awesome-icon :icon="['fab', 'x-twitter']" class="mr-2" />
              Login with X
            </button>
            <p v-if="error" class="notification is-danger mt-3">{{ error }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';
import { ref } from 'vue';

const userStore = useUserStore();
const router = useRouter();
const isLoggingIn = ref(false);
const error = ref<string | null>(null);

const login = async () => {
  console.log('Admin login attempt started');
  isLoggingIn.value = true;
  error.value = null;
  try {
    await userStore.login();
    console.log('Login successful, user:', {
      uid: userStore.user?.uid,
      username: userStore.user?.username,
      isAdmin: userStore.user?.isAdmin,
    });
    if (userStore.user?.isAdmin) {
      console.log('Admin access granted, redirecting to /');
      router.push('/');
    } else {
      console.log('Access denied: User is not admin');
      error.value = 'Access denied: Admin privileges required.';
      await userStore.logout();
    }
  } catch (err: any) {
    console.error('Login error:', err.message);
    error.value = `Login failed: ${err.message}`;
  } finally {
    isLoggingIn.value = false;
  }
};
</script>

<style scoped>
.mr-2 {
  margin-right: 0.5rem;
}

.box {
  background-color: #2a2a2a;
  border-radius: 6px;
}
</style>