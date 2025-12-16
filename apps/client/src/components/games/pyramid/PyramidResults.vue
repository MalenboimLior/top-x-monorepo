<template>
  <div class="pyramid-results">
    <!-- <h2 class="subtitle has-text-white">Other Users' Votes</h2> -->
    <div v-if="userVotes.length === 0" class="notification is-info">
      <p>No votes found for this game.</p>
    </div>
    <div v-else class="votes-list">
      <div v-for="vote in userVotes" :key="vote.uid" class="vote-item">
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
            label="Follow"
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

        />
      </div>
    </div>

    <div v-if="user" class="has-text-centered mt-4">
      <p class="has-text-white">Can't spot your pals? Time to find more users to follow!</p>
      <CustomButton
        type="is-primary"
        label="Find users to follow"
        @click="searchFrenemies"
      />
    </div>

    <!-- Login Tab -->
    <div v-show="showLoginTab" :class="['description-tab', { show: showLoginTab }]">
      <div class="tab-content" @click.stop>
    <p class="question-text">See your friends' picks? 👥</p> 
        <p class="answer-text">

          Log in to add people you want to follow & check their votes.<br>
Username + pic - we promise, we stay out of your posts! 🔒<br>
</p>

      
        <!-- <button style="color:#c4ff00;" @click="closeLoginTab">Close</button> -->
      </div>
      <div  class="has-text-centered">
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

const userVotes = ref<
  Array<{
    uid: string;
    displayName: string;
    photoURL: string;
    pyramid: PyramidSlot[][];
    worstItem: PyramidItem | null;
  }>
>([]);

onMounted(async () => {
  console.log('PyramidResults: onMounted called with gameId:', props.gameId);
  if (!user.value) {
    showLoginTab.value = true;
    const votes = await getVipLeaderboard(props.gameId);
    processVotes(votes);
  } else {
    // const friendsVotes = await getFriendsLeaderboard(props.gameId, user.value.uid);
    // let votes = friendsVotes;
    // if (friendsVotes.length === 0) {
    //   votes = await getVipLeaderboard(props.gameId);
    // }
    //remove frendes for now
    const votes = await getVipLeaderboard(props.gameId);

    processVotes(votes);
  }
  if (analytics) {
    logEvent(analytics, 'game_view', { game_name: props.gameId, view_type: 'results' });
  }
});

function processVotes(leaderboard: LeaderboardEntry[]) {
  const allItems = [...props.items, ...props.communityItems];
  userVotes.value = leaderboard
    .filter(entry => entry.custom && entry.custom.pyramid) // Filter out entries without pyramid data
    .map(entry => ({
      uid: entry.uid,
      displayName: entry.displayName || 'Anonymous',
      photoURL: entry.photoURL || '/assets/profile.png',
      pyramid: (entry.custom!.pyramid as Array<{ tier: number; slots: string[] }>).map(tier => 
        tier.slots.map(itemId => ({
          image: itemId ? allItems.find(item => item.id === itemId) || null : null,
        }))
      ),
      worstItem: entry.custom!.worstItem 
        ? allItems.find(item => item.id === (entry.custom!.worstItem as { id: string }).id) || null 
        : null,
    }));
  console.log('PyramidResults: Processed votes:', userVotes.value);
}

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
  max-width: 1000px;
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

.description-tab {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #1f1f1f;
  color: white;
  padding: 1.5rem;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  box-shadow: 0 -10px 30px rgba(0,0,0,0.6);
  border-top: 1px solid #333;
  backdrop-filter: blur(10px);
}

.description-tab.show {
  transform: translateY(0);
}

.tab-content {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 1rem;
}

@media screen and (min-width: 768px) {
  .description-tab {
    width: 450px;
    left: 50%;
    transform: translateX(-50%) translateY(100%);
    border-radius: 16px 16px 0 0;
    padding: 2rem;
  }
  .description-tab.show {
    transform: translateX(-50%) translateY(0);
  }
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
  padding: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  max-width: 100% !important;
}

:deep(.game-header) {
  font-size: 1rem !important;
  margin: 0.5rem 0 1rem !important;
  opacity: 0.9;
  text-align: left; /* Align header with user info if desired, or keep center */
}
</style>