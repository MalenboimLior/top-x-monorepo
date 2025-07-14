<template>
  <div class="pyramid-results">
    <!-- <h2 class="subtitle has-text-white">Other Users' Votes</h2> -->
    <div v-if="userVotes.length === 0" class="notification is-info">
      <p>No votes found for this game.</p>
    </div>
    <div v-else class="votes-list">
      <div v-for="vote in userVotes" :key="vote.uid" class="vote-item">
        <h3 class="has-text-white has-text-centered" style="padding-bottom: 15px;font-size:22px">{{ vote.displayName || 'Anonymous' }}</h3>
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
          :user-profile="{ photoURL: vote.photoURL }"
        />
      </div>
    </div>

    <!-- Login Tab -->
    <div v-show="showLoginTab" :class="['description-tab', { show: showLoginTab }]">
      <div class="tab-content" @click.stop>
        <p class="question-text">If you want to see what your friends votes and add new friends login</p>
        <p class="answer-text">We only use your username and image, and we’ll never post on your behalf.</p>

      
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
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@top-x/shared';
import PyramidView from '@/components/PyramidView.vue';
import { useUserStore } from '@/stores/user';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { PyramidItem, PyramidRow, PyramidSlot } from '@top-x/shared/types/pyramid';

const props = defineProps<{
  gameId: string;
  items: PyramidItem[];
  rows: PyramidRow[];
  gameHeader?: string;
  worstHeader?: string;
  gameTitle?: string;
  hideRowLabel?: boolean;
  shareImageTitle?: string;
  worstShow?: boolean;

}>();

const userStore = useUserStore();
const user = computed(() => userStore.user);
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
   
  }
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const votes = [];
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const gameData = userData.games?.PyramidTier?.[props.gameId];
      if (gameData?.custom) {
        const pyramid = gameData.custom.pyramid.map((tier: any) =>
          tier.slots.map((itemId: string | null) => ({
            image: itemId ? props.items.find(item => item.id === itemId) || null : null,
          }))
        );
        const worstItem = gameData.custom.worstItem
          ? props.items.find(item => item.id === gameData.custom.worstItem.id) || null
          : null;
        votes.push({
          uid: userDoc.id,
          displayName: userData.displayName || 'Anonymous',
          photoURL: userData.photoURL || 'https://www.top-x.co/assets/profile.png',
          pyramid,
          worstItem,
        });
      }
    }
    userVotes.value = votes;
    console.log('PyramidResults: Fetched votes:', userVotes.value);
  } catch (err: any) {
    console.error('PyramidResults: Error fetching votes:', err.message, err);
  }
});

async function handleLogin() {
  await userStore.loginWithX();
  closeLoginTab();
  // Reload or refetch votes after login
  location.reload(); // Simple way to refresh the component
}

function closeLoginTab() {
  showLoginTab.value = false;
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
}
</style>