<template>
  <section class="section">
    <div class="container has-text-centered">
      <h2 class="subtitle has-text-white">{{ props.gameHeader }}</h2>

      <div class="pyramid">
        <div v-for="(row, rowIndex) in pyramid" :key="rowIndex" class="pyramid-row-container">
          <div class="row-label has-text-white">
            {{ rows[rowIndex]?.label || toRoman(rowIndex + 1) }}
          </div>
          <div class="pyramid-row">
            <div
              v-for="(slot, colIndex) in row"
              :key="colIndex"
              class="pyramid-slot box"
              :class="[
                { 'selected': isSelected(slot.image) },
                { 'highlight-empty': (selectedItem || draggedItem) && !slot.image },
                { 'drop-hover': isDroppable(rowIndex, colIndex) },
                'dark-slot'
              ]"
              :style="{ backgroundColor: rows[rowIndex]?.color || '' }"
              @dragover.prevent
              @dragenter.prevent="onDragEnterSlot(rowIndex, colIndex)"
              @dragleave.prevent="onDragLeaveSlot"
              @drop="() => onDropToSlot(rowIndex, colIndex)"
              @click="onSlotClick(rowIndex, colIndex)"
            >
              <div v-if="slot.image" class="draggable-item slot-style">
                <img :src="slot.image.src" class="draggable-image" />
                <div class="image-label">{{ slot.image.label }}</div>
                <div class="color-indicator" :style="{ backgroundColor: slot.image.color || '#fff' }"></div>
              </div>
              <div v-else class="tier-label">{{ toRoman(rowIndex + 1) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Worst Item Slot -->
      <div class="worst-item-container">
        <h3 class="subtitle has-text-centered has-text-white">{{ props.worstHeader }}</h3>
        <div
          class="pyramid-slot box worst-slot dark-slot"
          :class="[
            { 'selected': isSelected(worstItem) },
            { 'highlight-empty': (selectedItem || draggedItem) && !worstItem },
            { 'drop-hover': isDroppable(-1, -1) }
          ]"
          @dragover.prevent
          @dragenter.prevent="onDragEnterSlot(-1, -1)"
          @dragleave.prevent="onDragLeaveSlot"
          @drop="onDropToWorst"
          @click="onWorstSlotClick"
        >
          <div v-if="worstItem" class="draggable-item slot-style">
            <img :src="worstItem.src" class="draggable-image" />
            <div class="image-label">{{ worstItem.label }}</div>
            <div class="color-indicator" :style="{ backgroundColor: worstItem.color || '#fff' }"></div>
          </div>
          <div v-else class="tier-label has-text-danger">Worst</div>
        </div>
      </div>

      <button class="button is-primary" @click="submitPyramid">Submit</button>

      <h2 class="subtitle has-text-white">{{ props.poolHeader }}</h2>
      <div
        class="image-pool drop-zone"
        @dragover.prevent
        @drop="onDropToPool"
      >
        <div
          v-for="image in imagePool"
          :key="image.id"
          class="pyramid-slot image-box slot-style dark-slot"
          :class="{ 'selected': isSelected(image) }"
          draggable="true"
          @dragstart="() => onDragStart(image)"
          @click.stop="() => onTapSelect(image)"
        >
          <img :src="image.src" class="draggable-image" />
          <div class="image-label">{{ image.label }}</div>
          <div class="color-indicator" :style="{ backgroundColor: image.color || '#fff' }"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { PyramidItem, PyramidRow, PyramidSlot, PyramidData, SortOption } from '@top-x/shared/types/pyramid';

const props = withDefaults(defineProps<{
  items: PyramidItem[];
  rows: PyramidRow[];
  sortItems: SortOption;
  gameHeader?: string;
  poolHeader?: string;
  worstHeader?: string;
  shareText?: string;
}>(), {
  gameHeader: 'Your Pyramid',
  poolHeader: 'Item Pool',
  worstHeader: 'Worst Item',
  shareText: '',
  sortItems: () => ({ orderBy: 'id', order: 'asc' } as SortOption),
});

const emit = defineEmits<{
  (e: 'submit', data: PyramidData): void;
}>();

const imagePool = ref<PyramidItem[]>([]);
const pyramid = ref<PyramidSlot[][]>([
  [{ image: null }],
  [{ image: null }, { image: null }],
  [{ image: null }, { image: null }, { image: null }],
  [{ image: null }, { image: null }, { image: null }, { image: null }],
]);
const worstItem = ref<PyramidItem | null>(null);
const draggedItem = ref<PyramidItem | null>(null);
const selectedItem = ref<PyramidItem | null>(null);
const droppableSlot = ref<{ row: number; col: number } | null>(null);

watch(
  () => props.items,
  (newItems) => {
    console.log('PyramidTable: Items prop updated:', newItems);
    const sorted = [...newItems].sort((a, b) => {
      const field = props.sortItems.orderBy;
      const dir = props.sortItems.order === 'asc' ? 1 : -1;
      const valA = a[field as keyof PyramidItem] || '';
      const valB = b[field as keyof PyramidItem] || '';
      if (field === 'id') {
        return (parseInt(valA as string, 10) - parseInt(valB as string, 10)) * dir;
      }
      return String(valA).localeCompare(String(valB)) * dir;
    });
    imagePool.value = sorted;
    console.log('PyramidTable: imagePool initialized:', imagePool.value);
  },
  { immediate: true }
);

watch(
  () => props.sortItems,
  () => {
    imagePool.value = [...imagePool.value].sort((a, b) => {
      const field = props.sortItems.orderBy;
      const dir = props.sortItems.order === 'asc' ? 1 : -1;
      const valA = a[field as keyof PyramidItem] || '';
      const valB = b[field as keyof PyramidItem] || '';
      if (field === 'id') {
        return (parseInt(valA as string, 10) - parseInt(valB as string, 10)) * dir;
      }
      return String(valA).localeCompare(String(valB)) * dir;
    });
    console.log('PyramidTable: imagePool sorted:', imagePool.value);
  }
);

function isSelected(item: PyramidItem | null): boolean {
  return item !== null && selectedItem.value?.id === item.id;
}

function isDroppable(row: number, col: number): boolean {
  if (!selectedItem.value && !draggedItem.value) {
    return false;
  }
  return droppableSlot.value?.row === row && droppableSlot.value?.col === col;
}

function onDragStart(item: PyramidItem) {
  draggedItem.value = item;
  selectedItem.value = item;
  console.log('PyramidTable: Drag started for item:', item);
}

function onTapSelect(item: PyramidItem) {
  selectedItem.value = selectedItem.value?.id === item.id ? null : item;
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
  const targetItem = targetSlot.image;

  if (!selectedItem.value && targetItem) {
    selectedItem.value = targetItem;
    draggedItem.value = targetItem;
    console.log('PyramidTable: Selected item from slot:', targetItem);
    return;
  }

  if (!selectedItem.value) {
    console.log('PyramidTable: No selected item, ignoring click');
    return;
  }

  const fromSlot = findSlotContaining(selectedItem.value.id);
  const fromInPool = imagePool.value.some(i => i.id === selectedItem.value!.id);
  const fromWorst = worstItem.value?.id === selectedItem.value.id;

  if (targetItem) {
    if (fromInPool) {
      imagePool.value = imagePool.value.filter(i => i.id !== selectedItem.value!.id);
      imagePool.value.push(targetItem);
      console.log('PyramidTable: Swapped pool item with slot item:', { pool: imagePool.value });
    } else if (fromSlot) {
      fromSlot.image = targetItem;
      console.log('PyramidTable: Swapped slot items:', { fromSlot, targetItem });
    } else if (fromWorst) {
      worstItem.value = targetItem;
      console.log('PyramidTable: Swapped worst item with slot item:', { worstItem: worstItem.value });
    }
  } else if (!fromInPool && fromSlot) {
    fromSlot.image = null;
    console.log('PyramidTable: Removed item from slot:', fromSlot);
  } else if (fromInPool) {
    imagePool.value = imagePool.value.filter(i => i.id !== selectedItem.value!.id);
    console.log('PyramidTable: Removed item from pool:', imagePool.value);
  } else if (fromWorst) {
    worstItem.value = null;
    console.log('PyramidTable: Removed worst item:', worstItem.value);
  }

  targetSlot.image = selectedItem.value;
  selectedItem.value = null;
  draggedItem.value = null;
  droppableSlot.value = null;
  console.log('PyramidTable: Placed item in slot:', { row, col, item: targetSlot.image });
}

function onDropToSlot(row: number, col: number) {
  console.log('PyramidTable: Drop to slot:', { row, col });
  onSlotClick(row, col);
}

function onWorstSlotClick() {
  console.log('PyramidTable: Worst slot clicked');
  if (!selectedItem.value && worstItem.value) {
    selectedItem.value = worstItem.value;
    draggedItem.value = worstItem.value;
    console.log('PyramidTable: Selected worst item:', worstItem.value);
    return;
  }

  if (!selectedItem.value) {
    console.log('PyramidTable: No selected item, ignoring worst slot click');
    return;
  }

  const fromSlot = findSlotContaining(selectedItem.value.id);
  const fromInPool = imagePool.value.some(i => i.id === selectedItem.value!.id);

  if (worstItem.value) {
    if (fromInPool) {
      imagePool.value = imagePool.value.filter(i => i.id !== selectedItem.value!.id);
      imagePool.value.push(worstItem.value);
      console.log('PyramidTable: Swapped pool item with worst item:', { pool: imagePool.value });
    } else if (fromSlot) {
      fromSlot.image = worstItem.value;
      console.log('PyramidTable: Swapped slot item with worst item:', { fromSlot, worstItem: worstItem.value });
    }
  } else if (!fromInPool && fromSlot) {
    fromSlot.image = null;
    console.log('PyramidTable: Removed item from slot for worst:', fromSlot);
  } else if (fromInPool) {
    imagePool.value = imagePool.value.filter(i => i.id !== selectedItem.value!.id);
    console.log('PyramidTable: Removed item from pool for worst:', imagePool.value);
  }

  worstItem.value = selectedItem.value;
  selectedItem.value = null;
  draggedItem.value = null;
  droppableSlot.value = null;
  console.log('PyramidTable: Placed item in worst slot:', worstItem.value);
}

function onDropToWorst() {
  console.log('PyramidTable: Drop to worst slot');
  onWorstSlotClick();
}

function onDropToPool() {
  if (!selectedItem.value) {
    console.log('PyramidTable: No selected item for pool drop');
    return;
  }
  const slot = findSlotContaining(selectedItem.value.id);
  const fromWorst = worstItem.value?.id === selectedItem.value.id;
  if (slot) {
    slot.image = null;
    console.log('PyramidTable: Removed item from slot for pool drop:', slot);
  } else if (fromWorst) {
    worstItem.value = null;
    console.log('PyramidTable: Removed worst item for pool drop:', worstItem.value);
  }
  if (!imagePool.value.some(i => i.id === selectedItem.value!.id)) {
    imagePool.value.push(selectedItem.value);
    console.log('PyramidTable: Added item back to pool:', imagePool.value);
  }
  selectedItem.value = null;
  draggedItem.value = null;
  droppableSlot.value = null;
}

function findSlotContaining(itemId: string): PyramidSlot | null {
  for (const row of pyramid.value) {
    for (const slot of row) {
      if (slot.image?.id === itemId) {
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
  console.log('PyramidTable: Submitting pyramid and worst item:', { pyramid: pyramid.value, worstItem: worstItem.value });
  emit('submit', { pyramid: pyramid.value, worstItem: worstItem.value });
}
</script>

<style scoped>
.section {
  padding: 0.2rem 0.1rem;
  background-color: #121212;
  color: #eee;
  display: flex;
  justify-content: center;
}
.container {
  width: 100%;
  max-width: 100%;
}
.pyramid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.05rem;
  width: fit-content;
  margin: 0 auto;
}
.pyramid-row-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}
.row-label {
  width: 100%;
  text-align: center;
  font-weight: bold;
  font-size: 0.7rem;
}
.pyramid-row {
  display: flex;
  justify-content: center;
  gap: 0.05rem;
}
.pyramid-slot {
  width: 22vw;
  height: 22vw;
  max-width: 80px;
  max-height: 80px;
  min-width: 45px;
  min-height: 45px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #1f1f1f;
  border: 1px dashed #444;
  cursor: pointer;
  padding: 1px;
  transition: all 0.2s ease;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  text-align: center;
  overflow: hidden;
}
.pyramid-slot.drop-hover {
  background-color: #3298dc;
  transform: scale(1.05);
  border-color: #3298dc;
}
.worst-item-container {
  width: fit-content;
  margin: 0.3rem auto;
}
.worst-slot {
  border: 2px dashed #ff7777 !important;
  background-color: #3d1f1f !important;
}
.worst-slot.drop-hover {
  background-color: #ff3333 !important;
  border-color: #ff3333 !important;
  transform: scale(1.05);
}
.tier-label {
  color: #bbb;
  font-size: 0.9rem;
  font-weight: bold;
  pointer-events: none;
}
.tier-label.has-text-danger {
  color: #ff5555;
}
.image-pool {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.2rem;
  justify-content: center;
  border: 2px dashed #666;
  padding: 0.3rem;
  margin-top: 0.3rem;
  background-color: #1f1f1f;
}
.image-box {
  width: 100%;
  height: 22vw;
  max-height: 80px;
  min-height: 45px;
  padding: 0;
}
.slot-style {
  width: 100%;
  height: 100%;
  border-radius: 0.5rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  background: linear-gradient(to bottom, #2a2a2a, #1f1f1f);
  border: 1px solid #444;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.draggable-image {
  max-width: 90%;
  max-height: 60px;
  user-select: none;
  touch-action: none;
  transition: transform 0.2s ease;
}
.image-label {
  font-size: 0.55rem;
  font-weight: 600;
  color: #ddd;
  text-align: center;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 0.1rem;
}
.color-indicator {
  width: 100%;
  height: 4px;
  border-radius: 0 0 0.5rem 0.5rem;
}
.selected {
  border: 2px solid #3273dc;
  box-shadow: 0 0 0 2px #3273dc33;
}
.highlight-empty {
  background-color: #ffd35c;
  border-color: #ffd35c;
  animation: pulse 1s infinite alternate;
}
@keyframes pulse {
  from { box-shadow: 0 0 0 0 rgba(255, 211, 92, 0.6); }
  to { box-shadow: 0 0 0 6px rgba(255, 211, 92, 0); }
}
.subtitle {
  color: #eee;
  font-size: 1rem;
  margin: 0.3rem 0;
}
.button.is-primary {
  background-color: #3273dc;
  margin: 0.3rem 0;
}

/* Mobile-specific adjustments */
@media screen and (max-width: 767px) {
  .section {
    padding: 0.1rem 0.05rem;
  }
  .pyramid-slot,
  .image-box {
    height: 22vw;
    min-width: 40px;
    min-height: 40px;
    margin: 0.5px;
  }
  .pyramid-row {
    min-height: 22vw;
  }
  .draggable-image {
    max-height: 55px;
  }
  .image-label {
    font-size: 0.5rem;
  }
  .tier-label {
    font-size: 0.8rem;
  }
  .row-label {
    font-size: 0.7rem;
  }
}
</style>