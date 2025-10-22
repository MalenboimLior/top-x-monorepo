<!-- Search for other players to compare ranks -->
<template>
  <div class="frenemy-page">
    <section class="frenemy-hero">
      <div class="frenemy-hero__glow"></div>
      <div class="frenemy-hero__content">
        <p class="frenemy-hero__pill">Community</p>
        <h1 class="frenemy-hero__title">Find Frenemies</h1>
        <p class="frenemy-hero__subtitle">
          Discover friends, rivals, and creators to follow. Add them as frenemies to compare your game streaks.
        </p>
        <div v-if="!userStore.user" class="frenemy-hero__cta">
          <CustomButton
            type="is-primary is-medium"
            label="Login with X"
            :icon="['fab', 'x-twitter']"
            @click="userStore.loginWithX"
          />
        </div>
      </div>
    </section>

    <section class="frenemy-body">
      <div class="frenemy-surface">
        <form class="frenemy-search" @submit.prevent="searchUsers">
          <label class="sr-only" for="frenemy-search-input">Search by username or name</label>
          <input
            id="frenemy-search-input"
            v-model="searchQuery"
            class="frenemy-input"
            type="text"
            placeholder="Search by username or name"
            @keyup.enter="searchUsers"
          />
          <CustomButton
            class="frenemy-search__button"
            :type="`is-primary ${isLoading ? 'is-loading' : ''}`"
            :label="isLoading ? 'Searching…' : 'Search'"
            @click="searchUsers"
          />
        </form>
        <p v-if="error" class="frenemy-error">{{ error }}</p>

        <div v-if="searchResults.length" class="frenemy-results">
          <article v-for="entry in searchResults" :key="entry.uid" class="frenemy-result">
            <div class="frenemy-result__avatar">
              <img :src="entry.photoURL" alt="Profile picture" />
            </div>
            <div class="frenemy-result__content">
              <RouterLink :to="{ path: '/profile', query: { user: entry.uid } }" class="frenemy-result__name">
                {{ entry.displayName }}
              </RouterLink>
              <p class="frenemy-result__username">{{ entry.username }}</p>
            </div>
            <div class="frenemy-result__actions">
              <CustomButton
                v-if="!isFrenemy(entry.uid)"
                type="is-primary is-small"
                label="Add Frenemy"
                @click="addFrenemy(entry.uid)"
              />
              <p v-else class="frenemy-result__state">Already frenemies</p>
            </div>
          </article>
        </div>

        <p v-else-if="hasSearched && searchQuery && !isLoading" class="frenemy-empty">
          No users found for “{{ searchQuery }}”.
        </p>

        <div v-if="!userStore.user" class="frenemy-notice">
          <h2>Login to explore the community</h2>
          <p>Sign in with X to search players and build your frenemy list.</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { ref, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { RouterLink } from 'vue-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { debounce } from 'lodash';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { User } from '@top-x/shared/types/user';

const userStore = useUserStore();

useHead({
  title: 'Find Frenemies - TOP-X',
  meta: [
    { name: 'description', content: 'Search for friends or rivals and add frenemies on TOP-X.' },
  ],
});

const searchQuery = ref('');
const searchResults = ref<User[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const hasSearched = ref(false);

const debouncedSearch = debounce(async () => {
  await searchUsers();
}, 500);

watch(searchQuery, (newValue) => {
  if (newValue.trim()) {
    hasSearched.value = false;
    debouncedSearch();
  } else {
    searchResults.value = [];
    hasSearched.value = false;
    error.value = null;
  }
});

async function searchUsers() {
  if (!userStore.user) {
    error.value = 'Please log in to search for frenemies.';
    hasSearched.value = true;
    return;
  }
  let queryStr = searchQuery.value.trim();
  if (!queryStr) {
    error.value = 'Please enter a username or name to search.';
    hasSearched.value = true;
    return;
  }
  if (queryStr.startsWith('@')) {
    queryStr = queryStr.slice(1);
  }
  isLoading.value = true;
  error.value = null;
  try {
    const usersRef = collection(db, 'users');
    const displayQ = query(usersRef, where('displayName', '>=', queryStr), where('displayName', '<=', `${queryStr}\uf8ff`));
    const usernameQ = query(usersRef, where('username', '>=', queryStr), where('username', '<=', `${queryStr}\uf8ff`));
    const [displaySnap, usernameSnap] = await Promise.all([getDocs(displayQ), getDocs(usernameQ)]);
    const resultsMap = new Map<string, User>();
    displaySnap.docs.forEach((docItem) => {
      resultsMap.set(docItem.id, docItem.data() as User);
    });
    usernameSnap.docs.forEach((docItem) => {
      if (!resultsMap.has(docItem.id)) {
        resultsMap.set(docItem.id, docItem.data() as User);
      }
    });
    searchResults.value = Array.from(resultsMap.values()).map((user) => ({
      ...user,
      username: user.username ? `@${user.username}` : '@Anonymous',
      displayName: user.displayName || 'Anonymous',
      photoURL: user.photoURL || 'https://www.top-x.co/assets/profile.png',
    }));
    hasSearched.value = true;
  } catch (err: any) {
    if (err.code === 'permission-denied') {
      error.value = 'Permission denied. Please ensure you’re logged in and try again.';
    } else {
      error.value = `Search failed: ${err.message}`;
    }
    hasSearched.value = true;
  } finally {
    isLoading.value = false;
  }
}

const isFrenemy = (uid: string) => userStore.profile?.frenemies?.includes(uid) || false;

async function addFrenemy(uid: string) {
  if (!userStore.user) {
    error.value = 'Please log in to add frenemies.';
    return;
  }
  await userStore.addFrenemy(uid);
  searchResults.value = searchResults.value.filter((result) => result.uid !== uid);
}
</script>

<style scoped>
.frenemy-page {
  min-height: 100vh;
  background: radial-gradient(circle at top left, rgba(0, 232, 224, 0.18), transparent 55%),
    linear-gradient(180deg, #040404 0%, #0d0d0d 100%);
  color: #f8f8fc;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.frenemy-hero {
  position: relative;
  padding: clamp(3rem, 8vw, 6rem) 1.5rem 2.5rem;
  display: flex;
  justify-content: center;
}

.frenemy-hero__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 25% 25%, rgba(0, 232, 224, 0.3), transparent 60%),
    radial-gradient(circle at 80% 15%, rgba(196, 255, 0, 0.2), transparent 60%);
  pointer-events: none;
}

.frenemy-hero__content {
  position: relative;
  width: min(820px, 100%);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  align-items: center;
}

.frenemy-hero__pill {
  display: inline-flex;
  padding: 0.35rem 1.25rem;
  border-radius: 999px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: rgba(0, 232, 224, 0.18);
  color: var(--bulma-primary);
  font-weight: 600;
}

.frenemy-hero__title {
  margin: 0;
  font-size: clamp(2.5rem, 2vw + 2rem, 3.5rem);
}

.frenemy-hero__subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 1.1rem;
  line-height: 1.7;
}

