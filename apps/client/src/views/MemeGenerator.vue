<template>
  <div class="meme-generator-view section">
    <div class="container">
      <h1 class="title has-text-centered mb-6">{{ t('meme.title') }}</h1>
      
      <div class="columns">
        <!-- Inputs Column -->
        <div class="column is-4">
          <div class="box">
            <h2 class="subtitle">1. {{ t('meme.input1') }}</h2>
            
            <div class="field">
              <div class="control">
                <input class="input" type="text" v-model="text1" :placeholder="t('meme.input1')">
              </div>
            </div>

            <div class="field">
              <div class="control">
                <input class="input" type="text" v-model="text2" :placeholder="t('meme.studiedAtS')">
              </div>
            </div>

            <div class="field">
              <div class="control">
                <input class="input" type="text" v-model="text3" :placeholder="t('meme.input3')">
              </div>
            </div>

            <div class="field mt-5" v-if="false"> <!-- Hidden per user request -->
              <label class="label">{{ t('meme.formatLabel') }}</label>
              <div class="control">
                <div class="select is-fullwidth">
                  <select v-model="exportFormat">
                    <option value="gif">{{ t('meme.gif') }}</option>
                    <option value="video">{{ t('meme.video') }}</option>
                  </select>
                </div>
              </div>
            </div>

            <button 
              class="button is-primary is-fullwidth mt-4" 
              @click="generateMeme"
              :class="{ 'is-loading': isGenerating }"
              :disabled="isGenerating || isSuccess"
            >
              {{ t('meme.generate') }}
            </button>

            <div v-if="isGenerating" class="mt-4">
              <progress class="progress is-small is-primary" :value="generationProgress" max="100"></progress>
              <p class="help has-text-centered">
                {{ t(generationStatusKey) }} 
                <span v-if="framesCaptured > 0 && generationProgress < 100">({{ framesCaptured }} frames)</span>
              </p>
            </div>

            <div v-if="isSuccess && (gifUrl || videoUrl)" class="mt-4">
              <button @click="resetGenerator" class="button is-light is-fullwidth">
                {{ t('meme.reset') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Preview Column -->
        <div class="column is-8">
          <div class="box has-text-centered">
            <h2 class="subtitle">2. {{ t('meme.preview') }}</h2>
            
            <!-- The Meme Stage -->
              <div id="meme-stage" class="meme-stage" ref="memeStage">
                <div class="meme-card" v-for="(card, index) in cards" :key="index">
                  <div class="card-content-row">
                    <div class="toggle-bar" :class="{ 'is-on': card.isOn }">
                      <div class="toggle-knob" :class="{ 'is-on': card.isOn }"></div>
                    </div>
                    <div class="card-label">
                      {{ card.text }}
                      <span v-if="index === 1 && text2Icon" class="icon-placeholder">{{ text2Icon }}</span>
                    </div>
                  </div>
                </div>

                <!-- Branding Watermark -->
                <div class="meme-watermark">www.Top-X.co/tools</div>

              <!-- Animated Cursor -->
                <div 
                  v-if="isPlaying"
                  class="meme-cursor" 
                  :style="{ transform: `translate(${cursorX}px, ${cursorY}px)` }"
                >
                  <!-- Selection based on cursorType -->
                  <svg v-if="cursorType === 'pointer'" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 3L19 12L13 13L16 19L14 20L11 14L8 17V3Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/>
                  </svg>
                  <svg v-else-if="cursorType === 'hand'" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 11V7C18 5.34 16.66 4 15 4C14.7 4 14.42 4.05 14.16 4.15C13.82 2.91 12.69 2 11.33 2C10.27 2 9.34 2.55 8.81 3.39C8.49 3.14 8.09 3 7.67 3C6.19 3 5 4.19 5 5.67V13.11L3.92 12.03C3.53 11.64 2.89 11.64 2.5 12.03C2.11 12.42 2.11 13.05 2.5 13.44L7.54 18.48C8.36 19.3 9.45 19.75 10.59 19.75H14.5C16.43 19.75 18 18.18 18 16.25V11ZM11.33 4C11.7 4 12 4.3 12 4.67V10.17H13.17V4.67C13.17 4.3 13.47 4 13.83 4C14.2 4 14.5 4.3 14.5 4.67V10.17H15.67V6.67C15.67 6.3 15.97 6 16.33 6C16.7 6 17 6.3 17 6.67V11V16.25C17 17.63 15.88 18.75 14.5 18.75H10.59C9.72 18.75 8.89 18.4 8.27 17.78L3.92 13.43L4.85 12.5L7.81 15.46C8 15.65 8.32 15.65 8.51 15.46C8.71 15.26 8.71 14.94 8.51 14.75L5.67 11.91V5.67C5.67 5.3 5.97 5 6.33 5C6.7 5 7 5.3 7 5.67V10.17H8.17V4.67C8.17 4.3 8.47 4 8.83 4C9.17 4 9.47 4.27 9.5 4.61L9.67 10.17H10.83V4.67C10.83 4.3 11.13 4 11.5 4H11.33Z" fill="white" stroke="black" stroke-width="0.5"/>
                  </svg>
                  <svg v-else-if="cursorType === 'crosshair'" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="white" stroke-width="1.5"/>
                    <path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="12" cy="12" r="1.5" fill="red"/>
                  </svg>
                </div>
            </div>

            <div class="mt-4 buttons is-centered" v-if="gifUrl || videoUrl">
              <a v-if="gifUrl && false" :href="gifUrl" download="meme-generator.gif" class="button is-success is-large">
                {{ t('meme.download') }} GIF
              </a>
              <a v-if="videoUrl" :href="videoUrl" :download="`meme-generator.${videoExtension}`" class="button is-info is-large">
                {{ t('meme.download') }} {{ videoExtension.toUpperCase() }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Ad Overlay -->
    <GameAdOverlay
      v-if="showAdOverlay"
      :autoCloseDelay="8"
      titleKey="meme.ad.title"
      waitingKey="meme.ad.waiting"
      continueKey="meme.ad.continue"
      @continue="handleAdContinue"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import html2canvas from 'html2canvas';
import { useLocaleStore } from '@/stores/locale';
import GameAdOverlay from '@/components/games/common/GameAdOverlay.vue';

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);
const locale = computed(() => localeStore.language);
const gifshot = (window as any).gifshot;

const isRTL = computed(() => locale.value === 'il');

const text1 = ref(t('meme.text1'));
const text2 = ref(t('meme.text2'));
const text3 = ref(t('meme.text3'));

const text2Icon = computed(() => {
  if (text2.value === t('meme.studiedAtS')) return t('meme.studiedAtSLabel'); 
  return '';
});

const cards = reactive([
  { text: computed(() => text1.value), isOn: false },
  { text: computed(() => text2.value), isOn: false },
  { text: computed(() => text3.value), isOn: false },
]);

const isGenerating = ref(false);
const isPlaying = ref(false);
const isSuccess = ref(false);
const exportFormat = ref<'gif' | 'video'>('video');
const gifUrl = ref('');
const videoUrl = ref('');
const videoExtension = ref('mp4');
const memeStage = ref<HTMLElement | null>(null);
const frames = ref<Blob[]>([]);

const generationProgress = ref(0);
const generationStatusKey = ref('meme.status.idle');
const framesCaptured = ref(0);

const showAdOverlay = ref(false);

const cursorX = ref(172);
const cursorY = ref(270);

// Internal parameters for calibration
const CONFIG = {
  // To reach ~9 seconds (90 frames) at 10 FPS:
  // 10 movements * 7 steps = 70 frames
  // + manual captures and sleeps = ~90 frames
  animationSpeedFactor: 1.0, 
  cursorType: 'pointer' as 'pointer' | 'hand' | 'crosshair',
  // Video FPS: Lower = slower playback (7 FPS = ~13s video, 5 FPS = ~18s video)
  videoFPS: 7
};

const animationSpeedFactor = ref(CONFIG.animationSpeedFactor);
const cursorType = ref(CONFIG.cursorType);

// Toggle center positions
const toggleCenterY = [65, 135, 205];
const toggleCenterX = computed(() => isRTL.value ? 257 : 87);
const idleX = 172;
const idleY = 270;

// Animation Logic
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const animateTo = async (x: number, y: number, duration: number = 500) => {
  const startX = cursorX.value;
  const startY = cursorY.value;
  const startTime = performance.now();

  return new Promise<void>(resolve => {
    const step = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const easeProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      
      cursorX.value = startX + (x - startX) * easeProgress;
      cursorY.value = startY + (y - startY) * easeProgress;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
};

const generateMeme = async () => {
  if (isGenerating.value) return;
  if (!memeStage.value) return;
  
  if (!gifshot) {
    console.error('GIFshot not loaded yet');
    generationStatusKey.value = 'meme.status.idle';
    return;
  }

  isGenerating.value = true;
  isPlaying.value = true;
  gifUrl.value = '';
  videoUrl.value = '';
  isSuccess.value = false;
  generationProgress.value = 0;
  generationStatusKey.value = 'meme.status.capturing';
  
  // Reset states
  cards.forEach(c => c.isOn = false);
  cursorX.value = idleX;
  cursorY.value = idleY;

  // Reset frames
  frames.value = [];
  
  // Wait 8 seconds before showing ad overlay (let user see preview animation)
  setTimeout(() => {
    if (isGenerating.value) {
      showAdOverlay.value = true;
    }
  }, 8000);
  
  const captureFrame = async () => {
    if (!memeStage.value) return;
    try {
      const canvas = await html2canvas(memeStage.value, {
        width: 344,
        height: 270,
        scale: 2, 
        backgroundColor: '#F0F0F0',
        useCORS: true,
        allowTaint: true,
        logging: false,
        ignoreElements: (el) => {
          const skipTags = ['SCRIPT', 'INS', 'IFRAME', 'NOSCRIPT'];
          return skipTags.includes(el.tagName) || el.classList.contains('adsbygoogle');
        }
      });
      
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.95));
      if (blob) {
        frames.value.push(blob);
        framesCaptured.value = frames.value.length;
      }
    } catch (err) {
      console.error('Frame capture error:', err);
    }
  };

  // 30% Slower base durations
  // steps=7 ensures we capture 7 frames per movement
  const animateAndCapture = async (targetX: number, targetY: number) => {
    const factor = 1 / animationSpeedFactor.value;
    const startX = cursorX.value;
    const startY = cursorY.value;
    const steps = 7; 
    
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const easeProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      
      cursorX.value = startX + (targetX - startX) * easeProgress;
      cursorY.value = startY + (targetY - startY) * easeProgress;
      
      await captureFrame();
      await sleep(100 * factor); 
    }
  };

  const adaptiveSleep = async (ms: number) => {
    await sleep(ms * (1 / animationSpeedFactor.value));
  };

  // T1: center X=87, center Y=65
  // T2: center X=87, center Y=135
  // T3: center X=87, center Y=205

  // 1. Initial Start
  await captureFrame();
  await adaptiveSleep(1000);

  // 2. Mouse turn on text 1
  await animateAndCapture(toggleCenterX.value, toggleCenterY[0]);
  cards[0].isOn = true;
  await captureFrame();
  await adaptiveSleep(600);

  // 3. Mouse turn on text 2
  await animateAndCapture(toggleCenterX.value, toggleCenterY[1]);
  cards[1].isOn = true;
  await captureFrame();
  await adaptiveSleep(600);

  // 4. Mouse turn on text 3 - automaticly text 2 is off
  await animateAndCapture(toggleCenterX.value, toggleCenterY[2]);
  cards[2].isOn = true;
  await captureFrame();
  cards[1].isOn = false;
  await captureFrame();
  await adaptiveSleep(1000);

  // 5. Mouse turn on text 2 again - automaticly text 1 is now off
  await animateAndCapture(toggleCenterX.value, toggleCenterY[1]);
  cards[1].isOn = true;
  await captureFrame();
  cards[0].isOn = false;
  await captureFrame();
  await adaptiveSleep(1000);

  // 6. Mouse turn on text 1 again - automaticly text 3 is now off
  await animateAndCapture(toggleCenterX.value, toggleCenterY[0]);
  cards[0].isOn = true;
  await captureFrame();
  cards[2].isOn = false;
  await captureFrame();
  await adaptiveSleep(1000);

  // 7. Mouse turn on text 3 - automaticly text 2 is off
  await animateAndCapture(toggleCenterX.value, toggleCenterY[2]);
  cards[2].isOn = true;
  await captureFrame();
  cards[1].isOn = false;
  await captureFrame();
  await adaptiveSleep(1000);

  // 8. Mouse turn on text 2 again - automaticly text 1 is now off
  await animateAndCapture(toggleCenterX.value, toggleCenterY[1]);
  cards[1].isOn = true;
  await captureFrame();
  cards[0].isOn = false;
  await captureFrame();
  await adaptiveSleep(1000);

  // 9. Mouse turn on text 1 again - automaticly text 3 is now off
  await animateAndCapture(toggleCenterX.value, toggleCenterY[0]);
  cards[0].isOn = true;
  await captureFrame();
  cards[2].isOn = false;
  await captureFrame();
  await adaptiveSleep(1000);

  // Move cursor away
  await animateAndCapture(idleX, idleY);
  for (let i = 0; i < 4; i++) {
    await captureFrame();
    await adaptiveSleep(200);
  }

  // Compilation
  await sleep(200);
  
  if (exportFormat.value === 'video') {
    await generateVideo();
    isGenerating.value = false;
    isSuccess.value = true;
    isPlaying.value = false;
    return;
  }

  generationStatusKey.value = 'meme.status.gif';
  
  const imageUrls = frames.value.map(blob => URL.createObjectURL(blob));

  gifshot.createGIF({
    images: imageUrls,
    gifWidth: 344,
    gifHeight: 270,
    interval: 0.1,
    numFrames: imageUrls.length,
    numWorkers: 2, 
    progress: (p: number) => {
      generationProgress.value = Math.round(p * 100);
    }
  }, (obj: any) => {
    imageUrls.forEach(url => URL.revokeObjectURL(url));
    console.log('GIFshot callback received:', obj);
    if (!obj.error) {
      gifUrl.value = obj.image;
      generationStatusKey.value = 'meme.status.ready';
      isSuccess.value = true;
    } else {
      console.error('GIFshot error:', obj.error, obj.errorCode, obj.errorMsg);
      generationStatusKey.value = 'meme.status.idle';
    }
    isGenerating.value = false;
    isPlaying.value = false;
  });
};

const generateVideo = async () => {
  if (frames.value.length === 0) return;
  generationStatusKey.value = 'meme.status.video';
  
  try {
    const canvas = document.createElement('canvas');
    // HIGH QUALITY: Use 2x resolution (Scale 2) for the final video
    canvas.width = 688;
    canvas.height = 540;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get canvas context');

    const stream = canvas.captureStream(CONFIG.videoFPS);
    
    // Modern Chrome/Safari support video/mp4
    let mimeType = 'video/webm';
    videoExtension.value = 'webm';

    const types = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=h264',
      'video/webm;codecs=vp9',
      'video/webm'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        videoExtension.value = type.includes('mp4') ? 'mp4' : 'webm';
        break;
      }
    }

    console.log('Selected MIME type for video:', mimeType);
      
    const recorder = new MediaRecorder(stream, { 
      mimeType,
      videoBitsPerSecond: 8000000 // 8 Mbps for high quality
    });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType }); 
      videoUrl.value = URL.createObjectURL(blob);
      generationStatusKey.value = 'meme.status.ready';
    };

    recorder.start();

    const fps = CONFIG.videoFPS;
    const msPerFrame = 1000 / fps;

    // OPTIMIZATION: Preload all images first for faster rendering
    const images: HTMLImageElement[] = [];
    for (const blob of frames.value) {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.src = url;
      await new Promise((resolve) => {
        img.onload = () => {
          images.push(img);
          URL.revokeObjectURL(url);
          resolve(null);
        };
      });
    }

    // OPTIMIZATION: Render frames as fast as possible using requestAnimationFrame
    let frameIndex = 0;
    const startTime = performance.now();

    const renderFrame = () => {
      if (frameIndex >= images.length) {
        // All frames rendered, stop recording
        setTimeout(() => recorder.stop(), 200);
        return;
      }

      const expectedTime = frameIndex * msPerFrame;
      const actualTime = performance.now() - startTime;
      
      // Draw the current frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(images[frameIndex], 0, 0, canvas.width, canvas.height);
      
      frameIndex++;

      // Schedule next frame to maintain exact FPS timing
      const timeUntilNextFrame = Math.max(0, expectedTime + msPerFrame - actualTime);
      setTimeout(renderFrame, timeUntilNextFrame);
    };

    renderFrame();
  } catch (err: any) {
    console.error('Video generation error:', err);
    generationStatusKey.value = 'meme.status.idle';
  }
};

