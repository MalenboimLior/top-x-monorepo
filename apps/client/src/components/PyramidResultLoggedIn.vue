<template>
  <div class="result-screen">
    <h2 class="title has-text-white">Your Pyramid</h2>
    <Card>
      <p class="has-text-white">You placed {{ score }} items in the pyramid.</p>
      <div class="pyramid">
        <div v-for="(row, rowIndex) in pyramid" :key="rowIndex" class="pyramid-row">
          <div v-for="(slot, colIndex) in row" :key="colIndex" class="pyramid-slot">
            <img v-if="slot.image" :src="slot.image.src" class="draggable-image" />
            <div v-else class="tier-label">{{ toRoman(rowIndex + 1) }}</div>
          </div>
        </div>
      </div>
      <CustomButton type="is-primary" label="Share Your Pyramid" @click="sharePyramid" />
    </Card>
    <h3 class="subtitle mt-6">Total Stats</h3>
    <table class="table is-striped">
      <thead>
        <tr>
          <th>Item ID</th>
          <th>Tier 1</th>
          <th>Tier 2</th>
          <th>Tier 3</th>
          <th>Tier 4</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(ranks, itemId) in itemRanks" :key="itemId">
          <td>{{ itemId }}</td>
          <td>{{ ranks[1] }}</td>
          <td>{{ ranks[2] }}</td>
          <td>{{ ranks[3] }}</td>
          <td>{{ ranks[4] }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useUserStore } from '@/stores/user';
import { ImageItem } from '@top-x/shared/types/pyramid';

const props = defineProps<{
  items: ImageItem[];
}>();
const items = props.items;

const route = useRoute();
const userStore = useUserStore();
const gameId = route.query.game as string;
const score = ref(Number(route.query.score));
const pyramid = ref<Array<Array<{ image: ImageItem | null }>>>([]);
const itemRanks = ref<Record<string, Record<number, number>>>({});

onMounted(async () => {
  console.log('PyramidResultLoggedIn: Fetching user game data for gameId:', gameId);
  const userGameData = userStore.profile?.games?.PyramidTier?.[gameId];
  if (userGameData?.custom?.pyramid) {
    pyramid.value = userGameData.custom.pyramid.map((tier: { tier: number; slots: Array<string | null> }) =>
      tier.slots.map((itemId: string | null) => ({
        image: itemId ? items.find(i => i.id === itemId) : null,
      }))
    );
    console.log('PyramidResultLoggedIn: Pyramid reconstructed:', pyramid.value);
  } else {
    console.warn('PyramidResultLoggedIn: No pyramid data found in user profile');
  }

  try {
    const statsDoc = await getDoc(doc(db, 'games', gameId, 'stats', 'general'));
    if (statsDoc.exists()) {
      itemRanks.value = statsDoc.data().itemRanks || {};
      console.log('PyramidResultLoggedIn: Stats fetched:', itemRanks.value);
    } else {
      console.warn('PyramidResultLoggedIn: No stats found for gameId:', gameId);
    }
  } catch (err: any) {
    console.error('PyramidResultLoggedIn: Error fetching stats:', err.message, err);
  }
});

function toRoman(num: number): string {
  const numerals = ['I', 'II', 'III', 'IV'];
  return numerals[num - 1] || `${num}`;
}

function sharePyramid() {
  console.log('PyramidResultLoggedIn: Share pyramid triggered');
  alert('Share functionality to be implemented');
}
</script>

<style scoped>
.result-screen {
  padding: 20px;
}
.pyramid-slot {
  width: 100px;
  height: 100px;
  margin: 5px;
}
.draggable-image {
  max-width: 80px;
  max-height: 80px;
}
</style>