<!-- Top navigation bar for the client app -->
<template>
  <nav class="navbar" role="navigation" aria-label="main navigation">
    <div class="navbar-inner layout-container">
      <div class="navbar-brand">
        <router-link class="navbar-item" to="/">
          <img :src="logo" alt="TOP-X Logo">
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
        <!-- <router-link class="navbar-item" to="/" @click="closeMenu">{{ t('nav.home') }}</router-link> -->
        <!-- <router-link class="navbar-item" to="/users" @click="closeMenu">
          <font-awesome-icon :icon="['fas', 'search']" class="navbar-icon" />
          Users
        </router-link>        -->
        <router-link class="navbar-item" to="/profile" @click="closeMenu">{{ t('nav.profile') }}</router-link>
        <router-link class="navbar-item" to="/users" @click="closeMenu">{{ t('nav.users') }}</router-link>
        <router-link class="navbar-item" to="/about" @click="closeMenu">{{ t('nav.about') }}</router-link>
        <router-link class="navbar-item build-link" to="/build" @click="closeMenu">{{ t('nav.build') }}</router-link>

      </div>


        <div class="navbar-end">
          <div class="navbar-item theme-toggle">
            <button
              type="button"
              class="theme-toggle-button"
              :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
              @click="themeStore.toggleTheme"
            >
              <font-awesome-icon
                :icon="theme === 'dark' ? ['fas', 'sun'] : ['fas', 'moon']"
                class="theme-icon"
              />
            </button>
          </div>
          <div class="navbar-item language-toggle">
            <div class="language-toggle-inner" role="group" aria-label="Language toggle">
              <button
                v-for="option in languageOptions"
                :key="option.code"
                type="button"
                class="language-button"
                :class="{ 'is-active': currentLanguage === option.code }"
                :aria-pressed="(currentLanguage === option.code).toString()"
                @click="localeStore.setLanguage(option.code)"
              >
                <img
                  :src="option.flag"
                  class="language-flag"
                  :alt="option.label"
                />
              </button>
            </div>
          </div>
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
                  <img :src="user.photoURL || '/assets/profile.png'" alt="Profile" class="is-rounded" />
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
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { analytics, trackEvent } from '@top-x/shared';
import usFlagUrl from '@/assets/flags/us.svg';
import ilFlagUrl from '@/assets/flags/il.svg';
import topxLogo from '@/assets/topx-logo.png';
import topxLogoBlack from '@/assets/topx-logo-black.png';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';
import { useThemeStore } from '@/stores/theme';

const userStore = useUserStore();
const router = useRouter();

const isMenuActive = ref(false);
const localeStore = useLocaleStore();
const themeStore = useThemeStore();
const theme = computed(() => themeStore.theme);
const logo = computed(() => (theme.value === 'dark' ? topxLogo : topxLogoBlack));
const t = (key: string) => localeStore.translate(key);
const currentLanguage = computed(() => localeStore.language);
const languageOptions = [
  { code: 'en' as const, label: 'English', flag: usFlagUrl },
  { code: 'il' as const, label: 'Hebrew', flag: ilFlagUrl },
];

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

watch(
  () => router.currentRoute.value.fullPath,
  () => {
    userStore.clearError();
  },
);
</script>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  background-color: var(--color-bg-navbar);
  border-bottom: 1px solid var(--color-border-base);
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
  transition: color var(--transition-fast), background-color var(--transition-fast);
}

.navbar-item:hover,
.navbar-item.router-link-active {
  color: var(--bulma-primary);
  background-color: var(--color-bg-navbar-hover);
}

.profile-link {
  position: relative;
}

.challenge-reward-indicator {
  position: absolute;
  top: 6px;
  inset-inline-end: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--bulma-primary);
  border: 2px solid var(--color-bg-navbar);
}

.navbar-brand .navbar-item {
  gap: var(--space-3);
  display: inline-flex;
  align-items: center;
  font-size: 1rem;
}

.navbar-brand img {
  height: 22px;
  width: auto;
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
  margin-inline-start: auto;
}

.language-toggle-inner {
  display: inline-flex;
  gap: var(--space-2);
  padding: var(--space-1);
  border-radius: 999px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-base);
}

.language-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.language-button:hover {
  background-color: var(--color-primary-bg);
}

.language-button.is-active {
  background-color: var(--color-primary-bg-hover);
  border: 1px solid var(--color-border-primary);
}

.language-button:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

.language-flag {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--color-border-base);
}

:global([dir='rtl']) .language-toggle-inner {
  flex-direction: row-reverse;
}

.navbar-burger {
  display: none;
  color: var(--bulma-primary);
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  margin-inline-start: var(--space-3);
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.navbar-burger:hover,
.navbar-burger.is-active {
  background-color: var(--color-primary-bg-hover);
  border-color: var(--color-border-primary);
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
  border: 2px solid var(--color-border-base);
  border-radius: 50%;
  overflow: hidden;
  transition: border-color var(--transition-fast);
}

.profile-link:hover .image {
  border-color: var(--color-border-primary);
}

.profile-link .image img {
  width: 48px;
  height: 48px;
  max-height: 48px;
}

.build-link {
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-md);
  padding: calc(var(--space-3) - 2px) calc(var(--space-4) - 2px);
  background-color: var(--color-primary-bg);
  transition: background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.build-link:hover,
.build-link.router-link-active {
  color: var(--bulma-primary);
  background-color: var(--color-primary-bg-hover);
  border-color: var(--color-border-primary);
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
    background-color: var(--color-bg-card);
    border: 1px solid var(--color-border-base);
    border-radius: var(--radius-md);
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

  .language-toggle {
    width: 100%;
  }

  .language-toggle-inner {
    justify-content: center;
  }

  .navbar-item {
    border-radius: 12px;
    padding: var(--space-3) var(--space-4);
  }

  .navbar-item:hover,
  .navbar-item.router-link-active {
    background-color: var(--color-primary-bg);
  }

  .profile-div .buttons {
    width: 100%;
    justify-content: center;
  }

  .navbar-burger {
    display: inline-flex;
  }
}

.theme-toggle {
  padding: 0;
}

.theme-toggle-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-base);
  background-color: transparent;
  color: var(--bulma-text);
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.theme-toggle-button:hover {
  background-color: var(--color-primary-bg);
  border-color: var(--color-border-primary);
  color: var(--bulma-primary);
}

.theme-toggle-button:focus {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

.theme-icon {
  font-size: 1.1rem;
}
</style>
