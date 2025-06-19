<template>
  <section class="section">
    <div class="container has-text-centered">
      <div class="theme-toggle">
        <button class="button is-small" @click="isDark = !isDark">
          Toggle {{ isDark ? 'Light' : 'Dark' }} Mode
        </button>
      </div>

      <div class="pyramid" :class="{ dark: isDark }">
        <div v-for="(row, rowIndex) in pyramid" :key="rowIndex" class="pyramid-row">
          <div
            v-for="(slot, colIndex) in row"
            :key="colIndex"
            class="pyramid-slot box"
            :class="[
              { 'selected': isSelected(slot.image) },
              { 'highlight-empty': (selectedItem || draggedItem) && !slot.image },
              { 'drop-hover': isDroppable(rowIndex, colIndex) },
              isDark ? 'dark-slot' : ''
            ]"
            @dragover.prevent
            @dragenter.prevent="onDragEnterSlot(rowIndex, colIndex)"
            @dragleave.prevent="onDragLeaveSlot"
            @drop="() => onDropToSlot(rowIndex, colIndex)"
            @click="onSlotClick(rowIndex, colIndex)"
          >
            <div v-if="slot.image" class="draggable-item slot-style">
              <img :src="slot.image.src" class="draggable-image" />
              <div class="image-label">{{ slot.image.label }}</div>
            </div>
            <div v-else class="tier-label">{{ toRoman(rowIndex + 1) }}</div>
          </div>
        </div>
      </div>

      <h2 class="subtitle mt-6" :class="{ 'has-text-white': isDark }">Image Pool</h2>
      <div
        class="image-pool drop-zone"
        :class="{ dark: isDark }"
        @dragover.prevent
        @drop="onDropToPool"
      >
        <div
          v-for="image in imagePool"
          :key="image.id"
          class="pyramid-slot image-box slot-style"
          :class="[{ 'selected': isSelected(image) }, isDark ? 'dark-slot' : '']"
          draggable="true"
          @dragstart="() => onDragStart(image)"
          @click.stop="() => onTapSelect(image)"
        >
          <img :src="image.src" class="draggable-image" />
          <div class="image-label">{{ image.label }}</div>
        </div>
      </div>

      <button class="button is-primary mt-4" @click="submitPyramid">Submit</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ImageItem, PyramidSlot } from '@top-x/shared/types/pyramid';

const props = defineProps<{
  items: ImageItem[];
}>();

const emit = defineEmits<{
  (e: 'submit', pyramid: PyramidSlot[][]): void;
}>();

const isDark = ref(false);
const imagePool = ref<ImageItem[]>([]);
const pyramid = ref<PyramidSlot[][]>([
  [{ image: null }],
  [{ image: null }, { image: null }],
  [{ image: null }, { image: null }, { image: null }],
  [{ image: null }, { image: null }, { image: null }, { image: null }],
]);
const draggedItem = ref<ImageItem | null>(null);
const selectedItem = ref<ImageItem | null>(null);
const droppableSlot = ref<{ row: number; col: number } | null>(null);

watch(
  () => props.items,
  (newItems) => {
    console.log('PyramidTable: Items prop updated:', newItems);
    imagePool.value = [...newItems];
    console.log('PyramidTable: imagePool initialized:', imagePool.value);
  },
  { immediate: true }
);

function isSelected(image: ImageItem | null): boolean {
  return image !== null && selectedItem.value?.id === image.id;
}

function isDroppable(row: number, col: number): boolean {
  if (!selectedItem.value && !draggedItem.value) {
    return false;
  }
  return droppableSlot.value?.row === row && droppableSlot.value?.col === col;
}

function onDragStart(image: ImageItem) {
  draggedItem.value = image;
  selectedItem.value = image;
  console.log('PyramidTable: Drag started for item:', image);
}

function onTapSelect(image: ImageItem) {
  selectedItem.value = selectedItem.value?.id === image.id ? null : image;
  draggedItem.value = selectedItem.value;
  console.log('PyramidTable: Item selected via tap:', selectedItem.value);
}

function onDragEnterSlot(row: number, col: number) {
  if (draggedItem.value || selectedItem.value) {
    droppableSlot.value = { row, col };
    console.log('PyramidTable: Drag entered slot:', { row, col });
  }
}

function onDragLeaveSlot() {
  droppableSlot.value = null;
  console.log('PyramidTable: Drag left slot');
}

function onSlotClick(row: number, col: number) {
  console.log('PyramidTable: Slot clicked:', { row, col });
  const targetSlot = pyramid.value[row][col];
  const targetImage = targetSlot.image;

  if (!selectedItem.value && targetImage) {
    selectedItem.value = targetImage;
    draggedItem.value = targetImage;
    console.log('PyramidTable: Selected image from slot:', targetImage);
    return;
  }

  if (!selectedItem.value) {
    console.log('PyramidTable: No selected item, ignoring click');
    return;
  }

  const fromSlot = findSlotContaining(selectedItem.value.id);
  const fromInPool = imagePool.value.some(i => i.id === selectedItem.value!.id);

  if (targetImage) {
    if (fromInPool) {
      imagePool.value = imagePool.value.filter(i => i.id !== selectedItem.value!.id);
      imagePool.value.push(targetImage);
      console.log('PyramidTable: Swapped pool item with slot item:', { pool: imagePool.value });
    } else if (fromSlot) {
      fromSlot.image = targetImage;
      console.log('PyramidTable: Swapped slot items:', { fromSlot, targetImage });
    }
  } else if (!fromInPool && fromSlot) {
    fromSlot.image = null;
    console.log('PyramidTable: Removed item from slot:', fromSlot);
  } else if (fromInPool) {
    imagePool.value = imagePool.value.filter(i => i.id !== selectedItem.value!.id);
    console.log('PyramidTable: Removed item from pool:', imagePool.value);
  }

  targetSlot.image = selectedItem.value;
  selectedItem.value = null;
  draggedItem.value = null;
  droppableSlot.value = null;
  console.log('PyramidTable: Placed item in slot:', { row, col, image: targetSlot.image });
}

