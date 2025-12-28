<template>
  <div class="pyramid-results">
    <!-- <h2 class="subtitle has-text-white">Other Users' Votes</h2> -->
    <!-- Only show votes list if user is logged in and has votes -->
    <div v-if="user && userVotes.length === 0 && !showLoginTab" class="notification is-info">
      <p>No votes found for this game.</p>
    </div>
    <div v-if="user && userVotes.length > 0" class="votes-list">
      <div v-for="vote in paginatedVotes" :key="vote.uid" class="vote-item">
        <div class="user-header has-text-centered">
          <img :src="vote.photoURL" alt="User Profile" class="user-profile-image" />
          <h3 class="has-text-white" style="font-size:22px">
            <router-link
              :to="{ path: '/profile', query: { user: vote.uid } }"
              class="has-text-white"
              style="text-decoration: none;"
            >
              {{ vote.displayName || 'Anonymous' }}
            </router-link>
          </h3>
          <CustomButton
            v-if="user && user.uid !== vote.uid && !frenemies.includes(vote.uid)"
            type="is-primary is-small"
            :label="t('games.pyramid.follow')"
            @click="addFrenemy(vote.uid)"
          />
        </div>
        <PyramidView
          :pyramid="vote.pyramid"
          :worst-item="vote.worstItem"
          :rows="props.rows"
          :game-header="props.gameHeader"
          :worst-header="props.worstHeader"
          :game-title="props.gameTitle"
          :share-image-title="shareImageTitle"
          :hide-row-label="props.hideRowLabel"
          :worst-show="props.worstShow"
          :share-link="shareLink"
          :user-profile="{ photoURL: vote.photoURL }"
          :user-name="vote.username || vote.displayName"
        />
      </div>
    </div>

    <div v-if="user" class="has-text-centered mt-4">
      <p class="has-text-white">{{ t('games.pyramid.cantFindPals') }}</p>
      <CustomButton
        type="is-primary"
        :label="t('games.pyramid.findUsers')"
        @click="searchFrenemies"
      />
    </div>
    
    <!-- Pagination Controls - Only show if user is logged in and has votes -->
    <div v-if="user && totalPages > 1" class="pagination-controls">
      <button 
        class="pagination-button" 
        :disabled="currentPage === 1"
        @click="currentPage = currentPage - 1"
      >
        {{ t('games.pagination.previous') }}
      </button>
      <span class="pagination-info">
        {{ t('games.pagination.pageInfo', { start: pageInfo.start, end: pageInfo.end, total: pageInfo.total }) }}
      </span>
      <button 
        class="pagination-button" 
        :disabled="currentPage === totalPages"
        @click="currentPage = currentPage + 1"
      >
        {{ t('games.pagination.next') }}
      </button>
    </div>

    <!-- Login Tab - Inline Display -->
    <div v-if="!user && showLoginTab" class="login-tab-inline">
      <div class="login-tab-content">
        <p class="question-text">{{ t('games.pyramid.results.seeFriendsPicks') }}</p> 
        <p class="answer-text">
          {{ t('games.pyramid.results.loginToFollow') }}<br>
          {{ t('games.pyramid.results.privacyNote') }}<br>
        </p>
      </div>
      <div class="has-text-centered">
        <CustomButton
          type="is-primary"
          :label="t('games.loginButton')"
          :icon="['fab', 'x-twitter']"
          @click="handleLogin"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import PyramidView from '@/components/games/pyramid/PyramidView.vue';
import { useUserStore } from '@/stores/user';
import { useLocaleStore } from '@/stores/locale';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);
import { PyramidItem, PyramidRow, PyramidSlot } from '@top-x/shared/types/pyramid';
import { LeaderboardEntry } from '@top-x/shared/types/game';
import router from '@/router';
import { getFriendsLeaderboard, getVipLeaderboard } from '@/services/leaderboard';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';

const props = defineProps<{
  gameId: string;
  items: PyramidItem[];
  communityItems: PyramidItem[];
  rows: PyramidRow[];
  gameHeader?: string;
  worstHeader?: string;
  gameTitle?: string;
  hideRowLabel?: boolean;
  shareImageTitle?: string;
  worstShow?: boolean;
    shareLink?: string;

}>();

const userStore = useUserStore();
const user = computed(() => userStore.user);
const frenemies = computed(() => userStore.profile?.frenemies || []);
const showLoginTab = ref(false);
const currentPage = ref(1);
const itemsPerPage = 10;

const userVotes = ref<
  Array<{
    uid: string;
    username: string;
    displayName: string;
    photoURL: string;
    pyramid: PyramidSlot[][];
    worstItem: PyramidItem | null;
  }>
>([]);

