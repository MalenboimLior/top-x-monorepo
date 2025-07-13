<template>
  <div class="pyramid-view">
    <div class="pyramid-container p-2">
      <div class="content-wrapper">
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
            :src="defaultProfile"
            alt="Default Profile"
            class="user-image"
            ref="userImage"
            crossorigin="anonymous"
          />
        </div>
        <!-- Logo -->
        <div class="logo-container">
          <img
            :src="topxLogo"
            alt="TOP-X Logo"
            class="logo"
            crossorigin="anonymous"
          />
        </div>
        <!-- Game Header -->
        <h2 class="subtitle has-text-success game-header" v-if="props.shareImageTitle" v-html="props.shareImageTitle"></h2>
        <h2 class="subtitle has-text-success game-header" v-else v-html="props.gameHeader || 'Your Pyramid'"></h2>

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
        <p class="top-x-label has-text-white has-text-centered">And what’s your vote?</p>
        <p class="top-x-label has-text-centered" style="font-size: 16px;">
          {{ props.shareLink || 'https://top-x.co' }}
        </p>
      </div>
    </div>
    <!-- Download & Share Buttons -->
    <div class="buttons is-centered mt-2">
      <CustomButton
        type="is-primary"
        label="Download Pyramid"
        :icon="['fas', 'download']"
        :disabled="isImageLoading"
        @click="downloadPyramid"
      />
      <div class="share-button-container">
        <CustomButton
          type="is-primary"
          label="Share"
          :icon="['fab', 'x-twitter']"
          :disabled="isImageLoading"
          @click.stop="handleShareClick"
        />
        <div v-if="showShareTooltip" class="share-tooltip">
          Don't forget to download the image or take a screenshot
        </div>
      </div>
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
import defaultProfile from '@/assets/profile.png';
import topxLogo from '@/assets/topx-logo.png';

const props = defineProps<{
  pyramid: PyramidSlot[][];
  worstItem: PyramidItem | null;
  rows: PyramidRow[];
  gameHeader?: string;
  worstHeader?: string;
  gameTitle?: string;
  hideRowLabel?: boolean;
  userProfile?: { photoURL: string };
  shareImageTitle?: string;
  shareText?: string;
  shareLink?: string;
}>();

const userStore = useUserStore();
const canvasContainer = ref<HTMLElement | null>(null);
const userImage = ref<HTMLImageElement | null>(null);
const pyramidImages = ref<HTMLImageElement[]>([]);
const worstImage = ref<HTMLImageElement | null>(null);
const isImageLoading = ref(true);
const preprocessedImages = ref<Map<string, string>>(new Map()); // Store preprocessed image data URLs
const showShareTooltip = ref(false);
const shareTooltipShown = ref(false);

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
        // console.log('PyramidView: Preprocessed image:', img.src, 'Dimensions:', img.naturalWidth, 'x', img.naturalHeight);
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
    link.download = `${(
      props.shareImageTitle ||
      props.gameHeader ||
      props.gameTitle ||
      'your-pyramid'
    )
      .toLowerCase()
      .replace(/\s+/g, '-')}.png`;
    link.click();
    console.log('PyramidView: Image download triggered');
  } catch (err: any) {
    console.error('PyramidView: Error generating download image:', err.message, err);
    alert('Failed to download image. Some images may not be accessible due to CORS restrictions.');
  }
}

function shareOnX() {
  const text = props.shareText || '';
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(tweetUrl, '_blank');
}

function handleShareClick(e: MouseEvent) {
  if (!shareTooltipShown.value) {
    e.stopPropagation();
    showShareTooltip.value = true;
    shareTooltipShown.value = true;
    nextTick(() => {
      const hide = () => {
        showShareTooltip.value = false;
        document.removeEventListener('click', hide);
      };
      document.addEventListener('click', hide);
    });
  } else {
    shareOnX();
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background-color: #121212;
  padding: 0.5rem;
  box-sizing: border-box;
  border: 1px solid #00e8e0;
  max-width: calc(100% - 0.4rem);
  margin: 0 auto;
  overflow: hidden;
}
.content-wrapper {
  position: relative;
  width: 100%;
}
.user-image-container {
  position: absolute;
  top: 0.6rem;
  left: 0.6rem;
}
.user-image {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  border: 2px solid #00e8e0;
  object-fit: cover;
}
.logo-container {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 200px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.logo {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}
.pyramid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.05rem;
  width: 100%;
  max-width: 100%;
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
  color: #fff;
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
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  text-align: center;
  overflow: hidden;
  box-sizing: border-box;
  padding: 0 !important;
  margin: 0 !important;
}
.worst-item-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin: 0.3rem 0;
}
.worst-item-container .subtitle {
  width: 100%;
  text-align: center;
  margin-bottom: 5px;
  color: #eee;
  font-size: 1rem;
  font-weight: bold;
}
.worst-slot {
  border: 2px dashed #ff7777;
  background-color: #3d1f1f;
  width: 90px;
  height: 90px;
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
  object-fit: cover;
  object-position: top;
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
  font-size: 0.9rem;
  font-weight: bold;
  color: #fff;
  text-align: center;
  margin-top: 0.5rem;
}
.game-header {
  margin: 0.3rem 2rem 1rem;
  font-size: 22px;
  text-align: center;
  color: #00e8e0;
}
.button.is-primary {
  margin: 0.3rem 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  font-weight: bold;
  border-radius: 4px;
  background-color: #3273dc;
  color: #fff;
  border: 1px solid #3273dc;
  text-decoration: none;
}
.button.is-primary:hover {
  background-color: #276cda;
  border-color: #276cda;
}
.button.is-primary.is-disabled {
  background-color: #7a7a7a;
  border-color: #7a7a7a;
  color: #dbdbdb;
  cursor: not-allowed;
  pointer-events: none;
}
.share-button-container {
  position: relative;
  display: inline-block;
}
.share-tooltip {
  position: absolute;
  bottom: 120%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #3273dc;
  color: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  white-space: nowrap;
  z-index: 20;
}
@media screen and (max-width: 767px) {
  .pyramid-container {
    padding: 0.2rem;
    width: 100%;
    max-width: 400px;
  }
  .pyramid-slot,
  .worst-slot {
    width: 80px;
    height: 80px;
  }
  .draggable-image {
    width: 100%;
    height: calc(100% - 4px);
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
  .game-header {
    font-size: 15px;
  }
  .logo {
    width: 60px;
  }
  .button.is-primary {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }
}
</style>