const resetGenerator = () => {
  isSuccess.value = false;
  gifUrl.value = '';
  videoUrl.value = '';
  generationProgress.value = 0;
  generationStatusKey.value = 'meme.status.idle';
};

const handleAdContinue = () => {
  showAdOverlay.value = false;
};


</script>

<style scoped>
.meme-generator-view {
  
  /*background: var(--bg-color, #f5f5f5);*/
  padding: 2.5rem 2rem;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin: 20px;
  
}

.meme-stage {
  width: 344px;
  height: 270px;
  background-color: #F0F0F0;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
  border: 1px solid #EEEEEE;
  border-radius: 4px;
}

.meme-card {
  width: 290px;
  height: 50px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  padding: 0 15px;
  position: relative;
}

.card-content-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  gap: 15px;
}

.card-content-row.is-rtl {
  flex-direction: row-reverse;
}

.card-label {
  font-family: 'Helvetica', 'Arial', sans-serif;
  font-weight: bold;
  font-size: 14px;
  color: #333;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
}

.card-label.is-rtl {
  text-align: right;
  flex-direction: row-reverse;
}

.icon-placeholder {
  font-size: 16px;
}

.toggle-bar {
  width: 40px;
  height: 20px;
  background-color: #DDDDDD;
  border-radius: 10px;
  position: relative;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.toggle-bar.is-on {
  background-color: #266b05; /* Pinkish red as per spec */
}

.toggle-knob {
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 1px;
  left: 1px;
  transition: transform 0.2s ease-in-out;
}

.toggle-knob.is-on {
  transform: translateX(20px);
}

.meme-cursor {
  position: absolute;
  top: 0;
  left: 0;
  width: 24px;
  height: 24px;
  pointer-events: none;
  z-index: 999;
  /* Simple pointer hotspot is at top-left 0,0 basically */
  margin-left: -2px;
  margin-top: -2px;
}

.meme-cursor img {
  width: 100%;
}

.meme-watermark {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-family: 'Helvetica', 'Arial', sans-serif;
  font-size: 10px;
  color: rgba(0, 0, 0, 0.4);
  font-weight: 500;
  pointer-events: none;
  z-index: 5;
  letter-spacing: 0.5px;
}

:global([dir='rtl']) .meme-watermark {
  right: auto;
  left: 12px;
}
</style>
