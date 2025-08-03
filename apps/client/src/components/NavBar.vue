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
        <!-- <router-link class="navbar-item" to="/frenemies" @click="closeMenu">
          <font-awesome-icon :icon="['fas', 'search']" class="navbar-icon" />
          Frenemies
        </router-link>        -->
        
        <router-link class="navbar-item" to="/about" @click="closeMenu">About</router-link>
        <router-link class="navbar-item" to="/faq" @click="closeMenu">FAQ</router-link>
        <router-link  class="navbar-item" to="/profile" @click="closeMenu">Profile</router-link>
                <router-link  class="navbar-item" to="/build" @click="closeMenu">Build</router-link>

      </div>


      <div class="navbar-end">
        <div class="navbar-item profile-div">
          <div class="buttons">
            <CustomButton
              v-if="!user"
              type="is-primary"
              label="Login with"
              :icon="['fab', 'x-twitter']"
              @click="handleLogin"
            />
            <router-link
              v-else
              to="/profile"
              @click="closeMenu"
              class="navbar-item profile-link"
            >
              <figure class="image is-48x48">
                <img :src="user.photoURL || 'https://www.top-x.co/assets/profile.png'" alt="Profile" class="is-rounded" />
              </figure>
            </router-link>
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
import { analytics, trackEvent } from '@top-x/shared';

const userStore = useUserStore();
const router = useRouter();

const isMenuActive = ref(false);

const user = computed(() => {
  console.log('NavBar user state:', userStore.user);
  return userStore.user;
});
const error = computed(() => userStore.error);

const handleLogin = async () => {
  console.log('Initiating login with X');
  trackEvent(analytics, 'user_action', { action: 'login_click', context: 'nav' });
  await userStore.loginWithX();
  if (userStore.user && userStore.profile) {
    console.log('Login successful, redirecting to /profile');
    trackEvent(analytics, 'user_action', { action: 'login', method: 'x_auth', context: 'nav' });
    // router.push('/profile');
    isMenuActive.value = false;
  } else {
    console.warn('Login failed or no profile loaded');
  }
};

const logout = async () => {
  console.log('Initiating logout');
  await userStore.logout();
  trackEvent(analytics, 'user_action', { action: 'logout' });
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
.navbar-burger {
  color: #00e8e0;
}
@media screen and (max-width: 1023px) {
 
}
.navbar-icon {
  font-size: 1.2rem;
}
.profile-link {
  padding: 0;
}
.profile-link .image {
  margin: 0;
}
.profile-link .image img {
  width: 48px;
  height: 48px;
  max-height: 48px;
}
</style>