function onDropToSlot(row: number, col: number) {
  console.log('PyramidTable: Drop to slot:', { row, col });
  onSlotClick(row, col);
}

function onDropToPool() {
  if (!selectedItem.value) {
    console.log('PyramidTable: No selected item for pool drop');
    return;
  }
  const slot = findSlotContaining(selectedItem.value.id);
  if (slot) {
    slot.image = null;
    console.log('PyramidTable: Removed item from slot for pool drop:', slot);
  }
  if (!imagePool.value.some(i => i.id === selectedItem.value!.id)) {
    imagePool.value.push(selectedItem.value);
    console.log('PyramidTable: Added item back to pool:', imagePool.value);
  }
  selectedItem.value = null;
  draggedItem.value = null;
  droppableSlot.value = null;
}

function findSlotContaining(imageId: string): PyramidSlot | null {
  for (const row of pyramid.value) {
    for (const slot of row) {
      if (slot.image?.id === imageId) {
        return slot;
      }
    }
  }
  return null;
}

function toRoman(num: number): string {
  const numerals = ['I', 'II', 'III', 'IV'];
  return numerals[num - 1] || `${num}`;
}

function submitPyramid() {
  console.log('PyramidTable: Submitting pyramid:', pyramid.value);
  emit('submit', pyramid.value);
}
</script>

<style scoped>
.section {
  padding: 1rem;
}
.theme-toggle {
  margin-bottom: 1rem;
  text-align: right;
}
.dark {
  background-color: #121212;
  color: #eee;
}
.dark-slot {
  background-color: #1f1f1f !important;
  border-color: #444 !important;
}
.pyramid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  width: fit-content;
  margin: 0 auto;
}
.pyramid-row {
  display: flex;
  justify-content: center;
  gap: 0.2rem;
}
.pyramid-slot {
  width: 18vw;
  height: 18vw;
  max-width: 80px;
  max-height: 80px;
  min-width: 50px;
  min-height: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border: 1px dashed #ccc;
  cursor: pointer;
  padding: 0.25rem;
  transition: background-color 0.2s, transform 0.2s;
  position: relative;
  border-radius: 0.75rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
  text-align: center;
  overflow: hidden;
  margin-bottom: 0px !important;

}
.pyramid-slot.drop-hover {
  background-color: #def0ff;
  transform: scale(1.05);
  border-color: #3298dc;
}
.tier-label {
  color: #bbb;
  font-size: 1.2rem;
  font-weight: bold;
  pointer-events: none;
}
.image-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  border: 2px dashed #999;
  padding: 1rem;
  margin-top: 1rem;
  background-color: #fff;
}
.image-box {
  width: 18vw;
  height: 18vw;
  max-width: 80px;
  max-height: 80px;
  min-width: 50px;
  min-height: 50px;
  padding: 0;
}
.slot-style {
  width: 100%;
  height: 100%;
  border-radius: 0.75rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
  background: linear-gradient(to bottom, #ffffff, #f1f1f1);
  border: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.draggable-image {
  max-width: 80%;
  max-height: 60px;
  user-select: none;
  touch-action: none;
  transition: transform 0.2s ease;
}
.image-label {
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 0.2rem;
  color: #333;
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 0.2rem;
}
.selected {
  border: 2px solid #3273dc;
  box-shadow: 0 0 0 2px #3273dc33;
}
.highlight-empty {
  background-color: #fffae6;
  border-color: #ffd35c;
  animation: pulse 1s infinite alternate;
}
@keyframes pulse {
  from { box-shadow: 0 0 0 0 rgba(255, 211, 92, 0.6); }
  to { box-shadow: 0 0 0 8px rgba(255, 211, 92, 0); }
}
.subtitle {
  color: #333;
}
.button.is-primary {
  background-color: #3273dc;
}

/* Mobile-specific adjustments */
@media screen and (max-width: 767px) {
  .section {
    padding: 0.5rem;
  }
  .pyramid-slot,
  .image-box {
    width: 20vw;
    height: 20vw;
    min-width: 40px;
    min-height: 40px;
    margin: 2px;
  }
  .pyramid-row {
    min-height: 20vw;
  }
  .draggable-image {
    max-height: 50px;
  }
  .image-label {
    font-size: 0.65rem;
    margin-top: 0.1rem;
  }
  .tier-label {
    font-size: 1rem;
  }
  .subtitle {
    font-size: 1.2rem;
  }
}
</style>