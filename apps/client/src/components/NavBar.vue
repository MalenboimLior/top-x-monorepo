<!-- Top navigation bar for the client app -->
<template>
  <nav class="navbar" role="navigation" aria-label="main navigation">
    <div class="navbar-brand">
      <router-link class="navbar-item" to="/">
        <img src="@/assets/topx-icon.png" alt="TOP-X Logo">
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
        <router-link class="navbar-item" to="/" @click="closeMenu">Home</router-link>
        <router-link class="navbar-item" to="/frenemies" @click="closeMenu">
          <font-awesome-icon :icon="['fas', 'search']" class="navbar-icon" />
          Frenemies
        </router-link>       
        
        <router-link class="navbar-item" to="/about" @click="closeMenu">About</router-link>
        <router-link class="navbar-item" to="/faq" @click="closeMenu">FAQ</router-link>
        <router-link v-if="user" class="navbar-item" to="/profile" @click="closeMenu">Profile</router-link>
      </div>

      <div class="navbar-end">
        <div class="navbar-item">
          <div class="buttons">
            <CustomButton
              v-if="!user"
              type="is-primary"
              label="Login with "
              :icon="['fab', 'x-twitter']"
              @click="loginWithX"
            />
            <CustomButton
              v-else
              type="is-light"
              label="Logout"
              @click="logout"
            />
          </div>
        </div>
      </div>
    </div>
    <div v-if="error" class="notification is-danger">
      {{ error }}
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';
import { computed, ref } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

const userStore = useUserStore();
const router = useRouter();

const isMenuActive = ref(false);

const user = computed(() => {
  console.log('NavBar user state:', userStore.user);
  return userStore.user;
});
const error = computed(() => userStore.error);

const loginWithX = async () => {
  console.log('Initiating login with X');
  await userStore.loginWithX();
  if (userStore.user && userStore.profile) {
    console.log('Login successful, redirecting to /profile');
    router.push('/profile');
    isMenuActive.value = false;
  } else {
    console.warn('Login failed or no profile loaded');
  }
};

const logout = async () => {
  console.log('Initiating logout');
  await userStore.logout();
  router.push('/');
  isMenuActive.value = false;
};

const toggleMenu = () => {
  isMenuActive.value = !isMenuActive.value;
};

const closeMenu = () => {
  isMenuActive.value = false;
};
</script>

<style scoped>
@media screen and (max-width: 1023px) {
  .navbar-menu {
    background-color: #fff;
  }
}
.navbar-icon {
 
  font-size: 1.2rem;
}
.navbar-item {

 
}
</style>