<!-- Shows the final pyramid placement when logged in -->
<template>
  <div class="result-screen">
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
          <div v-for="(row, rowIndex) in pyramid" :key="rowIndex" class="pyramid-row">
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
    <table class="table is-striped is-hoverable has-background-dark has-text-white">
      <thead>
        <tr>
          <th class="has-text-white">Rank</th>
          <th class="has-text-white">Image</th>
          <th class="has-text-white">Item</th>
          <th class="has-text-white">Tier 1</th>
          <th class="has-text-white">Tier 2</th>
          <th class="has-text-white">Tier 3</th>
          <th class="has-text-white">Tier 4</th>
          <th class="has-text-white">Score</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in sortedItemStats" :key="item.id" :class="getRowClass(index)">
          <td class="rank-column">
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
            <span v-else>{{ index + 1 }}</span>
          </td>
          <td>
            <img
              v-if="item.imageSrc"
              :src="item.imageSrc"
              :alt="item.name"
              class="item-image"
              crossorigin="anonymous"
            />
          </td>
          <td>{{ item.name }}</td>
          <td>{{ item.ranks[1] || 0 }}</td>
          <td>{{ item.ranks[2] || 0 }}</td>
          <td>{{ item.ranks[3] || 0 }}</td>
          <td>{{ item.ranks[4] || 0 }}</td>
          <td>{{ item.score }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import { useRoute } from 'vue-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useUserStore } from '@/stores/user';
import { ImageItem } from '@top-x/shared/types/pyramid';
import html2canvas from 'html2canvas';

const route = useRoute();
const userStore = useUserStore();
const gameId = route.query.game as string;
const score = ref(Number(route.query.score));
const pyramid = ref<Array<Array<{ image: ImageItem | null }>>>([]);
const itemRanks = ref<Record<string, Record<number, number>>>({});
const items = ref<ImageItem[]>([]);
const gameTitle = ref<string>('');
const pyramidContainer = ref<HTMLElement | null>(null);
const userImage = ref<HTMLImageElement | null>(null);
const pyramidImages = ref<HTMLImageElement[]>([]);
const isImageLoading = ref(true);

// Compute sorted item stats with score and item details
const sortedItemStats = computed(() => {
  const stats = Object.entries(itemRanks.value).map(([itemId, ranks]) => {
    const item = items.value.find(i => i.id === itemId);
    const score =
      (ranks[1] || 0) * 10 + // Tier 1: 10 points
      (ranks[2] || 0) * 5 +  // Tier 2: 5 points
      (ranks[3] || 0) * 3 +  // Tier 3: 3 points
      (ranks[4] || 0) * 1;   // Tier 4: 1 point
    return {
      id: itemId,
      name: item?.label || itemId,
      imageSrc: item?.src || '',
      ranks,
      score,
    };
  });
  return stats.sort((a, b) => b.score - a.score); // Sort by score descending
});

onMounted(async () => {
  console.log('PyramidResultLoggedIn: onMounted called with gameId:', gameId);
  try {
    // Fetch game data (items and title)
    const gameDocRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameDocRef);
    if (gameDoc.exists()) {
      const gameData = gameDoc.data();
      items.value = gameData.custom?.items || [];
      gameTitle.value = gameData.name || 'Untitled Game';
      console.log('PyramidResultLoggedIn: Game data fetched:', { items: items.value, title: gameTitle.value });
    } else {
      console.error('PyramidResultLoggedIn: Game document not found for ID:', gameId);
    }
  } catch (err: any) {
    console.error('PyramidResultLoggedIn: Error fetching game data:', err.message, err);
  }

  // Reconstruct pyramid
  const userGameData = userStore.profile?.games?.PyramidTier?.[gameId];
  if (userGameData?.custom?.pyramid && items.value.length) {
    pyramid.value = userGameData.custom.pyramid.map((tier: { tier: number; slots: Array<string | null> }) =>
      tier.slots.map((itemId: string | null) => ({
        image: itemId ? items.value.find(i => i.id === itemId) || null : null,
      }))
    );
    console.log('PyramidResultLoggedIn: Pyramid reconstructed:', pyramid.value);
  } else {
    console.warn('PyramidResultLoggedIn: No pyramid data or items available', {
      userGameData: userGameData?.custom?.pyramid,
      items: items.value,
    });
  }

  // Fetch game stats
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

  // Preload images
  await nextTick(); // Wait for DOM update
  await preloadImages();
});

