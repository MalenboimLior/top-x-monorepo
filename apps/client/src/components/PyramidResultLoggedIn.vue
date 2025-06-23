<template>
  <div class="result-screen">
    <div v-if="!gameId" class="notification is-danger">
      <p>Error: No game ID provided. Please return to the game selection.</p>
      <router-link to="/games" class="button is-light mt-2">Back to Games</router-link>
    </div>
    <div v-else-if="!pyramid.length && !worstItem" class="notification is-warning">
      <p>Error: No pyramid data available for this game. Please try playing again.</p>
      <router-link to="/games" class="button is-light mt-2">Back to Games</router-link>
    </div>
    <div v-else>
      <div ref="pyramidContainer" class="pyramid-container has-background-dark p-4">
        <!-- User Image -->
        <div class="user-image-container">
          <img
            v-if="userStore.profile?.photoURL"
            :src="userStore.profile.photoURL"
            alt="User Profile"
            class="user-image"
            ref="userImage"
          />
          <img
            v-else
            src="@/assets/profile.png"
            alt="Default Profile"
            class="user-image"
            ref="userImage"
          />
        </div>
        <!-- Game Title -->
        <h2 class="title has-text-white has-text-centered">{{ gameTitle || 'Your Pyramid' }}</h2>
        <!-- Pyramid -->
        <Card>
          <div class="pyramid mx-auto">
            <div v-for="(row, rowIndex) in pyramid" :key="rowIndex" class="pyramid-row-container">
              <div class="row-label has-text-white">
                {{ rows[rowIndex]?.label || toRoman(rowIndex + 1) }}
              </div>
              <div class="pyramid-row">
                <div v-for="(slot, colIndex) in row" :key="colIndex" class="pyramid-slot">
                  <img
                    v-if="slot.image"
                    :src="slot.image.src"
                    :alt="slot.image.label"
                    class="draggable-image"
                    ref="pyramidImages"
                    crossorigin="anonymous"
                  />
                  <div v-else class="tier-label has-text-white">{{ toRoman(rowIndex + 1) }}</div>
                </div>
              </div>
            </div>
          </div>
          <!-- Worst Item -->
          <div v-if="worstItem" class="worst-item mt-4">
            <h3 class="subtitle has-text-white has-text-centered">Worst Item</h3>
            <div class="pyramid-slot worst-slot mx-auto">
              <img
                v-if="worstItem"
                :src="worstItem.src"
                :alt="worstItem.label"
                class="draggable-image"
                ref="worstImage"
                crossorigin="anonymous"
              />
              <div class="image-label has-text-white">Worst</div>
            </div>
          </div>
          <!-- Top-X Label -->
          <p class="top-x-label has-text-white has-text-centered mt-4">top-x.co</p>
        </Card>
      </div>
      <!-- Share Button -->
      <div class="buttons is-centered mt-4">
        <CustomButton
          type="is-primary"
          label="Download Pyramid"
          :icon="['fas', 'download']"
          :disabled="isImageLoading"
          @click="downloadPyramid"
        />
        <span v-if="isImageLoading" class="has-text-white ml-2">Loading images...</span>
      </div>
      <!-- Stats Table -->
      <h3 class="subtitle has-text-white mt-6">Total Stats</h3>
      <div class="table-container">
        <table class="table is-striped is-hoverable has-background-dark has-text-white">
          <thead>
            <tr>
              <th class="has-text-centered">
                <a href="#" class="has-text-white" @click.prevent="sortBy('rank')">
                  Rank
                  <font-awesome-icon
                    v-if="sortColumn === 'rank'"
                    :icon="['fas', sortDirection === 'asc' ? 'sort-up' : 'sort-down']"
                  />
                </a>
              </th>
              <th class="has-text-centered">
                <a href="#" class="has-text-white" @click.prevent="sortBy('name')">
                  Item
                  <font-awesome-icon
                    v-if="sortColumn === 'name'"
                    :icon="['fas', sortDirection === 'asc' ? 'sort-up' : 'sort-down']"
                  />
                </a>
              </th>
              <th v-for="row in rows" :key="row.id" class="has-text-centered">
                <a href="#" class="has-text-white" @click.prevent="sortBy(`tier-${row.id}`)">
                  {{ row.label }}
                  <font-awesome-icon
                    v-if="sortColumn === `tier-${row.id}`"
                    :icon="['fas', sortDirection === 'asc' ? 'sort-up' : 'sort-down']"
                  />
                </a>
              </th>
              <th class="has-text-centered">
                <a href="#" class="has-text-white" @click.prevent="sortBy('score')">
                  Score
                  <font-awesome-icon
                    v-if="sortColumn === 'score'"
                    :icon="['fas', sortDirection === 'asc' ? 'sort-up' : 'sort-down']"
                  />
                </a>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in sortedItemStats" :key="item.id" :class="getRowClass(index)">
              <td class="rank-column has-text-centered">
                <span>{{ index + 1 }}</span>
                <font-awesome-icon
                  v-if="index === 0"
                  :icon="['fas', 'medal']"
                  class="medal gold"
                  title="1st Place"
                />
                <font-awesome-icon
                  v-else-if="index === 1"
                  :icon="['fas', 'medal']"
                  class="medal silver"
                  title="2nd Place"
                />
                <font-awesome-icon
                  v-else-if="index === 2"
                  :icon="['fas', 'medal']"
                  class="medal bronze"
                  title="3rd Place"
                />
              </td>
              <td class="has-text-centered">
                <img
                  v-if="item.imageSrc"
                  :src="item.imageSrc"
                  :alt="item.name"
                  class="item-image"
                  crossorigin="anonymous"
                />
                <span>{{ item.name }}</span>
              </td>
              <td v-for="row in rows" :key="row.id" class="has-text-centered">{{ item.ranks[row.id] || 0 }}</td>
              <td class="has-text-centered">{{ item.score }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useUserStore } from '@/stores/user';
