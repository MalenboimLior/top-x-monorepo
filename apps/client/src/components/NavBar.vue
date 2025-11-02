<!-- Top navigation bar for the client app -->
<template>
  <nav class="navbar" role="navigation" aria-label="main navigation">
    <div class="navbar-inner layout-container">
      <div class="navbar-brand">
        <router-link class="navbar-item" to="/">
          <img src="@/assets/topx-icon.png" alt="TOP-X Logo">
          <span class="brand-wordmark">TOP-X</span>
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
        <router-link class="navbar-item" to="/" @click="closeMenu">{{ t('nav.home') }}</router-link>
        <!-- <router-link class="navbar-item" to="/frenemies" @click="closeMenu">
          <font-awesome-icon :icon="['fas', 'search']" class="navbar-icon" />
          Frenemies
        </router-link>        -->

        <router-link class="navbar-item" to="/about" @click="closeMenu">{{ t('nav.about') }}</router-link>
        <router-link class="navbar-item" to="/faq" @click="closeMenu">{{ t('nav.faq') }}</router-link>
        <router-link  class="navbar-item" to="/profile" @click="closeMenu">{{ t('nav.profile') }}</router-link>
        <router-link
          v-if="user?.isAdmin"
          class="navbar-item"
          to="/build"
          @click="closeMenu"
        >
          {{ t('nav.build') }}
        </router-link>

      </div>


        <div class="navbar-end">
          <div class="navbar-item profile-div">
            <div class="buttons">
              <CustomButton
                v-if="!user"
                type="is-primary"
                :label="t('nav.loginWith')"
                :icon="['fab', 'x-twitter']"
                @click="handleLogin"
              />
              <router-link
                v-else
                to="/profile"
                @click="closeMenu"
                class="navbar-item profile-link"
                :title="hasRewardNotification ? 'Daily challenge results ready' : undefined"
              >
                <figure class="image is-48x48">
                  <img :src="user.photoURL || 'https://www.top-x.co/assets/profile.png'" alt="Profile" class="is-rounded" />
                </figure>
                <span
                  v-if="hasRewardNotification"
                  class="challenge-reward-indicator"
                  aria-hidden="true"
                ></span>
              </router-link>
            </div>
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
import { useLocaleStore } from '@/stores/locale';

const userStore = useUserStore();
const router = useRouter();

const isMenuActive = ref(false);
const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const user = computed(() => {
  console.log('NavBar user state:', userStore.user);
  return userStore.user;
});
const error = computed(() => userStore.error);
const hasRewardNotification = computed(() => userStore.readyDailyChallengeRewards.length > 0);

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
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(0, 232, 224, 0.12);
  padding: 0;
}

.navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-block: var(--space-3);
}

.navbar-brand {
  align-items: center;
}

.navbar-item {
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--bulma-text);
  transition: color 0.2s ease, opacity 0.2s ease;
}

.navbar-item:hover,
.navbar-item.router-link-active {
  color: var(--bulma-primary);
}

.profile-link {
  position: relative;
}

.challenge-reward-indicator {
  position: absolute;
  top: 6px;
  right: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--bulma-primary);
  box-shadow: 0 0 8px rgba(0, 232, 224, 0.6);
}

.navbar-brand .navbar-item {
  gap: var(--space-3);
  display: inline-flex;
  align-items: center;
  font-size: 1rem;
}

.navbar-brand img {
  width: 36px;
  height: 36px;
  filter: drop-shadow(0 6px 12px rgba(0, 232, 224, 0.25));
}

.brand-wordmark {
  font-weight: 700;
  letter-spacing: 0.18em;
  font-size: 0.95rem;
  text-transform: uppercase;
  color: var(--bulma-primary);
}

.navbar-menu {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
}

.navbar-start,
.navbar-end {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.navbar-end {
  margin-left: auto;
}

.navbar-burger {
  display: none;
  color: var(--bulma-primary);
  background: rgba(0, 232, 224, 0.08);
  border-radius: 999px;
  padding: var(--space-2) var(--space-3);
  margin-left: var(--space-3);
  transition: background 0.2s ease, color 0.2s ease;
}

.navbar-burger:hover,
.navbar-burger.is-active {
  background: rgba(0, 232, 224, 0.18);
}

.navbar-icon {
  font-size: 1.2rem;
}

.profile-div .buttons {
  display: flex;
  align-items: center;
}

.profile-link {
  padding: 0;
}

.profile-link .image {
  margin: 0;
  border: 2px solid rgba(0, 232, 224, 0.4);
  box-shadow: 0 10px 25px rgba(0, 232, 224, 0.2);
}

.profile-link .image img {
  width: 48px;
  height: 48px;
  max-height: 48px;
}

@media screen and (max-width: 64rem) {
  .navbar-inner {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
    padding-block: var(--space-3);
  }

  .navbar-menu {
    display: none;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    background: rgba(0, 0, 0, 0.96);
    border: 1px solid rgba(0, 232, 224, 0.12);
    border-radius: 18px;
    padding: var(--space-4);
  }

  .navbar-menu.is-active {
    display: flex;
  }

  .navbar-start,
  .navbar-end {
    flex-direction: column;
    align-items: stretch;
  }

  .navbar-item {
    border-radius: 12px;
    padding: var(--space-3) var(--space-4);
  }

  .navbar-item:hover,
  .navbar-item.router-link-active {
    background: rgba(0, 232, 224, 0.12);
  }

  .profile-div .buttons {
    width: 100%;
    justify-content: center;
  }

  .navbar-burger {
    display: inline-flex;
  }
}
</style>
