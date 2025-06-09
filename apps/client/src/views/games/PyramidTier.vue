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
import { PyramidSlot } from '@top-x/shared/types/pyramid';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const gameId = route.query.game as string;
const gameDescription = ref('');
const items = ref([]);

onMounted(async () => {
  if (gameId) {
    const gameDoc = await getDoc(doc(db, 'games', gameId));
    if (gameDoc.exists()) {
      const gameData = gameDoc.data();
      gameDescription.value = gameData.description;
      items.value = gameData.custom?.items || [];
    }
  }
});

const handleSubmit = async (pyramid: PyramidSlot[][]) => {
  if (!userStore.user) {
    router.push({ name: 'PyramidResultLoggedOut', query: { game: gameId } });
    return;
  }

  const userId = userStore.user.uid;
  const gameTypeId = 'PyramidTier';
  const score = pyramid.flat().filter(slot => slot.image).length;
  const custom = { pyramid: pyramid.map(row => row.map(slot => slot.image?.id || null)) };

  await userStore.updateGameProgress(gameTypeId, gameId, score, 0, custom);

  await updateGameStats(gameId, pyramid);

  router.push({ name: 'PyramidResultLoggedIn', query: { game: gameId, score: score.toString() } });
};

async function updateGameStats(gameId: string, pyramid: PyramidSlot[][]) {
  const statsRef = doc(db, 'games', gameId, 'stats', 'general');
  // @ts-ignore
  await db.runTransaction(async (transaction: any) => {
    const statsDoc = await transaction.get(statsRef);
    let stats = statsDoc.exists() ? statsDoc.data() : { totalPlayers: 0, itemRanks: {} };

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

    transaction.set(statsRef, stats);
  });
}
</script>

<style scoped>
.pyramid-tier {
  padding: 20px;
}
</style>