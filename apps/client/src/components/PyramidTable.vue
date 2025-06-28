<template>
  <section class="section">
    <div class="container has-text-centered">
      <h2 class="subtitle has-text-white">{{ props.gameHeader }}</h2>

      <div class="pyramid">
        <div v-for="(row, rowIndex) in pyramid" :key="rowIndex" class="pyramid-row-container">
          <div class="row-container">
            <div class="row-label-points">
              <div v-if="!props.hideRowLabel" class="row-label-container">
                <span class="row-label has-text-white">{{ rows[rowIndex]?.label || toRoman(rowIndex + 1) }}</span>
                <span class="row-points has-text-success">+{{ rows[rowIndex]?.points || 0 }} pts</span>
              </div>
              <div v-else class="row-points-container">
                <span class="row-points has-text-success">+{{ rows[rowIndex]?.points || 0 }} pts</span>
              </div>
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
                  <img :src="slot.image.src" class="draggable-image" crossorigin="anonymous" />
                  <div class="color-indicator-pyramid" :style="{ backgroundColor: slot.image.color || '#fff' }"></div>
                </div>
                <div v-else class="tier-label">{{ toRoman(rowIndex + 1) }}</div>
              </div>
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
            <img :src="worstItem.src" class="draggable-image" crossorigin="anonymous" />
          </div>
          <div v-else class="tier-label has-text-danger">Worst</div>
        </div>
        <span class="worst-points has-text-danger">{{ props.worstPoints || 0 }} pts</span>
      </div>

      <button class="button is-primary" @click="submitPyramid">Submit</button>

      <h2 class="subtitle has-text-white">{{ props.poolHeader }}</h2>
      <div class="image-pool drop-zone" @dragover.prevent @drop="onDropToPool">
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
          <font-awesome-icon :icon="['fas', 'circle-info']" class="info-icon" @click.stop="showDescription(image)" />
        </div>
      </div>

      <!-- Description Tab -->
      <div v-show="showTab" :class="['description-tab', { show: showTab }]">
        <div class="tab-content">
          <p class="question-text">Hi @Gork, what can you say about {{ describedItem?.label }}?</p>
          <p class="answer-text">{{ displayedDescription }}</p>
          <button @click="closeTab">Close</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { PyramidItem, PyramidRow, PyramidSlot, PyramidData, SortOption } from '@top-x/shared/types/pyramid';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';

library.add(faCircleInfo);

const props = defineProps<{
  items: PyramidItem[];
  rows: PyramidRow[];
  sortItems: SortOption;
  hideRowLabel: boolean;
  gameHeader: string;
  poolHeader?: string;
  worstHeader?: string;
  shareText?: string;
  worstPoints?: number;
}>();

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

// Description Tab State
const showTab = ref(false);
const describedItem = ref<PyramidItem | null>(null);
const displayedDescription = ref('');
let typingInterval: ReturnType<typeof setInterval> | null = null;

// Debug imagePool rendering
const imagePoolDebug = computed(() => {
  console.log('PyramidTable: imagePool computed:', {
    length: imagePool.value.length,
    items: imagePool.value
  });
  return imagePool.value;
});

