 <template>
   <div class="pyramid-tier">
     <h1>{{ gameDescription }}</h1>
     <PyramidEdit
       v-if="!hasSubmitted"
       :items="items"
       :rows="rows"
       :sort-items="sortItems"
       :hide-row-label="hideRowLabel"
       :game-header="gameHeader"
       :pool-header="poolHeader"
       :worst-header="worstHeader"
       :share-text="shareText"
       :worst-points="worstPoints"
       @submit="handleSubmit"
     />
    <PyramidNav
      v-else
      :game-id="gameId"
      :pyramid="pyramid"
      :worst-item="worstItem"
      :items="items"
      :rows="rows"
      :game-header="gameHeader"
      :worst-header="worstHeader"
      :game-title="gameDescription"
      :hide-row-label="hideRowLabel"
    />
   </div>
 </template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '@top-x/shared';
import PyramidEdit from '@/components/PyramidEdit.vue';
import PyramidNav from '@/components/PyramidNav.vue';
import { useUserStore } from '@/stores/user';
import { PyramidItem, PyramidRow, PyramidSlot, PyramidData, SortOption } from '@top-x/shared/types/pyramid';

 const gameTitle = ref(''); // Add gameTitle ref for consistency

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const gameId = ref(route.query.game as string);
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
const hasSubmitted = ref(false);
const pyramid = ref<PyramidSlot[][]>([]);
const worstItem = ref<PyramidItem | null>(null);

onMounted(async () => {
  console.log('PyramidTier: onMounted called with gameId:', gameId.value);
  if (!gameId.value) {
    console.error('PyramidTier: No gameId provided');
    return;
  }

  try {
    const gameDocRef = doc(db, 'games', gameId.value);
    const gameDoc = await getDoc(gameDocRef);

    if (gameDoc.exists()) {
      const gameData = gameDoc.data();
    gameDescription.value = gameData.description || '';
    gameTitle.value = gameData.description || ''; // Set gameTitle
     gameHeader.value = gameData.gameHeader || 'Your Pyramid';
     poolHeader.value = gameData.custom?.poolHeader || 'Item Pool';
     worstHeader.value = gameData.custom?.worstHeader || 'Worst Item';
     shareText.value = gameData.custom?.shareText || '';
     items.value = gameData.custom?.items || [];
     rows.value = gameData.custom?.rows || [];
     sortItems.value = gameData.custom?.sortItems || { orderBy: 'id', order: 'asc' };
     hideRowLabel.value = gameData.custom?.HideRowLabel ?? false;
     worstPoints.value = gameData.custom?.worstPoints ?? 0;
 
     console.log('PyramidTier: Game data fetched:', {
       gameDescription: gameDescription.value,
      gameTitle: gameTitle.value,
       gameHeader: gameHeader.value,
       poolHeader: poolHeader.value,
       worstHeader: worstHeader.value,
       shareText: shareText.value,
       items: items.value,
       rows: rows.value,
       sortItems: sortItems.value,
       hideRowLabel: hideRowLabel.value,
       worstPoints: worstPoints.value
     });
    } else {
      console.error('PyramidTier: Game document not found for ID:', gameId.value);
    }
  } catch (error: any) {
    console.error('PyramidTier: Error fetching game data:', error.message, error);
  }
});

async function handleSubmit(data: PyramidData) {
  console.log('PyramidTier: handleSubmit called with data:', data);
  pyramid.value = data.pyramid;
  worstItem.value = data.worstItem;

  if (!gameId.value) {
    console.error('PyramidTier: No gameId provided, cannot submit');
    alert('Error: No game ID provided. Please select a game.');
    router.push('/games');
    return;
  }

  const score = calculateScore(data.pyramid, data.worstItem);

  if (!userStore.user) {
    console.log('PyramidTier: User not logged in, storing vote in localStorage');
    const sessionId = crypto.randomUUID();
    localStorage.setItem(`vote_${gameId.value}_${sessionId}`, JSON.stringify({
      pyramid: data.pyramid,
      worstItem: data.worstItem,
      score,
      createdAt: new Date().toISOString()
    }));
    hasSubmitted.value = true;
    return;
  }

  const userId = userStore.user.uid;
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
    await userStore.updateGameProgress(gameTypeId, gameId.value, score, 0, custom);
    console.log('PyramidTier: User progress updated successfully');
    await updateGameStats(gameId.value, data.pyramid, rows.value, data.worstItem);
    console.log('PyramidTier: Game stats updated successfully');
    hasSubmitted.value = true;
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

      console.log('PyramidTier: Updated stats:', stats);
      transaction.set(statsRef, stats);
    });
  } catch (err: any) {
    console.error('PyramidTier: Error in runTransaction:', err.message, err);
    throw err;
  }
}
</script>

<style scoped>
.pyramid-tier {
  padding: 20px;
}
</style>