<template>
  <div class="pyramid-tier">
    <h1>{{ gameDescription }}</h1>
    <PyramidTable :items="items" @submit="handleSubmit" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import PyramidTable from '@/components/PyramidTable.vue';
import { useUserStore } from '@/stores/user';
import { PyramidSlot, ImageItem } from '@top-x/shared/types/pyramid';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const gameId = route.query.game as string;
const gameDescription = ref('');
const items = ref<ImageItem[]>([]);

onMounted(async () => {
  console.log('PyramidTier: onMounted called with gameId:', gameId);
  if (!gameId) {
    console.error('PyramidTier: No gameId provided in query');
    return;
  }

  try {
    const gameDocRef = doc(db, 'games', gameId);
    console.log('PyramidTier: Fetching game document:', gameDocRef.path);
    const gameDoc = await getDoc(gameDocRef);
    
    if (gameDoc.exists()) {
      const gameData = gameDoc.data();
      console.log('PyramidTier: Game data fetched:', gameData);
      
      gameDescription.value = gameData.description || '';
      items.value = gameData.custom?.items || [];
      console.log('PyramidTier: Items assigned:', items.value);
    } else {
      console.error('PyramidTier: Game document not found for ID:', gameId);
    }
  } catch (err: any) {
    console.error('PyramidTier: Error fetching game data:', err.message, err);
  }
});

const handleSubmit = async (pyramid: PyramidSlot[][]) => {
  console.log('PyramidTier: handleSubmit called with pyramid:', pyramid);
  
  if (!userStore.user) {
    console.log('PyramidTier: User not logged in, redirecting to logged out result');
    router.push({ name: 'PyramidResultLoggedOut', query: { game: gameId } });
    return;
  }

  const userId = userStore.user.uid;
  const gameTypeId = 'PyramidTier';
  const score = pyramid.flat().filter(slot => slot.image).length;
  const custom = { pyramid: pyramid.map(row => row.map(slot => slot.image?.id || null)) };
  console.log('PyramidTier: Saving user progress:', { userId, gameTypeId, gameId, score, custom });

  try {
    await userStore.updateGameProgress(gameTypeId, gameId, score, 0, custom);
    console.log('PyramidTier: User progress updated successfully');
    
    await updateGameStats(gameId, pyramid);
    console.log('PyramidTier: Game stats updated successfully');
    
    router.push({ name: 'PyramidResultLoggedIn', query: { game: gameId, score: score.toString() } });
    console.log('PyramidTier: Redirecting to logged in result');
  } catch (err: any) {
    console.error('PyramidTier: Error in handleSubmit:', err.message, err);
  }
};

async function updateGameStats(gameId: string, pyramid: PyramidSlot[][]) {
  console.log('PyramidTier: updateGameStats called for gameId:', gameId);
  const statsRef = doc(db, 'games', gameId, 'stats', 'general');
  
  // @ts-ignore
  await db.runTransaction(async (transaction: any) => {
    try {
      const statsDoc = await transaction.get(statsRef);
      let stats = statsDoc.exists() ? statsDoc.data() : { totalPlayers: 0, itemRanks: {} };
      console.log('PyramidTier: Current stats:', stats);

      stats.totalPlayers = (stats.totalPlayers || 0) + 1;

      pyramid.forEach((row: PyramidSlot[], rowIndex: number) => {
        row.forEach((slot: PyramidSlot) => {
          if (slot.image) {
            const itemId = slot.image.id;
            if (!stats.itemRanks[itemId]) {
              stats.itemRanks[itemId] = { 1: 0, 2: 0, 3: 0, 4: 0 };
            }
            stats.itemRanks[itemId][rowIndex + 1] += 1;
          }
        });
      });
      console.log('PyramidTier: Updated stats:', stats);

      transaction.set(statsRef, stats);
    } catch (err: any) {
      console.error('PyramidTier: Error in updateGameStats transaction:', err.message, err);
      throw err;
    }
  });
}
</script>

<style scoped>
.pyramid-tier {
  padding: 20px;
}
</style>