import { PyramidItem, PyramidRow, PyramidSlot } from '@top-x/shared/types/pyramid';
import html2canvas from 'html2canvas';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const gameId = ref<string | undefined>(route.query.game as string);
const score = ref(Number(route.query.score));
const pyramid = ref<PyramidSlot[][]>([]);
const worstItem = ref<PyramidItem | null>(null);
const itemRanks = ref<Record<string, Record<number, number>>>({});
const items = ref<PyramidItem[]>([]);
const rows = ref<PyramidRow[]>([]);
const gameTitle = ref<string>('');
const pyramidContainer = ref<HTMLElement | null>(null);
const userImage = ref<HTMLImageElement | null>(null);
const pyramidImages = ref<HTMLImageElement[]>([]);
const worstImage = ref<HTMLImageElement | null>(null);
const isImageLoading = ref(true);
const sortColumn = ref<string>('score');
const sortDirection = ref<'asc' | 'desc'>('desc');

// Compute sorted item stats with score and item details
const sortedItemStats = computed(() => {
  const stats = Object.entries(itemRanks.value).map(([itemId, ranks]) => {
    const item = items.value.find(i => i.id === itemId);
    const score = rows.value.reduce((total, row) => {
      return total + (ranks[row.id] || 0) * row.points;
    }, 0);
    return {
      id: itemId,
      name: item?.label || itemId,
      imageSrc: item?.src || '',
      ranks,
      score,
    };
  });
  return stats.sort((a, b) => {
    if (sortColumn.value === 'rank') {
      return sortDirection.value === 'asc' ? a.score - b.score : b.score - a.score;
    } else if (sortColumn.value === 'name') {
      return sortDirection.value === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else if (sortColumn.value.startsWith('tier-')) {
      const tierId = Number(sortColumn.value.split('-')[1]);
      const aRank = a.ranks[tierId] || 0;
      const bRank = b.ranks[tierId] || 0;
      return sortDirection.value === 'asc' ? aRank - bRank : bRank - aRank;
    } else {
      return sortDirection.value === 'asc' ? a.score - b.score : b.score - a.score;
    }
  });
});

onMounted(async () => {
  console.log('PyramidResultLoggedIn: onMounted called with gameId:', gameId.value);
  if (!gameId.value) {
    console.error('PyramidResultLoggedIn: No gameId provided, skipping data fetch');
    return;
  }

  try {
    // Fetch game data (items, rows, title)
    const gameDocRef = doc(db, 'games', gameId.value);
    const gameDoc = await getDoc(gameDocRef);
    if (gameDoc.exists()) {
      const gameData = gameDoc.data();
      items.value = gameData.custom?.items || [];
      rows.value = gameData.custom?.rows || [
        { id: 1, label: 'Tier 1', points: 10 },
        { id: 2, label: 'Tier 2', points: 5 },
        { id: 3, label: 'Tier 3', points: 3 },
        { id: 4, label: 'Tier 4', points: 1 },
      ];
      gameTitle.value = gameData.name || 'Untitled Game';
      console.log('PyramidResultLoggedIn: Game data fetched:', {
        items: items.value,
        rows: rows.value,
        title: gameTitle.value,
      });
    } else {
      console.error('PyramidResultLoggedIn: Game document not found for ID:', gameId.value);
    }
  } catch (err: any) {
    console.error('PyramidResultLoggedIn: Error fetching game data:', err.message, err);
  }

  // Reconstruct pyramid and worst item
  const userGameData = userStore.profile?.games?.PyramidTier?.[gameId.value];
  if (userGameData && userGameData.custom && items.value.length) {
    try {
      // Handle both direct array and nested pyramid structure
      const pyramidData = userGameData.custom.pyramid?.pyramid ?? userGameData.custom.pyramid;
      if (Array.isArray(pyramidData)) {
        pyramid.value = pyramidData.map((tier: { tier: number; slots: Array<string | null> }) =>
          tier.slots.map((itemId: string | null) => ({
            image: itemId ? items.value.find((i) => i.id === itemId) || null : null,
          })),
        );
        worstItem.value = userGameData.custom && userGameData.custom.worstItem
          ? items.value.find((i) => i.id === userGameData.custom!.worstItem.id) || null
          : null;
        console.log('PyramidResultLoggedIn: Pyramid and worst item reconstructed:', {
          pyramid: pyramid.value,
          worstItem: worstItem.value,
        });
      } else {
        console.warn('PyramidResultLoggedIn: userGameData.custom.pyramid is not an array:', pyramidData);
      }
    } catch (err: any) {
      console.error('PyramidResultLoggedIn: Error reconstructing pyramid:', err.message, err);
    }
  } else {
    console.warn('PyramidResultLoggedIn: No pyramid data or items available:', {
      userGameData: userGameData?.custom,
      items: items.value,
    });
  }

  // Fetch game stats
  try {
    const statsDoc = await getDoc(doc(db, 'games', gameId.value, 'stats', 'general'));
    if (statsDoc.exists()) {
      itemRanks.value = statsDoc.data().itemRanks || {};
      console.log('PyramidResultLoggedIn: Stats fetched:', itemRanks.value);
    } else {
      console.warn('PyramidResultLoggedIn: No stats found for gameId:', gameId.value);
    }
  } catch (err: any) {
    console.error('PyramidResultLoggedIn: Error fetching stats:', err.message, err);
  }

  // Preload images
  await nextTick();
  await preloadImages();
});

async function preloadImages() {
  const imagePromises: Promise<void>[] = [];
  const uniqueImageUrls = new Set<string>();
  const timeoutMs = 5000;

  const loadImageWithTimeout = (img: HTMLImageElement): Promise<void> =>
    Promise.race([
      new Promise<void>((resolve) => {
        img.onload = () => {
          console.log('PyramidResultLoggedIn: Image loaded:', img.src);
          resolve();
        };
        img.onerror = () => {
          console.warn('PyramidResultLoggedIn: Image failed to load:', img.src);
          resolve();
        };
        if (img.complete && img.naturalWidth !== 0) {
          console.log('PyramidResultLoggedIn: Image already loaded:', img.src);
          resolve();
        }
      }),
      new Promise<void>((resolve) => {
        setTimeout(() => {
          console.warn('PyramidResultLoggedIn: Image load timed out:', img.src);
          resolve();
        }, timeoutMs);
      }),
    ]);

  // Add user profile image
  if (userImage.value?.src) {
    uniqueImageUrls.add(userImage.value.src);
    userImage.value.crossOrigin = 'anonymous';
    imagePromises.push(loadImageWithTimeout(userImage.value));
  }

  // Add pyramid images
  pyramidImages.value.forEach((img) => {
    if (img.src && !uniqueImageUrls.has(img.src)) {
      uniqueImageUrls.add(img.src);
      imagePromises.push(loadImageWithTimeout(img));
    }
  });

  // Add worst item image
  if (worstImage.value?.src && !uniqueImageUrls.has(worstImage.value.src)) {
    uniqueImageUrls.add(worstImage.value.src);
    imagePromises.push(loadImageWithTimeout(worstImage.value));
  }

  console.log('PyramidResultLoggedIn: Preloading images:', uniqueImageUrls);
  try {
    if (imagePromises.length === 0) {
      console.log('PyramidResultLoggedIn: No images to preload');
      isImageLoading.value = false;
      return;
    }
    await Promise.all(imagePromises);
    console.log('PyramidResultLoggedIn: All images processed');
    isImageLoading.value = false;
  } catch (err: any) {
    console.error('PyramidResultLoggedIn: Error preloading images:', err.message, err);
    isImageLoading.value = false;
  }
}

function toRoman(num: number): string {
  const numerals = ['I', 'II', 'III', 'IV'];
  return numerals[num - 1] || `${num}`;
}

function getRowClass(index: number): string {
  const colors = [
    'has-background-primary-light',
    'has-background-success-light',
    'has-background-warning-light',
    'has-background-info-light',
    'has-background-danger-light',
  ];
  return colors[index % colors.length] || '';
}

function sortBy(column: string) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = column;
    sortDirection.value = 'desc';
  }
}

