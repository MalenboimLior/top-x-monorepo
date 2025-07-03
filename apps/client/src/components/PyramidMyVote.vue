<template>
  <div class="pyramid-my-vote">
    <!-- <h2 class="subtitle has-text-white">My Vote</h2> -->
    <PyramidView
      :pyramid="pyramid"
      :worst-item="worstItem"
      :rows="rows"
      :game-header="gameHeader"
      :worst-header="worstHeader"
      :game-title="gameTitle"
      :share-image-title="shareImageTitle"
      :share-text="shareText"
      :hide-row-label="hideRowLabel"
      :user-profile="{ photoURL: userStore.user?.photoURL || '' }"
    />
    <div class="buttons is-centered mt-4">
      <CustomButton
        type="is-primary"
        label="Edit"
        :icon="['fas', 'edit']"
        @click="editPyramid"
      />
      <CustomButton
        v-if="!userStore.user"
        type="is-primary"
        label="Login to Save Vote"
        :icon="['fab', 'x-twitter']"
        @click="loginWithX"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { doc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import PyramidView from '@/components/PyramidView.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { PyramidItem, PyramidRow, PyramidSlot, PyramidData } from '@top-x/shared/types/pyramid';

const router = useRouter();
const userStore = useUserStore();

const props = defineProps<{
  pyramid: PyramidSlot[][];
  worstItem: PyramidItem | null;
  rows: PyramidRow[];
  gameId?: string;
  gameHeader?: string;
  worstHeader?: string;
  gameTitle?: string;
  hideRowLabel?: boolean;
  worstPoints?: number;
  shareImageTitle?: string;
  shareText?: string;
}>();

watch(
  () => userStore.user,
  async (newUser) => {
    if (newUser && props.gameId) {
      console.log('PyramidMyVote: User logged in, checking for cached vote');
      const savedPyramid = localStorage.getItem(`pyramid_${props.gameId}`);
      if (savedPyramid) {
        const cachedVote = JSON.parse(savedPyramid);
        await saveCachedVote(cachedVote, newUser.uid);
       // localStorage.removeItem(`pyramid_${props.gameId}`);
        console.log('PyramidMyVote: Cached vote saved to user database');
      }
    }
  }
);

async function loginWithX() {
  try {
    const success = await userStore.loginWithX();
    if (success) {
      console.log('PyramidMyVote: Login successful');
      if (props.gameId) {
        const savedPyramid = localStorage.getItem(`pyramid_${props.gameId}`);
        if (savedPyramid && userStore.user) {
          const cachedVote = JSON.parse(savedPyramid);
          await saveCachedVote(cachedVote, userStore.user.uid);
          localStorage.removeItem(`pyramid_${props.gameId}`);
          console.log('PyramidMyVote: Cached vote saved after login');
        }
      }
    }
  } catch (err: any) {
    console.error('PyramidMyVote: Login error:', err.message);
    alert('Failed to login. Please try again.');
  }
}

async function saveCachedVote(data: { pyramid: PyramidSlot[][]; worstItem: PyramidItem | null }, userId: string) {
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

  const score = calculateScore(data.pyramid, data.worstItem);

  try {
    await userStore.updateGameProgress(gameTypeId, props.gameId, score, 0, custom);
    console.log('PyramidMyVote: Cached vote saved to user progress');
    await updateGameStats(props.gameId, data.pyramid, props.rows, data.worstItem);
    console.log('PyramidMyVote: Game stats updated for cached vote');
  } catch (err: any) {
    console.error('PyramidMyVote: Error saving cached vote:', err.message, err);
    alert('Failed to save vote. Please try again.');
  }
}

function calculateScore(pyramid: PyramidSlot[][], worstItem: PyramidItem | null): number {
  let score = 0;
  pyramid.forEach((row, rowIndex) => {
    const rowPoints = props.rows[rowIndex]?.points || 0;
    row.forEach(slot => {
      if (slot.image) {
        score += rowPoints;
      }
    });
  });
  if (worstItem) {
    score += props.worstPoints || 0;
  }
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
      transaction.set(statsRef, stats);
    });
  } catch (err: any) {
    console.error('PyramidMyVote: Error updating game stats:', err.message, err);
    throw err;
  }
}

function editPyramid() {
  if (props.gameId) {
    router.push({ name: 'PyramidTier', query: { game: props.gameId, edit: 'true' } });
    console.log('PyramidMyVote: Navigating to PyramidEdit with edit=true');
  }
}
</script>

<style scoped>
.pyramid-my-vote {
  padding: 0.2rem 0.1rem;
  background-color: #000000;

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

@media screen and (max-width: 767px) {
  .pyramid-my-vote {
    padding: 0.1rem 0.05rem;
  }
}
</style>