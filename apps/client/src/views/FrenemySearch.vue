<template>
  <div class="page-container users-page" :class="{ 'is-rtl': isRTL }">
    <section class="users-hero">
      <div class="users-hero__glow" aria-hidden="true"></div>
      <div class="users-hero__content">
        <p class="users-hero__pill">{{ t('users.hero.pill') }}</p>
        <h1 class="users-hero__title">{{ t('users.hero.title') }}</h1>
        <p class="users-hero__subtitle">
          {{ t('users.hero.subtitle') }}
        </p>
        <div class="users-hero__features">
          <span class="users-hero__feature">{{ t('users.hero.feature.compare') }}</span>
          <span class="users-hero__feature">{{ t('users.hero.feature.follow') }}</span>
          <span class="users-hero__feature">{{ t('users.hero.feature.share') }}</span>
        </div>
        <div v-if="!userStore.user" class="users-hero__cta">
          <CustomButton
            type="is-primary is-medium"
            :label="t('users.hero.cta')"
            :icon="['fab', 'x-twitter']"
            @click="userStore.loginWithX"
          />
        </div>
      </div>
    </section>

    <section class="users-body">
      <div class="users-surface">
        <form class="users-search" @submit.prevent="searchUsers">
          <label class="sr-only" for="users-search-input">{{ t('users.search.label') }}</label>
          <input
            id="users-search-input"
            v-model="searchQuery"
            class="users-input"
            type="text"
            :placeholder="t('users.search.placeholder')"
            @keyup.enter="searchUsers"
          />
          <CustomButton
            class="users-search__button"
            :type="`is-primary ${isLoading ? 'is-loading' : ''}`"
            :label="isLoading ? t('users.search.loading') : t('users.search.button')"
            @click="searchUsers"
          />
        </form>

        <p v-if="errorMessage" class="users-error" role="alert">
          {{ errorMessage }}
        </p>

        <div v-if="searchResults.length" class="users-results" role="list">
          <article v-for="entry in searchResults" :key="entry.uid" class="users-result" role="listitem">
            <div class="users-result__avatar">
              <img :src="entry.photoURL" :alt="t('users.card.avatarAlt')" />
            </div>
            <div class="users-result__content">
              <RouterLink
                :to="{ path: '/profile', query: { user: entry.uid } }"
                class="users-result__name"
                :aria-label="t('users.card.viewProfile')"
              >
                {{ entry.displayName }}
              </RouterLink>
              <p class="users-result__username">{{ entry.username }}</p>
              <p class="users-result__meta">
                <span>{{ formatFollowers(entry.followersCount) }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ formatFollowing(entry.followingCount) }}</span>
              </p>
            </div>
            <div class="users-result__actions">
              <CustomButton
                v-if="!isFollowing(entry.uid)"
                type="is-primary is-small"
                :label="t('users.card.follow')"
                @click="followUser(entry.uid)"
              />
              <p v-else class="users-result__state">{{ t('users.card.following') }}</p>
            </div>
          </article>
        </div>

        <p v-else-if="hasSearched && hasTypedQuery && !isLoading" class="users-empty">
          {{ emptyStateMessage }}
        </p>

        <div v-if="!userStore.user" class="users-notice">
          <h2>{{ t('users.notice.title') }}</h2>
          <p>{{ t('users.notice.body') }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { RouterLink } from 'vue-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { debounce } from 'lodash';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { db } from '@top-x/shared';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';
import type { User } from '@top-x/shared/types/user';

interface UsersResult {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  followersCount: number;
  followingCount: number;
}

const userStore = useUserStore();
const localeStore = useLocaleStore();

const t = (key: string) => localeStore.translate(key);
const isRTL = computed(() => localeStore.direction === 'rtl');

useHead(() => ({
  title: t('users.meta.title'),
  meta: [
    {
      name: 'description',
      content: t('users.meta.description'),
    },
  ],
}));

const searchQuery = ref('');
const searchResults = ref<UsersResult[]>([]);
const isLoading = ref(false);
const errorKey = ref<string | null>(null);
const hasSearched = ref(false);
const lastSearchedQuery = ref('');

const hasTypedQuery = computed(() => searchQuery.value.trim().length > 0);
const numberFormatter = computed(
  () => new Intl.NumberFormat(localeStore.language === 'il' ? 'he-IL' : 'en-US'),
);

const errorMessage = computed(() => (errorKey.value ? t(errorKey.value) : null));
const emptyStateMessage = computed(() => {
  if (!lastSearchedQuery.value) {
    return '';
  }
  const template = t('users.results.empty');
  return template.includes('{query}')
    ? template.replace('{query}', lastSearchedQuery.value)
    : `${template} "${lastSearchedQuery.value}"`;
});

const defaultAvatar = 'https://www.top-x.co/assets/profile.png';

const debouncedSearch = debounce(() => {
  void searchUsers();
}, 500);

watch(searchQuery, (newValue) => {
  const trimmed = newValue.trim();
  if (trimmed) {
    hasSearched.value = false;
    if (userStore.user) {
      debouncedSearch();
    }
  } else {
    debouncedSearch.cancel();
    searchResults.value = [];
    hasSearched.value = false;
    errorKey.value = null;
    lastSearchedQuery.value = '';
  }
});

onBeforeUnmount(() => {
  debouncedSearch.cancel();
});

function formatCount(templateKey: string, count: number) {
  const template = t(templateKey);
  const formatted = numberFormatter.value.format(Number.isFinite(count) ? count : 0);
  return template.includes('{count}') ? template.replace('{count}', formatted) : `${formatted} ${template}`;
}

function formatFollowers(count: number) {
  return formatCount('users.card.followers', count);
}

function formatFollowing(count: number) {
  return formatCount('users.card.followingCount', count);
}

async function searchUsers() {
  errorKey.value = null;

  if (!userStore.user) {
    errorKey.value = 'users.error.loginRequired';
    hasSearched.value = true;
    searchResults.value = [];
    return;
  }

  let rawQuery = searchQuery.value.trim();
  if (!rawQuery) {
    errorKey.value = 'users.error.noInput';
    hasSearched.value = true;
    searchResults.value = [];
    return;
  }

  if (rawQuery.startsWith('@')) {
    rawQuery = rawQuery.slice(1);
  }

  const sanitizedQuery = rawQuery;

  if (!sanitizedQuery) {
    errorKey.value = 'users.error.noInput';
    hasSearched.value = true;
    searchResults.value = [];
    return;
  }

  isLoading.value = true;
  try {
    const usersRef = collection(db, 'users');
    const displayQ = query(
      usersRef,
      where('displayName', '>=', sanitizedQuery),
      where('displayName', '<=', `${sanitizedQuery}\uf8ff`),
    );
    const usernameQ = query(
      usersRef,
      where('username', '>=', sanitizedQuery),
      where('username', '<=', `${sanitizedQuery}\uf8ff`),
    );

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

    searchResults.value = Array.from(resultsMap.entries()).map(([uid, user]) => ({
      uid,
      displayName: user.displayName || t('users.card.displayNameFallback'),
      username: user.username
        ? user.username.startsWith('@')
          ? user.username
          : `@${user.username}`
        : t('users.card.usernameFallback'),
      photoURL: user.photoURL || defaultAvatar,
      followersCount: typeof user.followersCount === 'number' ? user.followersCount : 0,
      followingCount: typeof user.followingCount === 'number' ? user.followingCount : 0,
    }));

    lastSearchedQuery.value = searchQuery.value.trim();
    hasSearched.value = true;
  } catch (err: any) {
    console.error('searchUsers error:', err);
    if (err?.code === 'permission-denied') {
      errorKey.value = 'users.error.permission';
    } else {
      errorKey.value = 'users.error.generic';
    }
    hasSearched.value = true;
    searchResults.value = [];
  } finally {
    isLoading.value = false;
  }
}

function isFollowing(uid: string) {
  return userStore.profile?.frenemies?.includes(uid) ?? false;
}

async function followUser(uid: string) {
  if (!userStore.user) {
    errorKey.value = 'users.error.loginRequired';
    return;
  }

  try {
    await userStore.addFrenemy(uid);
    searchResults.value = searchResults.value.filter((result) => result.uid !== uid);
  } catch (err) {
    console.error('followUser error:', err);
    errorKey.value = 'users.error.generic';
  }
}
</script>

<style scoped>
.users-page {
  display: flex;
  flex-direction: column;
  gap: clamp(2.5rem, 6vw, 4rem);
  padding-bottom: clamp(3rem, 8vw, 5rem);
}

.users-page.is-rtl {
  direction: rtl;
}

.users-hero {
  position: relative;
  padding: clamp(3rem, 8vw, 6rem) 0 clamp(2.5rem, 6vw, 4rem);
  margin: 0 calc(-1 * var(--space-6));
  display: flex;
  justify-content: center;
}

.users-hero__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 24% 25%, rgba(0, 232, 224, 0.26), transparent 60%),
    radial-gradient(circle at 78% 18%, rgba(196, 255, 0, 0.18), transparent 62%);
  pointer-events: none;
}

