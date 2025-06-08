<template>
  <nav class="navbar is-dark" role="navigation" aria-label="main navigation">
    <div class="navbar-brand">
      <a class="navbar-item" href="/">
        <strong>Top-X Admin</strong>
      </a>
      <a role="button" class="navbar-burger" aria-label="menu" :class="{ 'is-active': isMenuActive }" @click="toggleMenu">
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
      </a>
    </div>
    <div class="navbar-menu" :class="{ 'is-active': isMenuActive }">
      <div class="navbar-start">
        <router-link class="navbar-item" to="/">Dashboard</router-link>
      </div>
      <div class="navbar-end">
        <div class="navbar-item">
          <div class="buttons">
            <a class="button is-light" @click="logout" v-if="user">
              <font-awesome-icon icon="sign-out-alt" /> Logout
            </a>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';

const isMenuActive = ref(false);
const userStore = useUserStore();
const router = useRouter();

const toggleMenu = () => {
  isMenuActive.value = !isMenuActive.value;
};

const logout = async () => {
  await userStore.logout();
  router.push('/login');
};
</script>