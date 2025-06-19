<!-- Drag-and-drop pyramid game board -->
<template>
  <section class="section">
    <div class="container has-text-centered">
      <div class="pyramid">
        <div v-for="(row, rowIndex) in pyramid" :key="rowIndex" class="pyramid-row">
          <div
            v-for="(slot, colIndex) in row"
            :key="colIndex"
            class="pyramid-slot box"
            @dragover.prevent
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

      <h2 class="subtitle mt-6">Image Pool</h2>
      <div class="image-pool drop-zone" @dragover.prevent @drop="onDropToPool">
        <div
          v-for="image in imagePool"
          :key="image.id"
          class="pyramid-slot image-box slot-style"
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

const imagePool = ref<ImageItem[]>([]);
const pyramid = ref<PyramidSlot[][]>([
  [{ image: null }],
  [{ image: null }, { image: null }],
  [{ image: null }, { image: null }, { image: null }],
  [{ image: null }, { image: null }, { image: null }, { image: null }],
]);

const draggedItem = ref<ImageItem | null>(null);

// Initialize imagePool with props.items
watch(
  () => props.items,
  (newItems) => {
    console.log('PyramidTable: Items prop updated:', newItems);
    imagePool.value = [...newItems];
    console.log('PyramidTable: imagePool initialized:', imagePool.value);
  },
  { immediate: true }
);

function onDragStart(image: ImageItem) {
  draggedItem.value = image;
  console.log('PyramidTable: Drag started for item:', image);
}

function onTapSelect(image: ImageItem) {
  draggedItem.value = image;
  console.log('PyramidTable: Item selected via tap:', image);
}

function onSlotClick(row: number, col: number) {
  console.log('PyramidTable: Slot clicked:', { row, col });
  const targetSlot = pyramid.value[row][col];
  const targetImage = targetSlot.image;

  if (!draggedItem.value && targetImage) {
    draggedItem.value = targetImage;
    console.log('PyramidTable: Selected image from slot:', targetImage);
    return;
  }

  if (!draggedItem.value) {
    console.log('PyramidTable: No dragged item, ignoring click');
    return;
  }

  const fromSlot = findSlotContaining(draggedItem.value.id);
  const fromInPool = imagePool.value.some(i => i.id === draggedItem.value!.id);

  if (targetImage) {
    if (fromInPool) {
      imagePool.value = imagePool.value.filter(i => i.id !== draggedItem.value!.id);
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
    imagePool.value = imagePool.value.filter(i => i.id !== draggedItem.value!.id);
    console.log('PyramidTable: Removed item from pool:', imagePool.value);
  }

  targetSlot.image = draggedItem.value;
  draggedItem.value = null;
  console.log('PyramidTable: Placed item in slot:', { row, col, image: targetSlot.image });
}

function onDropToSlot(row: number, col: number) {
  console.log('PyramidTable: Drop to slot:', { row, col });
  onSlotClick(row, col);
}

function onDropToPool() {
  if (!draggedItem.value) {
    console.log('PyramidTable: No dragged item for pool drop');
    return;
  }
  const slot = findSlotContaining(draggedItem.value.id);
  if (slot) {
    slot.image = null;
    console.log('PyramidTable: Removed item from slot for pool drop:', slot);
  }
  if (!imagePool.value.some(i => i.id === draggedItem.value!.id)) {
    imagePool.value.push(draggedItem.value);
    console.log('PyramidTable: Added item back to pool:', imagePool.value);
  }
  draggedItem.value = null;
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
.pyramid {
  margin: 0 auto;
  width: fit-content;
}
.pyramid-row {
  display: flex;
  justify-content: center;
}
.pyramid-slot {
  width: 100px;
  height: 100px;
  margin: 5px;
}
.draggable-image {
  max-width: 80px;
  max-height: 80px;
}
.image-pool {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}
</style>