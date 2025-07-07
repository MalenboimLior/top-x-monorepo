<template>
  <div class="pyramid-my-vote">
    <div :key="renderKey">
      <PyramidImage
        ref="pyramidImageRef"
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
    </div>
    <div class="buttons is-centered mt-4">
      <CustomButton
        type="is-primary"
        label="Edit"
        :icon="['fas', 'edit']"
        @click="editPyramid"
      />
      <ShareButton
        :share-text="shareText || 'Check out my TOP-X Pyramid ranking! #TOPX'"
        :image-url="imageUrl"
      />
    </div>
    <PyramidLoginPopup
      :is-active="showLoginPopup"
      :game-id="props.gameId"
      :rows="rows"
      @login="closeLoginPopup"
      @skip="closeLoginPopup"
      @close="closeLoginPopup"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { doc, runTransaction, setDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import PyramidImage from '@/components/PyramidImage.vue';
import PyramidLoginPopup from '@/components/PyramidLoginPopup.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ShareButton from '@/components/ShareButton.vue';
import { PyramidItem, PyramidRow, PyramidSlot } from '@top-x/shared/types/pyramid';

const router = useRouter();
const userStore = useUserStore();
const pyramidImageRef = ref<any>(null);
const imageUrl = computed(() => pyramidImageRef.value?.getImageDataUrl() || null);
const showLoginPopup = ref(false);
const renderKey = ref(0);

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

onMounted(() => {
  console.log('PyramidMyVote: onMounted called with gameId:', props.gameId);
  if (!userStore.user && props.gameId) {
    const flag = localStorage.getItem(`showLoginPopup_${props.gameId}`);
    if (flag) {
      showLoginPopup.value = true;
      localStorage.removeItem(`showLoginPopup_${props.gameId}`);
      console.log('PyramidMyVote: Showing login popup due to flag');
    }
  }
});

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
        renderKey.value++; // Force re-render of PyramidImage
        console.log('PyramidMyVote: Forcing re-render with new renderKey:', renderKey.value);
      }
    }
  }
);

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
      const stats = statsDoc.exists()
        ? statsDoc.data()
        : { totalPlayers: 0, itemRanks: {}, worstItemCounts: {} };

      // Prepare updates to merge
      const updates: Record<string, any> = {
        totalPlayers: (stats.totalPlayers || 0) + 1,
      };

      // Update itemRanks
      const updatedItemRanks = { ...stats.itemRanks };
      pyramid.forEach((row: PyramidSlot[], rowIndex: number) => {
        row.forEach((slot: PyramidSlot) => {
          if (slot.image) {
            const itemId = slot.image.id;
            const rowId = rows[rowIndex]?.id || rowIndex + 1;
            updatedItemRanks[itemId] = updatedItemRanks[itemId] || {};
            updatedItemRanks[itemId][rowId] = (updatedItemRanks[itemId][rowId] || 0) + 1;
          }
        });
      });

      // Update worstItemCounts
      const updatedWorstItemCounts = { ...stats.worstItemCounts };
      if (worstItem) {
        const itemId = worstItem.id;
        updatedWorstItemCounts[itemId] = (updatedWorstItemCounts[itemId] || 0) + 1;
      }

      // Merge updates
      updates.itemRanks = updatedItemRanks;
      updates.worstItemCounts = updatedWorstItemCounts;

      // Use set with merge to handle both existing and non-existing documents
      transaction.set(statsRef, updates, { merge: true });
    });
    console.log('PyramidMyVote: Successfully updated game stats for gameId:', gameId);
  } catch (err: any) {
    console.error('PyramidMyVote: Error updating game stats:', {
      message: err.message,
      code: err.code,
      details: err.details,
      stack: err.stack
    });
    throw err;
  }
}

function closeLoginPopup() {
  console.log('PyramidMyVote: Closing login popup');
  showLoginPopup.value = false;
  renderKey.value++; // Force re-render to update PyramidImage
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