watch(
  () => props.items,
  (newItems) => {
    console.log('PyramidTable: Items prop updated:', newItems);
    if (!newItems || !Array.isArray(newItems)) {
      console.warn('PyramidTable: Invalid or empty items prop:', newItems);
      imagePool.value = [];
      return;
    }
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
    console.log('PyramidTable: sortItems prop updated:', props.sortItems);
    if (!imagePool.value.length) {
      console.warn('PyramidTable: imagePool is empty, skipping sort');
      return;
    }
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

watch(
  () => props.hideRowLabel,
  (newValue) => {
    console.log('PyramidTable: hideRowLabel prop updated:', newValue);
  },
  { immediate: true }
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
    console.log('PyramidTable: Removed item from worst for pool drop:', worstItem.value);
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

// Description Tab Methods
function showDescription(item: PyramidItem) {
  describedItem.value = item;
  showTab.value = true;
  displayedDescription.value = '';
  startTypingAnimation(item.description || 'No description available.');
}

function startTypingAnimation(fullDescription: string) {
  if (typingInterval) {
    clearInterval(typingInterval);
  }
  let index = 0;
  typingInterval = setInterval(() => {
    if (index < fullDescription.length) {
      displayedDescription.value += fullDescription[index];
      index++;
    } else {
      clearInterval(typingInterval!);
      typingInterval = null;
    }
  }, 50);
}

function closeTab() {
  showTab.value = false;
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
  describedItem.value = null;
  displayedDescription.value = '';
}
</script>

<style scoped>
.box {
  padding: 0 !important;
}
.section {
  padding: 0.2rem 0.1rem;
  background-color: #121212;
  color: white;
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
.row-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.row-label-points {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.row-label-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
}
.row-label {
  font-weight: bold;
  font-size: 0.7rem;
}
.row-points-container {
  display: flex;
  justify-content: flex-end;
}
.row-points {
  font-size: 0.6rem;
  font-weight: bold;
}
.pyramid-row {
  display: flex;
  justify-content: center;
  gap: 0.05rem;
}
.pyramid-slot {
  width: 25vw;
  height: 25vw;
  max-width: 100px;
  max-height: 100px;
  min-width: 60px;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #1f1f1f;
  border: 1px dashed #444;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  text-align: center;
  overflow: hidden;
  box-sizing: border-box;
  margin-bottom: 0 !important;
}
.pyramid-slot.drop-hover {
  background-color: #3298dc;
  transform: scale(1.05);
  border-color: #3298dc;
}
.worst-item-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: max-content;
  margin: 0.3rem auto;
}
.worst-item-container .subtitle {
  width: 100%;
  text-align: center;
}
.worst-slot {
  border: 2px solid #ff3333;
  background-color: #3d1f1f;
  max-width: 100px;
  max-height: 100px;
  min-width: 60px;
  min-height: 60px;
  box-sizing: border-box;
}
.worst-slot.drop-hover {
  background-color: #ff3333;
  border: 2px solid #ff3333;
  transform: scale(1.05);
}
.worst-points {
  font-size: 0.6rem;
  font-weight: bold;
  margin-top: 0.2rem;
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
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 0.2rem;
  justify-content: center;
  border: 2px dashed #666;
  padding: 0.3rem;
  margin-top: 0.3rem;
  background-color: #1f1f1f;
}
.image-box {
  width: 100%;
  height: 27vw;
  max-width: 80px;
  max-height: 100px;
  min-height: 45px;
  padding: 0;
  position: relative;
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
  box-sizing: border-box;
  position: relative;
}
.pyramid-slot .slot-style,
.worst-slot .slot-style {
  padding: 0 !important;
}
.image-box .slot-style {
  padding: 0 !important;
  position: relative;
}
.draggable-image {
  user-select: none;
  touch-action: none;
  transition: transform 0.2s ease;
}
.pyramid-slot .draggable-image,
.worst-slot .draggable-image {
  width: 100%;
  height: calc(100% - 4px);
  object-fit: cover;
  object-position: top;
  border-radius: 0.5rem 0.5rem 0 0;
}
.image-box .draggable-image {
  width: 100%;
  height: calc(100% - 8px);
  object-fit: cover;
  object-position: top;
  border-radius: 0.5rem 0.5rem 0 0;
}
.image-label {
  position: absolute;
  bottom: 4px;
  left: 0;
  width: 100%;
  font-size: 0.5rem;
  font-weight: 600;
  color: #fff;
  background-color: #000;
  text-align: center;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0.1rem;
  z-index: 10;
}
.color-indicator {
  width: 100%;
  height: 4px;
  border-radius: 0 0 0.5rem 0.5rem;
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 10;
}
.color-indicator-pyramid {
  width: 100%;
  height: 4px;
  border-radius: 0 0 0.5rem 0.5rem;
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 10;
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
.info-icon {
  position: absolute;
  top: 5px;
  right: 5px;
  cursor: pointer;
  font-size: 0.8rem;
  color: #fff;
  background-color: #000;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.description-tab {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #1f1f1f;
  color: white;
  padding: 1rem;
  transform: translateY(100%);
  transition: transform 0.3s ease-in-out;
  z-index: 1000;
}
.description-tab.show {
  transform: translateY(0);
}
.tab-content {
  max-height: 200px;
  overflow-y: auto;
}
.question-text {
  color: #3273dc;
  font-weight: bold;
  margin-bottom: 0.5rem;
}
.answer-text {
  color: #eee;
}
@media screen and (max-width: 767px) {
  .section {
    padding: 0.1rem 0.05rem;
  }
  .pyramid-slot {
    height: 25vw;
    max-width: 90px;
    max-height: 90px;
    min-width: 50px;
    min-height: 50px;
  }
  .worst-item-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: max-content;
    margin: 0.3rem auto;
  }
  .worst-item-container .subtitle {
    width: 100%;
    text-align: center;
  }
  .worst-slot {
    border: 2px solid #ff3333;
    max-width: 90px;
    max-height: 90px;
    min-width: 50px;
    min-height: 50px;
  }
  .worst-slot.drop-hover {
    border: 2px solid #ff3333;
  }
  .worst-points {
    font-size: 0.5rem;
  }
  .pyramid-slot .draggable-image,
  .worst-slot .draggable-image {
    width: 100%;
    height: calc(100% - 4px);
    object-fit: cover;
    object-position: top;
    border-radius: 0.5rem 0.5rem 0 0;
  }
  .image-pool {
    grid-template-columns: repeat(4, 1fr);
  }
  .image-box {
    min-width: 40px;
    min-height: 45px;
    max-height: 100px;
  }
  .image-box .draggable-image {
    width: 100%;
    height: calc(100% - 8px);
    object-fit: cover;
    object-position: top;
    border-radius: 0.5rem 0.5rem 0 0;
  }
  .image-label {
    font-size: 0.45rem;
    padding: 0.05rem;
  }
  .tier-label {
    font-size: 0.8rem;
  }
  .row-label {
    font-size: 0.7rem;
  }
  .row-points {
    font-size: 0.5rem;
  }
  .color-indicator {
    width: 100%;
    height: 4px;
    border-radius: 0 0 0.5rem 0.5rem;
    position: absolute;
    bottom: 0;
    left: 0;
    z-index: 10;
  }
  .color-indicator-pyramid {
    width: 100%;
    height: 4px;
    border-radius: 0 0 0.5rem 0.5rem;
    position: absolute;
    bottom: 0;
    left: 0;
    z-index: 10;
  }
}
</style>