<template>
  <div class="tap-to-transform-view section" :dir="isRTL ? 'rtl' : 'ltr'">
    <div class="container">
      <!-- Step 1: Landing Screen -->
      <div v-if="currentStep === 'landing'" class="landing-screen">
        <div class="hero-section has-text-centered mb-6">
          <h1 class="title is-1 gradient-text mb-4">{{ t('ttt.title') }}</h1>
          <p class="subtitle is-4 mb-6">{{ t('ttt.subtitle') }}</p>
          
          <div class="explanation-box box p-5 mb-6">
            <p class="content is-medium">{{ t('ttt.explanation') }}</p>
            <div class="example-grid mt-5">
              <div v-for="ex in examples" :key="ex.id" class="example-card" @click="selectExample(ex)">
                <div class="example-img-placeholder" :style="{ background: ex.gradient }">
                  <span>{{ ex.label }}</span>
                </div>
                <p class="help mt-2">{{ ex.desc }}</p>
              </div>
            </div>
          </div>

          <div class="upload-area" 
               @dragover.prevent="isDragging = true" 
               @dragleave.prevent="isDragging = false" 
               @drop.prevent="handleDrop">
            <input type="file" id="fileInput" class="is-hidden" accept="image/*" @change="handleFileChange">
            <label for="fileInput" class="upload-button button is-primary is-large is-rounded" :class="{ 'is-loading': isLoading }">
              <span class="icon"><i class="fas fa-upload"></i></span>
              <span>{{ t('ttt.uploadButton') }}</span>
            </label>
            <p class="mt-3 has-text-grey">{{ t('ttt.dragAndDrop') }}</p>
          </div>
        </div>
      </div>

      <!-- Step 2: Crop/Editor Screen -->
      <div v-else-if="currentStep === 'crop'" class="editor-screen">
        <div class="level mb-5">
          <div class="level-left">
            <h2 class="title is-3">{{ t('ttt.step2Title') }}</h2>
          </div>
          <div class="level-right">
            <button class="button is-light mr-2" @click="resetCrop">{{ t('ttt.resetCrop') }}</button>
            <button class="button is-primary" @click="goToSplit" :disabled="!imageLoaded">{{ t('ttt.nextToSplit') }}</button>
          </div>
        </div>

        <div class="editor-container box p-0">
          <div class="cropper-wrapper" ref="cropperWrapper">
            <!-- Simple custom cropper -->
            <canvas ref="cropCanvas" 
                    @mousedown="startDrag" 
                    @mousemove="onDrag" 
                    @mouseup="endDrag"
                    @touchstart="startDrag"
                    @touchmove="onDrag"
                    @touchend="endDrag"
                    @wheel="handleZoom"></canvas>
            
            <div class="cropper-controls">
              <div class="ratio-buttons">
                <button v-for="r in ratios" :key="r.label" 
                        class="button is-small is-rounded mb-1 mr-1" 
                        :class="{ 'is-primary': activeRatio === r.value }"
                        @click="setRatio(r.value)">
                  {{ r.label }}
                </button>
              </div>
              <div class="zoom-controls">
                <button class="button is-small is-rounded mb-1 mr-1" @click="zoom(-0.1)">-</button>
                <button class="button is-small is-rounded mb-1 mr-1" @click="zoom(0.1)">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Split & Preview Screen -->
      <div v-else-if="currentStep === 'split'" class="split-screen">
        <div class="level mb-5">
          <div class="level-left">
            <h2 class="title is-3">{{ t('ttt.step3Title') }}</h2>
          </div>
          <div class="level-right">
            <button class="button is-light mr-2" @click="currentStep = 'crop'">{{ t('ttt.back') }}</button>
            <button class="button is-success" @click="goToDownload">{{ t('ttt.generateFinal') }}</button>
          </div>
        </div>

        <div class="columns">
          <div class="column is-4">
            <div class="box">
              <h3 class="subtitle is-5">{{ t('ttt.splitControls') }}</h3>
              <div class="presets mb-4">
                <p class="label is-small">{{ t('ttt.presets') }}</p>
                <div class="buttons">
                  <button v-for="p in splitPresets" :key="p.name" 
                          class="button is-small is-fullwidth mb-2" 
                          @click="applySplitPreset(p.values)">
                    {{ t('ttt.preset.' + p.name) }}
                  </button>
                </div>
              </div>
              <div class="manual-splits">
                <p class="label is-small">{{ t('ttt.manualAdjustment') }}</p>
                <div v-for="(val, idx) in splitLines" :key="idx" class="field">
                  <label class="label is-small">{{ t('ttt.splitLine') }} {{ idx + 1 }}</label>
                  <div class="control">
                    <input type="range" v-model.number="splitLines[idx]" min="5" max="95" class="slider is-fullwidth">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="column is-8">
            <div class="preview-container">
              <div class="preview-section mb-6">
                <h4 class="subtitle is-6 has-text-centered">{{ t('ttt.feedPreview') }}</h4>
                <div class="x-feed-grid">
                  <div v-for="(slice, idx) in slices" :key="idx" class="feed-slice-container">
                    <img :src="slice" class="feed-slice-img">
                    <span class="slice-number">{{ idx + 1 }}</span>
                  </div>
                </div>
              </div>

              <div class="preview-section">
                <h4 class="subtitle is-6 has-text-centered">{{ t('ttt.expandedPreview') }}</h4>
                <div class="x-expanded-view" @click="simulateTap">
                  <div class="stacked-slices" :class="{ 'is-tapped': isExpanded }">
                    <img v-for="(slice, idx) in slices" :key="idx" :src="slice" class="stacked-slice-img">
                  </div>
                </div>
                <p class="help has-text-centered mt-2">{{ t('ttt.tapPreviewHint') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Download & Share Screen -->
      <div v-else-if="currentStep === 'download'" class="download-screen">
        <div class="has-text-centered mb-6">
          <h2 class="title is-2 gradient-text">{{ t('ttt.step4Title') }}</h2>
          <p class="subtitle">{{ t('ttt.step4Subtitle') }}</p>
        </div>

        <div class="columns is-centered">
          <div class="column is-8">
            <div class="box">
              <div class="final-slices-grid mb-5">
                <div v-for="(slice, idx) in slices" :key="idx" class="final-slice-item">
                  <img :src="slice">
                  <button class="button is-small is-light download-single" @click="downloadSingle(idx)">
                    <span class="icon is-small"><i class="fas fa-download"></i></span>
                  </button>
                </div>
              </div>

              <div class="buttons is-centered">
                <button class="button is-primary is-large" @click="downloadAll" :class="{ 'is-loading': isZipping }">
                  <span class="icon"><i class="fas fa-file-archive"></i></span>
                  <span>{{ t('ttt.downloadAll') }}</span>
                </button>
                <button class="button is-success is-large" @click="copyCaption">
                  <span class="icon"><i class="fas fa-copy"></i></span>
                  <span>{{ captionCopied ? t('ttt.copied') : t('ttt.copyCaption') }}</span>
                </button>
              </div>

              <div class="instruction-guide mt-6 p-5 has-background-dark-soft rounded-xl">
                <h4 class="title is-4 mb-4">{{ t('ttt.howToPost') }}</h4>
                <ol class="content">
                  <li v-for="i in 5" :key="i">{{ t('ttt.guideStep' + i) }}</li>
                </ol>
              </div>
              
              <div class="has-text-centered mt-6">
                <button class="button is-light" @click="resetAll">{{ t('ttt.startOver') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useLocaleStore } from '@/stores/locale';

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);
const isRTL = computed(() => localeStore.language === 'il');

// Steps: 'landing', 'crop', 'split', 'download'
const currentStep = ref('landing');
const isLoading = ref(false);
const imageLoaded = ref(false);
const isDragging = ref(false);

// Image Data
const originalImage = ref<HTMLImageElement | null>(null);
const croppedImage = ref<HTMLCanvasElement | null>(null);
const slices = ref<string[]>([]);
const isExpanded = ref(false);
const isZipping = ref(false);
const captionCopied = ref(false);

// Cropper State
const cropCanvas = ref<HTMLCanvasElement | null>(null);
const cropperWrapper = ref<HTMLElement | null>(null);
const activeRatio = ref('free');
const ratios = [
  { label: 'Free', value: 'free' },
  { label: '3:4', value: 0.75 },
  { label: '4:5', value: 0.8 },
  { label: '1:1', value: 1 }
];

const cropX = ref(0);
const cropY = ref(0);
const cropZoom = ref(1);
const isDraggingImage = ref(false);
const lastMousePos = ref({ x: 0, y: 0 });

// Split State
const splitLines = ref([25, 50, 75]); // percentages
const splitPresets = [
  { name: 'equal', values: [25, 50, 75] },
  { name: 'centaur', values: [30, 60, 85] },
  { name: 'monster', values: [20, 45, 75] }
];

// Content
const examples = [
  { id: 1, label: '🐴 Centaur', desc: 'Transform human to horse', gradient: 'linear-gradient(135deg, #6e45e2 0%, #88d3ce 100%)' },
  { id: 2, label: '👹 Monster', desc: 'Cute to scary transformation', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  { id: 3, label: '👗 Outfit', desc: 'Change clothes style', gradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' }
];

// Functions
const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) loadFile(file);
};

const handleDrop = (e: DragEvent) => {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) loadFile(file);
};

const loadFile = (file: File) => {
  if (!file.type.startsWith('image/')) return;
  isLoading.value = true;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      originalImage.value = img;
      currentStep.value = 'crop';
      isLoading.value = false;
      nextTick(() => {
        initCropper();
      });
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

const initCropper = () => {
  if (!cropCanvas.value || !originalImage.value) return;
  const canvas = cropCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const containerWidth = cropperWrapper.value?.clientWidth || 800;
  const containerHeight = 500;
  canvas.width = containerWidth;
  canvas.height = containerHeight;

  // Center image
  cropZoom.value = Math.min(canvas.width / originalImage.value.width, canvas.height / originalImage.value.height);
  cropX.value = (canvas.width - originalImage.value.width * cropZoom.value) / 2;
  cropY.value = (canvas.height - originalImage.value.height * cropZoom.value) / 2;

  drawCropCanvas();
  imageLoaded.value = true;
};

const drawCropCanvas = () => {
  if (!cropCanvas.value || !originalImage.value) return;
  const ctx = cropCanvas.value.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, cropCanvas.value.width, cropCanvas.value.height);
  ctx.drawImage(originalImage.value, cropX.value, cropY.value, originalImage.value.width * cropZoom.value, originalImage.value.height * cropZoom.value);

  // Draw overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  // Dim the whole area
  ctx.fillRect(0, 0, cropCanvas.value.width, cropCanvas.value.height);

  const isFree = activeRatio.value === 'free';
  const ratioNum = isFree ? 1 : Number(activeRatio.value);
  const cropW = isFree ? cropCanvas.value.width * 0.8 : (cropCanvas.value.height * 0.8) * ratioNum;
  const cropH = cropCanvas.value.height * 0.8;
  
  const cx = (cropCanvas.value.width - cropW) / 2;
  const cy = (cropCanvas.value.height - cropH) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(cx, cy, cropW, cropH);
  ctx.clip();
  ctx.clearRect(cx, cy, cropW, cropH);
  ctx.drawImage(originalImage.value, cropX.value, cropY.value, originalImage.value.width * cropZoom.value, originalImage.value.height * cropZoom.value);
  ctx.restore();

  // Draw border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx, cy, cropW, cropH);
};

const handleZoom = (e: WheelEvent) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  zoom(delta);
};

