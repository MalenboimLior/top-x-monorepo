<!-- Shows stats and info about the logged in user -->
<template>
  <div class="profile-page">
    <section class="profile-hero">
      <div class="profile-hero__glow"></div>
      <div class="profile-hero__content">
        <div class="profile-card" :class="{ 'is-blurred': isOwnProfile && !isLoggedIn }">
          <div class="profile-card__main">
            <div class="profile-card__avatar">
              <img :src="photoURL" alt="Profile picture" />
            </div>
            <div class="profile-card__info">
              <h1>{{ displayName }}</h1>
              <a
                :href="`https://x.com/${profile?.username || ''}`"
                target="_blank"
                rel="noopener"
                class="profile-card__username"
              >
                {{ username }}
              </a>
              <p class="profile-card__meta">
                {{ profile?.followersCount || 0 }} followers · {{ profile?.followingCount || 0 }} following
              </p>
            </div>
          </div>
          <div class="profile-card__actions">
            <CustomButton
              v-if="isOwnProfile"
              type="is-light is-small"
              label="Logout"
              @click="logout"
            />
            <CustomButton
              v-else-if="isLoggedIn && !isFrenemy"
              type="is-primary"
              label="Add Frenemy"
              :icon="['fas', 'user-plus']"
              @click="addFrenemy(profile?.uid || '')"
            />
            <p v-else-if="!isLoggedIn" class="profile-card__hint">Login to add frenemy</p>
            <p v-else class="profile-card__hint">Already frenemies</p>
          </div>
        </div>
      </div>
    </section>

    <section class="profile-body">
      <div class="profile-surface" :class="{ 'is-blurred': isOwnProfile && !isLoggedIn }">
        <nav class="profile-tabs" role="tablist">
          <button
            type="button"
            class="profile-tab"
            :class="{ active: activeTab === 'games' }"
            @click="setActiveTab('games')"
          >
            Games
          </button>
          <button
            type="button"
            class="profile-tab"
            :class="{ active: activeTab === 'badges' }"
            @click="setActiveTab('badges')"
          >
            Badges
          </button>
          <button
            v-if="isOwnProfile"
            type="button"
            class="profile-tab"
            :class="{ active: activeTab === 'frenemies' }"
            @click="setActiveTab('frenemies')"
          >
            Frenemies ({{ userStore.profile?.frenemies?.length || 0 }})
          </button>
          <button
            v-if="isOwnProfile"
            type="button"
            class="profile-tab"
            :class="{ active: activeTab === 'whoadded' }"
            @click="setActiveTab('whoadded')"
          >
            Who Added Me ({{ userStore.profile?.addedBy?.length || 0 }})
          </button>
        </nav>

        <div v-if="activeTab === 'games'" class="profile-panel">
          <div v-if="pyramid" class="profile-pyramid">
            <PyramidView
              :pyramid="pyramid"
              :worst-item="worstItem"
              :rows="rows"
              :game-header="pyramidHeader"
              :hide-row-label="hideRowLabel"
              :worst-show="worstShow"
            />
          </div>
          <div v-else class="profile-table-wrapper">
            <table class="profile-table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Mode</th>
                  <th>Score</th>
                  <th>Streak</th>
                  <th>Last Played</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!profile?.games || Object.keys(profile.games).length === 0">
                  <td colspan="5" class="profile-empty">No games played yet.</td>
                </tr>
                <template v-else>
                  <template v-for="(modes, gameName) in filteredGames" :key="gameName">
                    <tr v-for="(data, modeName) in modes" :key="gameName + '-' + modeName">
                      <td>{{ gameName }}</td>
                      <td>{{ modeName }}</td>
                      <td>{{ data.score }}</td>
                      <td>{{ data.streak }}</td>
                      <td>{{ formatLastPlayed(data.lastPlayed) }}</td>
                    </tr>
                  </template>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="activeTab === 'badges'" class="profile-panel">
          <p class="profile-empty">Coming soon.</p>
        </div>

        <div v-if="activeTab === 'frenemies' && isOwnProfile" class="profile-panel">
          <div v-if="loadingFrenemies" class="profile-empty">Loading frenemies...</div>
          <div v-else-if="!frenemyEntries.length" class="profile-empty">No frenemies added yet.</div>
          <div v-else class="profile-list">
            <article v-for="entry in frenemyEntries" :key="entry.uid" class="profile-list-item">
              <div class="profile-list-item__avatar">
                <img :src="entry.photoURL" alt="Profile picture" />
              </div>
              <div class="profile-list-item__content">
                <RouterLink :to="{ path: '/profile', query: { user: entry.uid } }">{{ entry.displayName }}</RouterLink>
                <p>{{ entry.username }}</p>
              </div>
              <div class="profile-list-item__actions">
                <CustomButton
                  type="is-danger is-small"
                  label="Remove"
                  @click="removeFrenemy(entry.uid)"
                  :disabled="!isOwnProfile"
                />
              </div>
            </article>
          </div>
          <div class="profile-panel__cta">
            <CustomButton type="is-primary" label="Search more frenemies" @click="searchMoreFrenemies" />
          </div>
        </div>

        <div v-if="activeTab === 'whoadded' && isOwnProfile" class="profile-panel">
          <div v-if="loadingAddedBy" class="profile-empty">Loading...</div>
          <div v-else-if="!addedByEntries.length" class="profile-empty">No one has added you as a frenemy yet.</div>
          <div v-else class="profile-list">
            <article v-for="entry in addedByEntries" :key="entry.uid" class="profile-list-item">
              <div class="profile-list-item__avatar">
                <img :src="entry.photoURL" alt="Profile picture" />
              </div>
              <div class="profile-list-item__content">
                <RouterLink :to="{ path: '/profile', query: { user: entry.uid } }">{{ entry.displayName }}</RouterLink>
                <p>{{ entry.username }}</p>
              </div>
              <div class="profile-list-item__actions">
                <CustomButton
                  v-if="isOwnProfile && !userStore.profile?.frenemies?.includes(entry.uid)"
                  type="is-primary is-small"
                  label="Add to Frenemies"
                  @click="addFrenemy(entry.uid)"
                  :disabled="!isOwnProfile"
                />
                <p v-else-if="isOwnProfile" class="profile-card__hint">Already Frenemies</p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <div v-show="showLoginTab" class="profile-login-banner" @click="closeLoginTab">
      <div class="profile-login-banner__content" @click.stop>
        <p class="profile-login-banner__title">Unlock Your Profile? 🧐</p>
        <p class="profile-login-banner__text">
          Log in to reveal your picks, stats and frenemies' results!<br />
          Just your X username + pic - we promise, no meddling with your account! 🔒
        </p>
        <CustomButton
          type="is-primary"
          label="Login with X"
          :icon="['fab', 'x-twitter']"
          @click="handleLogin"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { computed, ref, onMounted, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { useRouter, useRoute } from 'vue-router';
import { RouterLink } from 'vue-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';

import CustomButton from '@top-x/shared/components/CustomButton.vue';
import PyramidView from '@/components/games/pyramid/PyramidView.vue';
import type { User } from '@top-x/shared/types/user';
import type { PyramidSlot, PyramidItem, PyramidRow } from '@top-x/shared/types/pyramid';
import { analytics, trackEvent } from '@top-x/shared';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

useHead({
  title: 'Your Profile - TOP-X',
  meta: [
    { name: 'description', content: 'View your TOP-X profile, stats and frenemies.' },
  ],
});

const profile = ref<User | null>(null);
const pyramid = ref<PyramidSlot[][] | null>(null);
const worstItem = ref<PyramidItem | null>(null);
const rows = ref<PyramidRow[]>([]);
const pyramidHeader = ref('Your Pyramid');
const hideRowLabel = ref(false);
const worstShow = ref(true);

const displayName = computed(() => profile.value?.displayName || 'Anonymous');
const username = computed(() => (profile.value?.username ? `@${profile.value.username}` : '@Anonymous'));
const photoURL = computed(() => profile.value?.photoURL || 'https://www.top-x.co/assets/profile.png');
const isLoggedIn = computed(() => !!userStore.user);
const isOwnProfile = computed(() => {
  const uidParam = route.query.user as string | undefined;
  return !uidParam || uidParam === userStore.user?.uid;
});
const isFrenemy = computed(() => {
  if (!profile.value || !userStore.profile) return false;
  return userStore.profile.frenemies?.includes(profile.value.uid);
});

const frenemyEntries = ref<User[]>([]);
const addedByEntries = ref<User[]>([]);
const loadingFrenemies = ref(false);
const loadingAddedBy = ref(false);
const showLoginTab = ref(false);
const activeTab = ref('games');
const loadedFrenemies = ref(false);
const loadedAddedBy = ref(false);

const filteredGames = computed(() => {
  if (!profile.value?.games) return {};
  const games = { ...profile.value.games } as Record<string, any>;
  delete games.PyramidTier;
  return games;
});

function formatLastPlayed(value: unknown): string {
  if (!value) return '—';

  let millis: number | null = null;

  if (typeof value === 'number') {
    millis = value;
  } else if (typeof value === 'string') {
    const parsed = Date.parse(value);
    millis = Number.isNaN(parsed) ? null : parsed;
  } else if (typeof value === 'object' && value !== null) {
    const timestampLike = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof timestampLike.toMillis === 'function') {
      millis = timestampLike.toMillis();
    } else if (typeof timestampLike.seconds === 'number') {
      const nanos = typeof timestampLike.nanoseconds === 'number' ? timestampLike.nanoseconds : 0;
      millis = timestampLike.seconds * 1000 + Math.floor(nanos / 1_000_000);
    }
  }

  if (!millis) return '—';

  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString();
}

