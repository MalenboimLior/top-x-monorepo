<template>
  <div class="pyramid-results">
    <h2 class="subtitle has-text-white">Other Users' Votes</h2>
    <div v-if="userVotes.length === 0" class="notification is-info">
      <p>No votes found for this game.</p>
    </div>
    <div v-else class="votes-list">
      <div v-for="vote in userVotes" :key="vote.uid" class="vote-item">
        <h3 class="has-text-white has-text-centered">{{ vote.displayName || 'Anonymous' }}</h3>
        <PyramidView
          :pyramid="vote.pyramid"
          :worst-item="vote.worstItem"
          :rows="props.rows"
          :game-header="props.gameHeader"
          :worst-header="props.worstHeader"
          :game-title="props.gameTitle"
          :hide-row-label="props.hideRowLabel"
          :user-profile="{ photoURL: vote.photoURL }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@top-x/shared';
import PyramidView from '@/components/PyramidView.vue';
import { PyramidItem, PyramidRow, PyramidSlot } from '@top-x/shared/types/pyramid';

const props = defineProps<{
  gameId: string;
  items: PyramidItem[];
  rows: PyramidRow[];
  gameHeader?: string;
  worstHeader?: string;
  gameTitle?: string;
  hideRowLabel?: boolean;
}>();

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
  border-bottom: 1px solid #333;
  padding-bottom: 1rem;
}
.subtitle {
  color: #eee;
  font-size: 1rem;
  margin: 0.3rem 0;
}
@media screen and (max-width: 767px) {
  .pyramid-results {
    padding: 0.1rem 0.05rem;
  }
}
</style>