const zoom = (delta: number) => {
  const oldZoom = cropZoom.value;
  cropZoom.value = Math.max(0.1, Math.min(5, cropZoom.value + delta));
  
  // Zoom from center
  const centerX = cropCanvas.value!.width / 2;
  const centerY = cropCanvas.value!.height / 2;
  cropX.value = centerX - (centerX - cropX.value) * (cropZoom.value / oldZoom);
  cropY.value = centerY - (centerY - cropY.value) * (cropZoom.value / oldZoom);
  
  drawCropCanvas();
};

const startDrag = (e: MouseEvent | TouchEvent) => {
  isDraggingImage.value = true;
  const pos = getPos(e);
  lastMousePos.value = pos;
};

const onDrag = (e: MouseEvent | TouchEvent) => {
  if (!isDraggingImage.value) return;
  const pos = getPos(e);
  cropX.value += pos.x - lastMousePos.value.x;
  cropY.value += pos.y - lastMousePos.value.y;
  lastMousePos.value = pos;
  drawCropCanvas();
};

const endDrag = () => {
  isDraggingImage.value = false;
};

const getPos = (e: MouseEvent | TouchEvent) => {
  const rect = cropCanvas.value!.getBoundingClientRect();
  if ('touches' in e) {
    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
  }
  return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
};