onMounted(async () => {
  console.log('PyramidResults: onMounted called with gameId:', props.gameId);
  // Only load votes if user is logged in
  if (!user.value) {
    showLoginTab.value = true;
    // Don't fetch votes for non-logged-in users
    return;
  }
  
  // User is logged in, fetch votes asynchronously
  // Use setTimeout to allow component to render first, then fetch data
  setTimeout(async () => {
    try {
      const votes = await getVipLeaderboard(props.gameId);
      processVotes(votes);
      
      if (analytics) {
        logEvent(analytics, 'game_view', { game_name: props.gameId, view_type: 'results' });
      }
    } catch (error) {
      console.error('PyramidResults: Error loading votes:', error);
    }
  }, 0);
});

function processVotes(leaderboard: LeaderboardEntry[]) {
  const allItems = [...props.items, ...props.communityItems];
  // Create a map for faster lookups instead of using find() repeatedly
  const itemsMap = new Map(allItems.map(item => [item.id, item]));
  
  // Process votes more efficiently
  userVotes.value = leaderboard
    .filter(entry => entry.custom && entry.custom.pyramid) // Filter out entries without pyramid data
    .map(entry => ({
      uid: entry.uid,
      username: entry.username || '',
      displayName: entry.displayName || 'Anonymous',
      photoURL: entry.photoURL || '/assets/profile.png',
      pyramid: (entry.custom!.pyramid as Array<{ tier: number; slots: string[] }>).map(tier => 
        tier.slots.map(itemId => ({
          image: itemId ? (itemsMap.get(itemId) || null) : null,
        }))
      ),
      worstItem: entry.custom!.worstItem 
        ? (itemsMap.get((entry.custom!.worstItem as { id: string }).id) || null)
        : null,
    }));
  console.log('PyramidResults: Processed votes:', userVotes.value);
  currentPage.value = 1; // Reset to first page when votes are loaded
}

const paginatedVotes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return userVotes.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(userVotes.value.length / itemsPerPage);
});

const pageInfo = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage.value * itemsPerPage, userVotes.value.length);
  return { start, end, total: userVotes.value.length };
});

async function handleLogin() {
  await userStore.loginWithX();
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'login', method: 'x_auth', context: 'results_tab', game_id: props.gameId });
  }
  closeLoginTab();
  // Reload or refetch votes after login
  location.reload(); // Simple way to refresh the component
}

function closeLoginTab() {
  showLoginTab.value = false;
}

async function addFrenemy(uid: string) {
  if (!user.value) {
    showLoginTab.value = true;
    return;
  }
  try {
    await userStore.addFrenemy(uid);
  } catch (err) {
    console.error('Error following user:', err);
  }
}

function searchFrenemies() {
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'search_users', game_id: props.gameId });
  }
  router.push('/users');
}
</script>

<style scoped>
.pyramid-results {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  padding: 1rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.votes-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
}

.vote-item {
  padding: 1.5rem;
  background-color: #121212;
  border-radius: 12px;
  border: 1px solid #222;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  transition: transform 0.2s ease;
}

.vote-item:hover {
  border-color: #333;
}

.user-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #222;
  padding-bottom: 1rem;
}

.user-profile-image {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #00e8e0;
  object-fit: cover;
  box-shadow: 0 0 10px rgba(0, 232, 224, 0.2);
}

.subtitle {
  color: #eee;
  font-size: 1rem;
  margin: 0.3rem 0;
}

.login-tab-inline {
  background-color: #1f1f1f;
  color: white;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #333;
  margin: 2rem 0;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}

.login-tab-content {
  margin-bottom: 1.5rem;
}

.question-text {
  color: #00e8e0;
  font-weight: 800;
  margin-bottom: 0.5rem;
  text-align: center;
  font-size: 1.1rem;
}

.answer-text {
  color: #ccc;
  text-align: center;
  line-height: 1.5;
}

@media screen and (max-width: 767px) {
  .pyramid-results {
    padding: 0.5rem 0.2rem; /* Reduced horizontal padding */
    width: 100%;
  }
  .vote-item {
    padding: 1rem 0.5rem; /* Reduced horizontal padding inside cards */
    border-radius: 8px; /* Slightly tighter radius for mobile */
  }
  .user-profile-image {
    width: 36px;
    height: 36px;
  }
}

/* Blend the nested PyramidView into the card */
:deep(.pyramid-container) {
  max-width: 100% !important;
}

:deep(.game-header) {
  display: none !important;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  margin-top: 1rem;
  border-top: 1px solid #222;
}

.pagination-button {
  background-color: #2a2a2a;
  color: #fff;
  border: 1px solid #444;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-button:hover:not(:disabled) {
  background-color: #3a3a3a;
  border-color: #00e8e0;
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  color: #ccc;
  font-size: 0.9rem;
}
</style>