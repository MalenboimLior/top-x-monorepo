<template>
  <div class="pyramid-view">
    <div ref="canvasContainer" class="pyramid-container  p-2">
      <!-- User Image -->
      <div class="user-image-container">
        <img
          v-if="userProfile?.photoURL"
          :src="userProfile.photoURL"
          alt="User Profile"
          class="user-image"
          ref="userImage"
          crossorigin="anonymous"
        />
        <img
          v-else
          src="@/assets/profile.png"
          alt="Default Profile"
          class="user-image"
          ref="userImage"
          crossorigin="anonymous"
        />
      </div>
      <!-- Game Header -->
      <h2 class="subtitle has-text-white game-header">{{ gameHeader || gameTitle || 'Your Pyramid' }}</h2>
      <!-- Pyramid -->
      <div class="pyramid">
        <div v-for="(row, rowIndex) in pyramid" :key="rowIndex" class="pyramid-row-container">
          <div class="row-label has-text-white" v-if="!hideRowLabel">
            {{ rows[rowIndex]?.label || toRoman(rowIndex + 1) }}
          </div>
          <div class="pyramid-row">
            <div v-for="(slot, colIndex) in row" :key="colIndex" class="pyramid-slot box dark-slot">
              <div v-if="slot.image" class="slot-style">
                <img
                  :src="slot.image.src"
                  :alt="slot.image.label"
                  class="draggable-image"
                  ref="pyramidImages"
                  crossorigin="anonymous"
                />
                <div class="color-indicator-pyramid" :style="{ backgroundColor: slot.image.color || '#fff' }"></div>
              </div>
              <div v-else class="tier-label">{{ toRoman(rowIndex + 1) }}</div>
            </div>
          </div>
        </div>
      </div>
      <!-- Worst Item -->
      <div class="worst-item-container">
        <h3 class="subtitle has-text-centered has-text-white">{{ worstHeader || 'Worst Item' }}</h3>
        <div class="pyramid-slot box worst-slot dark-slot mx-auto">
          <div v-if="worstItem" class="slot-style">
            <img
              :src="worstItem.src"
              :alt="worstItem.label"
              class="draggable-image"
              ref="worstImage"
              crossorigin="anonymous"
            />
            <div class="color-indicator-pyramid" :style="{ backgroundColor: worstItem.color || '#fff' }"></div>
          </div>
          <div v-else class="tier-label has-text-danger">Worst</div>
        </div>
      </div>
      <!-- Top-X Label -->
      <p class="top-x-label has-text-white has-text-centered mt-2">top-x.co</p>
    </div>
    <!-- Download Button -->
    <div class="buttons is-centered mt-2">
      <CustomButton
        type="is-primary"
        label="Download Pyramid"
        :icon="['fas', 'download']"
        :disabled="isImageLoading"
        @click="downloadPyramid"
      />
      <span v-if="isImageLoading" class="has-text-white ml-2">Loading images...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useUserStore } from '@/stores/user';
import { PyramidItem, PyramidRow, PyramidSlot } from '@top-x/shared/types/pyramid';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import html2canvas from 'html2canvas';

const props = defineProps<{
  pyramid: PyramidSlot[][];
  worstItem: PyramidItem | null;
  rows: PyramidRow[];
  gameHeader?: string;
  worstHeader?: string;
  gameTitle?: string;
  hideRowLabel?: boolean;
  userProfile?: { photoURL: string };
}>();

const userStore = useUserStore();
const canvasContainer = ref<HTMLElement | null>(null);
const userImage = ref<HTMLImageElement | null>(null);
const pyramidImages = ref<HTMLImageElement[]>([]);
const worstImage = ref<HTMLImageElement | null>(null);
const isImageLoading = ref(true);
const preprocessedImages = ref<Map<string, string>>(new Map()); // Store preprocessed image data URLs

onMounted(async () => {
  console.log('PyramidView: onMounted called with props:', {
    gameHeader: props.gameHeader,
    worstHeader: props.worstHeader,
    hideRowLabel: props.hideRowLabel,
  });
  await nextTick();
  if (!canvasContainer.value) {
    console.error('PyramidView: canvasContainer ref is null after nextTick');
  }
  await preloadImages();
});