const setRatio = (r: any) => {
  activeRatio.value = r;
  drawCropCanvas();
};

const resetCrop = () => initCropper();

const goToSplit = () => {
  // Capture crop
  const canvas = document.createElement('canvas');
  const isFree = activeRatio.value === 'free';
  const ratioNum = isFree ? 1 : Number(activeRatio.value);
  const cropW = isFree ? cropCanvas.value!.width * 0.8 : (cropCanvas.value!.height * 0.8) * ratioNum;
  const cropH = cropCanvas.value!.height * 0.8;
  const cx = (cropCanvas.value!.width - cropW) / 2;
  const cy = (cropCanvas.value!.height - cropH) / 2;

  // We want high resolution export. 1080px width is standard.
  const exportScale = 1080 / cropW;
  canvas.width = 1080;
  canvas.height = cropH * exportScale;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(originalImage.value!, 
    (cx - cropX.value) / cropZoom.value, 
    (cy - cropY.value) / cropZoom.value, 
    cropW / cropZoom.value, 
    cropH / cropZoom.value,
    0, 0, canvas.width, canvas.height);

  croppedImage.value = canvas;
  generateSlices();
  currentStep.value = 'split';
};

const generateSlices = () => {
  if (!croppedImage.value) return;
  const canvas = croppedImage.value;
  const h = canvas.height;
  const w = canvas.width;
  
  const points = [0, ...splitLines.value.map(p => (p / 100) * h), h].sort((a,b) => a-b);
  const newSlices = [];

  for (let i = 0; i < 4; i++) {
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = w;
    sliceCanvas.height = points[i+1] - points[i];
    const sCtx = sliceCanvas.getContext('2d');
    sCtx?.drawImage(canvas, 0, points[i], w, sliceCanvas.height, 0, 0, w, sliceCanvas.height);
    newSlices.push(sliceCanvas.toDataURL('image/jpeg', 0.9));
  }
  slices.value = newSlices;
};

