<template>
  <div class="image-uploader">
    <div v-if="modelValue">
      <img :src="modelValue" alt="Current image" style="max-width: 200px; height: auto;" />
      <button class="button is-primary" @click="selectImage">Change Image</button>
    </div>
    <button v-else class="button is-primary" @click="selectImage">Upload Image</button>

    <input
      type="file"
      ref="fileInput"
      @change="onFileChange"
      accept="image/*"
      style="display: none"
    />

    <div class="modal" :class="{ 'is-active': showModal }">
      <div class="modal-background" @click="cancel"></div>
      <div class="modal-content">
        <div class="box">
          <div
            class="image-crop-frame"
            :style="{
              width: props.cropWidth + 'px',
              height: props.cropHeight + 'px',
              transform: `scale(${previewScale})`,
              transformOrigin: 'top left',
              boxShadow: previewScale < 1 ? '0 0 0 2px #00d1b2' : undefined
            }"
            @mousedown="onMouseDownPreview"
            @wheel.prevent="onWheelPreview"
          >
            <img
              v-if="selectedImage"
              ref="image"
              class="image-crop-img"
              :src="selectedImage"
              alt="Image to crop"
              @load="onImageLoad"
              :style="{
                position: 'absolute',
                left: offset.x + 'px',
                top: offset.y + 'px',
                width: imgNatural.width * scale + 'px',
                height: imgNatural.height * scale + 'px',
                cursor: dragging ? 'grabbing' : 'grab',
                userSelect: 'none'
              }"
              draggable="false"
            />
          </div>
          <div class="zoom-controls mt-2 has-text-centered">
            <button class="button is-small mr-2" @click="zoomOut" :disabled="scale <= minScale">-</button>
            <span style="min-width: 60px; display: inline-block;">Zoom: {{ scale.toFixed(2) }}</span>
            <button class="button is-small ml-2" @click="zoomIn" :disabled="scale >= 3">+</button>
          </div>
          <div class="controls mt-4 has-text-centered">
            <button class="button is-success" @click="cropAndUpload">Upload</button>
            <button class="button is-danger ml-2" @click="cancel">Cancel</button>
          </div>
        </div>
      </div>
      <button class="modal-close is-large" aria-label="close" @click="cancel"></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { storage } from '@top-x/shared/';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Props {
  modelValue: string;
  uploadFolder: string;
  cropWidth: number;
  cropHeight: number;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:modelValue']);

const fileInput = ref<HTMLInputElement | null>(null);
const showModal = ref(false);
const selectedImage = ref<string | null>(null);
const originalFile = ref<File | null>(null);
const image = ref<HTMLImageElement | null>(null);

const offset = ref({ x: 0, y: 0 });
const startDrag = ref({ x: 0, y: 0 });
const dragging = ref(false);
const imgNatural = ref({ width: 1, height: 1 });
const scale = ref(1);
const minScale = ref(1);

// Responsive preview scaling
const maxPreviewWidth = 0.9 * window.innerWidth;
const maxPreviewHeight = 0.7 * window.innerHeight;
const previewScale = computed(() => {
  const scaleW = maxPreviewWidth / props.cropWidth;
  const scaleH = maxPreviewHeight / props.cropHeight;
  return Math.min(1, scaleW, scaleH);
});

// Helper to get coordinates in crop area space
const getPreviewCoords = (e: MouseEvent | WheelEvent) => {
  const rect = (e.target as HTMLElement).getBoundingClientRect();
  const px = (e.clientX - rect.left) / previewScale.value;
  const py = (e.clientY - rect.top) / previewScale.value;
  return { x: px, y: py };
};

// Mouse events for scaled preview
const onMouseDownPreview = (e: MouseEvent) => {
  dragging.value = true;
  const { x, y } = getPreviewCoords(e);
  startDrag.value = { x: x - offset.value.x, y: y - offset.value.y };
  window.addEventListener('mousemove', onMouseMovePreview);
  window.addEventListener('mouseup', onMouseUpPreview);
};
const onMouseMovePreview = (e: MouseEvent) => {
  if (!dragging.value) return;
  const { x, y } = getPreviewCoords(e);
  offset.value.x = x - startDrag.value.x;
  offset.value.y = y - startDrag.value.y;
  clampOffset();
};
const onMouseUpPreview = () => {
  dragging.value = false;
  window.removeEventListener('mousemove', onMouseMovePreview);
  window.removeEventListener('mouseup', onMouseUpPreview);
};

const onWheelPreview = (e: WheelEvent) => {
  if (!image.value) return;
  const { x, y } = getPreviewCoords(e);
  setZoom(scale.value + (e.deltaY < 0 ? 0.05 : -0.05), x, y);
};

const selectImage = () => {
  fileInput.value?.click();
};

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    originalFile.value = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      selectedImage.value = ev.target?.result as string;
      showModal.value = true;
    };
    reader.readAsDataURL(file);
  }
};

