<template>
  <div class="pyramid-tier">
    <h1>{{ gameDescription }}</h1>
    <PyramidTable
      :items="items"
      :rows="rows"
      :sort-items="sortItems"
      :hide-row-label="hideRowLabel"
      :game-header="gameHeader"
      :pool-header="poolHeader"
      :worst-header="worstHeader"
      :share-text="shareText"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '@top-x/shared';
import PyramidTable from '@/components/PyramidTable.vue';
import { useUserStore } from '@/stores/user';
import { PyramidItem, PyramidRow, PyramidSlot, PyramidData, SortOption } from '@top-x/shared/types/pyramid';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const gameId = route.query.game as string;
const gameDescription = ref('');
const items = ref<PyramidItem[]>([]);
const rows = ref<PyramidRow[]>([]);
const sortItems = ref<SortOption>({ orderBy: 'id', order: 'asc' });
const hideRowLabel = ref(false);
const gameHeader = ref('Your Pyramid');
const poolHeader = ref('Item Pool');
const worstHeader = ref('Worst Item');
const shareText = ref('');
const worstPoints = ref(0);

onMounted(async () => {
  console.log('PyramidTier: onMounted called with gameId:', gameId);
  if (!gameId) {
    console.error('PyramidTier: No gameId provided');
    return;
  }

  try {
    const gameDocRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameDocRef);

    if (gameDoc.exists()) {
      const gameData = gameDoc.data();
      console.log('PyramidTier: Raw game data from Firestore:', gameData);
      console.log('PyramidTier: Custom field from Firestore:', gameData.custom);
      console.log('PyramidTier: HideRowLabel value:', gameData.custom?.HideRowLabel);

      gameDescription.value = gameData.description || '';
      gameHeader.value = gameData.gameHeader || 'Your Pyramid';
      poolHeader.value = gameData.custom?.poolHeader || 'Item Pool';
      worstHeader.value = gameData.custom?.worstHeader || 'Worst Item';
      shareText.value = gameData.shareText || '';
      items.value = gameData.custom?.items || [];
      rows.value = gameData.custom?.rows || [];
      sortItems.value = gameData.custom?.sortItems || { orderBy: 'id', order: 'asc' };
      hideRowLabel.value = gameData.custom?.HideRowLabel ?? false;
      worstPoints.value = gameData.custom?.worstPoints ?? 0;

      console.log('PyramidTier: Game data fetched:', {
        gameDescription: gameDescription.value,
        gameHeader: gameHeader.value,
        poolHeader: poolHeader.value,
        worstHeader: worstHeader.value,
        shareText: shareText.value,
        items: items.value,
        rows: rows.value,
        sortItems: sortItems.value,
        hideRowLabel: hideRowLabel.value
      });

      if (!gameData.custom) {
        console.warn('PyramidTier: No custom field found in game data for ID:', gameId);
      }
      if (!items.value.length) {
        console.warn('PyramidTier: No items found in gameData.custom.items for ID:', gameId);
      }
      if (!rows.value.length) {
        console.warn('PyramidTier: No rows found in gameData.custom.rows for ID:', gameId);
      }
    } else {
      console.error('PyramidTier: Game document not found for ID:', gameId);
    }
  } catch (error: any) {
    console.error('PyramidTier: Error fetching game data:', error.message, error);
  }
});
async function handleSubmit({ pyramid, worstItem }: PyramidData) {
  console.log('PyramidTier: handleSubmit called with data:', { pyramid, worstItem });

  if (!gameId) {
    console.error('PyramidTier: No gameId provided, cannot submit');
    alert('Error: No game ID provided. Please select a game.');
    router.push('/games');
    return;
  }

  if (!userStore.user) {
    console.log('PyramidTier: User not logged in, redirecting to logged out result');
    router.push({ name: 'PyramidResultLoggedOut', query: { game: gameId } });
    return;
  }

  if (!pyramid || !Array.isArray(pyramid)) {
    console.error('PyramidTier: Invalid pyramid data:', pyramid);
    alert('Error: Invalid pyramid data. Please try again.');
    router.push('/games');
    return;
  }

  const userId = userStore.user.uid;
  const gameTypeId = 'PyramidTier';
  const score = calculateScore(pyramid, worstItem);

  // Serialize pyramid and worstItem for route state
  const serializedPyramid = pyramid.map(row =>
    row.map(slot => ({
      image: slot.image
        ? { id: slot.image.id, label: slot.image.label, src: slot.image.src, color: slot.image.color }
        : null
    }))
  );
  const serializedWorstItem = worstItem
    ? { id: worstItem.id, label: worstItem.label, src: worstItem.src, color: worstItem.color }
    : null;

  const custom = {
    pyramid: Array.isArray(pyramid)
      ? pyramid.map((row, index) => ({
          tier: index + 1,
          slots: row.map(slot => slot.image?.id || null)
        }))
      : [],
    worstItem: worstItem ? { id: worstItem.id, label: worstItem.label, src: worstItem.src } : null,
  };
  console.log('PyramidTier: Prepared custom data for saving:', custom);

  try {
    await userStore.updateGameProgress(gameTypeId, gameId, score, 0, custom);
    console.log('PyramidTier: User progress updated successfully');

    await updateGameStats(gameId, pyramid, rows.value, worstItem);
    console.log('PyramidTier: Game stats updated successfully');

    console.log('PyramidTier: Pushing to PyramidResultLoggedIn with state:', {
      items: items.value,
      rows: rows.value,
      pyramid: serializedPyramid,
      worstItem: serializedWorstItem,
      gameHeader: gameHeader.value,
      worstHeader: worstHeader.value,
      hideRowLabel: hideRowLabel.value,
      gameTitle: gameDescription.value,
    });

    router.push({
      name: 'PyramidResultLoggedIn',
      query: { game: gameId, score: score.toString() },
      state: {
        items: items.value,
        rows: rows.value,
        pyramid: serializedPyramid,
        worstItem: serializedWorstItem,
        gameHeader: gameHeader.value,
        worstHeader: worstHeader.value,
        hideRowLabel: hideRowLabel.value,
        gameTitle: gameDescription.value,
      }
    });
  } catch (err: any) {
    console.error('PyramidTier: Error in handleSubmit:', err.message, err);
    alert('Failed to submit game data. Please try again.');
  }
}

