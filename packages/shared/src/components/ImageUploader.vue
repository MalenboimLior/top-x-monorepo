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
          <div
            class="crop-area"
            :style="{ width: cropWidth + 'px', height: cropHeight + 'px' }"
            @mousedown="startDrag"
            @mousemove="duringDrag"
            @mouseup="endDrag"
            @mouseleave="endDrag"
            @wheel.prevent="onWheel"
          >
            <img
              ref="imageRef"
              :src="selectedImage"
              draggable="false"
              :style="{ transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})` }"
            />
          </div>
          <input type="range" min="0.5" max="3" step="0.01" v-model.number="scale" class="mt-2" />
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
let dragging = false;
let startX = 0;
let startY = 0;

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

function startDrag(e: MouseEvent) {
  dragging = true;
  startX = e.clientX - offsetX.value;
  startY = e.clientY - offsetY.value;
}
function duringDrag(e: MouseEvent) {
  if (!dragging) return;
  offsetX.value = e.clientX - startX;
  offsetY.value = e.clientY - startY;
}
function endDrag() {
  dragging = false;
}
function onWheel(e: WheelEvent) {
  const delta = e.deltaY < 0 ? 0.05 : -0.05;
  scale.value = Math.min(3, Math.max(0.5, scale.value + delta));
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
  const sx = (-offsetX.value) / scale.value;
  const sy = (-offsetY.value) / scale.value;
  const sWidth = props.cropWidth / scale.value;
  const sHeight = props.cropHeight / scale.value;
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
.crop-area {
  overflow: hidden;
  position: relative;
  margin: 0 auto;
}
.crop-area img {
  cursor: move;
  user-select: none;
  pointer-events: none;
}
.modal-card-foot {
  justify-content: flex-end;
}
.mt-2 {
  margin-top: 0.5rem;
}
</style>
