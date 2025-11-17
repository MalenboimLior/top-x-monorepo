<template>
  <div class="admin-shell" :class="{ 'is-collapsed': isSidebarCollapsed }">
    <aside class="admin-shell__sidebar">
      <div class="admin-shell__brand">
        <RouterLink to="/">
          <span class="icon-text">
            <span class="icon">
              <font-awesome-icon icon="chess-queen" aria-hidden="true" />
            </span>
            <span>Top-X Admin</span>
          </span>
        </RouterLink>
        <button
          class="button is-small admin-shell__collapse"
          type="button"
          @click="toggleSidebar"
          aria-label="Toggle navigation"
        >
          <span class="icon">
            <font-awesome-icon :icon="isSidebarCollapsed ? 'chevron-right' : 'chevron-left'" aria-hidden="true" />
          </span>
        </button>
      </div>

      <nav class="menu">
        <p class="menu-label">Main</p>
        <ul class="menu-list">
          <li v-for="link in navigation" :key="link.name">
            <RouterLink
              :to="{ name: link.name }"
              class="is-capitalized"
              active-class="is-active"
              :title="isSidebarCollapsed ? link.label : undefined"
            >
              <span class="icon-text">
                  <span class="icon">
                    <font-awesome-icon :icon="link.icon" aria-hidden="true" />
                  </span>
                  <span>{{ link.label }}</span>
                </span>
              </RouterLink>
          </li>
        </ul>
      </nav>
    </aside>

    <div class="admin-shell__main">
      <header class="admin-shell__header">
        <div class="admin-shell__header-inner">
          <div class="admin-shell__title-area">
            <div class="admin-shell__breadcrumbs">
              <slot name="breadcrumbs">
                <nav class="breadcrumb" aria-label="breadcrumbs">
                  <ul>
                    <li>
                      <RouterLink to="/">Top-X Admin</RouterLink>
                    </li>
                    <li class="is-active">
                      <span aria-current="page">{{ currentTitle }}</span>
                    </li>
                  </ul>
                </nav>
              </slot>
            </div>

            <div class="admin-shell__title">
              <h1>{{ currentTitle }}</h1>
              <p class="admin-shell__subtitle">{{ currentSubtitle }}</p>
            </div>
          </div>

          <div class="admin-shell__utilities">
            <div class="admin-shell__account" v-if="user">
              <div class="dropdown" :class="{ 'is-active': isAccountMenuOpen }">
                <div class="dropdown-trigger">
                  <button class="button" type="button" @click="toggleAccountMenu" aria-haspopup="true" aria-controls="account-menu">
                    <span class="icon">
                      <img :src="user.photoURL" alt="User avatar" class="is-rounded" />
                    </span>
                    <span>{{ user.displayName }}</span>
                    <span class="icon is-small">
                      <font-awesome-icon icon="angle-down" aria-hidden="true" />
                    </span>
                  </button>
                </div>
                <div class="dropdown-menu" id="account-menu" role="menu">
                  <div class="dropdown-content">
                    <div class="dropdown-item">
                      <p class="is-size-7 has-text-grey">Signed in as</p>
                      <p class="is-size-6 has-text-weight-semibold">{{ user.username }}</p>
                    </div>
                    <hr class="dropdown-divider" />
                    <button class="dropdown-item" type="button" @click="logout">
                      <span class="icon-text">
                        <span class="icon"><font-awesome-icon icon="sign-out-alt" aria-hidden="true" /></span>
                        <span>Sign out</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="admin-shell__account" v-else>
              <RouterLink class="button is-primary" to="/login">Sign in</RouterLink>
            </div>
          </div>
        </div>
      </header>

      <main class="admin-shell__content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';

const navigation = [
  { label: 'Dashboard', name: 'dashboard', icon: 'chart-line' },
  { label: 'Game Types', name: 'game-types', icon: 'layer-group' },
  { label: 'Games', name: 'games', icon: 'gamepad' },
  { label: 'Rehash Trivia', name: 'trivia-rehash', icon: 'arrows-rotate' },
  { label: 'Users', name: 'users', icon: 'users' },
  { label: 'Homepage', name: 'homepage', icon: 'home' },
  { label: 'Communications', name: 'communications', icon: 'bullhorn' },
  { label: 'Settings', name: 'settings', icon: 'cog' },
];

const route = useRoute();
const userStore = useUserStore();
const isSidebarCollapsed = ref(false);
const isAccountMenuOpen = ref(false);

const user = computed(() => userStore.user);

const currentTitle = computed(() => {
  const title = route.meta?.title;
  return typeof title === 'string' ? title : 'Admin';
});

const subtitleMap: Record<string, string> = {
  dashboard: 'Monitor performance, player activity, and platform health at a glance.',
  'game-types': 'Curate the experiences available to players across the Top-X ecosystem.',
  games: 'Manage game details, daily challenges, and special configurations.',
  'trivia-rehash': 'Refresh stored answer hashes after rotating the trivia secret.',
  users: 'Search users and choose who to spotlight on the homepage.',
  homepage: 'Design the storefront of Top-X with featured content and spotlights.',
  communications: 'Coordinate announcements and keep the community in the loop.',
  settings: 'Fine-tune administrative preferences and integrations.',
};

const currentSubtitle = computed(() => {
  const metaSubtitle = route.meta?.subtitle;
  if (typeof metaSubtitle === 'string') {
    return metaSubtitle;
  }

  const name = typeof route.name === 'string' ? route.name : '';
  if (name && subtitleMap[name]) {
    return subtitleMap[name];
  }

  return 'Manage the Top-X platform with clarity and confidence.';
});

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}

