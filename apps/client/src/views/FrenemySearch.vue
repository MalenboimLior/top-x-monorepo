<template>
  <div class="page-container users-page" :class="{ 'is-rtl': isRTL }">
    <!-- Decorative background elements -->
    <div class="users-glow" aria-hidden="true"></div>

    <div class="users-surface">
      <div class="users-header">
        <div class="users-header__badge">{{ t('users.hero.pill') }}</div>
        <h1 class="users-header__title">{{ t('users.hero.title') }}</h1>
        <p class="users-header__subtitle">
          {{ t('users.hero.subtitle') }}
        </p>
        
        <div v-if="!userStore.user" class="users-header__cta">
          <CustomButton
            type="is-primary is-medium"
            :label="t('users.hero.cta')"
            :icon="['fab', 'x-twitter']"
            @click="userStore.loginWithX"
          />
        </div>
      </div>

      <form class="users-search" @submit.prevent="searchUsers">
        <div class="users-search__bar" :class="{ 'is-focused': isSearchFocused }">
          <span class="users-search__prefix">@</span>
          <label class="sr-only" for="users-search-input">{{ t('users.search.label') }}</label>
          <input
            id="users-search-input"
            v-model="searchQuery"
            class="users-input"
            type="text"
            :placeholder="t('users.search.placeholder')"
            @keyup.enter="searchUsers"
            @focus="isSearchFocused = true"
            @blur="isSearchFocused = false"
          />
          <div class="users-search__actions">
            <CustomButton
              class="users-search__button"
              :type="`is-primary is-small ${isLoading ? 'is-loading' : ''}`"
              :label="isLoading ? '' : t('users.search.button')"
              :icon="isLoading ? undefined : ['fas', 'search']"
              @click="searchUsers"
            />
          </div>
        </div>
      </form>

      <p v-if="errorMessage" class="users-error" role="alert">
        {{ errorMessage }}
      </p>

      <TransitionGroup 
        name="list" 
        tag="div" 
        class="users-results" 
        v-if="searchResults.length" 
        role="list"
      >
        <article v-for="entry in searchResults" :key="entry.uid" class="users-result" role="listitem">
          <div class="users-result__avatar">
            <img :src="entry.photoURL" :alt="t('users.card.avatarAlt')" loading="lazy" />
          </div>
          <div class="users-result__content">
            <div class="users-result__header">
              <RouterLink
                :to="{ path: '/profile', query: { user: entry.uid } }"
                class="users-result__name"
                :aria-label="t('users.card.viewProfile')"
              >
                {{ entry.displayName }}
              </RouterLink>
              <span v-if="entry.isFollowingMe" class="users-result__badge">
                {{ t('users.card.followsYou') || 'Follows you' }}
              </span>
            </div>
            
            <p class="users-result__username">{{ entry.username }}</p>
            
            <div class="users-result__stats">
              <div class="users-result__stat">
                <strong>{{ formatNumber(entry.followersCount) }}</strong>
                <span>{{ t('users.card.followers').replace('{count}', '').trim() }}</span>
              </div>
              <div class="users-result__divider" aria-hidden="true"></div>
              <div class="users-result__stat">
                <strong>{{ formatNumber(entry.followingCount) }}</strong>
                <span>{{ t('users.card.followingCount').replace('{count}', '').trim() }}</span>
              </div>
            </div>
          </div>
          <div class="users-result__actions">
            <CustomButton
              v-if="!isFollowing(entry.uid)"
              type="is-primary is-soft is-small"
              :label="t('users.card.follow')"
              :icon="['fas', 'user-plus']"
              @click="followUser(entry.uid)"
            />
            <CustomButton
              v-else
              type="is-secondary is-small"
              :label="t('users.card.following')"
              :icon="['fas', 'check']"
              @click="unfollowUser(entry.uid)" 
            />
          </div>
        </article>
      </TransitionGroup>

      <div v-else-if="hasSearched && hasTypedQuery && !isLoading" class="users-empty">
        <div class="users-empty__icon">
            <i class="fa-solid fa-ghost"></i>
        </div>
        <p class="users-empty__text">{{ emptyStateMessage }}</p>
        
        <div class="users-empty__card">
             <p class="users-empty__invite">
                {{ t('users.notfound.invite').replace('{user}', lastSearchedQuery) }}
            </p>
            <a :href="`https://x.com/${lastSearchedQuery}`" target="_blank" rel="noopener noreferrer" class="users-empty__link">
                {{ t('users.notfound.link') }} <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
  isFollowingMe?: boolean;
}

const userStore = useUserStore();
const localeStore = useLocaleStore();

