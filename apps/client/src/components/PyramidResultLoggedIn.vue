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
        <p class="has-text-white has-text-centered mb-4">You placed {{ score }} items in the pyramid.</p>
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
    <!-- Share Buttons -->
    <div class="buttons is-centered mt-4">
      <CustomButton
        type="is-primary"
        label="Download Image"
        :disabled="isImageLoading"
        @click="downloadPyramid"
      />
      <CustomButton
        type="is-info"
        label="Copy Screenshot"
        :disabled="isImageLoading"
        @click="copyScreenshot"
      />
      <span v-if="isImageLoading" class="has-text-white ml-2">Loading images...</span>
    </div>
    <!-- Stats Table -->
    <h3 class="subtitle has-text-white mt-6">Total Stats</h3>
    <table class="table is-striped has-background-dark has-text-white">
      <thead>
        <tr>
          <th class="has-text-white">Item ID</th>
          <th class="has-text-white">Tier 1</th>
          <th class="has-text-white">Tier 2</th>
          <th class="has-text-white">Tier 3</th>
          <th class="has-text-white">Tier 4</th>
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
import { ref, onMounted, nextTick } from 'vue';
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

async function copyScreenshot() {
  if (!pyramidContainer.value) {
    console.error('PyramidResultLoggedIn: Pyramid container not found');
    alert('Failed to copy screenshot. Please try again.');
    return;
  }
  try {
    console.log('PyramidResultLoggedIn: Generating screenshot for clipboard');
    const canvas = await html2canvas(pyramidContainer.value, {
      backgroundColor: '#1a1b1e', // Match dark theme
      scale: 2, // Higher resolution
      useCORS: true, // Handle external images
      logging: true, // Debug html2canvas
      allowTaint: false, // Prevent tainted canvas errors
    });
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png')
    );
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    console.log('PyramidResultLoggedIn: Screenshot copied to clipboard');
    alert('Pyramid screenshot copied to clipboard!');
  } catch (err: any) {
    console.error('PyramidResultLoggedIn: Error copying screenshot:', err.message, err);
    alert('Failed to copy screenshot. Some images may not be accessible due to CORS restrictions.');
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
  max-width: 600px;
  margin: 0 auto;
}
.user-image-container {
  position: absolute;
  top: 10px;
  left: 10px;
}
.user-image {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid #fff;
  object-fit: cover;
}
.pyramid {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pyramid-row {
  display: flex;
  justify-content: center;
}
.pyramid-slot {
  width: 100px;
  height: 100px;
  margin: 5px;
  background-color: #2c2d30;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.draggable-image {
  max-width: 80px;
  max-height: 80px;
  object-fit: cover;
}
.tier-label {
  font-size: 1.5rem;
  font-weight: bold;
}
.top-x-label {
  font-size: 1.2rem;
  font-weight: bold;
}
.table {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}
</style>