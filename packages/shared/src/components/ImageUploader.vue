<template>
  <div class="image-uploader">
    <div v-if="modelValue">
      <img :src="modelValue" alt="Current image" class="uploader-current-image" />
      <button type="button" class="uploader-button uploader-button-primary" @click="selectImage">Change Image</button>
    </div>
    <button type="button" v-else class="uploader-button uploader-button-primary" @click="selectImage">
      Upload Image
    </button>

    <input
      type="file"
      ref="fileInput"
      @change="onFileChange"
      accept="image/*"
      style="display: none"
    />

    <div class="uploader-modal" :class="{ 'uploader-modal-active': showModal }">
      <div class="uploader-modal-background" @click="cancel"></div>
      <div class="uploader-modal-content">
        <div class="uploader-box">
          <div v-if="uploadError" class="uploader-error">
            {{ uploadError }}
          </div>
          <div class="uploader-crop-wrapper" :style="{
            width: (props.cropWidth * previewScale) + 'px',
            height: (props.cropHeight * previewScale) + 'px'
          }">
            <div
              ref="cropFrame"
              class="uploader-crop-frame"
              :style="{
                width: props.cropWidth + 'px',
                height: props.cropHeight + 'px',
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
                boxShadow: previewScale < 1 ? '0 0 0 2px #00d1b2' : 'none'
              }"
              @mousedown="onMouseDownPreview"
              @wheel.prevent="onWheelPreview"
            >
            <img
              v-if="selectedImage"
              ref="image"
              class="uploader-crop-image"
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
          </div>
          <div class="uploader-zoom-controls">
            <button
              type="button"
              class="uploader-button uploader-button-small"
              @click="zoomOut"
              :disabled="scale <= minScale"
            >
              -
            </button>
            <span class="uploader-zoom-label">Zoom: {{ scale.toFixed(2) }}</span>
            <button
              type="button"
              class="uploader-button uploader-button-small"
              @click="zoomIn"
              :disabled="scale >= 3"
            >
              +
            </button>
          </div>
          <div class="uploader-controls">
            <button
              type="button"
              class="uploader-button uploader-button-success"
              @click="cropAndUpload"
              :disabled="!image || !originalFile"
            >
              Upload
            </button>
            <button
              type="button"
              class="uploader-button uploader-button-cancel"
              @click="cancel"
              :disabled="!image || !originalFile"
            >
              Cancel
            </button>
          </div>
        </div>
        <button type="button" class="uploader-modal-close" aria-label="close" @click="cancel"></button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { storage } from '@top-x/shared/';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Props {
  modelValue: string | null;
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
const cropFrame = ref<HTMLDivElement | null>(null);
const uploadError = ref<string | null>(null);

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

// Validate uploadFolder
const validatedUploadFolder = computed(() => {
  if (!props.uploadFolder || props.uploadFolder.includes('//') || props.uploadFolder.startsWith('/') || props.uploadFolder.endsWith('/')) {
    return 'pyramid/default';
  }
  return props.uploadFolder;
});

// Helper to get coordinates in crop area space
const getPreviewCoords = (e: MouseEvent | WheelEvent) => {
  if (!cropFrame.value) return { x: 0, y: 0 };
  const rect = cropFrame.value.getBoundingClientRect();
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
  uploadError.value = null;
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
  minScale.value = Math.max(
    props.cropWidth / imgNatural.value.width,
    props.cropHeight / imgNatural.value.height
  );
  if (minScale.value > 1) {
    scale.value = 1; // Allow zooming in if image is smaller than crop frame
  } else {
    scale.value = minScale.value; // Fit image to frame if larger
  }
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

  const mx = centerX ?? props.cropWidth / 2;
  const my = centerY ?? props.cropHeight / 2;

  offset.value.x = mx - ((mx - offset.value.x) * (prevScale / scale.value));
  offset.value.y = my - ((my - offset.value.y) * (prevScale / scale.value));

  clampOffset();
};

const zoomIn = () => setZoom(scale.value + 0.1);
const zoomOut = () => setZoom(scale.value - 0.1);

watch(scale, clampOffset);

const cropAndUpload = async () => {
  if (!image.value || !originalFile.value) return;

  uploadError.value = null;
  const sx = (-offset.value.x) / scale.value;
  const sy = (-offset.value.y) / scale.value;
  const sWidth = props.cropWidth / scale.value;
  const sHeight = props.cropHeight / scale.value;

  const canvas = document.createElement('canvas');
  canvas.width = props.cropWidth;
  canvas.height = props.cropHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    uploadError.value = 'Failed to create canvas context';
    return;
  }

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
  if (!blob) {
    uploadError.value = 'Failed to create image blob';
    return;
  }

  try {
    const path = `${validatedUploadFolder.value}/${Date.now()}_${originalFile.value.name}`;
    const sRef = storageRef(storage, path);
    await uploadBytes(sRef, blob);
    const url = await getDownloadURL(sRef);
    emit('update:modelValue', url);
    showModal.value = false;
    selectedImage.value = null;
  } catch (error: any) {
    uploadError.value = `Upload failed: ${error.message}`;
    console.error('Upload error:', error);
  }
};