.frenemy-hero__cta {
  display: flex;
  justify-content: center;
}

.frenemy-body {
  display: flex;
  justify-content: center;
  padding: 0 1.5rem 4rem;
}

.frenemy-surface {
  width: min(960px, 100%);
  background: rgba(12, 12, 12, 0.8);
  border-radius: 32px;
  border: 1px solid rgba(0, 232, 224, 0.15);
  padding: clamp(2rem, 4vw, 3rem);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.frenemy-search {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.frenemy-input {
  flex: 1;
  min-width: 200px;
  padding: 0.85rem 1rem;
  border-radius: 16px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.frenemy-input:focus {
  outline: none;
  border-color: rgba(0, 232, 224, 0.5);
}

.frenemy-search__button {
  white-space: nowrap;
}

.frenemy-error {
  margin: 0;
  color: rgba(255, 107, 107, 0.9);
}

.frenemy-results {
  display: grid;
  gap: 1.25rem;
}

.frenemy-result {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 1.25rem 1.5rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1.25rem;
}

.frenemy-result__avatar img {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  object-fit: cover;
}

.frenemy-result__content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.frenemy-result__name {
  font-size: 1.1rem;
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}

.frenemy-result__name:hover,
.frenemy-result__name:focus {
  color: var(--bulma-primary);
}

.frenemy-result__username {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
}

.frenemy-result__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.frenemy-result__state {
  margin: 0;
  color: rgba(255, 255, 255, 0.55);
}

.frenemy-empty {
  margin: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
}

.frenemy-notice {
  padding: 1.75rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 22px;
  border: 1px solid rgba(0, 232, 224, 0.12);
}

.frenemy-notice h2 {
  margin: 0;
  font-size: 1.4rem;
}

.frenemy-notice p {
  margin: 0.75rem 0 0;
  color: rgba(255, 255, 255, 0.7);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 640px) {
  .frenemy-result {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .frenemy-result__actions {
    align-items: center;
  }
}
</style>