watch(splitLines, () => {
  generateSlices();
}, { deep: true });

const applySplitPreset = (values: number[]) => {
  splitLines.value = [...values];
};

const simulateTap = () => {
  isExpanded.value = !isExpanded.value;
};

const goToDownload = () => {
  currentStep.value = 'download';
};

const downloadSingle = (idx: number) => {
  const link = document.createElement('a');
  link.href = slices.value[idx];
  link.download = `tap-to-transform-${idx + 1}.jpg`;
  link.click();
};

const downloadAll = async () => {
  isZipping.value = true;
  // Fallback: If JSZip is not available, download one by one
  const JSZip = (window as any).JSZip;
  if (!JSZip) {
    for (let i = 0; i < slices.value.length; i++) {
      downloadSingle(i);
      await new Promise(r => setTimeout(r, 500));
    }
    isZipping.value = false;
    return;
  }

  const zip = new JSZip();
  slices.value.forEach((s, i) => {
    const base64 = s.split(',')[1];
    zip.file(`slice-${i + 1}.jpg`, base64, { base64: true });
  });

  zip.generateAsync({ type: 'blob' }).then((content: Blob) => {
    const saveAs = (window as any).saveAs;
    if (saveAs) {
      saveAs(content, 'tap-to-transform.zip');
    } else {
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tap-to-transform.zip';
      link.click();
    }
    isZipping.value = false;
  });
};

const copyCaption = () => {
  const text = `タップで変身！🐴✨ / Tap to transform! Did it work? 🔥 #TapToTransform\nCreated on https://top-x.co/tools/tap-to-transform`;
  navigator.clipboard.writeText(text).then(() => {
    captionCopied.value = true;
    setTimeout(() => captionCopied.value = false, 2000);
  });
};

const resetAll = () => {
  currentStep.value = 'landing';
  originalImage.value = null;
  slices.value = [];
  imageLoaded.value = false;
};

const selectExample = (ex: any) => {
  // Just for visual effect in this demo, usually would prompt to upload or show more
};
</script>

<style scoped>
.tap-to-transform-view {
  min-height: 80vh;
}

.gradient-text {
  background: linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
}

.explanation-box {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}

.example-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.example-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.example-card:hover {
  transform: translateY(-5px);
}

.example-img-placeholder {
  height: 80px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.8rem;
}

.upload-area {
  border: 3px dashed rgba(255, 255, 255, 0.2);
  border-radius: 30px;
  padding: 60px 20px;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: var(--primary-color, #00d2ff);
  background: rgba(0, 210, 255, 0.02);
}

.cropper-wrapper {
  position: relative;
  background: #000;
  height: 500px;
  overflow: hidden;
  border-radius: 8px;
  cursor: move;
}

.cropper-controls {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
}

.cropper-controls button {
  pointer-events: auto;
}

.x-feed-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2px;
  max-width: 400px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  background: #15202b;
  border: 1px solid #38444d;
}

.feed-slice-container {
  position: relative;
  aspect-ratio: 16/9;
  background: #000;
}

.feed-slice-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.slice-number {
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(0,0,0,0.6);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.x-expanded-view {
  max-width: 400px;
  margin: 0 auto;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  border: 4px solid #3a7bd5;
}

.stacked-slices {
  display: flex;
  flex-direction: column;
  gap: 0;
  transition: transform 0.5s ease-in-out;
}

.stacked-slice-img {
  width: 100%;
  display: block;
}

.final-slices-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.final-slice-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
}

.final-slice-item img {
  display: block;
  width: 100%;
}

.download-single {
  position: absolute;
  bottom: 5px;
  right: 5px;
  opacity: 0.8;
}

.download-single:hover {
  opacity: 1;
}

.rounded-xl {
  border-radius: 1.5rem;
}

.has-background-dark-soft {
  background-color: rgba(255, 255, 255, 0.03);
}

@media (max-width: 768px) {
  .final-slices-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
