
<template>
  <div>
    <div class="field has-addons">
      <div class="control is-expanded">
        <input v-model="internalValue" class="input" type="text" />
      </div>
      <div class="control">
        <CustomButton type="is-info" label="Upload" @click="openFileDialog" />
        <input ref="fileInput" type="file" accept="image/*" class="is-hidden" @change="onFileSelected" />
      </div>
    </div>

    <div v-if="selectedImage" class="modal is-active">
      <div class="modal-background" @click="closeCrop"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Crop Image</p>
          <button class="delete" aria-label="close" @click="closeCrop"></button>
        </header>
        <section class="modal-card-body">
          <div class="crop-wrapper" :style="{ width: cropWidth + 'px' }">
            <div
              class="crop-area"
              :style="{ width: cropWidth + 'px', height: cropHeight + 'px' }"
            >
              <img
                ref="imageRef"
                :src="selectedImage"
                draggable="false"
                :style="{ transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)` }"
                @load="onImageLoad"
              />
            </div>
            <div class="crop-dimensions">{{ cropWidth }} x {{ cropHeight }}</div>
          </div>
        </section>
        <footer class="modal-card-foot">
          <CustomButton type="is-primary" label="Crop & Upload" @click="cropAndUpload" />
          <CustomButton type="is-light" label="Cancel" @click="closeCrop" />
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@top-x/shared';
import CustomButton from './CustomButton.vue';

interface Props {
  modelValue: string;
  uploadFolder: string;
  cropWidth: number;
  cropHeight: number;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:modelValue']);

const internalValue = ref(props.modelValue);
watch(
  () => props.modelValue,
  val => {
    internalValue.value = val;
  }
);
watch(internalValue, val => emit('update:modelValue', val));

const fileInput = ref<HTMLInputElement | null>(null);
const selectedImage = ref<string | null>(null);
const imageFile = ref<File | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);

const offsetX = ref(0);
const offsetY = ref(0);
const scale = ref(1);

function openFileDialog() {
  fileInput.value?.click();
}

function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = event => {
    selectedImage.value = event.target?.result as string;
  };
  reader.readAsDataURL(file);
  imageFile.value = file;
  offsetX.value = 0;
  offsetY.value = 0;
  scale.value = 1;
}

function onImageLoad() {
  if (!imageRef.value) return;
  const imgW = imageRef.value.naturalWidth;
  const imgH = imageRef.value.naturalHeight;
  const cropW = props.cropWidth;
  const cropH = props.cropHeight;

  scale.value = Math.max(cropW / imgW, cropH / imgH);
  offsetX.value = (cropW - imgW * scale.value) / 2;
  offsetY.value = (cropH - imgH * scale.value) / 2;
  clampOffset();
}

function clampOffset() {
  if (!imageRef.value) return;
  const imgW = imageRef.value.naturalWidth;
  const imgH = imageRef.value.naturalHeight;
  const scaledW = imgW * scale.value;
  const scaledH = imgH * scale.value;

  const lowerX = cropWidth - scaledW;
  const lowerY = cropHeight - scaledH;

  offsetX.value = Math.max(lowerX, Math.min(0, offsetX.value));
  offsetY.value = Math.max(lowerY, Math.min(0, offsetY.value));
}

function closeCrop() {
  selectedImage.value = null;
}

async function cropAndUpload() {
  const img = imageRef.value;
  const file = imageFile.value;
  if (!img || !file) return;
  const canvas = document.createElement('canvas');
  canvas.width = props.cropWidth;
  canvas.height = props.cropHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let sx = -offsetX.value / scale.value;
  let sy = -offsetY.value / scale.value;
  const sWidth = props.cropWidth / scale.value;
  const sHeight = props.cropHeight / scale.value;

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, props.cropWidth, props.cropHeight);
  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, props.cropWidth, props.cropHeight);

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
  if (!blob) return;
  const path = `${props.uploadFolder}/${Date.now()}_${file.name}`;
  const sRef = storageRef(storage, path);
  await uploadBytes(sRef, blob);
  internalValue.value = await getDownloadURL(sRef);
  selectedImage.value = null;
}
</script>

<style scoped>
.crop-wrapper {
  margin: 0 auto;
  text-align: center;
}

.crop-area {
  overflow: hidden;
  position: relative;
  border: 2px dashed #4a4a4a;
  box-sizing: content-box;
  background-color: white;
}
.crop-area img {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  user-select: none;
  pointer-events: none;
}

.crop-dimensions {
  margin-top: 0.5rem;
  color: #4a4a4a;
  font-size: 0.9rem;
}
.modal-card-foot {
  justify-content: flex-end;
}
</style>