async function loadProfile() {
  const uidParam = route.query.user as string | undefined;
  if (uidParam && uidParam !== userStore.user?.uid) {
    const snap = await getDoc(doc(db, 'users', uidParam));
    profile.value = snap.exists() ? (snap.data() as User) : null;
  } else {
    profile.value = userStore.profile;
  }
}

async function loadPyramid() {
  pyramid.value = null;
  worstItem.value = null;
  rows.value = [];
  const pyramidGames = profile.value?.games?.PyramidTier;
  if (!pyramidGames) return;
  const entries = Object.entries(pyramidGames);
  for (const [gameId, gameData] of entries) {
    if ((gameData as any).custom) {
      const gameSnap = await getDoc(doc(db, 'games', gameId));
      if (!gameSnap.exists()) continue;
      const gameInfo = gameSnap.data();
      const allItems = [...(gameInfo.custom?.items || []), ...(gameInfo.custom?.communityItems || [])];
      pyramid.value = (gameData as any).custom.pyramid.map((tier: any) =>
        tier.slots.map((id: string | null) => ({ image: id ? allItems.find((i: any) => i.id === id) || null : null })),
      );
      worstItem.value = (gameData as any).custom.worstItem
        ? allItems.find((i: any) => i.id === (gameData as any).custom.worstItem.id) || null
        : null;
      rows.value = gameInfo.custom?.rows || [];
      pyramidHeader.value = gameInfo.gameHeader || 'Your Pyramid';
      hideRowLabel.value = gameInfo.custom?.HideRowLabel ?? false;
      worstShow.value = gameInfo.custom?.worstShow !== false;
      break;
    }
  }
}

