
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
  userName?: string;
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
    tempDiv.style.width = '1080px'; // High res width
    tempDiv.style.padding = '80px 40px';
    tempDiv.style.display = 'flex';
    tempDiv.style.flexDirection = 'column';
    tempDiv.style.alignItems = 'center';
    tempDiv.style.backgroundColor = '#0c0c0c';
    tempDiv.style.backgroundImage = 'radial-gradient(circle at center, #1a1a2e 0%, #0c0c0c 100%)';
    tempDiv.className = 'pyramid-generator-container';
    document.body.appendChild(tempDiv);
    tempContainer.value = tempDiv;

    // We use programmatic styles to ensure html2canvas captures everything correctly
    // Dynamic Styles for the generator
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .pyramid-generator-container {
        font-family: 'Outfit', 'Inter', sans-serif;
        color: white;
        box-sizing: border-box;
      }
      .header-section {
        text-align: center;
        
        position: relative;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .brand-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-bottom: 20px;
      }
      .user-image {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        border: 4px solid #00e8e0;
        box-shadow: 0 0 30px rgba(0, 232, 224, 0.4);
      }
      .logo {
        width: 200px;
      }
      .game-title {
        font-size: 72px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin: 10px 0 5px;
        color: #fff;
        text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      }
      .game-subtitle {
        font-size: 24px; /* Slightly smaller for name */
        color: #00e8e0;
        letter-spacing: 4px; /* Reduced for readability */
        margin-bottom: 10px;
        text-transform: uppercase;
        font-weight: 700;
        opacity: 0.9;
      }
      
      .pyramid-grid {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        padding: 20px 0;
      }
      .pyramid-row {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: -50px; /* Matched to View spacing */
        position: relative;
      }
      .pyramid-row:first-child {
        margin-top: 0;
        z-index: 4;
      }
      .pyramid-row:nth-child(2) { z-index: 3; }
      .pyramid-row:nth-child(3) { z-index: 2; }
      .pyramid-row:nth-child(4) { z-index: 1; }
      
      .hex-wrapper {
        width: 220px;
        height: 254px;
        position: relative;
      }
      
      .rank-bar {
        position: absolute;
        bottom: 18px;
        left: 50%;
        transform: translateX(-50%);
        width: 60px;
        height: 12px;
        border-radius: 6px;
        z-index: 20;
      }
      
      .footer-section {
        margin-top: 5px;
        text-align: center;
        width: 100%;
      }
      .cta-text {
        font-size: 40px;
        font-weight: 800;
        margin-bottom: 15px;
        color: #fff;
      }
      .link-text {
        font-size: 34px;
        font-weight: 700;
        color: #00e8e0;
        background: rgba(0, 232, 224, 0.1);
        padding: 5px 20px;
        border-radius: 30px;
        display: inline-block;
      }

      .worst-section {
        margin-top: 1px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .worst-title {
        font-size: 28px;
        color: #ff5555;
        text-transform: uppercase;
        letter-spacing: 6px;
        font-weight: 800;
      }
    `;
    tempDiv.appendChild(styleElement);

    const logoSrc = topxLogo;
    const profileImage = props.userProfile?.photoURL || userStore.profile?.photoURL || defaultProfile;
    const highResProfile = getHighResProfileUrl(profileImage);

    // SVG Hexagon Scale for 220px
    const generateHexSvg = (imageSrc: string | null, borderColor: string, id: string) => {
      const dataUrl = imageSrc ? (preprocessedImages.value.get(imageSrc) || imageSrc) : '';
      return `
        <svg width="220" height="254" viewBox="0 0 100 115.47" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="clip-${id}">
              <polygon points="50,0 100,28.87 100,86.6 50,115.47 0,86.6 0,28.87" />
            </clipPath>
          </defs>
          <polygon points="50,0 100,28.87 100,86.6 50,115.47 0,86.6 0,28.87" fill="${borderColor}" />
          <g transform="scale(0.93) translate(3.75 4.0)">
            <polygon points="50,0 100,28.87 100,86.6 50,115.47 0,86.6 0,28.87" fill="#0c0c0c" />
            <g clip-path="url(#clip-${id})">
              ${dataUrl ? `<image x="0" y="0" width="100" height="115.47" preserveAspectRatio="xMidYMid slice" href="${dataUrl}" />` : ''}
            </g>
          </g>
        </svg>
      `;
    };

    tempDiv.innerHTML += `
      <div class="header-section">
        <div class="brand-row">
          <img src="${preprocessedImages.value.get(highResProfile) || defaultProfile}" class="user-image" />
          <img src="${preprocessedImages.value.get(logoSrc) || logoSrc}" class="logo" />
        </div>
        <h1 class="game-title">${props.shareImageTitle || props.gameHeader || 'Top Ranking'}</h1>
        ${props.userName ? `<p class="game-subtitle">BY ${props.userName.startsWith('@') ? props.userName.toUpperCase() : '@' + props.userName.toUpperCase()}</p>` : ''}
      </div>

      <div class="pyramid-grid">
        ${props.pyramid
          .map((row, rowIndex) => {
            return `
              <div class="pyramid-row">
                ${row.map((slot, colIndex) => {
                  const id = `s-${rowIndex}-${colIndex}`;
                  const color = slot.image?.color || '#00e8e0';
                  return `
                    <div class="hex-wrapper">
                      ${generateHexSvg(slot.image?.src || null, color, id)}
                    
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          }).join('')}
      </div>

      ${props.worstShow !== false ? `
        <div class="worst-section">
          <h3 class="worst-title">${props.worstHeader || 'The Worst'}</h3>
          <div class="hex-wrapper">
            ${generateHexSvg(props.worstItem?.src || null, '#ff5555', 'worst')}
            
          </div>
        </div>
      ` : ''}

      <div class="footer-section">
        <p class="cta-text">And what's your vote?</p>
        <p class="link-text">${props.shareLink || 'top-x.co'}</p>
      </div>
    `;

    // Wait for fonts and layout
    await new Promise(resolve => setTimeout(resolve, 800));

    const canvas = await html2canvas(tempDiv, {
      backgroundColor: '#0c0c0c',
      scale: 2,
      useCORS: true,
      logging: false,
      width: 1080,
      height: tempDiv.offsetHeight,
      imageTimeout: 0,
      onclone: (clonedDoc) => {
        // Fix for SVG clipPath in some html2canvas builds if needed
      }
    });
    
    generatedImage.value = canvas.toDataURL('image/png');
    isImageLoading.value = false;
  } catch (err: any) {
    console.error('PyramidView: Error generating image:', err.message, err);
    isImageLoading.value = false;
    generatedImage.value = null;
  } finally {
    if (tempContainer.value && document.body.contains(tempContainer.value)) {
      document.body.removeChild(tempContainer.value);
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
  width: 100%;
}
.pyramid-row-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  margin-top: -25px; /* Tighter vertical overlap in editor */
}
.pyramid-row {
  display: flex;
  justify-content: center;
  gap: 5px; /* Tighter horizontal gap in editor */
}
.pyramid-container {
  position: relative;
  border-radius: 12px;
  box-shadow: 0 0 30px rgba(0, 232, 224, 0.2);
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  overflow: hidden;
  background-color: #0c0c0c;
  padding: 1rem;
  border: 1px solid rgba(0, 232, 224, 0.1);
}
.pyramid-image {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
}
@media screen and (max-width: 767px) {
  .pyramid-container {
    padding: 0;
    max-width: 100%;
    box-shadow: none;
    border: none;
  }
}
</style>
