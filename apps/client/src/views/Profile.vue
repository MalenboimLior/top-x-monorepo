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
            <p class="subtitle is-6 has-text-grey-light">{{ username }}</p>
          </div>
        </div>
        <div class="content mt-4" v-if="pyramid">
          <PyramidView
            :pyramid="pyramid"
            :worst-item="worstItem"
            :rows="rows"
            :game-header="pyramidHeader"
            :hide-row-label="hideRowLabel"
            :worst-show="worstShow"
          />
        </div>
        <div class="has-text-centered mt-4">
          <CustomButton
            v-if="isOwnProfile"
            type="is-light"
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
      <Leaderboard
        v-if="isOwnProfile"
        title="Your Frenemies"
        :entries="frenemyEntries"
        :frenemies="userStore.profile?.frenemies || []"
        :current-user-id="userStore.user?.uid"
        @add-frenemy="addFrenemy"
      >
        <template v-if="loadingFrenemies">
          <p class="has-text-grey-light">Loading frenemies...</p>
        </template>
        <template v-else-if="!frenemyEntries.length">
          <p class="has-text-grey-light">No frenemies added yet.</p>
        </template>
      </Leaderboard>
      <Leaderboard
        v-if="isOwnProfile"
        title="Frenemies Who’ve Added You"
        :entries="addedByEntries"
        :frenemies="userStore.profile?.frenemies || []"
        :current-user-id="userStore.user?.uid"
        @add-frenemy="addFrenemy"
      >
        <template v-if="loadingAddedBy">
          <p class="has-text-grey-light">Loading...</p>
        </template>
        <template v-else-if="!addedByEntries.length">
          <p class="has-text-grey-light">No one has added you as a frenemy yet.</p>
        </template>
      </Leaderboard>
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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';

import Leaderboard from '@/components/Leaderboard.vue';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import PyramidView from '@/components/PyramidView.vue';
import type { User } from '@top-x/shared/types/user';
import type { LeaderboardEntry } from '@top-x/shared/types/game';
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

const frenemies = ref<User[]>([]);
const addedBy = ref<User[]>([]);
const frenemyEntries = ref<LeaderboardEntry[]>([]);
const addedByEntries = ref<LeaderboardEntry[]>([]);
const loadingFrenemies = ref(false);
const loadingAddedBy = ref(false);
const showLoginTab = ref(false);

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
  if (!userStore.profile?.frenemies || userStore.profile.frenemies.length === 0) {
    frenemies.value = [];
    frenemyEntries.value = [];
    return;
  }
  loadingFrenemies.value = true;
  try {
    const frenemyPromises = userStore.profile.frenemies.map(uid => getDoc(doc(db, 'users', uid)));
    const frenemyDocs = await Promise.all(frenemyPromises);
    frenemies.value = frenemyDocs
      .filter(doc => doc.exists())
      .map(doc => doc.data() as User);
    frenemyEntries.value = frenemies.value.map(user => ({
      uid: user.uid,
      displayName: user.displayName || 'Anonymous',
      username: user.username || '@Anonymous',
      photoURL: user.photoURL || 'https://www.top-x.co/assets/profile.png',
      score: user.games?.smartest_on_x?.default?.score || 0,
    }));
  } catch (err) {
    console.error('Error fetching frenemies:', err);
    frenemies.value = [];
    frenemyEntries.value = [];
  } finally {
    loadingFrenemies.value = false;
  }
}

async function fetchAddedBy() {
  if (!userStore.profile?.addedBy || userStore.profile.addedBy.length === 0) {
    addedBy.value = [];
    addedByEntries.value = [];
    return;
  }
  loadingAddedBy.value = true;
  try {
    const addedByPromises = userStore.profile.addedBy.map(uid => getDoc(doc(db, 'users', uid)));
    const addedByDocs = await Promise.all(addedByPromises);
    addedBy.value = addedByDocs
      .filter(doc => doc.exists())
      .map(doc => doc.data() as User);
    addedByEntries.value = addedBy.value.map(user => ({
      uid: user.uid,
      displayName: user.displayName || 'Anonymous',
      username: user.username || '@Anonymous',
      photoURL: user.photoURL || 'https://www.top-x.co/assets/profile.png',
      score: user.games?.smartest_on_x?.default?.score || 0,
    }));
  } catch (err) {
    console.error('Error fetching addedBy:', err);
    addedBy.value = [];
    addedByEntries.value = [];
  } finally {
    loadingAddedBy.value = false;
  }
}

async function addFrenemy(uid: string) {
  try {
    await userStore.addFrenemy(uid);
    await fetchFrenemies();
    await fetchAddedBy();
  } catch (err) {
    console.error('Error adding frenemy:', err);
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

watch(
  [() => route.query.user, () => userStore.profile],
  async () => {
    await loadProfile();
    await loadPyramid();
    if (isOwnProfile.value && isLoggedIn.value) {
      fetchFrenemies();
      fetchAddedBy();
    }
    if (isOwnProfile.value && !isLoggedIn.value) {
      showLoginTab.value = true;
    } else {
      showLoginTab.value = false;
    }
  },
  { immediate: true }
);

onMounted(() => {
  trackEvent(analytics, 'page_view', { page_name: 'profile' });
  // additional actions handled by watcher
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
</style>