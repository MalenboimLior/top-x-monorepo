<!-- Shows stats and info about the logged in user -->
<template>
  <div class="profile-container">
    <h1 class="title has-text-white">Your Profile</h1>
    <div :class="{ blurred: !isLoggedIn }">
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
        <div class="content mt-4">
          <h3 class="subtitle is-5 has-text-white">Trivia Stats</h3>
          <p class="has-text-white">Best Score: {{ triviaStats.score }}</p>
          <p class="has-text-white">Best Streak: {{ triviaStats.streak }}</p>
        </div>
      </Card>
      <Leaderboard
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
        <!-- <p class="question-text">Hi, if you want to see the vote statistics you need to login, also your vote will be count</p> -->
        <p class="answer-text">Unlock Your Profile? 🧐 <br>
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
import { computed, ref, onMounted } from 'vue';
import { useHead } from '@vueuse/head';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';

import Leaderboard from '@/components/Leaderboard.vue';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { User, UserGameData } from '@top-x/shared/types/user';

interface LeaderboardEntry {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  score: number;
}

const userStore = useUserStore();

useHead({
  title: 'Your Profile - TOP-X',
  meta: [
    { name: 'description', content: 'View your TOP-X profile, stats and frenemies.' },
  ],
});

const displayName = computed(() => userStore.profile?.displayName || 'Anonymous');
const username = computed(() => userStore.profile?.username ? `@${userStore.profile.username}` : '@Anonymous');
const photoURL = computed(() => userStore.profile?.photoURL || 'https://www.top-x.co/assets/profile.png');
const triviaStats = computed(() => userStore.profile?.games?.smartest_on_x?.default || { score: 0, streak: 0 } as UserGameData);
const isLoggedIn = computed(() => !!userStore.user);
const frenemies = ref<User[]>([]);
const addedBy = ref<User[]>([]);
const frenemyEntries = ref<LeaderboardEntry[]>([]);
const addedByEntries = ref<LeaderboardEntry[]>([]);
const loadingFrenemies = ref(false);
const loadingAddedBy = ref(false);
const showLoginTab = ref(false);

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

function closeLoginTab() {
  showLoginTab.value = false;
}

onMounted(() => {
  if (isLoggedIn.value) {
    fetchFrenemies();
    fetchAddedBy();
  } else {
    showLoginTab.value = true;
  }
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