<template>
  <div class="modal" :class="{ 'is-active': isActive }">
    <div class="modal-background"></div>
    <div class="modal-content box has-background-dark has-text-white">
      <button class="delete is-large" aria-label="close" @click="close"></button>
      <h2 class="title has-text-white">Great Pyramid!</h2>
      <p class="mb-4">
        Log in to make your vote count and unlock cool features:<br>
        - Your vote is saved<br>
        - See your friends’ votes<br>
        - Get detailed stats on all votes<br>
        - Show your profile image and share a unique invite link<br><br>
        We only use your username and image, and we’ll never post on your behalf.
      </p>
      <div class="buttons">
        <button class="button is-success" @click="handleLogin">Log in with X</button>
        <button class="button is-text has-text-white" @click="skip">Skip for now</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '../stores/user';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { PyramidItem, PyramidRow, PyramidSlot, PyramidData } from '@top-x/shared/types/pyramid';

const props = defineProps<{
  isActive: boolean;
  gameId?: string;
  pendingVote?: PyramidData | null;
  rows?: PyramidRow[];
}>();

const emit = defineEmits<{
  (e: 'login'): void;
  (e: 'skip'): void;
  (e: 'close'): void;
}>();

const userStore = useUserStore();

async function handleLogin() {
  try {
    const success = await userStore.loginWithX();
    if (success && userStore.user && props.gameId) {
      console.log('PyramidLoginPopup: Login successful');
      const voteData = props.pendingVote || JSON.parse(localStorage.getItem(`pyramid_${props.gameId}`) || '{}');
      if (voteData && voteData.pyramid && 'worstItem' in voteData) {
        await saveCachedVote(voteData, userStore.user.uid);
        console.log('PyramidLoginPopup: Vote saved');
      }
      emit('login');
    }
  } catch (err: any) {
    console.error('PyramidLoginPopup: Login error:', err.message);
    alert('Failed to login. Please try again.');
  }
}

async function saveCachedVote(data: PyramidData, userId: string) {
  if (!props.gameId) {
    console.error('PyramidLoginPopup: No gameId provided');
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

  const score = calculateScore(data.pyramid, data.worstItem);

  try {
    await userStore.updateGameProgress(gameTypeId, props.gameId, score, 0, custom);
    console.log('PyramidLoginPopup: Cached vote saved to user progress');
    await updateGameStats(props.gameId, data.pyramid, props.rows || [], data.worstItem);
    console.log('PyramidLoginPopup: Game stats updated for cached vote');
  } catch (err: any) {
    console.error('PyramidLoginPopup: Error saving cached vote:', err.message);
    alert('Failed to save vote. Please try again.');
  }
}

function calculateScore(pyramid: PyramidSlot[][], worstItem: PyramidItem | null): number {
  let score = 0;
  pyramid.forEach((row, rowIndex) => {
    const rowPoints = props.rows?.[rowIndex]?.points || 0;
    row.forEach(slot => {
      if (slot.image) {
        score += rowPoints;
      }
    });
  });

  console.log('PyramidLoginPopup: Calculated score:', score);
  return score;
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
      console.log('PyramidLoginPopup: Updated stats:', stats);
      transaction.set(statsRef, stats);
    });
  } catch (err: any) {
    console.error('PyramidLoginPopup: Error updating game stats:', err.message);
    throw err;
  }
}

const skip = () => {
  console.log('PyramidLoginPopup: Skip clicked');
  emit('skip');
};

const close = () => {
  console.log('PyramidLoginPopup: Close clicked');
  emit('close');
};
</script>

<style scoped>
.modal-content {
  max-width: 400px;
  padding: 2rem !important;
  border-radius: 8px;
}

.delete {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.button.is-success {
  background-color: var(--bulma-success, #c4ff00);
  color: #000;
}

.button.is-text {
  text-decoration: underline;
}
</style>