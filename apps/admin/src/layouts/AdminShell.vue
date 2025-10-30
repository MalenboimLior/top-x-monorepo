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
        <div class="admin-shell__breadcrumbs">
          <slot name="breadcrumbs">
            <nav class="breadcrumb" aria-label="breadcrumbs">
              <ul>
                <li class="is-active"><a>{{ currentTitle }}</a></li>
              </ul>
            </nav>
          </slot>
        </div>

        <div class="admin-shell__utilities">
          <slot name="search">
            <div class="field has-addons">
              <div class="control has-icons-left">
                <input class="input" type="search" placeholder="Search admin" />
                <span class="icon is-small is-left">
                  <font-awesome-icon icon="search" aria-hidden="true" />
                </span>
              </div>
              <div class="control">
                <button class="button is-info" type="button">
                  Search
                </button>
              </div>
            </div>
          </slot>

          <slot name="actions">
            <div class="buttons">
              <button class="button is-light" type="button">
                <span class="icon">
                  <font-awesome-icon icon="plus" aria-hidden="true" />
                </span>
                <span>Quick Action</span>
              </button>
            </div>
          </slot>

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
  { label: 'Content', name: 'content', icon: 'pen-nib' },
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
  grid-template-columns: 16rem 1fr;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.admin-shell.is-collapsed {
  grid-template-columns: 4rem 1fr;
}

.admin-shell__sidebar {
  position: relative;
  background: linear-gradient(180deg, #1e3a8a 0%, #0f172a 100%);
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  gap: 1rem;
  box-shadow: 12px 0 45px rgba(15, 23, 42, 0.35);
  overflow: hidden;
}

.admin-shell.is-collapsed .admin-shell__sidebar span:not(.icon) {
  display: none;
}

.admin-shell__brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: #fff;
}

.admin-shell__brand a {
  color: inherit;
  font-weight: 600;
  font-size: 1.05rem;
}

.admin-shell__collapse {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border-color: transparent;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.admin-shell__collapse:hover,
.admin-shell__collapse:focus {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.menu-label {
  color: rgba(226, 232, 240, 0.75);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-size: 0.75rem;
  font-weight: 600;
}

.menu-list a {
  color: rgba(248, 250, 252, 0.92);
  padding: 0.65rem 0.85rem;
  border-radius: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease,
    transform 0.2s ease;
}

.menu-list a .icon {
  color: rgba(248, 250, 252, 0.7);
}

.menu-list a:hover,
.menu-list a:focus {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  transform: translateX(4px);
}

.menu-list a.is-active {
  background: linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%);
  color: #fff;
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.35);
  transform: translateX(6px);
}

.menu-list a.is-active .icon {
  color: #fff;
}

.menu-list a:focus-visible {
  outline: 2px solid rgba(148, 163, 184, 0.65);
  outline-offset: 3px;
}

.admin-shell__main {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
}

.admin-shell__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  gap: 1rem;
  backdrop-filter: blur(12px);
}

.admin-shell__breadcrumbs {
  flex: 1 1 auto;
  min-width: 12rem;
}

.admin-shell__utilities {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.admin-shell__account img {
  width: 24px;
  height: 24px;
}

.admin-shell__content {
  padding: 2rem;
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
}
</style>
