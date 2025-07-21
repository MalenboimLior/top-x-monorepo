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
            label="Add to Frenemies"
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
      <p class="has-text-white">Can't spot your pals? Time to hunt for more frenemies!</p>
      <CustomButton
        type="is-primary"
        label="Search more frenemies"
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
            label="Login with X"
            :icon="['fab', 'x-twitter']"
            @click="handleLogin"
          />
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import PyramidView from '@/components/PyramidView.vue';
import { useUserStore } from '@/stores/user';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
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
      photoURL: entry.photoURL || 'https://www.top-x.co/assets/profile.png',
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
    console.error('Error adding frenemy:', err);
  }
}

function searchFrenemies() {
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'search_frenemies', game_id: props.gameId });
  }
  router.push('/frenemies');
}
</script>

<style scoped>
.pyramid-results {
  padding: 0.2rem 0.1rem;
  background-color: #000000;

  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.votes-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}
.vote-item {
 padding-bottom: 1rem;
}
.user-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.user-profile-image {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #00e8e0;
  object-fit: cover;
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
    width: 400px; /* Matches image-pool: 4 * 90px + 3 * 0.2rem + 2 * 0.3rem + 2px */
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
@media screen and (max-width: 767px) {
  .pyramid-results {
    padding: 0.1rem 0.05rem;
  }
  .user-profile-image {
    width: 30px;
    height: 30px;
  }
}
</style>