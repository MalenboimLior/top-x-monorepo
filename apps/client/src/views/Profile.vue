
<!-- Shows stats and info about the logged in user -->
<template>
  <div class="profile-container">
    <h1 class="title has-text-white">Profile</h1>
    <div :class="{ blurred: isOwnProfile && !isLoggedIn }">
      <Card>
        <div class="media">
          <div class="media-left">
            <figure class="image is-64x64">
              <img :src="photoURL" alt="Profile picture" class="is-rounded" />
            </figure>
          </div>
          <div class="media-content">
            <p class="title is-4 has-text-white">{{ displayName }}</p>
            <a :href="`https://x.com/${profile?.username || ''}`" target="_blank" class="subtitle is-6 has-text-grey-light">{{ username }}</a>
            <p class="subtitle is-6 has-text-grey-light">{{ profile?.followersCount || 0 }} followers · {{ profile?.followingCount || 0 }} following</p>
          </div>
        </div>
        <div class="has-text-centered mt-4">
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
          <p v-else-if="!isLoggedIn" class="has-text-grey-light">Login to add frenemy</p>
          <p v-else class="has-text-grey-light">Already Frenemies</p>
        </div>
      </Card>
      <!-- Tabs -->
      <div class="tabs is-centered is-small">
        <ul>
          <li :class="{ 'is-active': activeTab === 'games' }"><a @click="setActiveTab('games')">Games</a></li>
          <li :class="{ 'is-active': activeTab === 'badges' }"><a @click="setActiveTab('badges')">Badges</a></li>
          <li v-if="isOwnProfile" :class="{ 'is-active': activeTab === 'frenemies' }"><a @click="setActiveTab('frenemies')">Frenemies ({{ userStore.profile?.frenemies?.length || 0 }})</a></li>
          <li v-if="isOwnProfile" :class="{ 'is-active': activeTab === 'whoadded' }"><a @click="setActiveTab('whoadded')">Who Added Me ({{ userStore.profile?.addedBy?.length || 0 }})</a></li>
        </ul>
      </div>
      <div v-if="activeTab === 'games'">
        <div v-if="pyramid">
          <PyramidView
            :pyramid="pyramid"
            :worst-item="worstItem"
            :rows="rows"
            :game-header="pyramidHeader"
            :hide-row-label="hideRowLabel"
            :worst-show="worstShow"
          />
        </div>
        <div v-else class="table-container mt-4">
          <table class="table is-fullwidth is-striped is-narrow">
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
                <td colspan="5" class="has-text-centered">No games played yet.</td>
              </tr>
              <template v-else>
                <template v-for="(modes, gameName) in filteredGames" :key="gameName">
                  <tr v-for="(data, modeName) in modes" :key="gameName + '-' + modeName">
                    <td>{{ gameName }}</td>
                    <td>{{ modeName }}</td>
                    <td>{{ data.score }}</td>
                    <td>{{ data.streak }}</td>
                    <td>{{ data.lastPlayed }}</td>
                  </tr>
                </template>
              </template>
            </tbody>
          </table>
        </div>
      </div>
      <div v-if="activeTab === 'badges'">
        <p class="has-text-grey-light">Coming soon</p>
      </div>
      <div v-if="activeTab === 'frenemies' && isOwnProfile">
        <div v-if="loadingFrenemies">
          <p class="has-text-grey-light has-text-centered">Loading frenemies...</p>
        </div>
        <div v-else-if="!frenemyEntries.length">
          <p class="has-text-grey-light has-text-centered">No frenemies added yet.</p>
        </div>
        <div v-else>
          <div v-for="entry in frenemyEntries" :key="entry.uid" class="media mt-3">
            <div class="media-left">
              <figure class="image is-48x48">
                <img :src="entry.photoURL" alt="Profile picture" class="is-rounded" />
              </figure>
            </div>
            <div class="media-content">
              <p class="title is-5 has-text-white">
                <RouterLink :to="{ path: '/profile', query: { user: entry.uid } }">{{ entry.displayName }}</RouterLink>
              </p>
              <p class="subtitle is-6 has-text-grey-light">{{ entry.username }}</p>
            </div>
            <div class="media-right">
              <CustomButton
                v-if="isOwnProfile"
                type="is-danger is-small"
                label="Remove"
                @click="removeFrenemy(entry.uid)"
                :disabled="!isOwnProfile"
              />
            </div>
          </div>
        </div>
        <div class="has-text-centered mt-4">
          <CustomButton
            type="is-primary"
            label="Search More Frenemies"
            @click="searchMoreFrenemies"
          />
        </div>
      </div>
      <div v-if="activeTab === 'whoadded' && isOwnProfile">
        <div v-if="loadingAddedBy">
          <p class="has-text-grey-light has-text-centered">Loading...</p>
        </div>
        <div v-else-if="!addedByEntries.length">
          <p class="has-text-grey-light has-text-centered">No one has added you as a frenemy yet.</p>
        </div>
        <div v-else>
          <div v-for="entry in addedByEntries" :key="entry.uid" class="media mt-3">
            <div class="media-left">
              <figure class="image is-48x48">
                <img :src="entry.photoURL" alt="Profile picture" class="is-rounded" />
              </figure>
            </div>
            <div class="media-content">
              <p class="title is-5 has-text-white">
                <RouterLink :to="{ path: '/profile', query: { user: entry.uid } }">{{ entry.displayName }}</RouterLink>
              </p>
              <p class="subtitle is-6 has-text-grey-light">{{ entry.username }}</p>
            </div>
            <div class="media-right">
              <CustomButton
                v-if="isOwnProfile && !userStore.profile?.frenemies?.includes(entry.uid)"
                type="is-primary is-small"
                label="Add to Frenemies"
                @click="addFrenemy(entry.uid)"
                :disabled="!isOwnProfile"
              />
              <p v-else-if="isOwnProfile" class="has-text-grey-light">Already Frenemies</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-show="showLoginTab" :class="['description-tab', { show: showLoginTab }]">
      <div class="tab-content" @click.stop>
        <p class="question-text">Unlock Your Profile? 🧐</p>
        <p class="answer-text">
          Log in to reveal your picks, stats and frenemies' results!<br>
          Just your X username + pic - we promise, no meddling with your account! 🔒<br>
        </p>
      </div>
      <div class="has-text-centered">
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

