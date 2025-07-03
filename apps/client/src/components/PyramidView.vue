<template>
  <div class="pyramid-view">
    <div class="pyramid-container p-2">
      <div v-if="isImageLoading" class="has-text-white has-text-centered">Loading image...</div>
      <img
        v-else-if="generatedImage"
        :src="generatedImage"
        alt="Pyramid Ranking"
        class="pyramid-image"
        ref="pyramidImage"
        crossorigin="anonymous"
      />
      <div v-else class="has-text-white has-text-centered">Failed to generate image. Please try again.</div>
      <!-- Download & Share Buttons -->
       </div>

      <div class="buttons is-centered mt-2">
        <a
          :href="generatedImage || '#'"
          :download="(props.shareImageTitle || props.gameHeader || props.gameTitle || 'your-pyramid').toLowerCase().replace(/\s+/g, '-') + '.png'"
          :class="{ 'is-disabled': isImageLoading || !generatedImage }"
          @click="downloadPyramid"
        >
          <font-awesome-icon :icon="['fas', 'download']" class="mr-2" />
          Download
        </a>
        <!-- <CustomButton
          type="is-primary"
          label="Download"
          :icon="['fas', 'download']"
          :disabled="isImageLoading || !generatedImage"
          @click="downloadPyramid"
        /> -->
        <div class="share-button-container">
          <CustomButton
            type="is-primary"
            label="Share"
            :icon="['fab', 'x-twitter']"
            :disabled="isImageLoading || !generatedImage"
            @click.stop="handleShareClick"
          />
          <div v-if="showShareTooltip" class="share-tooltip">
            Long-press the image to save, then share on X
          </div>
        </div>
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
}>();

const userStore = useUserStore();
const isImageLoading = ref(true);
const generatedImage = ref<string | null>(null);
const pyramidImage = ref<HTMLImageElement | null>(null);
const preprocessedImages = ref<Map<string, string>>(new Map());
const showShareTooltip = ref(false);
const shareTooltipShown = ref(false);
const tempContainer = ref<HTMLElement | null>(null);

onMounted(async () => {
  console.log('PyramidView: onMounted called with props:', {
    gameHeader: props.gameHeader,
    worstHeader: props.worstHeader,
    hideRowLabel: props.hideRowLabel,
  });
  await nextTick();
  await renderPyramidImage();
});

async function preloadImages() {
  const imagePromises: Promise<void>[] = [];
  const uniqueImageUrls = new Set<string>();
  const timeoutMs = 5000;

  const preprocessImage = (src: string): Promise<void> =>
    new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.crossOrigin = 'anonymous';

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('PyramidView: Failed to get canvas context for', src);
        resolve();
        return;
      }

      img.onload = () => {
        const size = 90;
        canvas.width = size;
        canvas.height = size;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        let srcX = 0,
          srcY = 0,
          srcWidth = img.naturalWidth,
          srcHeight = img.naturalHeight;

        if (imgAspect > 1) {
          srcWidth = srcHeight;
          srcX = (img.naturalWidth - srcWidth) / 2;
        } else if (imgAspect < 1) {
          srcHeight = srcWidth;
          srcY = (img.naturalHeight - srcHeight) / 2;
        }

        ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/png');
        preprocessedImages.value.set(src, dataUrl);
        console.log('PyramidView: Preprocessed image:', src);
        resolve();
      };

      img.onerror = () => {
        console.warn('PyramidView: Image failed to load:', src);
        resolve();
      };

      img.onabort = () => {
        console.warn('PyramidView: Image load aborted:', src);
        resolve();
      };

      if (img.complete && img.naturalWidth !== 0) {
        img.onload?.(new Event('load'));
      }
    });

  const profileImage = props.userProfile?.photoURL || userStore.profile?.photoURL || defaultProfile;
  if (profileImage && !uniqueImageUrls.has(profileImage)) {
    uniqueImageUrls.add(profileImage);
    imagePromises.push(
      Promise.race([
        preprocessImage(profileImage),
        new Promise<void>((resolve) => setTimeout(() => resolve(), timeoutMs)),
      ])
    );
  }

  props.pyramid.flat().forEach((slot) => {
    if (slot.image?.src && !uniqueImageUrls.has(slot.image.src)) {
      uniqueImageUrls.add(slot.image.src);
      imagePromises.push(
        Promise.race([
          preprocessImage(slot.image.src),
          new Promise<void>((resolve) => setTimeout(() => resolve(), timeoutMs)),
        ])
      );
    }
  });

  if (props.worstItem?.src && !uniqueImageUrls.has(props.worstItem.src)) {
    uniqueImageUrls.add(props.worstItem.src);
    imagePromises.push(
      Promise.race([
        preprocessImage(props.worstItem.src),
        new Promise<void>((resolve) => setTimeout(() => resolve(), timeoutMs)),
      ])
    );
  }

  console.log('PyramidView: Preloading images:', Array.from(uniqueImageUrls));
  if (imagePromises.length === 0) {
    console.log('PyramidView: No images to preload');
    return;
  }

  await Promise.all(imagePromises);
  console.log('PyramidView: All images preprocessed');
}