async function fetchFrenemies() {
  loadingFrenemies.value = true;
  frenemyEntries.value = [];
  if (!userStore.profile?.frenemies || userStore.profile.frenemies.length === 0) {
    loadingFrenemies.value = false;
    return;
  }
  try {
    const frenemyPromises = userStore.profile.frenemies.map((uid) => getDoc(doc(db, 'users', uid)));
    const frenemyDocs = await Promise.all(frenemyPromises);
    frenemyEntries.value = frenemyDocs.filter((docItem) => docItem.exists()).map((docItem) => docItem.data() as User);
  } catch (err) {
    console.error('Error fetching frenemies:', err);
  } finally {
    loadingFrenemies.value = false;
  }
}

async function fetchAddedBy() {
  loadingAddedBy.value = true;
  addedByEntries.value = [];
  if (!userStore.profile?.addedBy || userStore.profile.addedBy.length === 0) {
    loadingAddedBy.value = false;
    return;
  }
  try {
    const addedByPromises = userStore.profile.addedBy.map((uid) => getDoc(doc(db, 'users', uid)));
    const addedByDocs = await Promise.all(addedByPromises);
    addedByEntries.value = addedByDocs.filter((docItem) => docItem.exists()).map((docItem) => docItem.data() as User);
  } catch (err) {
    console.error('Error fetching addedBy:', err);
  } finally {
    loadingAddedBy.value = false;
  }
}

async function addFrenemy(uid: string) {
  try {
    await userStore.addFrenemy(uid);
    if (activeTab.value === 'frenemies') await fetchFrenemies();
    if (activeTab.value === 'whoadded') await fetchAddedBy();
  } catch (err) {
    console.error('Error adding frenemy:', err);
  }
}

async function removeFrenemy(uid: string) {
  try {
    await userStore.removeFrenemy(uid);
    if (activeTab.value === 'frenemies') await fetchFrenemies();
    if (activeTab.value === 'whoadded') await fetchAddedBy();
  } catch (err) {
    console.error('Error removing frenemy:', err);
  }
}

async function handleLogin() {
  await userStore.loginWithX();
  closeLoginTab();
}

async function logout() {
  await userStore.logout();
  router.push('/');
}

function closeLoginTab() {
  showLoginTab.value = false;
}

function setActiveTab(tab: string) {
  activeTab.value = tab;
}

function searchMoreFrenemies() {
  router.push('/frenemies');
}

watch(
  [() => route.query.user, () => userStore.user?.uid],
  async () => {
    await loadProfile();
    await loadPyramid();
    if (isOwnProfile.value && !isLoggedIn.value) {
      showLoginTab.value = true;
    } else {
      showLoginTab.value = false;
    }
    if (!isOwnProfile.value) {
      activeTab.value = 'games';
    }
  },
  { immediate: true },
);

