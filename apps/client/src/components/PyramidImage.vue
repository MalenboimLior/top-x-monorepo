
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { useUserStore } from '@/stores/user';
import { PyramidItem, PyramidRow, PyramidSlot } from '@top-x/shared/types/pyramid';
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
  worstShow?: boolean;
}>();

const userStore = useUserStore();
const isImageLoading = ref(true);
const generatedImage = ref<string | null>(null);
const pyramidImage = ref<HTMLImageElement | null>(null);
const preprocessedImages = ref<Map<string, string>>(new Map());
const tempContainer = ref<HTMLElement | null>(null);
const isRendering = ref(false); // Prevent concurrent renders

onMounted(async () => {
  console.log('PyramidView: onMounted called with props:', {
    gameHeader: props.gameHeader,
    worstHeader: props.worstHeader,
    hideRowLabel: props.hideRowLabel,
    userProfile: props.userProfile?.photoURL,
  });
  await nextTick();
  await renderPyramidImage();
});

watch(
  [() => props.pyramid, () => props.worstItem, () => props.userProfile?.photoURL, () => props.worstShow],
  async () => {
    console.log('PyramidView: Detected change in pyramid, worstItem, or userProfile, re-rendering');
    await nextTick();
    await renderPyramidImage();
  }
);

function getHighResProfileUrl(src: string): string {
  if (src.includes('pbs.twimg.com/profile_images')) {
    return src.replace(/_normal(\.\w+)$/, '$1');
  }
  return src;
}