const t = (key: string) => localeStore.translate(key);
const isRTL = computed(() => localeStore.direction === 'rtl');
const isSearchFocused = ref(false);

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
  () => new Intl.NumberFormat(localeStore.language === 'il' ? 'he-IL' : 'en-US', { notation: 'compact', compactDisplay: 'short' }),
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

const defaultAvatar = '/assets/profile.png';

const debouncedSearch = debounce(() => {
  void searchUsers();
}, 500);

// Watch input to strip @ and debounce search
watch(searchQuery, (newValue) => {
  if (newValue.includes('@')) {
    searchQuery.value = newValue.replace(/@/g, '');
    return; // value change will trigger watch again
  }
  
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

// Restore persistence
onMounted(() => {
    const savedQuery = sessionStorage.getItem('frenemySearchQuery');
    const savedResults = sessionStorage.getItem('frenemySearchResults');
    if (savedQuery) {
        searchQuery.value = savedQuery;
        lastSearchedQuery.value = savedQuery; 
    }
    if (savedResults) {
        try {
            searchResults.value = JSON.parse(savedResults);
            hasSearched.value = true;
        } catch (e) {
            console.error('Failed to parse saved search results', e);
        }
    }
});

onBeforeUnmount(() => {
  debouncedSearch.cancel();
  // Save persistence
  sessionStorage.setItem('frenemySearchQuery', searchQuery.value);
  if (searchResults.value.length > 0) {
      sessionStorage.setItem('frenemySearchResults', JSON.stringify(searchResults.value));
  } else {
      sessionStorage.removeItem('frenemySearchResults');
  }
});

function formatNumber(count: number) {
  return numberFormatter.value.format(Number.isFinite(count) ? count : 0);
}

async function searchUsers() {
  errorKey.value = null;

  if (!userStore.user) {
    // Optional: Prompt login if needed, though header CTA handles it.
  }

  let rawQuery = searchQuery.value.trim();
  if (!rawQuery) {
     if (userStore.user) {
        errorKey.value = 'users.error.noInput';
     }
    hasSearched.value = true;
    searchResults.value = [];
    return;
  }
  
  rawQuery = rawQuery.replace(/@/g, '');

  // Determine search variations to improve recall (simple case-insensitivity simulation)
  const searchTerms = new Set<string>();
  searchTerms.add(rawQuery);
  searchTerms.add(rawQuery.toLowerCase());
  searchTerms.add(rawQuery.charAt(0).toUpperCase() + rawQuery.slice(1).toLowerCase());
  
  // If the query is all caps, maybe add it specifically if different?
  // But usually users search "LIOR" for "Lior". The capitalized version covers "Lior".
  // The lower version covers "lior".
  
  const uniqueTerms = Array.from(searchTerms);

  isLoading.value = true;
  try {
    const usersRef = collection(db, 'users');
    const queries = [];
    
    // Create queries for each term on both fields
    for (const term of uniqueTerms) {
        if (!term) continue;
        queries.push(query(
          usersRef,
          where('displayName', '>=', term),
          where('displayName', '<=', `${term}\uf8ff`),
        ));
        queries.push(query(
          usersRef,
          where('username', '>=', term),
          where('username', '<=', `${term}\uf8ff`),
        ));
    }

    const snapshots = await Promise.all(queries.map(q => getDocs(q)));
    
    const resultsMap = new Map<string, User & { isFollowingMe?: boolean }>();
    const myUid = userStore.user?.uid;

    const processDoc = (docItem: any) => {
       const data = docItem.data() as User;
       const isFollowingMe = !!(myUid && data.frenemies?.includes(myUid));
       return { ...data, isFollowingMe };
    };

    for (const snap of snapshots) {
        snap.docs.forEach((docItem) => {
            if (!resultsMap.has(docItem.id)) {
                resultsMap.set(docItem.id, processDoc(docItem));
            }
        });
    }

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
      isFollowingMe: !!user.isFollowingMe
    }));

    lastSearchedQuery.value = rawQuery;
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
  } catch (err) {
    console.error('followUser error:', err);
    errorKey.value = 'users.error.generic';
  }
}

async function unfollowUser(uid: string) {
    if (!userStore.user) return;
    try {
        await userStore.removeFrenemy(uid);
    } catch(err) {
        console.error('unfollowUser error', err);
    }
}
</script>

<style scoped>
.users-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: clamp(3rem, 8vw, 5rem);
  padding-top: clamp(2rem, 5vw, 3rem);
  position: relative;
  overflow-x: hidden;
}

.users-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 500px;
  background: radial-gradient(circle at 50% 0%, var(--color-primary-16) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.users-surface {
  position: relative;
  z-index: 1;
  width: min(800px, 100%);
  margin: 0 var(--space-6);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: clamp(2rem, 5vw, 3.5rem);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.is-rtl .users-surface {
  text-align: right;
}

.users-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-4);
  margin-bottom: var(--space-2);
}