watch(
  () => userStore.profile,
  (newProfile) => {
    if (isOwnProfile.value) {
      profile.value = newProfile;
    }
  },
);

watch(activeTab, (newTab) => {
  if (newTab === 'frenemies' && isOwnProfile.value && !loadedFrenemies.value) {
    loadedFrenemies.value = true;
    fetchFrenemies();
  } else if (newTab === 'whoadded' && isOwnProfile.value && !loadedAddedBy.value) {
    loadedAddedBy.value = true;
    fetchAddedBy();
  }
});

onMounted(() => {
  trackEvent(analytics, 'page_view', { page_name: 'profile' });
});
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: radial-gradient(circle at top left, rgba(0, 232, 224, 0.18), transparent 55%), #050505;
  color: #f8f8fc;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.profile-hero {
  position: relative;
  padding: clamp(3rem, 8vw, 6rem) 1.5rem 0;
  display: flex;
  justify-content: center;
}

.profile-hero__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 25% 25%, rgba(0, 232, 224, 0.28), transparent 60%),
    radial-gradient(circle at 75% 20%, rgba(196, 255, 0, 0.18), transparent 60%);
  pointer-events: none;
}

.profile-hero__content {
  position: relative;
  width: min(960px, 100%);
  display: flex;
  justify-content: center;
}

.profile-card {
  width: 100%;
  background: rgba(12, 12, 12, 0.8);
  border-radius: 32px;
  border: 1px solid rgba(0, 232, 224, 0.15);
  padding: clamp(2rem, 4vw, 3rem);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-card__main {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.profile-card__avatar img {
  width: clamp(80px, 12vw, 120px);
  height: clamp(80px, 12vw, 120px);
  border-radius: 999px;
  object-fit: cover;
  border: 3px solid rgba(0, 232, 224, 0.4);
}

.profile-card__info h1 {
  margin: 0;
  font-size: clamp(2rem, 2vw + 1.5rem, 3rem);
}

.profile-card__username {
  color: var(--bulma-primary);
  text-decoration: none;
}

.profile-card__username:hover,
.profile-card__username:focus {
  color: rgba(196, 255, 0, 0.85);
}

.profile-card__meta {
  margin: 0.5rem 0 0;
  color: rgba(255, 255, 255, 0.7);
}

.profile-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.profile-card__hint {
  margin: 0;
  color: rgba(255, 255, 255, 0.65);
}

.profile-body {
  display: flex;
  justify-content: center;
  padding: 0 1.5rem 4rem;
}

.profile-surface {
  width: min(960px, 100%);
  background: rgba(12, 12, 12, 0.82);
  border-radius: 32px;
  border: 1px solid rgba(0, 232, 224, 0.14);
  padding: clamp(2rem, 4vw, 3rem);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.profile-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.profile-tab {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.55rem 1.4rem;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.profile-tab.active {
  background: rgba(0, 232, 224, 0.15);
  border-color: rgba(0, 232, 224, 0.45);
}

.profile-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-table-wrapper {
  overflow-x: auto;
}

.profile-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

.profile-table th,
.profile-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.profile-table th {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
}

.profile-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.65);
}

.profile-list {
  display: grid;
  gap: 1rem;
}

.profile-list-item {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 1.25rem 1.5rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1.25rem;
  align-items: center;
}

.profile-list-item__avatar img {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  object-fit: cover;
}

.profile-list-item__content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.profile-list-item__content a {
  color: inherit;
  font-weight: 600;
  text-decoration: none;
}

.profile-list-item__content a:hover,
.profile-list-item__content a:focus {
  color: var(--bulma-primary);
}

.profile-list-item__content p {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
}

.profile-list-item__actions {
  display: flex;
  justify-content: flex-end;
}

.profile-panel__cta {
  display: flex;
  justify-content: center;
}

.profile-login-banner {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  padding: 1.5rem 1rem;
  background: rgba(8, 8, 8, 0.85);
  backdrop-filter: blur(8px);
  z-index: 1000;
}

.profile-login-banner__content {
  width: min(480px, 100%);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(0, 232, 224, 0.25);
  border-radius: 24px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
}

.profile-login-banner__title {
  margin: 0;
  color: var(--bulma-primary);
  font-weight: 600;
  font-size: 1.2rem;
}

.profile-login-banner__text {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
}

.is-blurred {
  filter: blur(6px);
  pointer-events: none;
  user-select: none;
}

@media (max-width: 768px) {
  .profile-card__main {
    flex-direction: column;
    text-align: center;
  }

  .profile-list-item {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .profile-list-item__actions {
    justify-content: center;
  }
}
</style>
