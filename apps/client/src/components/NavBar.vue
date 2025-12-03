<!-- Top navigation bar for the client app -->
<template>
  <nav class="navbar" role="navigation" aria-label="main navigation">
    <div class="navbar-inner layout-container">
      <div class="navbar-brand">
        <router-link 
          class="navbar-item logo-link" 
          :class="{ 'is-home': isHomePage }"
          to="/"
        >
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
        <router-link class="navbar-item" to="/games" @click="closeMenu">{{ t('nav.games') }}</router-link>
        <router-link class="navbar-item" to="/users" @click="closeMenu">{{ t('nav.users') }}</router-link>
        <router-link class="navbar-item" to="/about" @click="closeMenu">{{ t('nav.about') }}</router-link>
        <router-link class="navbar-item build-link" to="/build" @click="closeMenu">{{ t('nav.build') }}</router-link>

      </div>


        <div class="navbar-end">
          <div class="navbar-item theme-toggle">
            <div class="theme-toggle-inner" role="group" aria-label="Theme toggle">
              <button
                type="button"
                class="theme-button"
                :class="{ 'is-active': theme === 'dark' }"
                :aria-pressed="(theme === 'dark').toString()"
                @click="themeStore.setTheme('dark')"
                aria-label="Dark mode"
              >
                <font-awesome-icon
                  :icon="['fas', 'moon']"
                  class="theme-icon"
                />
              </button>
              <button
                type="button"
                class="theme-button"
                :class="{ 'is-active': theme === 'light' }"
                :aria-pressed="(theme === 'light').toString()"
                @click="themeStore.setTheme('light')"
                aria-label="Light mode"
              >
                <font-awesome-icon
                  :icon="['fas', 'lightbulb']"
                  class="theme-icon"
                />
              </button>
            </div>
          </div>
          <div class="navbar-item language-toggle">
            <div class="language-toggle-wrapper">
              <button
                type="button"
                class="language-current-button"
                :aria-expanded="isLanguageMenuOpen.toString()"
                :aria-label="`Current language: ${currentLanguageLabel}`"
                @click="toggleLanguageMenu"
              >
                <img
                  :src="currentLanguageFlag"
                  class="language-flag"
                  :alt="currentLanguageLabel"
                />
              </button>
              <div
                v-if="isLanguageMenuOpen"
                class="language-dropdown"
                @click.stop
              >
                <button
                  v-for="option in languageOptions"
                  :key="option.code"
                  type="button"
                  class="language-dropdown-item"
                  :class="{ 'is-active': currentLanguage === option.code }"
                  @click="selectLanguage(option.code)"
                >
                  <img
                    :src="option.flag"
                    class="language-flag"
                    :alt="option.label"
                  />
                  <span>{{ option.label }}</span>
                </button>
              </div>
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
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
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
const isLanguageMenuOpen = ref(false);
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
const currentLanguageOption = computed(() => 
  languageOptions.find(opt => opt.code === currentLanguage.value) || languageOptions[0]
);
const currentLanguageFlag = computed(() => currentLanguageOption.value.flag);
const currentLanguageLabel = computed(() => currentLanguageOption.value.label);

const toggleLanguageMenu = () => {
  isLanguageMenuOpen.value = !isLanguageMenuOpen.value;
};

const selectLanguage = (code: 'en' | 'il') => {
  localeStore.setLanguage(code);
  isLanguageMenuOpen.value = false;
};

const user = computed(() => {
  console.log('NavBar user state:', userStore.user);
  return userStore.user;
});
const error = computed(() => userStore.error);
const hasRewardNotification = computed(() => userStore.readyDailyChallengeRewards.length > 0);
const isHomePage = computed(() => router.currentRoute.value.path === '/');

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
  isLanguageMenuOpen.value = false;
};

watch(
  () => router.currentRoute.value.fullPath,
  () => {
    userStore.clearError();
    isLanguageMenuOpen.value = false;
  },
);

// Close language menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.language-toggle-wrapper')) {
    isLanguageMenuOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
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
  gap: var(--space-3);
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
  border: none;
  outline: none;
  transition: color var(--transition-fast), background-color var(--transition-fast);
}

.navbar-item:focus,
.navbar-item:focus-visible {
  outline: none;
  border: none;
}

.navbar-item:hover,
.navbar-item.router-link-active {
  color: var(--bulma-primary);
  background-color: var(--color-bg-navbar-hover);
  border: none;
  outline: none;
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
  height: 18px;
  width: auto;
}

.logo-link {
  padding: 0;
  border: none !important;
  outline: none !important;
}

.logo-link:hover,
.logo-link.router-link-active,
.logo-link:focus,
.logo-link:focus-visible,
.logo-link:active {
  background-color: transparent !important;
  border: none !important;
  outline: none !important;
}

.logo-link.is-home:hover,
.logo-link.is-home.router-link-active,
.logo-link.is-home:focus,
.logo-link.is-home:focus-visible,
.logo-link.is-home:active {
  background-color: transparent !important;
  border: none !important;
  outline: none !important;
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
  gap: var(--space-3);
}

.navbar-end {
  margin-inline-start: auto;
}

.theme-toggle-inner {
  display: inline-flex;
  gap: var(--space-2);
  padding: var(--space-1);
  border-radius: 999px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-base);
}

.theme-button {
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
  color: var(--bulma-text);
}

.theme-button:hover {
  background-color: var(--color-primary-bg);
}

.theme-button.is-active {
  background-color: var(--color-primary-bg-hover);
  border: 1px solid var(--color-border-primary);
  color: var(--bulma-primary);
}

.theme-button:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

.theme-icon {
  font-size: 1.1rem;
}

.language-toggle-wrapper {
  position: relative;
}

.language-current-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--color-border-base);
  padding: 0;
  background-color: var(--color-bg-surface);
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.language-current-button:hover {
  background-color: var(--color-primary-bg);
  border-color: var(--color-border-primary);
}

.language-current-button:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

.language-dropdown {
  position: absolute;
  top: calc(100% + var(--space-2));
  inset-inline-end: 0;
  min-width: 150px;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.language-dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--bulma-text);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  text-align: start;
}

.language-dropdown-item:hover {
  background-color: var(--color-primary-bg);
}

.language-dropdown-item.is-active {
  background-color: var(--color-primary-bg-hover);
  color: var(--bulma-primary);
}

.language-flag {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--color-border-base);
  flex-shrink: 0;
}

:global([dir='rtl']) .theme-toggle-inner {
  flex-direction: row-reverse;
}

:global([dir='rtl']) .language-dropdown {
  inset-inline-start: 0;
  inset-inline-end: auto;
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

.profile-div .button {
  display: inline-flex;
  align-items: center;
}

.profile-div .button .icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  height: auto;
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
  
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.build-link:focus,
.build-link:focus-visible {
  outline: none;
  border-color: var(--color-border-primary);
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

  .language-toggle,
  .theme-toggle {
    width: 100%;
  }

  .theme-toggle-inner {
    justify-content: center;
  }

  .language-dropdown {
    inset-inline-end: auto;
    inset-inline-start: 0;
    width: 100%;
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

</style>