import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import PyramidView from '@/components/PyramidView.vue';
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
const username = computed(() => profile.value?.username ? `@${profile.value.username}` : '@Anonymous');
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
  const games = { ...profile.value.games };
  delete games.PyramidTier;
  return games;
});

async function loadProfile() {
  const uidParam = route.query.user as string | undefined;
  if (uidParam && uidParam !== userStore.user?.uid) {
    const snap = await getDoc(doc(db, 'users', uidParam));
    profile.value = snap.exists() ? snap.data() as User : null;
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
        tier.slots.map((id: string | null) => ({ image: id ? allItems.find((i: any) => i.id === id) || null : null }))
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
    const frenemyPromises = userStore.profile.frenemies.map(uid => getDoc(doc(db, 'users', uid)));
    const frenemyDocs = await Promise.all(frenemyPromises);
    frenemyEntries.value = frenemyDocs
      .filter(doc => doc.exists())
      .map(doc => doc.data() as User);
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
    const addedByPromises = userStore.profile.addedBy.map(uid => getDoc(doc(db, 'users', uid)));
    const addedByDocs = await Promise.all(addedByPromises);
    addedByEntries.value = addedByDocs
      .filter(doc => doc.exists())
      .map(doc => doc.data() as User);
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
    await userStore.removeFrenemy(uid); // Assume this method is implemented in the store
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
  [() => route.query.user, () => userStore.profile],
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
  { immediate: true }
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
@import '../styles/Profile.css';
.description-tab {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #1f1f1f;
  color: white;
  padding: 1rem;
  transform: translateY(100%);
  transition: transform 0.3s ease-in-out;
  z-index: 1000;
}
.description-tab.show {
  transform: translateY(0);
}
.tab-content {
  max-height: 200px;
  overflow-y: auto;
}
@media screen and (min-width: 768px) {
  .description-tab {
    width: 400px;
    left: 50%;
    transform: translateX(-50%) translateY(100%);
  }
  .description-tab.show {
    transform: translateX(-50%) translateY(0);
  }
}
.question-text {
  color: #00e8e0;
  font-weight: bold;
  margin-bottom: 0.5rem;
  text-align: center;
}
.answer-text {
  color: #eee;
}
.blurred {
  filter: blur(8px);
  pointer-events: none;
  user-select: none;
}
.profile-container {
  max-width: 100%;
  overflow-x: hidden;
  padding: 0 1rem;
}
.media {
  align-items: center;
}
.table-container {
  overflow-x: auto;
}
.tabs ul {
  flex-wrap: wrap;
}
</style>
