
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
            class="crop-container"
            :style="{ width: cropWidth + 'px', height: cropHeight + 'px' }"
          >
            <img
              ref="image"
              :src="selectedImage ?? undefined"
              alt="Image to crop"
            />
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
import { ref } from 'vue';
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

const cropAndUpload = async () => {
  if (!image.value || !originalFile.value) return;

  const imgWidth = image.value.naturalWidth;
  const imgHeight = image.value.naturalHeight;

  const scale = Math.max(props.cropWidth / imgWidth, props.cropHeight / imgHeight);
  const sourceWidth = props.cropWidth / scale;
  const sourceHeight = props.cropHeight / scale;
  const sourceX = (imgWidth - sourceWidth) / 2;
  const sourceY = (imgHeight - sourceHeight) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = props.cropWidth;
  canvas.height = props.cropHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(
    image.value,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
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

.crop-container {
  position: relative;
  overflow: hidden;
  margin: 0 auto;
  border: 1px solid #dbdbdb;
}

.crop-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.controls {
  display: flex;
  justify-content: center;
}
</style>