.users-hero__content {
  position: relative;
  width: min(880px, 100%);
  padding: clamp(2.75rem, 6vw, 4rem) clamp(2rem, 5vw, 3rem);
  margin: 0 var(--space-6);
  border-radius: 36px; /* Component-specific */
  border: 1px solid var(--color-border-medium);
  background: rgba(12, 12, 12, 0.82); /* Component-specific background */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(var(--space-4), 2vw, var(--space-6));
  text-align: center;
  box-shadow: 0 42px 80px rgba(0, 0, 0, 0.45); /* Component-specific shadow */
  backdrop-filter: blur(16px);
}

.users-hero__pill {
  display: inline-flex;
  padding: 0.4rem 1.35rem;
  border-radius: var(--radius-full);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: var(--color-primary-18);
  color: var(--bulma-primary);
  font-weight: 600;
}

.users-hero__title {
  margin: 0;
  font-size: clamp(2.6rem, 2vw + 2rem, 3.6rem);
}

.users-hero__subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.75); /* Component-specific opacity */
  font-size: clamp(1.05rem, 1.4vw, 1.2rem);
  line-height: 1.7;
  max-width: 640px;
}

.users-hero__features {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
}

.users-hero__feature {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem var(--space-4);
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.06); /* Component-specific */
  border: 1px solid rgba(255, 255, 255, 0.08); /* Component-specific */
  font-size: var(--font-size-300);
  letter-spacing: 0.01em;
}