function calculateScore(pyramid: PyramidSlot[][], worstItem: PyramidItem | null): number {
  let score = 0;
  pyramid.forEach((row, rowIndex) => {
    const rowPoints = rows.value[rowIndex]?.points || 0;
    row.forEach(slot => {
      if (slot.image) {
        score += rowPoints;
      }
    });
  });
  if (worstItem) {
    score += worstPoints.value;
  }
  console.log('PyramidTier: Calculated score:', score);
  return score;
}

async function updateGameStats(gameId: string, pyramid: PyramidSlot[][], rows: PyramidRow[], worstItem: PyramidItem | null) {
  console.log('PyramidTier: Updating game stats for gameId:', gameId);
  const statsRef = doc(db, 'games', gameId, 'stats', 'general');

  if (typeof runTransaction === 'function') {
    console.log('PyramidTier: Using runTransaction for stats update');
    try {
      await runTransaction(db, async (transaction) => {
        const statsDoc = await transaction.get(statsRef);
        let stats = statsDoc.exists() ? statsDoc.data() : { totalPlayers: 0, itemRanks: {}, worstItemCounts: {} };
        console.log('PyramidTier: Current stats:', stats);

        stats.totalPlayers = (stats.totalPlayers || 0) + 1;

        pyramid.forEach((row: PyramidSlot[], rowIndex: number) => {
          row.forEach((slot: PyramidSlot) => {
            if (slot.image) {
              const itemId = slot.image.id;
              const rowId = rows[rowIndex]?.id || rowIndex + 1;
              if (!stats.itemRanks[itemId]) {
                stats.itemRanks[itemId] = {};
              }
              stats.itemRanks[itemId][rowId] = (stats.itemRanks[itemId][rowId] || 0) + 1;
            }
          });
        });

        if (worstItem) {
          const itemId = worstItem.id;
          stats.worstItemCounts[itemId] = (stats.worstItemCounts[itemId] || 0) + 1;
        }

        console.log('PyramidTier: Updated stats:', stats);
        transaction.set(statsRef, stats);
      });
    } catch (err: any) {
      console.error('PyramidTier: Error in runTransaction:', err.message, err);
      throw err;
    }
  } else {
    console.warn('PyramidTier: runTransaction not available, using setDoc fallback');
    try {
      const statsDoc = await getDoc(statsRef);
      let stats = statsDoc.exists() ? statsDoc.data() : { totalPlayers: 0, itemRanks: {}, worstItemCounts: {} };
      console.log('PyramidTier: Current stats (fallback):', stats);

      stats.totalPlayers = (stats.totalPlayers || 0) + 1;

      pyramid.forEach((row: PyramidSlot[], rowIndex: number) => {
        row.forEach((slot: PyramidSlot) => {
          if (slot.image) {
            const itemId = slot.image.id;
            const rowId = rows[rowIndex]?.id || rowIndex + 1;
            if (!stats.itemRanks[itemId]) {
              stats.itemRanks[itemId] = {};
            }
            stats.itemRanks[itemId][rowId] = (stats.itemRanks[itemId][rowId] || 0) + 1;
          }
        });
      });

      if (worstItem) {
        const itemId = worstItem.id;
        stats.worstItemCounts[itemId] = (stats.worstItemCounts[itemId] || 0) + 1;
      }

      console.log('PyramidTier: Updated stats (fallback):', stats);
      await setDoc(statsRef, stats, { merge: true });
      console.log('PyramidTier: Stats updated successfully with setDoc');
    } catch (err: any) {
      console.error('PyramidTier: Error in setDoc fallback:', err.message, err);
      throw err;
    }
  }
}
</script>

<style scoped>
.pyramid-tier {
  padding: 20px;
}
</style>