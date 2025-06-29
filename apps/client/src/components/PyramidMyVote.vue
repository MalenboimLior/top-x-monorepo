<template>
  <div class="pyramid-my-vote">
    <h2 class="subtitle has-text-white">My Vote</h2>
    <PyramidView
      :pyramid="pyramid"
      :worst-item="worstItem"
      :rows="rows"
      :game-header="gameHeader"
      :worst-header="worstHeader"
      :game-title="gameTitle"
      :hide-row-label="hideRowLabel"
    />
    <div v-if="!userStore.user" class="buttons is-centered mt-4">
      <CustomButton
        type="is-primary"
        label="Login to Save Vote"
        :icon="['fas', 'sign-in-alt']"
        @click="loginWithX"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { doc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import PyramidView from '@/components/PyramidView.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { PyramidItem, PyramidRow, PyramidSlot, PyramidData } from '@top-x/shared/types/pyramid';

const props = defineProps<{
  pyramid: PyramidSlot[][];
  worstItem: PyramidItem | null;
  rows: PyramidRow[];
  gameId?: string;
  gameHeader?: string;
  worstHeader?: string;
  gameTitle?: string;
  hideRowLabel?: boolean;
}>();

const userStore = useUserStore();

watch(
  () => userStore.user,
  async (newUser) => {
    if (newUser && props.gameId) {
      console.log('PyramidMyVote: User logged in, checking for cached vote');
      const cacheKey = Object.keys(localStorage).find(key => key.startsWith(`vote_${props.gameId}_`));
      if (cacheKey) {
        const cachedVote = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        if (cachedVote.pyramid && cachedVote.worstItem !== undefined) {
          await saveCachedVote(cachedVote, newUser.uid);
          localStorage.removeItem(cacheKey);
          console.log('PyramidMyVote: Cached vote saved and removed');
        }
      }
    }
  }
);

async function loginWithX() {
  try {
    const success = await userStore.loginWithX();
    if (success) {
      console.log('PyramidMyVote: Login successful');
    }
  } catch (err: any) {
    console.error('PyramidMyVote: Login error:', err.message);
    alert('Failed to login. Please try again.');
  }
}

async function saveCachedVote(data: { pyramid: PyramidSlot[][]; worstItem: PyramidItem | null; score: number }, userId: string) {
  if (!props.gameId) {
    console.error('PyramidMyVote: No gameId provided');
    return;
  }
  const gameTypeId = 'PyramidTier';
  const custom = {
    pyramid: Array.isArray(data.pyramid)
      ? data.pyramid.map((row, index) => ({
          tier: index + 1,
          slots: row.map(slot => slot.image?.id || null)
        }))
      : [],
    worstItem: data.worstItem ? { id: data.worstItem.id, label: data.worstItem.label, src: data.worstItem.src } : null,
  };

  try {
    await userStore.updateGameProgress(gameTypeId, props.gameId, data.score, 0, custom);
    console.log('PyramidMyVote: Cached vote saved to user progress');
    await updateGameStats(props.gameId, data.pyramid, props.rows, data.worstItem);
    console.log('PyramidMyVote: Game stats updated for cached vote');
  } catch (err: any) {
    console.error('PyramidMyVote: Error saving cached vote:', err.message, err);
    alert('Failed to save vote. Please try again.');
  }
}

async function updateGameStats(gameId: string, pyramid: PyramidSlot[][], rows: PyramidRow[], worstItem: PyramidItem | null) {
  const statsRef = doc(db, 'games', gameId, 'stats', 'general');
  try {
    await runTransaction(db, async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      let stats = statsDoc.exists() ? statsDoc.data() : { totalPlayers: 0, itemRanks: {}, worstItemCounts: {} };
      stats.totalPlayers = (stats.totalPlayers || 0) + 1;
      pyramid.forEach((row: PyramidSlot[], rowIndex: number) => {
        row.forEach((slot: PyramidSlot) => {
          if (slot.image) {
            const itemId = slot.image.id;
            const rowId = rows[rowIndex]?.id || rowIndex + 1;
            stats.itemRanks[itemId] = stats.itemRanks[itemId] || {};
            stats.itemRanks[itemId][rowId] = (stats.itemRanks[itemId][rowId] || 0) + 1;
          }
        });
      });
      if (worstItem) {
        const itemId = worstItem.id;
        stats.worstItemCounts[itemId] = (stats.worstItemCounts[itemId] || 0) + 1;
      }
      transaction.set(statsRef, stats);
    });
  } catch (err: any) {
    console.error('PyramidMyVote: Error updating game stats:', err.message, err);
    throw err;
  }
}
</script>

<style scoped>
.pyramid-my-vote {
  padding: 0.2rem 0.1rem;
  background-color: #121212;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.subtitle {
  color: #eee;
  font-size: 1rem;
  margin: 0.3rem 0;
}
.button.is-primary {
  background-color: #3273dc;
}
@media screen and (max-width: 767px) {
  .pyramid-my-vote {
    padding: 0.1rem 0.05rem;
  }
}
</style>