async function preloadImages() {
  const imagePromises: Promise<void>[] = [];
  const uniqueImageUrls = new Set<string>();
  const timeoutMs = 5000; // 5 seconds timeout per image

  // Helper to wrap image loading with timeout
  const loadImageWithTimeout = (img: HTMLImageElement): Promise<void> =>
    Promise.race([
      new Promise<void>((resolve) => {
        img.onload = () => {
          console.log('PyramidResultLoggedIn: Image loaded:', img.src);
          resolve();
        };
        img.onerror = () => {
          console.warn('PyramidResultLoggedIn: Image failed to load:', img.src);
          resolve(); // Continue even if image fails
        };
        // Trigger load if src is already set
        if (img.complete && img.naturalWidth !== 0) {
          console.log('PyramidResultLoggedIn: Image already loaded:', img.src);
          resolve();
        }
      }),
      new Promise<void>((resolve) => {
        setTimeout(() => {
          console.warn('PyramidResultLoggedIn: Image load timed out:', img.src);
          resolve(); // Continue after timeout
        }, timeoutMs);
      }),
    ]);

  // Add user profile image
  if (userImage.value?.src) {
    uniqueImageUrls.add(userImage.value.src);
    userImage.value.crossOrigin = 'anonymous'; // Enable CORS
    imagePromises.push(loadImageWithTimeout(userImage.value));
  }

  // Add pyramid images
  pyramidImages.value.forEach((img) => {
    if (img.src && !uniqueImageUrls.has(img.src)) {
      uniqueImageUrls.add(img.src);
      imagePromises.push(loadImageWithTimeout(img));
    }
  });

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
    isImageLoading.value = false; // Enable buttons even on error
  }
}

function toRoman(num: number): string {
  const numerals = ['I', 'II', 'III', 'IV'];
  return numerals[num - 1] || `${num}`;
}

// Dynamic row class for colorful table
function getRowClass(index: number): string {
  const colors = [
    'has-background-primary-light', // Light blue
    'has-background-success-light', // Light green
    'has-background-warning-light', // Light yellow
    'has-background-info-light', // Light cyan
    'has-background-danger-light', // Light red
  ];
  return colors[index % colors.length] || '';
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
      backgroundColor: '#1a1b1e', // Match dark theme
      scale: 2, // Higher resolution
      useCORS: true, // Handle external images
      logging: true, // Debug html2canvas
      allowTaint: false, // Prevent tainted canvas errors
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
  padding: 20px;
}
.pyramid-container {
  position: relative;
  border-radius: 8px;
  max-width: 90vw; /* Responsive width */
  margin: 0 auto;
}
.user-image-container {
  position: absolute;
  top: 10px;
  left: 10px;
}
.user-image {
  width: 40px; /* Smaller for mobile */
  height: 40px;
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
.pyramid-row {
  display: flex;
  justify-content: center;
  width: 100%;
}
.pyramid-slot {
  width: 18vw; /* Scale with viewport */
  height: 18vw;
  max-width: 80px; /* Cap for larger screens */
  max-height: 80px;
  min-width: 50px; /* Minimum for small screens */
  min-height: 50px;
  margin: 3px;
  background-color: #2c2d30;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.draggable-image {
  max-width: 90%;
  max-height: 90%;
  object-fit: cover;
}
.tier-label {
  font-size: 1.2rem; /* Smaller for mobile */
  font-weight: bold;
}
.top-x-label {
  font-size: 1rem; /* Adjusted for mobile */
  font-weight: bold;
}
.table {
  width: 100%;
  max-width: 90vw;
  margin: 0 auto;
}
.item-image {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}
.rank-column {
  display: flex;
  align-items: center;
  gap: 8px;
}
.medal {
  font-size: 1.2rem;
}
.medal.gold {
  color: #ffd700; /* Gold */
}
.medal.silver {
  color: #c0c0c0; /* Silver */
}
.medal.bronze {
  color: #cd7f32; /* Bronze */
}

/* Mobile-specific adjustments */
@media screen and (max-width: 767px) {
  .pyramid-container {
    padding: 10px;
  }
  .user-image {
    width: 30px;
    height: 30px;
  }
  .pyramid-slot {
    width: 20vw;
    height: 20vw;
    min-width: 40px;
    min-height: 40px;
    margin: 2px;
  }
  .tier-label {
    font-size: 1rem;
  }
  .top-x-label {
    font-size: 0.9rem;
  }
  .title {
    font-size: 1.5rem;
  }
  .subtitle {
    font-size: 1.2rem;
  }
  .item-image {
    width: 30px;
    height: 30px;
  }
  .medal {
    font-size: 1rem;
  }
}
</style>