<template>
  <div class="page-container users-page" :class="{ 'is-rtl': isRTL }">
    <!-- Decorative background elements -->
    <div class="users-glow" aria-hidden="true"></div>
    <div class="users-ambient-blob users-ambient-blob-1" aria-hidden="true"></div>
    <div class="users-ambient-blob users-ambient-blob-2" aria-hidden="true"></div>

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
        <i class="fa-solid fa-circle-exclamation"></i>
        {{ errorMessage }}
      </p>

      <div class="results-wrapper">
        <TransitionGroup 
          name="list" 
          tag="div" 
          class="users-results" 
          v-if="searchResults.length" 
          role="list"
        >
          <article v-for="entry in searchResults" :key="entry.uid" class="users-result" role="listitem">
            <div class="users-result__avatar-container">
              <div class="users-result__avatar">
                <img :src="entry.photoURL" :alt="t('users.card.avatarAlt')" loading="lazy" />
              </div>
              <div v-if="entry.isFollowingMe" class="users-result__status-dot" :title="t('users.card.followsYou')"></div>
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
                  <i class="fa-solid fa-users"></i>
                  <strong>{{ formatNumber(entry.followersCount) }}</strong>
                  <span>{{ t('users.card.followers').replace('{count}', '').trim() }}</span>
                </div>
                <div class="users-result__stat">
                  <i class="fa-solid fa-user-group"></i>
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
          <div class="users-empty__visual">
            <div class="users-empty__circle"></div>
            <i class="fa-solid fa-ghost"></i>
          </div>
          <h3 class="users-empty__title">{{ t('users.results.empty_title') || 'No players found' }}</h3>
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
  padding-bottom: clamp(4rem, 10vw, 6rem);
  padding-top: clamp(2rem, 5vw, 4rem);
  position: relative;
  overflow-x: hidden;
  min-height: 100vh;
}

/* Decorative background elements */
.users-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 140%;
  height: 600px;
  background: radial-gradient(circle at 50% 0%, var(--color-primary-16) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
  filter: blur(80px);
}

.users-ambient-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  z-index: 0;
  opacity: 0.15;
}

.users-ambient-blob-1 {
  width: 400px;
  height: 400px;
  background: var(--bulma-primary);
  top: 20%;
  left: -100px;
  animation: float 20s infinite alternate ease-in-out;
}

.users-ambient-blob-2 {
  width: 300px;
  height: 300px;
  background: var(--color-secondary, #9b59b6);
  bottom: 10%;
  right: -50px;
  animation: float 25s infinite alternate-reverse ease-in-out;
}

@keyframes float {
  0% { transform: translate(0, 0) rotate(0deg); }
  100% { transform: translate(50px, 100px) rotate(15deg); }
}

.users-surface {
  position: relative;
  z-index: 1;
  width: min(850px, 92%);
  background: rgba(var(--color-bg-base-rgb), 0.4);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-radius: 40px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: clamp(2rem, 6vw, 4rem);
  display: flex;
  flex-direction: column;
  gap: var(--space-10);
  box-shadow: 
    0 30px 60px -12px rgba(0, 0, 0, 0.45),
    inset 0 1px 1px rgba(255, 255, 255, 0.1);
}

.is-rtl .users-surface {
  text-align: right;
}

.users-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-5);
}

.users-header__badge {
  display: inline-flex;
  padding: 0.5rem 1.25rem;
  border-radius: var(--radius-full);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(var(--bulma-primary-rgb), 0.1);
  border: 1px solid rgba(var(--bulma-primary-rgb), 0.2);
  color: var(--bulma-primary);
  font-weight: 800;
  font-size: 0.7rem;
  box-shadow: 0 4px 12px rgba(var(--bulma-primary-rgb), 0.1);
}

.users-header__title {
  margin: 0;
  font-size: clamp(2.5rem, 5vw, 3.8rem);
  line-height: 1;
  font-weight: 900;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.2));
}

.users-header__subtitle {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: clamp(1.1rem, 1.5vw, 1.3rem);
  line-height: 1.6;
  max-width: 650px;
  font-weight: 450;
}

.users-header__cta {
  margin-top: var(--space-2);
}

/* Search Bar */
.users-search {
  width: 100%;
  max-width: 650px;
  margin: 0 auto;
}

.users-search__bar {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  padding: 0.6rem 0.6rem 0.6rem 1.5rem;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.3);
  direction: ltr; 
}

.users-search__bar.is-focused {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--bulma-primary);
  box-shadow: 
    0 0 0 5px rgba(var(--bulma-primary-rgb), 0.15),
    0 20px 40px -15px rgba(0, 0, 0, 0.4);
  transform: translateY(-2px);
}

.users-search__prefix {
  color: var(--bulma-primary);
  font-weight: 700;
  font-size: 1.3rem;
  margin-right: 0.5rem;
  user-select: none;
  opacity: 0.8;
}