async function preloadImages() {
  const imagePromises: Promise<void>[] = [];
  const uniqueImageUrls = new Set<string>();
  const timeoutMs = 5000;

  const preprocessImage = (img: HTMLImageElement): Promise<void> =>
    new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('PyramidView: Failed to get canvas context for', img.src);
        resolve();
        return;
      }

      img.onload = () => {
        // Resize to square (90x90 to match max slot size)
        const size = 90;
        canvas.width = size;
        canvas.height = size;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        let srcX = 0,
          srcY = 0,
          srcWidth = img.naturalWidth,
          srcHeight = img.naturalHeight;

        // Crop to square if not already
        if (imgAspect > 1) {
          srcWidth = srcHeight;
          srcX = (img.naturalWidth - srcWidth) / 2;
        } else if (imgAspect < 1) {
          srcHeight = srcWidth;
          srcY = (img.naturalHeight - srcHeight) / 2;
        }

        ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/png');
        preprocessedImages.value.set(img.src, dataUrl);
        console.log('PyramidView: Preprocessed image:', img.src, 'Dimensions:', img.naturalWidth, 'x', img.naturalHeight);
        resolve();
      };

      img.onerror = () => {
        console.warn('PyramidView: Image failed to load:', img.src);
        resolve();
      };

      img.onabort = () => {
        console.warn('PyramidView: Image load aborted:', img.src);
        resolve();
      };

      if (img.complete && img.naturalWidth !== 0) {
        img.onload?.(new Event('load')); // Trigger immediately if already loaded
      }
    });

  const profileImage = props.userProfile?.photoURL || userStore.profile?.photoURL || '@/assets/profile.png';
  if (userImage.value?.src && !uniqueImageUrls.has(profileImage)) {
    uniqueImageUrls.add(profileImage);
    userImage.value.crossOrigin = 'anonymous';
    imagePromises.push(
      Promise.race([
        preprocessImage(userImage.value),
        new Promise<void>((resolve) => setTimeout(() => resolve(), timeoutMs)),
      ])
    );
  }

  pyramidImages.value.forEach((img) => {
    if (img.src && !uniqueImageUrls.has(img.src)) {
      uniqueImageUrls.add(img.src);
      imagePromises.push(
        Promise.race([
          preprocessImage(img),
          new Promise<void>((resolve) => setTimeout(() => resolve(), timeoutMs)),
        ])
      );
    }
  });

  if (worstImage.value?.src && !uniqueImageUrls.has(worstImage.value.src)) {
    uniqueImageUrls.add(worstImage.value.src);
    imagePromises.push(
      Promise.race([
        preprocessImage(worstImage.value),
        new Promise<void>((resolve) => setTimeout(() => resolve(), timeoutMs)),
      ])
    );
  }

  console.log('PyramidView: Preloading images:', Array.from(uniqueImageUrls));
  if (imagePromises.length === 0) {
    console.log('PyramidView: No images to preload');
    isImageLoading.value = false;
    return;
  }

  try {
    await Promise.all(imagePromises);
    console.log('PyramidView: All images preprocessed');
    // Update image sources to preprocessed versions
    if (userImage.value && preprocessedImages.value.has(profileImage)) {
      userImage.value.src = preprocessedImages.value.get(profileImage)!;
    }
    pyramidImages.value.forEach((img) => {
      if (preprocessedImages.value.has(img.src)) {
        img.src = preprocessedImages.value.get(img.src)!;
      }
    });
    if (worstImage.value && preprocessedImages.value.has(worstImage.value.src)) {
      worstImage.value.src = preprocessedImages.value.get(worstImage.value.src)!;
    }
    isImageLoading.value = false;
  } catch (err: any) {
    console.error('PyramidView: Error preloading images:', err.message, err);
    isImageLoading.value = false;
  }
}

function toRoman(num: number): string {
  const numerals = ['I', 'II', 'III', 'IV'];
  return numerals[num - 1] || `${num}`;
}