async function preloadImages() {
  const imagePromises: Promise<void>[] = [];
  const uniqueImageUrls = new Set<string>();
  const timeoutMs = 5000;

  const preprocessImage = (src: string, cropToSquare: boolean = true, cropPosition: 'center' | 'top' = 'center'): Promise<void> =>
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
        if (!cropToSquare) {
          // No crop, full image
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
        } else {
          // Crop to square
          const size = 540;
          canvas.width = size;
          canvas.height = size;
          const imgAspect = img.naturalWidth / img.naturalHeight;
          let srcX = 0,
            srcY = 0,
            srcWidth = img.naturalWidth,
            srcHeight = img.naturalHeight;

          if (imgAspect > 1) { // landscape
            srcHeight = img.naturalHeight;
            srcWidth = srcHeight;
            srcX = (img.naturalWidth - srcWidth) / 2; // center horizontally
            srcY = 0;
          } else if (imgAspect < 1) { // portrait
            srcWidth = img.naturalWidth;
            srcHeight = srcWidth;
            srcX = 0;
            if (cropPosition === 'center') {
              srcY = (img.naturalHeight - srcHeight) / 2;
            } else if (cropPosition === 'top') {
              srcY = 0;
            }
          } // square: full

          ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, size, size);
        }
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
  const highResProfile = getHighResProfileUrl(profileImage);
  if (highResProfile && !uniqueImageUrls.has(highResProfile)) {
    uniqueImageUrls.add(highResProfile);
    imagePromises.push(
      Promise.race([
        preprocessImage(highResProfile, true, 'center'), // center crop for profile
        new Promise<void>((resolve) => setTimeout(() => resolve(), timeoutMs)),
      ])
    );
  }

  const logoSrc = topxLogo;
  if (logoSrc && !uniqueImageUrls.has(logoSrc)) {
    uniqueImageUrls.add(logoSrc);
    imagePromises.push(
      Promise.race([
        preprocessImage(logoSrc, false), // no crop for logo
        new Promise<void>((resolve) => setTimeout(() => resolve(), timeoutMs)),
      ])
    );
  }

  props.pyramid.flat().forEach((slot) => {
    if (slot.image?.src && !uniqueImageUrls.has(slot.image.src)) {
      uniqueImageUrls.add(slot.image.src);
      imagePromises.push(
        Promise.race([
          preprocessImage(slot.image.src, true, 'top'), // top crop for items
          new Promise<void>((resolve) => setTimeout(() => resolve(), timeoutMs)),
        ])
      );
    }
  });

  if (props.worstItem?.src && !uniqueImageUrls.has(props.worstItem.src)) {
    uniqueImageUrls.add(props.worstItem.src);
    imagePromises.push(
      Promise.race([
        preprocessImage(props.worstItem.src, true, 'top'), // top crop for worst item
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
  if (isRendering.value) {
    console.log('PyramidView: Skipping render, already in progress');
    return;
  }
  isRendering.value = true;
  isImageLoading.value = true;

  try {
    await preloadImages();

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.top = '-9999px';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '1000px';
    tempDiv.style.display = 'flex';
    tempDiv.style.flexDirection = 'column';
    tempDiv.style.alignItems = 'center';
    tempDiv.style.backgroundColor = '#121212';
    tempDiv.className = 'pyramid-container';
    document.body.appendChild(tempDiv);
    tempContainer.value = tempDiv;

    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .box { padding: 0 !important; box-sizing: border-box; }
      .pyramid-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background-color: #121212;
        padding: 0.5rem;
        box-sizing: border-box;
      }
      .user-image-container { position: absolute; top: 0.6rem; left: 0.6rem; }
      .user-image {
        width: 8rem;
        height: 8rem;
        border-radius: 50%;
        border: 2px solid #00e8e0;
        object-fit: cover;
      }
      .logo-container {
        position: absolute;
        top: 0.6rem;
        right: 0.2rem;
        width: 160px;
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
        width: 180px;
        height: 180px;
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
        width: 180px;
        height: 180px;
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
        font-size: 34px;
        font-weight: bold;
        color: #fff;
        text-align: center;
        margin-top: 0.5rem;
      }
        .top-x-labelsmall {
        font-size: 30px;
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
        margin: 0.3rem 2rem 1rem;
        font-size: 50px !important;
        text-align: center;
        color: #00e8e0;
      }
      @media screen and (max-width: 767px) {
        .pyramid-container { padding: 0.2rem; width: 100%; max-width: 400px; }
        .pyramid-slot, .worst-slot {
          width: 80px;
          height: 80px;
        }
        .draggable-image {
          width: 100%;
          height: calc(100% - 4px);
        }
        .tier-label { font-size: 0.8rem; }
        .row-label { font-size: 0.6rem; }
        .top-x-label { font-size: 1rem; }
        .top-x-labelsmall { font-size: 0.8rem; }
       .game-header {font-size: 22px !important;}
       .logo-container {width: 70px;}
       .user-image {
        width: 3rem;
        height: 3rem;}

      }
    `;
    tempDiv.appendChild(styleElement);

    const logoSrc = topxLogo;
    const profileImage = props.userProfile?.photoURL || userStore.profile?.photoURL || defaultProfile;
    const highResProfile = getHighResProfileUrl(profileImage);

    tempDiv.innerHTML += `
      <div class="content-wrapper">
        <div class="user-image-container">
          <img
            src="${preprocessedImages.value.get(highResProfile) || defaultProfile}"
            alt="User Profile"
            class="user-image"
            crossorigin="anonymous"
          />
        </div>
        <div class="logo-container">
          <img
            src="${preprocessedImages.value.get(logoSrc) || logoSrc}"
            alt="TOP-X Logo"
            class="logo"
            crossorigin="anonymous"
          />
        </div>
        <h2 class="subtitle has-text-success game-header">${props.shareImageTitle || props.gameHeader || 'Your Pyramid'}</h2>
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
                    (slot) => `
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
        ${
          props.worstShow === false
            ? ''
            : `<div class="worst-item-container">
          <h3 class="subtitle has-text-centered has-text-white">${props.worstHeader || 'Worst Item'}</h3>
          <div class="pyramid-slot box worst-slot dark-slot">
            ${
              props.worstItem
                ? `<div class="slot-style">
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
        </div>`
        }
        <p class="top-x-label has-text-white has-text-centered">
          And what’s your vote?
        </p>
        <p class="top-x-labelsmall has-text-centered" >
          ${props.shareLink || 'https://top-x.co'}
        </p>
        
      </div>
    `;

    const canvas = await html2canvas(tempDiv, {
      backgroundColor: '#121212',
      scale: 3,
      useCORS: true,
      logging: true,
      allowTaint: false,
      height: tempDiv.offsetHeight,
    });
    console.log('PyramidView: Canvas generated, size:', canvas.width, 'x', canvas.height);
    console.log('tempDiv:', tempDiv);
    generatedImage.value = canvas.toDataURL('image/png');
    isImageLoading.value = false;
  } catch (err: any) {
    console.error('PyramidView: Error generating image:', err.message, err);
    isImageLoading.value = false;
    generatedImage.value = null;
    alert('Failed to generate image. Some images may not be accessible due to CORS restrictions.');
  } finally {
    if (tempContainer.value && document.body.contains(tempContainer.value)) {
      document.body.removeChild(tempContainer.value);
      console.log('PyramidView: Removed tempContainer from DOM');
    }
    tempContainer.value = null;
    isRendering.value = false;
  }
}

function toRoman(num: number): string {
  const numerals = ['I', 'II', 'III', 'IV'];
  return numerals[num - 1] || `${num}`;
}

function getImageDataUrl(): string | null {
  return generatedImage.value;
}

defineExpose({ getImageDataUrl });
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
  box-shadow: 0 0 10px rgba(0, 232, 224, 0.7), 0 0 20px rgba(0, 232, 224, 0.3);
  max-width: calc(100% - 0.4rem);
  margin: 0 auto;
  overflow: hidden;
  background-color: #121212;
  padding: 0.5rem;
}
.pyramid-image {
  width: 100%;
  max-width: 500px;
  height: auto;
  display: block;
  margin: 0 !important;
  border-radius: 8px;
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
.mr-2 {
  margin-right: 0.5rem;
}
@media screen and (max-width: 767px) {
  .pyramid-container {
    padding: 0.2rem;
    max-width: calc(100% - 0.4rem);
  }
  .pyramid-image {
    max-width: 100%;
  }
  .button.is-primary {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }
}
</style>