function toggleAccountMenu() {
  isAccountMenuOpen.value = !isAccountMenuOpen.value;
}

async function logout() {
  await userStore.logout();
  isAccountMenuOpen.value = false;
}
</script>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: 17rem 1fr;
  min-height: 100vh;
  background: #e2e8f0;
}

.admin-shell.is-collapsed {
  grid-template-columns: 4.5rem 1fr;
}

.admin-shell__sidebar {
  position: relative;
  background: linear-gradient(200deg, #1d4ed8 0%, #312e81 55%, #111827 100%);
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  padding: 1.75rem 1.15rem;
  gap: 1.25rem;
  box-shadow: 12px 0 45px rgba(15, 23, 42, 0.35);
  overflow: hidden;
  border-right: 1px solid rgba(148, 163, 184, 0.25);
}

.admin-shell.is-collapsed .admin-shell__sidebar span:not(.icon) {
  display: none;
}

.admin-shell__brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: #f8fafc;
}

.admin-shell__brand a {
  color: inherit;
  font-weight: 600;
  font-size: 1.1rem;
  letter-spacing: 0.01em;
}

.admin-shell__collapse {
  background: rgba(248, 250, 252, 0.12);
  color: inherit;
  border-color: transparent;
  border-radius: 999px;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.admin-shell__collapse:hover,
.admin-shell__collapse:focus {
  background: rgba(248, 250, 252, 0.25);
  color: #fff;
  transform: translateX(1px);
}

.menu-label {
  color: rgba(226, 232, 240, 0.72);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.7rem;
  font-weight: 600;
}

.menu-list a {
  padding: 0.7rem 0.95rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
  font-size: 0.95rem;
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease,
    transform 0.2s ease;
}

.menu-list a .icon {
  color: rgba(248, 250, 252, 0.65);
}

.menu-list a:hover,
.menu-list a:focus {
  background: rgba(248, 250, 252, 0.18);
  color: #fff;
  transform: translateX(4px);
}

.menu-list a.is-active {
  background: linear-gradient(90deg, #38bdf8 0%, #6366f1 100%);
  color: #fff;
  box-shadow: 0 14px 30px rgba(56, 189, 248, 0.35);
  transform: translateX(6px);
}

.menu-list a.is-active .icon {
  color: #fff;
}

.menu-list a:focus-visible {
  outline: 2px solid rgba(191, 219, 254, 0.75);
  outline-offset: 4px;
}

.admin-shell__main {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #f8fafc 0%, #e0e7ff 45%, #eef2ff 100%);
}

.admin-shell__header {
  position: relative;
  padding: 2.25rem clamp(1.5rem, 3vw, 3rem);
  background: #ffffff;
  box-shadow: 0 16px 35px rgba(15, 23, 42, 0.1);
  overflow: hidden;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.admin-shell__header::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 55%),
    radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.14), transparent 60%);
  pointer-events: none;
}

.admin-shell__header-inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(1.5rem, 4vw, 3.5rem);
  z-index: 1;
}

.admin-shell__title-area {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.admin-shell__title h1 {
  margin: 0;
  font-size: clamp(1.6rem, 2.8vw, 2.1rem);
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.admin-shell__subtitle {
  margin: 0;
  color: rgba(15, 23, 42, 0.7);
  font-size: 0.95rem;
  max-width: 40ch;
  line-height: 1.5;
}

.admin-shell__breadcrumbs .breadcrumb {
  background: transparent;
  padding: 0;
  margin-bottom: 0;
}

.admin-shell__breadcrumbs li + li::before {
  color: rgba(79, 70, 229, 0.5);
}

.admin-shell__breadcrumbs a,
.admin-shell__breadcrumbs span {
  font-size: 0.9rem;
  color: rgba(15, 23, 42, 0.65);
}

.admin-shell__breadcrumbs .is-active span {
  color: #1d4ed8;
  font-weight: 600;
}

.admin-shell__utilities {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: flex-end;
  flex-wrap: nowrap;
}

.admin-shell__account img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.admin-shell__account .dropdown-trigger .button {
  border-radius: 999px;
  border: 1px solid rgba(59, 130, 246, 0.15);
  background: rgba(59, 130, 246, 0.08);
  color: #1d4ed8;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.admin-shell__account .dropdown-trigger .button:hover,
.admin-shell__account .dropdown-trigger .button:focus-visible {
  background: rgba(59, 130, 246, 0.16);
  border-color: rgba(59, 130, 246, 0.25);
  transform: translateY(-1px);
}

.admin-shell__content {
  padding: clamp(1.75rem, 3vw, 2.75rem) clamp(1.5rem, 4vw, 3rem);
  flex: 1 1 auto;
  color: #1f2937;
}

@media screen and (max-width: 960px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }

  .admin-shell__sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 20;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .admin-shell.is-collapsed .admin-shell__sidebar {
    transform: translateX(0);
  }

  .admin-shell__header-inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .admin-shell__utilities {
    width: 100%;
    justify-content: flex-start;
  }
}

@media screen and (max-width: 600px) {
  .admin-shell__sidebar {
    width: 18rem;
  }

  .admin-shell__utilities {
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .admin-shell__account .dropdown-trigger .button {
    width: 100%;
    justify-content: center;
  }
}
</style>