.users-header__badge {
  display: inline-flex;
  padding: 0.4rem 1rem;
  border-radius: var(--radius-full);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: var(--color-primary-8);
  border: 1px solid var(--color-primary-16);
  color: var(--bulma-primary);
  font-weight: 700;
  font-size: 0.75rem;
  margin-bottom: var(--space-2);
}

.users-header__title {
  margin: 0;
  font-size: clamp(2.2rem, 4vw, 3.2rem);
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-text-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.users-header__subtitle {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 1.15rem;
  line-height: 1.6;
  max-width: 600px;
  white-space: pre-line;
}

.users-header__cta {
  margin-top: var(--space-4);
}

/* Search Bar */
.users-search {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.users-search__bar {
  display: flex;
  align-items: center;
  background-color: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: 9999px; /* Pill shape */
  padding: 0.5rem 0.5rem 0.5rem 1.25rem;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  /* Force LTR layout for the input group regardless of page dir */
  direction: ltr; 
}

.users-search__bar.is-focused {
  border-color: var(--color-primary-48);
  box-shadow: 0 0 0 4px var(--color-primary-16), 0 8px 20px rgba(0, 0, 0, 0.1);
  background-color: var(--color-bg-surface);
  transform: translateY(-1px);
}

.users-search__prefix {
  color: var(--color-text-tertiary);
  font-weight: 600;
  font-size: 1.1rem;
  margin-right: 0.25rem;
  user-select: none;
}

.users-input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 0.75rem 0;
  color: inherit;
  font-size: 1.1rem;
  outline: none;
  min-width: 0;
}

.users-search__actions {
  margin-left: 0.5rem;
}

.users-search__button {
  border-radius: 9999px !important;
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
}

.users-error {
  margin: 0;
  color: #ff4757;
  font-weight: 600;
  text-align: center;
  background: rgba(255, 71, 87, 0.1);
  padding: 0.75rem;
  border-radius: 12px;
}

/* Results List */
.users-results {
  display: grid;
  gap: 1rem;
}

/* List Transitions */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(10px);
}

.list-leave-active {
  position: absolute;
  width: 100%;
}

.users-result {
  background: var(--color-bg-card);
  border-radius: 20px;
  border: 1px solid transparent;
  padding: 1rem 1.25rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1.25rem;
  transition: all 0.2s ease;
  position: relative;
}

.users-result:hover {
  background: var(--color-bg-surface-2, var(--color-bg-surface)); /* Fallback */
  border-color: var(--color-border-hover, var(--color-border-base));
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); 
  z-index: 2;
}

.users-result__avatar img {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-bg-surface);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.users-result__content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0; /* Text truncation fix */
}

.users-result__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.users-result__name {
  font-size: 1.05rem;
  font-weight: 700;
  color: inherit;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.users-result__name:hover {
  color: var(--bulma-primary);
  text-decoration: underline;
}

.users-result__badge {
  font-size: 0.65rem;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--bulma-primary);
  background: var(--color-primary-8);
  border: 1px solid var(--color-primary-16);
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  line-height: 1;
}

.users-result__username {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.users-result__stats {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.users-result__stat {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.users-result__stat strong {
  color: var(--color-text-primary);
  font-weight: 700;
}

.users-result__divider {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background-color: var(--color-border-base);
}

/* Empty State */
.users-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.users-empty__icon {
  font-size: 3rem;
  color: var(--color-text-tertiary);
  margin-bottom: 1rem;
  opacity: 0.5;
}

.users-empty__text {
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
}

.users-empty__card {
  background: var(--color-bg-surface);
  border: 1px dashed var(--color-border-base);
  padding: 1.5rem 2rem;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}

.users-empty__invite {
    margin: 0;
    font-weight: 500;
}

.users-empty__link {
    color: var(--bulma-primary);
    font-weight: 700;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-primary-8);
    border-radius: 99px;
    transition: all 0.2s;
}

.users-empty__link:hover {
    background: var(--color-primary-16);
    transform: translateY(-1px);
}

@media (max-width: 640px) {
  .users-result {
    grid-template-columns: auto 1fr;
    gap: 1rem;
    padding: 1rem;
  }
  
  .users-result__actions {
    grid-column: 2;
    grid-row: 2;
    align-items: flex-start;
    width: 100%;
    margin-top: 0.5rem;
  }

  .users-result__actions .button {
    width: 100%;
    justify-content: center;
  }
  
  .users-search__bar {
      padding-left: 1rem;
  }
}
</style>