const cancel = () => {
  uploadError.value = null;
  showModal.value = false;
  selectedImage.value = null;
};
</script>

<style scoped>
/* Targeted reset for isolation without breaking layout */
.image-uploader,
.uploader-modal,
.uploader-modal-content,
.uploader-box,
.uploader-crop-frame,
.uploader-crop-image {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Container */
.image-uploader {
  display: block;
  margin-bottom: 1rem;
}

/* Current image */
.uploader-current-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  display: block;
  object-fit: contain;
}

/* Modal */
.uploader-modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
}

.uploader-modal-active {
  display: flex;
  align-items: center;
  justify-content: center;
}

.uploader-modal-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  cursor: pointer;
  z-index: 1000;
}

.uploader-modal-content {
  display: block;
  width: fit-content;
  max-width: 90vw;
  max-height: 90vh;
  position: relative;
  z-index: 1001;
  pointer-events: auto;
}

/* Box */
.uploader-box {
  display: block;
  background: #1a1a1a; /* TOP-X dark theme */
  padding: 1.5rem;
  border-radius: 8px;
  color: #ffffff;
  z-index: 1002;
  pointer-events: auto;
  width: fit-content;
  margin: 0 auto;
}

/* Error */
.uploader-error {
  display: block;
  background: #ff4d4f;
  color: #ffffff;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

/* Crop wrapper */
.uploader-crop-wrapper {
  position: relative;
  margin: 0 auto;
}

/* Crop frame */
.uploader-crop-frame {
  position: relative;
  overflow: hidden;
  border: 2px solid #00d1b2;
  background: #222222;
  cursor: grab;
  user-select: none;
}

/* Crop image */
.uploader-crop-image {
  position: absolute;
  width: auto;
  height: auto;
  max-width: none;
  max-height: none;
  will-change: transform;
}

/* Zoom controls */

.uploader-zoom-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0.5rem 0;
  gap: 0.5rem;
  pointer-events: auto;
}

.uploader-zoom-label {
  display: inline-block;
  min-width: 60px;
  text-align: center;
  color: #ffffff;
  font-size: 1rem;
}

/* Controls */

.uploader-controls {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  pointer-events: auto;
}

/* Buttons */
.uploader-button {
  display: inline-block;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #ffffff;
  font-size: 1rem;
  background: #00d1b2; /* Default */
  transition: background 0.2s;
}

.uploader-button-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.uploader-button-primary {
  background: #00d1b2;
}

.uploader-button-success {
  background: #48c774;
}

.uploader-button-cancel {
  background: #ff4d4f;
}

.uploader-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.uploader-button:hover:not(:disabled) {
  filter: brightness(1.1);
}

/* Modal close button */
.uploader-modal-close {
  display: block;
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  background: #ff4d4f;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #ffffff;
  font-size: 1.25rem;
  line-height: 2.5rem;
  text-align: center;
}
</style>