.users-hero__cta {
  display: flex;
  justify-content: center;
}

.users-body {
  display: flex;
  justify-content: center;
  padding: 0;
  margin: 0 calc(-1 * var(--space-6));
}

.users-surface {
  width: min(960px, 100%);
  margin: 0 var(--space-6);
  background: rgba(12, 12, 12, 0.82); /* Component-specific background */
  border-radius: 32px; /* Component-specific */
  border: 1px solid var(--color-border-medium);
  padding: clamp(var(--space-8), 5vw, 3.25rem);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  backdrop-filter: blur(12px);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35); /* Component-specific shadow */
}

.users-search {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.users-input {
  flex: 1;
  min-width: 220px;
  padding: 0.85rem 1.1rem;
  border-radius: var(--radius-lg);
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.06); /* Component-specific */
  color: inherit;
  font-size: var(--font-size-400);
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.users-input:focus {
  outline: none;
  border-color: rgba(0, 232, 224, 0.5); /* Component-specific */
  background: rgba(255, 255, 255, 0.08); /* Component-specific */
}

.users-search__button {
  white-space: nowrap;
}

.users-error {
  margin: 0;
  color: rgba(255, 110, 110, 0.92);
  font-weight: 500;
}

.users-results {
  display: grid;
  gap: var(--space-5);
}

.users-result {
  background: var(--color-bg-surface);
  border-radius: 24px; /* Component-specific */
  border: 1px solid rgba(255, 255, 255, 0.08); /* Component-specific */
  padding: 1.35rem var(--space-6);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1.35rem;
}

.users-result__avatar img {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
}

.users-result__content {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.users-result__name {
  font-size: 1.15rem;
  font-weight: 600;
  color: inherit;
  text-decoration: none;
  transition: color var(--transition-fast);
}

.users-result__name:hover,
.users-result__name:focus {
  color: var(--bulma-primary);
}

.users-result__username {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
}

.users-result__meta {
  margin: 0;
  display: flex;
  gap: var(--space-2);
  font-size: var(--font-size-300);
  color: var(--color-text-muted);
}

.users-result__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
}

.users-result__state {
  margin: 0;
  color: var(--color-text-muted);
  font-weight: 500;
}

.users-empty {
  margin: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.62);
}

.users-notice {
  padding: 1.85rem;
  text-align: center;
  background: var(--color-bg-surface);
  border-radius: 24px; /* Component-specific */
  border: 1px solid var(--color-primary-16);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.users-notice h2 {
  margin: 0;
  font-size: 1.4rem;
}

.users-notice p {
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
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

@media (max-width: 768px) {
  .users-result {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    row-gap: 1rem;
  }

  .users-result__actions {
    grid-column: 1 / -1;
    align-items: center;
  }
}

@media (max-width: 640px) {
  .users-hero__content {
    padding: 2.25rem 1.75rem;
  }

  .users-result {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .users-result__content {
    align-items: center;
  }

  .users-result__meta {
    justify-content: center;
  }

  .users-result__actions {
    align-items: center;
  }
}
</style>