async function downloadPyramid() {
  if (!pyramidContainer.value) {
    console.error('PyramidResultLoggedIn: Pyramid container not found');
    alert('Failed to download image. Please try again.');
    return;
  }
  try {
    console.log('PyramidResultLoggedIn: Generating download image');
    const canvas = await html2canvas(pyramidContainer.value, {
      backgroundColor: '#1a1b1e',
      scale: 2,
      useCORS: true,
      logging: true,
      allowTaint: false,
    });
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${gameTitle.value.toLowerCase().replace(/\s+/g, '-')}-pyramid.png`;
    link.click();
    console.log('PyramidResultLoggedIn: Image downloaded');
  } catch (err: any) {
    console.error('PyramidResultLoggedIn: Error generating download image:', err.message, err);
    alert('Failed to download image. Some images may not be accessible due to CORS restrictions.');
  }
}
</script>

<style scoped>
.result-screen {
  padding: 1rem;
}
.pyramid-container {
  position: relative;
  border-radius: 8px;
  max-width: 90vw;
  margin: 0 auto;
}
.user-image-container {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
}
.user-image {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: 2px solid #fff;
  object-fit: cover;
}
.pyramid {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.pyramid-row-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.row-label {
  width: 5rem;
  text-align: right;
  font-weight: bold;
  font-size: 0.9rem;
}
.pyramid-row {
  display: flex;
  justify-content: center;
  width: 100%;
}
.pyramid-slot {
  width: 18vw;
  height: 18vw;
  max-width: 4.5rem;
  max-height: 4.5rem;
  min-width: 2.5rem;
  min-height: 2.5rem;
  margin: 0.15rem;
  background-color: #2c2d30;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.worst-slot {
  background-color: #3d1f1f;
  border: 2px dashed #ff5555;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 4.5rem;
  height: 4.5rem;
}
.draggable-image {
  max-width: 90%;
  max-height: 90%;
  object-fit: cover;
}
.image-label {
  font-size: 0.7rem;
  margin-top: 0.25rem;
  text-align: center;
}
.tier-label {
  font-size: 0.9rem;
  font-weight: bold;
}
.top-x-label {
  font-size: 0.9rem;
  font-weight: bold;
}
.table-container {
  overflow-x: auto;
  max-width: 100%;
}
.table {
  width: 100%;
  min-width: 600px; /* Ensures table is scrollable on mobile */
  max-width: 90vw;
  margin: 0 auto;
}
.item-image {
  width: 2rem;
  height: 2rem;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 0.5rem;
}
.rank-column {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.medal {
  font-size: 0.9rem;
}
.medal.gold {
  color: #ffd700;
}
.medal.silver {
  color: #c0c0c0;
}
.medal.bronze {
  color: #cd7f32;
}

/* Mobile-specific adjustments */
@media screen and (max-width: 767px) {
  .result-screen {
    padding: 0.5rem;
  }
  .pyramid-container {
    padding: 0.5rem;
  }
  .user-image {
    width: 2rem;
    height: 2rem;
  }
  .pyramid-slot {
    width: 20vw;
    height: 20vw;
    max-width: 3.5rem;
    max-height: 3.5rem;
    min-width: 2rem;
    min-height: 2rem;
    margin: 0.1rem;
  }
  .worst-slot {
    width: 3.5rem;
    height: 3.5rem;
  }
  .tier-label {
    font-size: 0.8rem;
  }
  .top-x-label {
    font-size: 0.8rem;
  }
  .title {
    font-size: 1.2rem;
  }
  .subtitle {
    font-size: 1rem;
  }
  .item-image {
    width: 1.5rem;
    height: 1.5rem;
  }
  .medal {
    font-size: 0.8rem;
  }
  .image-label {
    font-size: 0.6rem;
  }
  .row-label {
    width: 4rem;
    font-size: 0.8rem;
  }
  .table {
    font-size: 0.8rem;
  }
  th,
  td {
    padding: 0.25rem;
  }
}
</style>