async function downloadPyramid() {
  console.log('PyramidView: downloadPyramid called');
  await nextTick();
  if (!canvasContainer.value) {
    console.error('PyramidView: Canvas container not found');
    alert('Failed to download image. Please try again.');
    return;
  }
  try {
    console.log('PyramidView: Generating canvas with html2canvas');
    const canvas = await html2canvas(canvasContainer.value, {
      backgroundColor: '#121212',
      scale: window.devicePixelRatio || 2, // Use device pixel ratio for crisp rendering
      useCORS: true,
      logging: true,
      allowTaint: false,
      width: canvasContainer.value.offsetWidth,
      height: canvasContainer.value.offsetHeight,
    });
    console.log('PyramidView: Canvas generated, size:', canvas.width, 'x', canvas.height);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${(props.gameHeader || props.gameTitle || 'your-pyramid').toLowerCase().replace(/\s+/g, '-')}.png`;
    link.click();
    console.log('PyramidView: Image download triggered');
  } catch (err: any) {
    console.error('PyramidView: Error generating download image:', err.message, err);
    alert('Failed to download image. Some images may not be accessible due to CORS restrictions.');
  }
}
</script>

<style scoped>
.box {
  padding: 0 !important;
  box-sizing: border-box;
}
.pyramid-view {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pyramid-container {
  position: relative;
  border-radius: 8px;
  border: 1px solid #444;
  max-width: calc(100% - 0.4rem);
  margin: 0 auto;
  overflow: hidden;
}
.user-image-container {
  position: absolute;
  top: 0.3rem;
  left: 0.3rem;
}
.user-image {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  border: 2px solid #fff;
  object-fit: cover;
}
.pyramid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.05rem;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}
.pyramid-row-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  width: 100%;
}
.row-label {
  width: 100%;
  text-align: center;
  font-weight: bold;
  font-size: 0.7rem;
}
.pyramid-row {
  display: flex;
  justify-content: center;
  gap: 0.05rem;
  width: 100%;
  flex-wrap: nowrap;
}
.pyramid-slot {
  width: 22vw;
  height: 22vw;
  max-width: 90px;
  max-height: 90px;
  min-width: 50px;
  min-height: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #1f1f1f;
  border: 1px dashed #444;
  cursor: default;
  transition: all 0.2s ease;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  text-align: center;
  overflow: hidden;
  box-sizing: border-box;
  margin-bottom: 0 !important;
}
.worst-item-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: max-content;
  margin: 0.3rem auto;
}
.worst-item-container .subtitle {
  width: 100%;
  text-align: center;
  margin-bottom: 5px;
}
.worst-slot {
  border: 2px dashed #ff7777;
  background-color: #3d1f1f;
  max-width: 90px;
  max-height: 90px;
  min-width: 50px;
  min-height: 50px;
  box-sizing: border-box;
}
.slot-style {
  width: 100%;
  height: 100%;
  border-radius: 0.5rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  background: linear-gradient(to bottom, #2a2a2a, #1f1f1f);
  border: 1px solid #444;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  position: relative;
}
.pyramid-slot .slot-style,
.worst-slot .slot-style {
  padding: 0 !important;
}
.draggable-image {
  user-select: none;
  touch-action: none;
  width: 100%;
  height: calc(100% - 4px);
  object-fit: cover; /* fill slots */
  object-position: top; /* crop from bottom */
  border-radius: 0.5rem 0.5rem 0 0;
}
.color-indicator-pyramid {
  width: 100%;
  height: 4px;
  border-radius: 0 0 0.5rem 0.5rem;
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 10;
}
.tier-label {
  color: #bbb;
  font-size: 0.9rem;
  font-weight: bold;
  pointer-events: none;
}
.tier-label.has-text-danger {
  color: #ff5555;
}
.top-x-label {
  font-size: 0.7rem;
  font-weight: bold;
}
.subtitle {
  color: #eee;
  font-size: 1rem;
  margin: 0.3rem 0;
}
.game-header {
  margin-left: 4.5rem;
  text-align: left;
}
.button.is-primary {
  background-color: #3273dc;
  margin: 0.3rem 0;
}
@media screen and (max-width: 767px) {
  .pyramid-container {
    padding: 0.2rem;
    max-width: calc(100% - 0.2rem);
  }
  .pyramid-slot {
    width: 20vw;
    height: 20vw;
    max-width: 80px;
    max-height: 80px;
    min-width: 45px;
    min-height: 45px;
  }
  .worst-slot {
    max-width: 80px;
    max-height: 80px;
    min-width: 45px;
    min-height: 45px;
  }
  .pyramid-slot .draggable-image,
  .worst-slot .draggable-image {
    width: 100%;
    height: calc(100% - 4px);
    object-fit: cover;
    object-position: top;
    border-radius: 0.5rem 0.5rem 0 0;
  }
  .tier-label {
    font-size: 0.8rem;
  }
  .row-label {
    font-size: 0.6rem;
  }
  .top-x-label {
    font-size: 0.6rem;
  }
}
</style>