const onImageLoad = () => {
  if (!image.value) return;
  imgNatural.value = {
    width: image.value.naturalWidth,
    height: image.value.naturalHeight,
  };
  // Calculate min scale so image always covers crop area
  minScale.value = Math.max(
    props.cropWidth / imgNatural.value.width,
    props.cropHeight / imgNatural.value.height
  );
  scale.value = minScale.value;
  // Center image
  offset.value = {
    x: (props.cropWidth - imgNatural.value.width * scale.value) / 2,
    y: (props.cropHeight - imgNatural.value.height * scale.value) / 2,
  };
};

const clampOffset = () => {
  const imgW = imgNatural.value.width * scale.value;
  const imgH = imgNatural.value.height * scale.value;
  offset.value.x = Math.min(0, Math.max(offset.value.x, props.cropWidth - imgW));
  offset.value.y = Math.min(0, Math.max(offset.value.y, props.cropHeight - imgH));
};

const setZoom = (newScale: number, centerX?: number, centerY?: number) => {
  if (!image.value) return;
  const prevScale = scale.value;
  scale.value = Math.max(minScale.value, Math.min(3, newScale));

  // Calculate zoom center
  const mx = centerX ?? props.cropWidth / 2;
  const my = centerY ?? props.cropHeight / 2;

  // Adjust offsets to zoom toward the center
  offset.value.x = mx - ((mx - offset.value.x) * (prevScale / scale.value));
  offset.value.y = my - ((my - offset.value.y) * (prevScale / scale.value));

  clampOffset();
};

const zoomIn = () => setZoom(scale.value + 0.1);
const zoomOut = () => setZoom(scale.value - 0.1);

watch(scale, clampOffset);

const cropAndUpload = async () => {
  if (!image.value || !originalFile.value) return;

  const sx = (-offset.value.x) / scale.value;
  const sy = (-offset.value.y) / scale.value;
  const sWidth = props.cropWidth / scale.value;
  const sHeight = props.cropHeight / scale.value;

  const canvas = document.createElement('canvas');
  canvas.width = props.cropWidth;
  canvas.height = props.cropHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(
    image.value,
    sx,
    sy,
    sWidth,
    sHeight,
    0,
    0,
    props.cropWidth,
    props.cropHeight
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );
  if (!blob) return;

  const path = `${props.uploadFolder}/${Date.now()}_${originalFile.value.name}`;
  const sRef = storageRef(storage, path);
  await uploadBytes(sRef, blob);
  const url = await getDownloadURL(sRef);

  emit('update:modelValue', url);
  showModal.value = false;
  selectedImage.value = null;
};

const cancel = () => {
  showModal.value = false;
  selectedImage.value = null;
};
</script>

<style scoped>
.image-uploader {
  margin-bottom: 1rem;
}

.image-crop-frame {
  position: relative;
  overflow: hidden;
  margin: 0 auto;
  border: 2px solid #00d1b2;
  background: #222;
  cursor: grab;
  user-select: none;
  box-sizing: border-box;
}

.image-crop-img {
  will-change: transform;
  width: unset !important;
  height: unset !important;
  max-width: none !important;
  max-height: 100% !important;
  /* Prevent any inherited stretching */
}

.zoom-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.controls {
  display: flex;
  justify-content: center;
}
</style>