.users-input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 1rem 0;
  color: #fff;
  font-size: 1.2rem;
  outline: none;
  min-width: 0;
  font-weight: 500;
}

.users-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.users-search__actions {
  margin-left: 0.75rem;
}

.users-search__button {
  border-radius: 20px !important;
  padding-left: 2rem !important;
  padding-right: 2rem !important;
  height: 52px !important;
  font-weight: 700 !important;
  box-shadow: 0 8px 16px -4px rgba(var(--bulma-primary-rgb), 0.4) !important;
}

.users-error {
  margin: -1rem auto 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #ff5e6c;
  font-weight: 600;
  text-align: center;
  background: rgba(255, 94, 108, 0.1);
  padding: 1rem 1.5rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 94, 108, 0.2);
  width: fit-content;
}

/* Results Content */
.results-wrapper {
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.users-results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
  gap: 1.25rem;
}

.users-result {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  position: relative;
  overflow: hidden;
}

.users-result::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(var(--bulma-primary-rgb), 0.05) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.users-result:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(var(--bulma-primary-rgb), 0.3);
  transform: translateY(-4px) scale(1.01);
  box-shadow: 0 15px 35px -10px rgba(0, 0, 0, 0.3);
}

.users-result:hover::before {
  opacity: 1;
}

.users-result__avatar-container {
  position: relative;
  flex-shrink: 0;
}

.users-result__avatar {
  width: 64px;
  height: 64px;
  border-radius: 22px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
}

.users-result:hover .users-result__avatar {
  transform: rotate(3deg) scale(1.05);
  border-color: var(--bulma-primary);
}

.users-result__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.users-result__status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  background: #00ca72;
  border: 3px solid rgba(var(--color-bg-base-rgb), 1);
  border-radius: 50%;
  z-index: 2;
}

.users-result__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.users-result__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.users-result__name {
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.users-result__name:hover {
  color: var(--bulma-primary);
}

.users-result__badge {
  font-size: 0.65rem;
  text-transform: uppercase;
  font-weight: 800;
  color: var(--bulma-primary);
  background: rgba(var(--bulma-primary-rgb), 0.15);
  padding: 0.25rem 0.6rem;
  border-radius: 8px;
  letter-spacing: 0.02em;
}

.users-result__username {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: 0.95rem;
  font-weight: 500;
}

.users-result__stats {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-top: 0.25rem;
}

.users-result__stat {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.users-result__stat i {
  font-size: 0.75rem;
  opacity: 0.5;
}

.users-result__stat strong {
  color: #fff;
  font-weight: 700;
}

.users-result__actions {
  position: relative;
  z-index: 1;
}

/* Empty State */
.users-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  text-align: center;
}

.users-empty__visual {
  position: relative;
  margin-bottom: 2rem;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.users-empty__circle {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(var(--bulma-primary-rgb), 0.1) 0%, transparent 70%);
  border-radius: 50%;
  animation: pulse 4s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

.users-empty__visual i {
  font-size: 4rem;
  color: var(--bulma-primary);
  opacity: 0.3;
  z-index: 1;
}

.users-empty__title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 0.75rem;
}

.users-empty__text {
  font-size: 1.15rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  max-width: 400px;
  margin-bottom: 2.5rem;
}

.users-empty__card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  padding: 2rem;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-items: center;
  max-width: 450px;
  transition: all 0.3s ease;
}

.users-empty__card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--bulma-primary);
}

.users-empty__invite {
  margin: 0;
  font-weight: 600;
  color: #fff;
  font-size: 1.05rem;
}

.users-empty__link {
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 1.75rem;
  background: var(--bulma-primary);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  box-shadow: 0 10px 20px -5px rgba(var(--bulma-primary-rgb), 0.4);
}

.users-empty__link:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 25px -5px rgba(var(--bulma-primary-rgb), 0.5);
  filter: brightness(1.1);
}

/* List Transitions */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}

.list-leave-active {
  position: absolute;
  width: 100%;
}

@media (max-width: 768px) {
  .users-surface {
    padding: 2rem 1.5rem;
    gap: var(--space-8);
  }
  
  .users-header__title {
    font-size: 2.8rem;
  }
}

@media (max-width: 640px) {
  .users-result {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.25rem;
    padding: 1.5rem;
  }
  
  .users-result__avatar {
    width: 60px;
    height: 60px;
  }

  .users-result__header {
    flex-wrap: wrap;
  }

  .users-result__actions {
    width: 100%;
    margin-top: 0.5rem;
  }

  .users-result__actions :deep(.button) {
    width: 100%;
    justify-content: center;
    height: 48px;
  }
  
  .users-search__bar {
    padding-left: 1.25rem;
  }

  .users-search__button {
    padding-left: 1.25rem !important;
    padding-right: 1.25rem !important;
  }
}
</style>

