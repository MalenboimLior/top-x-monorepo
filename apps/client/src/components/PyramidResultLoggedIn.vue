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

const props = defineProps<{ items: Array<{ id: string; image?: { src: string } }> }>();

const route = useRoute();
const userStore = useUserStore();
const gameId = route.query.game as string;
const score = ref(Number(route.query.score));
type PyramidSlot = { image: { src: string } | null };
const pyramid = ref<PyramidSlot[][]>([]);
const itemRanks = ref({});

onMounted(async () => {
  const userGameData = userStore.profile?.games?.PyramidTier?.[gameId];
  if (userGameData?.custom?.pyramid) {
    pyramid.value = userGameData.custom.pyramid.map((row: any[]) =>
      row.map((itemId: string | null) => ({
        image: itemId ? props.items.find(i => i.id === itemId) : null,
      }))
    );
  }

  const statsDoc = await getDoc(doc(db, 'games', gameId, 'stats', 'general'));
  if (statsDoc.exists()) {
    itemRanks.value = statsDoc.data().itemRanks || {};
  }
});

function toRoman(num: number): string {
  const numerals = ['I', 'II', 'III', 'IV'];
  return numerals[num - 1] || `${num}`;
}

function sharePyramid() {
  // Implement share functionality, e.g., copy URL or social media share
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