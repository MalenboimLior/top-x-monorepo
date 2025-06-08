<template>
  <nav class="navbar is-dark" role="navigation" aria-label="main navigation">
    <div class="navbar-brand">
      <router-link class="navbar-item" to="/">
        <img src="@/assets/topx-icon.png" alt="TOP-X Admin Logo" class="logo" />
      </router-link>
      <a
        role="button"
        class="navbar-burger"
        :class="{ 'is-active': isMenuActive }"
        aria-label="menu"
        aria-expanded="false"
        @click="toggleMenu"
      >
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
      </a>
    </div>

    <div class="navbar-menu" :class="{ 'is-active': isMenuActive }">
      <div class="navbar-start">
        <router-link class="navbar-item has-text-white" to="/">Dashboard</router-link>
        <router-link class="navbar-item has-text-white" to="/game-management">Game Management</router-link>
      </div>

      <div class="navbar-end">
        <div v-if="userStore.user" class="navbar-item has-dropdown is-hoverable">
          <a class="navbar-link has-text-white">
            <img :src="userStore.user.photoURL || defaultPhotoURL" alt="Profile" class="profile-pic is-rounded mr-2" />
            {{ userStore.user.username ? `@${userStore.user.username}` : '@Anonymous' }}
          </a>
          <div class="navbar-dropdown is-right">
            <a class="navbar-item" @click="logout">Logout</a>
          </div>
        </div>
        <div v-else class="navbar-item">
          <CustomButton
            type="is-primary"
            label="Login with "
            :icon="['fab', 'x-twitter']"
            @click="router.push('/login')"
          />
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

const userStore = useUserStore();
const router = useRouter();
const isMenuActive = ref(false);
const defaultPhotoURL = 'https://www.top-x.co/assets/profile.png';

const toggleMenu = () => {
  isMenuActive.value = !isMenuActive.value;
  console.log('Navbar menu toggled:', isMenuActive.value);
};

const logout = async () => {
  try {
    console.log('Navbar logout initiated');
    await userStore.logout();
    isMenuActive.value = false;
    router.push('/login');
  } catch (err: any) {
    console.error('Navbar logout error:', err.message);
  }
};
</script>

<style scoped>
.navbar {
  background-color: #1a1a1a;
}

.logo {
  max-height: 2rem;
}

.profile-pic {
  width: 1.5rem;
  height: 1.5rem;
}

.navbar-item {
  color: #ffffff;
}

.navbar-item:hover,
.navbar-link:hover {
  background-color: #2a2a2a !important;
  color: #ffffff !important;
}

.navbar-dropdown {
  background-color: #2a2a2a;
  border-top: none;
}

.navbar-dropdown .navbar-item {
  color: #ffffff;
}

.navbar-dropdown .navbar-item:hover {
  background-color: #3a3a3a;
}

.mr-2 {
  margin-right: 0.5rem;
}
</style>