async function renderPyramidImage() {
  isImageLoading.value = true;
  await preloadImages();

  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.top = '-9999px';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '100%';
  tempDiv.style.maxWidth = '500px';
  tempDiv.style.backgroundColor = '#121212';
  tempDiv.className = 'pyramid-container p-2';
  document.body.appendChild(tempDiv);
  tempContainer.value = tempDiv;

  // Inject styles into the temporary container
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .box { padding: 0 !important; box-sizing: border-box; }
    .pyramid-container {
      position: relative;
      
     
      margin: 0 auto;
      overflow: hidden;
      background-color: #121212;
      padding: 0.5rem;
    }
    .user-image-container { position: absolute; top: 0.6rem; left: 0.6rem; }
    .user-image {
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      border: 2px solid #00e8e0;
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
      cursor: default;
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
      color: #eee;
      font-size: 1rem;
      font-weight: bold;
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
    .worst-slot .slot-style { padding: 0 !important; }
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
    .tier-label.has-text-danger { color: #ff5555; }
    .top-x-label {
      font-size: 0.9rem !important;
      font-weight: bold;
      color: #fff;
      text-align: center;
      margin-top: 0.5rem;
    }
    .subtitle {
      color: #eee;
      font-size: 1rem;
      font-weight: bold;
      margin: 0.3rem 0;
    }
    .game-header {
      margin-bottom: 0.3rem !important;
      margin-left: 2rem;
      margin-right: 2rem;
      font-size: 17px;
      text-align: center;
      color: #00e8e0;
    }
    @media screen and (max-width: 767px) {
      .pyramid-container { padding: 0.2rem; max-width: calc(100% - 0.2rem); }
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
      .tier-label { font-size: 0.8rem; }
      .row-label { font-size: 0.6rem; }
      .top-x-label { font-size: 0.6rem; }
    }
  `;
  tempDiv.appendChild(styleElement);

  // Render the pyramid content
  tempDiv.innerHTML += `
    <div class="user-image-container">
      <img
        src="${preprocessedImages.value.get(props.userProfile?.photoURL || userStore.profile?.photoURL || defaultProfile) || defaultProfile}"
        alt="User Profile"
        class="user-image"
        crossorigin="anonymous"
      />
    </div>
    <h2 class="subtitle has-text-success game-header" style="margin-bottom: 1rem; text-align: center"
      >${props.shareImageTitle || props.gameHeader || 'Your Pyramid'}</h2>
    <div class="pyramid">
      ${props.pyramid
        .map(
          (row, rowIndex) => `
        <div class="pyramid-row-container">
          <div class="row-label has-text-white" style="${props.hideRowLabel ? 'display: none;' : ''}">
            ${props.rows[rowIndex]?.label || toRoman(rowIndex + 1)}
          </div>
          <div class="pyramid-row">
            ${row
              .map(
                (slot, colIndex) => `
              <div class="pyramid-slot box dark-slot">
                ${
                  slot.image
                    ? `
                  <div class="slot-style">
                    <img
                      src="${preprocessedImages.value.get(slot.image.src) || slot.image.src}"
                      alt="${slot.image.label}"
                      class="draggable-image"
                      crossorigin="anonymous"
                    />
                    <div class="color-indicator-pyramid" style="background-color: ${slot.image.color || '#fff'}"></div>
                  </div>`
                    : `<div class="tier-label">${toRoman(rowIndex + 1)}</div>`
                }
              </div>`
              )
              .join('')}
          </div>
        </div>`
        )
        .join('')}
    </div>
    <div class="worst-item-container">
      <h3 class="subtitle has-text-centered has-text-white">${props.worstHeader || 'Worst Item'}</h3>
      <div class="pyramid-slot box worst-slot dark-slot mx-auto">
        ${
          props.worstItem
            ? `
          <div class="slot-style">
            <img
              src="${preprocessedImages.value.get(props.worstItem.src) || props.worstItem.src}"
              alt="${props.worstItem.label}"
              class="draggable-image"
              crossorigin="anonymous"
            />
            <div class="color-indicator-pyramid" style="background-color: ${props.worstItem.color || '#fff'}"></div>
          </div>`
            : `<div class="tier-label has-text-danger">Worst</div>`
        }
      </div>
    </div>
    <p class="top-x-label has-text-white has-text-centered mt-2">
      And what’s your vote? <br /> top-x.co/PrezPyramid
    </p>
  `;

  try {
    const canvas = await html2canvas(tempContainer.value!, {
      backgroundColor: '#121212',
      scale: 2, // Fixed scale for consistent rendering
      useCORS: true,
      logging: true,
      allowTaint: false,
      width: 500, // Fixed width to match max-width
      height: tempContainer.value!.offsetHeight,
    });
    console.log('PyramidView: Canvas generated, size:', canvas.width, 'x', canvas.height);
    generatedImage.value = canvas.toDataURL('image/png');
    isImageLoading.value = false;
  } catch (err: any) {
    console.error('PyramidView: Error generating image:', err.message, err);
    isImageLoading.value = false;
    generatedImage.value = null;
    alert('Failed to generate image. Some images may not be accessible due to CORS restrictions.');
  } finally {
    document.body.removeChild(tempContainer.value!);
    tempContainer.value = null;
  }
}

function toRoman(num: number): string {
  const numerals = ['I', 'II', 'III', 'IV'];
  return numerals[num - 1] || `${num}`;
}

async function downloadPyramid() {
  console.log('PyramidView: downloadPyramid called');
  if (!generatedImage.value) {
    console.error('PyramidView: No generated image available');
    alert('Failed to download image. Please try again.');
    return;
  }
  try {
    const link = document.createElement('a');
    link.href = generatedImage.value;
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
    console.error('PyramidView: Error downloading image:', err.message, err);
    alert('Failed to download image.');
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
.pyramid-view {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pyramid-container {
  position: relative;
  border-radius: 8px;
  
  max-width: calc(100% - 0.4rem);
  margin: 0 auto;
  overflow: hidden;
  background-color: #121212;
}
.pyramid-image {
  width: 100%;
  max-width: 500px;
  height: auto;
  display: block;
  margin: 0 auto;
  border-radius: 8px;
}
.button.is-primary {
  margin: 0.3rem 0;
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
    max-width: calc(100% - 0.2rem);
  }
  .pyramid-image {
    max-width: 100%;
  }
}
</style>