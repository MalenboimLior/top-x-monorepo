<template>
  <AuthLayout>
    <form @submit.prevent="handleLogin">
      <div class="field">
        <label class="label">Sign in with X</label>
        <p class="control">
          <button class="button is-primary is-fullwidth" type="submit" :class="{ 'is-loading': isLoading }">
            <span class="icon"><font-awesome-icon :icon="['fab', 'x-twitter']" aria-hidden="true" /></span>
            <span>Continue with X</span>
          </button>
        </p>
      </div>
      <p class="has-text-grey is-size-7">
        You must be part of the Top-X admin team to access these tools.
      </p>
    </form>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthLayout from '@/layouts/AuthLayout.vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const router = useRouter();
const isLoading = ref(false);

const handleLogin = async () => {
  try {
    isLoading.value = true;
    await userStore.login();
    await router.push('/');
  } catch (error) {
    console.error('Login failed', error);
  } finally {
    isLoading.value = false;
  }
};
</script>
