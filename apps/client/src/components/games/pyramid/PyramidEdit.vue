
<!-- PyramidEdit.vue -->
<template>
  <section class="section">
    <div class="container has-text-centered">
      <h1 class="main-game-title" v-html="props.gameHeader"></h1>
      <p class="game-subtitle" v-html="props.gameInstruction"></p>

      <div class="pyramid" ref="pyramidRef">
        <div v-for="(row, rowIndex) in pyramid" :key="rowIndex" class="pyramid-row-container">
          <div class="pyramid-row-wrapper">
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
                <div class="hex-outer" :class="{ 'has-image': slot.image }">
                  <div class="hex-border" :style="{ background: slot.image?.color || '' }"></div>
                  <div class="hex-inner">
                    <div v-if="slot.image" class="draggable-item slot-style">
                      <img :src="slot.image.src" class="draggable-image" crossorigin="anonymous" />
                    </div>
                    <div v-else class="slot-label-container">
                      <div class="tier-label">{{ toRoman(rowIndex + 1) }}</div>
                      <div class="slot-points has-text-success">+{{ rows[rowIndex]?.points || 0 }}</div>
                    </div>
                  </div>
                  <div class="rank-tag" v-if="slot.image" :style="{ background: slot.image?.color || '' }"></div>
                </div>
              </div>
            </div>
            <!-- Animation container for row 2 -->
            <div v-if="rowIndex === 1 && animatedPoints" class="animation-container">
              <div class="animated-points has-text-success">{{ animatedPoints }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Worst Item Slot -->
      <div v-if="worstShow" class="worst-item-container">
        <h3 class="subtitle has-text-centered has-text-white" style="margin-bottom:5px;font-size: 18px">{{ props.worstHeader }}</h3>
        <div class="worst-row-wrapper">
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
            <div class="hex-outer worst" :class="{ 'has-image': worstItem }">
              <div class="hex-border"></div>
              <div class="hex-inner">
                <div v-if="worstItem" class="draggable-item slot-style">
                  <img :src="worstItem.src" class="draggable-image" crossorigin="anonymous" />
                </div>
                <div v-else class="worst-slot-label-container">
                  <div class="tier-label has-text-danger">{{ t('games.pyramid.worst') }}</div>
                  <div class="worst-slot-points has-text-danger">{{ props.worstPoints || 0 }}</div>
                </div>
              </div>
              <div class="rank-tag" v-if="worstItem"></div>
            </div>
          </div>
          <!-- Animation container for worst slot -->
          <div v-if="worstAnimatedPoints" class="worst-animation-container">
            <div class="animated-points has-text-danger">{{ worstAnimatedPoints }}</div>
          </div>
        </div>
      </div>
<div style="padding: 10px;">
      <CustomButton
        type="is-primary"
        :label="t('games.pyramid.placeVote')"
        :icon="['fas', 'square-poll-vertical']"
        :disabled="isSubmitting"
        @click="submitPyramid"
      />
      </div>
      <h2 class="subtitle has-text-white" style="font-size: 20px;">{{ props.poolHeader }}</h2>
      <div class="pool-controls mb-4">
       
        <div class="field">
          <div class="control has-icons-left">
            <input
              class="input is-dark"
              type="text"
              :placeholder="t('games.pyramid.search')"
              v-model="searchQuery"
            />
            <span class="icon is-left">
              <font-awesome-icon :icon="['fas', 'search']" />
            </span>
          </div>
        </div>
        <div class="clear-link-wrapper">
          <a
            style="font-size: 14px;"
            @click.stop.prevent="clearPyramid"
          >{{ t('games.pyramid.clearPyramid') }}</a>
          <div v-if="showConfirm" class="confirm-tooltip">
            <p>{{ t('games.pyramid.confirmClear') }}</p>
            <div class="buttons">
              <button class="button is-small is-success" @click="confirmClear(true)">{{ t('games.pyramid.yes') }}</button>
              <button class="button is-small is-danger" @click="confirmClear(false)">{{ t('games.pyramid.no') }}</button>
            </div>
          </div>
        </div>
      </div>
      <div class="image-pool drop-zone" @dragover.prevent @drop="onDropToOfficialPool">
        <div
          v-for="image in filteredOfficialPool"
          :key="image.id"
          class="pyramid-slot image-box slot-style dark-slot"
          :class="{ 'selected': isSelected(image) }"
          :draggable="!isTouchDevice"
          @dragstart="() => onDragStart(image)"
          @click.stop="() => onTapSelect(image)"
        >
          <img :src="image.src" class="draggable-image" />
          <div class="image-label">{{ image.label }}</div>
          <div class="color-indicator" :style="{ backgroundColor: image.color || '#fff' }"></div>
          <font-awesome-icon
            v-if="!props.hideInfoButton"
            :icon="['fas', 'circle-info']"
            class="info-icon"
            :class="{ 'selected': selectedInfoIcon === image.id }"
            @click.stop="showDescription(image)"
          />
        </div>
      </div>
       <div class="pool-controls mb-4">
       
    
        <CustomButton
          type="is-success"
          :label="t('games.pyramid.addNewItem')"
          :icon="['fas', 'plus']"
          @click="showAddItemPopup"
        />
      </div>
      <h2 v-if="props.communityHeader" class="subtitle has-text-white" style="font-size: 20px;">{{ props.communityHeader }}</h2>
      
      <div class="image-pool drop-zone" @dragover.prevent @drop="onDropToCommunityPool">
        <div
          v-for="image in filteredCommunityPool"
          :key="image.id"
          class="pyramid-slot image-box slot-style dark-slot"
          :class="{ 'selected': isSelected(image) }"
          :draggable="!isTouchDevice"
          @dragstart="() => onDragStart(image)"
          @click.stop="() => onTapSelect(image)"
        >
          <img :src="image.src" class="draggable-image" />
          <div class="image-label">{{ image.label }}</div>
          <div class="color-indicator" :style="{ backgroundColor: image.color || '#fff' }"></div>
          <font-awesome-icon
            v-if="!props.hideInfoButton"
            :icon="['fas', 'circle-info']"
            class="info-icon"
            :class="{ 'selected': selectedInfoIcon === image.id }"
            @click.stop="showDescription(image)"
          />
        </div>
      </div>
      <!-- Description Tab -->
      <div v-show="showTab" :class="['description-tab', { show: showTab }]">
        <div class="tab-content" @click.stop>
          <p class="question-text">{{ t('games.pyramid.questionAbout') }}{{ describedItem?.label }}״?</p>
          <p class="answer-text" v-html="displayedDescription"></p>
          <button class="button is-small is-primary" @click="closeTab">{{ t('games.pyramid.close') }}</button>
        </div>
      </div>

      <!-- Add Item Popup -->
      <PyramidAddItemPopup
        :is-active="showAddPopup"
        :game-id="gameId"
        :colors-tag="props.colorsTag"
        @add-item="addNewItem"
        @close="showAddPopup = false"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { PyramidItem, PyramidRow, PyramidSlot, PyramidData, SortOption } from '@top-x/shared/types/pyramid';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCircleInfo, faSearch, faEraser, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useRoute } from 'vue-router';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import PyramidAddItemPopup from '@/components/games/pyramid/PyramidAddItemPopup.vue';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';

library.add(faCircleInfo, faSearch, faEraser, faPlus);

const localeStore = useLocaleStore();
const userStore = useUserStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);

const route = useRoute();
const gameId = ref((route.query.game as string).toLowerCase());
const gameTitle = ref('');

const props = defineProps<{
  items: PyramidItem[];
  communityItems: PyramidItem[];
  rows: PyramidRow[];
  sortItems: SortOption;
  hideRowLabel: boolean;
  gameHeader: string;
  gameInstruction?: string;
  poolHeader?: string;
  communityHeader?: string;
  worstHeader?: string;
  shareText?: string;
  shareImageTitle?: string;
  worstPoints?: number;
  worstShow?: boolean;
  hideInfoButton?: boolean;
  colorsTag?: { [label: string]: string };
  userName?: string;
}>();

const emit = defineEmits<{
  (e: 'submit', data: PyramidData): void;
}>();

const officialPool = ref<PyramidItem[]>([]);
const communityPool = ref<PyramidItem[]>([]);
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
const animatedPoints = ref<string | null>(null);
const worstAnimatedPoints = ref<string | null>(null);
const worstShow = computed(() => props.worstShow ?? true);
const selectedInfoIcon = ref<string | null>(null); // Track the selected info icon by item ID

const searchQuery = ref('');
const showAddPopup = ref(false);
// Description Tab State
const showTab = ref(false);
const describedItem = ref<PyramidItem | null>(null);
const displayedDescription = ref('');
let typingInterval: ReturnType<typeof setInterval> | null = null;

const showConfirm = ref(false);
const pyramidRef = ref<HTMLElement | null>(null);
const isTouchDevice = ref(false);
const isSubmitting = ref(false);

onMounted(() => {
  if (analytics) {
    logEvent(analytics, 'game_view', { game_name: gameId.value || 'unknown', view_type: 'edit' });
  }
});
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Load from local storage if available
  const savedPyramid = localStorage.getItem(`pyramid_${gameId.value}`);
  if (savedPyramid) {
    const parsed = JSON.parse(savedPyramid);
    pyramid.value = parsed.pyramid;
    worstItem.value = parsed.worstItem;
    console.log('PyramidEdit: Loaded state from local storage:', parsed);
    removeUsedFromPools();
  }

  // Add global click listener to close tab and reset selected info icon
  const handleOutsideClick = (event: MouseEvent) => {
    if (showTab.value) {
      const tabElement = document.querySelector('.description-tab');
      if (tabElement && !tabElement.contains(event.target as Node)) {
        closeTab();
        selectedInfoIcon.value = null; // Reset selected info icon
      }
    }
    if (showConfirm.value) {
      const confirmElement = document.querySelector('.confirm-tooltip');
      if (confirmElement && !confirmElement.contains(event.target as Node)) {
        showConfirm.value = false;
      }
    }
  };
  document.addEventListener('click', handleOutsideClick);
  
  onUnmounted(() => {
    document.removeEventListener('click', handleOutsideClick);
  });


// Save to local storage on every change
watch([pyramid, worstItem], () => {
  localStorage.setItem(`pyramid_${gameId.value}`, JSON.stringify({ pyramid: pyramid.value, worstItem: worstItem.value }));
  console.log('PyramidEdit: Saved state to local storage:', { pyramid: pyramid.value, worstItem: worstItem.value });
  removeUsedFromPools();
}, { deep: true });

const filteredOfficialPool = computed(() => {
  if (!searchQuery.value.trim()) {
    return officialPool.value;
  }
  const query = searchQuery.value.toLowerCase().trim();
  return officialPool.value.filter(item => {
    const label = item.label?.toLowerCase() || '';
    const name = item.name?.toLowerCase() || '';
    return label.includes(query) || name.includes(query);
  });
});

const filteredCommunityPool = computed(() => {
  if (!searchQuery.value.trim()) {
    return communityPool.value;
  }
  const query = searchQuery.value.toLowerCase().trim();
  return communityPool.value.filter(item => {
    const label = item.label?.toLowerCase() || '';
    const name = item.name?.toLowerCase() || '';
    return label.includes(query) || name.includes(query);
  });
});

watch(
  () => props.worstPoints,
  (newValue) => {
    console.log('PyramidEdit: worstPoints prop updated:', newValue);
  },
  { immediate: true }
);

const sortFunction = (a: PyramidItem, b: PyramidItem) => {
  const field = props.sortItems.orderBy;
  const dir = props.sortItems.order === 'asc' ? 1 : -1;
  const valA = a[field as keyof PyramidItem] || '';
  const valB = b[field as keyof PyramidItem] || '';
  if (field === 'id') {
    return (parseInt(valA as string, 10) - parseInt(valB as string, 10)) * dir;
  }
  return String(valA).localeCompare(String(valB)) * dir;
};

watch(
  () => props.items,
  (newItems) => {
    console.log('PyramidEdit: Items prop updated:', newItems);
    if (!newItems || !Array.isArray(newItems)) {
      console.warn('PyramidEdit: Invalid or empty items prop:', newItems);
      officialPool.value = [];
      return;
    }
    const filtered = newItems.filter(item => item.active !== false);
    const sorted = [...filtered].sort(sortFunction);
    officialPool.value = sorted;
    console.log('PyramidEdit: officialPool initialized:', officialPool.value);
    removeUsedFromPools();
  },
  { immediate: true }
);

watch(
  () => props.communityItems,
  (newItems) => {
    console.log('PyramidEdit: communityItems prop updated:', newItems);
    if (!newItems || !Array.isArray(newItems)) {
      console.warn('PyramidEdit: Invalid or empty communityItems prop:', newItems);
      communityPool.value = [];
      return;
    }
    const filtered = newItems.filter(item => item.active !== false);
    const sorted = [...filtered].sort(sortFunction);
    communityPool.value = sorted;
    console.log('PyramidEdit: communityPool initialized:', communityPool.value);
    removeUsedFromPools();
  },
  { immediate: true }
);

watch(
  () => props.sortItems,
  () => {
    console.log('PyramidEdit: sortItems prop updated:', props.sortItems);
    if (!officialPool.value.length && !communityPool.value.length) {
      console.warn('PyramidEdit: Pools are empty, skipping sort');
      return;
    }
    officialPool.value = [...officialPool.value].sort(sortFunction);
    communityPool.value = [...communityPool.value].sort(sortFunction);
    console.log('PyramidEdit: Pools sorted:', { official: officialPool.value, community: communityPool.value });
    removeUsedFromPools();
  }
);

watch(
  () => props.hideRowLabel,
  (newValue) => {
    console.log('PyramidEdit: hideRowLabel prop updated:', newValue);
  },
  { immediate: true }
);

function clearPyramid() {
  showConfirm.value = true;
}

function confirmClear(yes: boolean) {
  showConfirm.value = false;
  if (yes) {
    if (analytics) {
      logEvent(analytics, 'user_action', { action: 'clear_pyramid', game_id: gameId.value });
    }
    // Collect all items from pyramid and worst slot
    const itemsToReturn: PyramidItem[] = [];
    pyramid.value.forEach(row => {
      row.forEach(slot => {
        if (slot.image) {
          itemsToReturn.push(slot.image);
          slot.image = null;
        }
      });
    });
    if (worstItem.value) {
      itemsToReturn.push(worstItem.value);
      worstItem.value = null;
    }
    // Separate into official and community
    const officialItems: PyramidItem[] = [];
    const communityItems: PyramidItem[] = [];
    itemsToReturn.forEach(item => {
      if (props.communityItems.some(i => i.id === item.id)) {
        communityItems.push(item);
      } else {
        officialItems.push(item);
      }
    });
    // Add back to respective pools and sort
    officialPool.value = [...officialPool.value, ...officialItems].sort(sortFunction);
    communityPool.value = [...communityPool.value, ...communityItems].sort(sortFunction);
    console.log('PyramidEdit: Pyramid cleared, items returned to pools:', { official: officialPool.value, community: communityPool.value });
  }
}

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
  console.log('PyramidEdit: Drag started for item:', item);
}

function onTapSelect(item: PyramidItem) {
  selectedItem.value = selectedItem.value?.id === item.id ? null : item;
  draggedItem.value = selectedItem.value;
  console.log('PyramidEdit: Item selected via tap:', selectedItem.value);
  if (selectedItem.value) {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 500);
  }
}

function onDragEnterSlot(row: number, col: number) {
  if (draggedItem.value || selectedItem.value) {
    droppableSlot.value = { row, col };
    console.log('PyramidEdit: Drag entered slot:', { row, col });
  }
}

function onDragLeaveSlot() {
  droppableSlot.value = null;
  console.log('PyramidEdit: Drag left slot');
}

function onSlotClick(row: number, col: number) {
  console.log('PyramidEdit: Slot clicked:', { row, col });
  const targetSlot = pyramid.value[row][col];
  const targetItem = targetSlot.image;

  if (!selectedItem.value && targetItem) {
    selectedItem.value = targetItem;
    draggedItem.value = targetItem;
    console.log('PyramidEdit: Selected item from slot:', targetItem);
    return;
  }

  if (!selectedItem.value) {
    console.log('PyramidEdit: No selected item, ignoring click');
    return;
  }

  const fromSlot = findSlotContaining(selectedItem.value.id);
  const fromOfficial = officialPool.value.some(i => i.id === selectedItem.value!.id);
  const fromCommunity = communityPool.value.some(i => i.id === selectedItem.value!.id);
  const fromWorst = worstItem.value?.id === selectedItem.value.id;

  if (targetItem) {
    if (fromOfficial) {
      officialPool.value = officialPool.value.filter(i => i.id !== selectedItem.value!.id);
      officialPool.value.push(targetItem);
      console.log('PyramidEdit: Swapped official pool item with slot item:', { officialPool: officialPool.value });
    } else if (fromCommunity) {
      communityPool.value = communityPool.value.filter(i => i.id !== selectedItem.value!.id);
      communityPool.value.push(targetItem);
      console.log('PyramidEdit: Swapped community pool item with slot item:', { communityPool: communityPool.value });
    } else if (fromSlot) {
      fromSlot.image = targetItem;
      console.log('PyramidEdit: Swapped slot items:', { fromSlot, targetItem });
    } else if (fromWorst) {
      worstItem.value = targetItem;
      console.log('PyramidEdit: Swapped worst item with slot item:', { worstItem: worstItem.value });
    }
  } else if (fromOfficial) {
    officialPool.value = officialPool.value.filter(i => i.id !== selectedItem.value!.id);
    console.log('PyramidEdit: Removed item from official pool:', officialPool.value);
  } else if (fromCommunity) {
    communityPool.value = communityPool.value.filter(i => i.id !== selectedItem.value!.id);
    console.log('PyramidEdit: Removed item from community pool:', communityPool.value);
  } else if (fromSlot) {
    fromSlot.image = null;
    console.log('PyramidEdit: Removed item from slot:', fromSlot);
  } else if (fromWorst) {
    worstItem.value = null;
    console.log('PyramidEdit: Removed worst item:', worstItem.value);
  }

  targetSlot.image = selectedItem.value;
  animatedPoints.value = `+${props.rows[row]?.points || 0} ${t('games.pyramid.points')}`;
  setTimeout(() => {
    animatedPoints.value = null;
  }, 1000);
  selectedItem.value = null;
  draggedItem.value = null;
  droppableSlot.value = null;
  console.log('PyramidEdit: Placed item in slot:', { row, col, item: targetSlot.image });
}

function onDropToSlot(row: number, col: number) {
  console.log('PyramidEdit: Drop to slot:', { row, col });
  onSlotClick(row, col);
}

function onWorstSlotClick() {
  console.log('PyramidEdit: Worst slot clicked');
  if (!selectedItem.value && worstItem.value) {
    selectedItem.value = worstItem.value;
    draggedItem.value = worstItem.value;
    console.log('PyramidEdit: Selected worst item:', worstItem.value);
    return;
  }

  if (!selectedItem.value) {
    console.log('PyramidEdit: No selected item, ignoring worst slot click');
    return;
  }

  const fromSlot = findSlotContaining(selectedItem.value.id);
  const fromOfficial = officialPool.value.some(i => i.id === selectedItem.value!.id);
  const fromCommunity = communityPool.value.some(i => i.id === selectedItem.value!.id);

  if (worstItem.value) {
    if (fromOfficial) {
      officialPool.value = officialPool.value.filter(i => i.id !== selectedItem.value!.id);
      officialPool.value.push(worstItem.value);
      console.log('PyramidEdit: Swapped official pool item with worst item:', { officialPool: officialPool.value });
    } else if (fromCommunity) {
      communityPool.value = communityPool.value.filter(i => i.id !== selectedItem.value!.id);
      communityPool.value.push(worstItem.value);
      console.log('PyramidEdit: Swapped community pool item with worst item:', { communityPool: communityPool.value });
    } else if (fromSlot) {
      fromSlot.image = worstItem.value;
      console.log('PyramidEdit: Swapped slot item with worst item:', { fromSlot, worstItem: worstItem.value });
    }
  } else if (fromOfficial) {
    officialPool.value = officialPool.value.filter(i => i.id !== selectedItem.value!.id);
    console.log('PyramidEdit: Removed item from official pool for worst:', officialPool.value);
  } else if (fromCommunity) {
    communityPool.value = communityPool.value.filter(i => i.id !== selectedItem.value!.id);
    console.log('PyramidEdit: Removed item from community pool for worst:', communityPool.value);
  } else if (fromSlot) {
    fromSlot.image = null;
    console.log('PyramidEdit: Removed item from slot for worst:', fromSlot);
  }

  worstItem.value = selectedItem.value;
  worstAnimatedPoints.value = `${props.worstPoints || 0} ${t('games.pyramid.points')}`;
  setTimeout(() => {
    worstAnimatedPoints.value = null;
  }, 1000);
  selectedItem.value = null;
  draggedItem.value = null;
  droppableSlot.value = null;
  console.log('PyramidEdit: Placed item in worst slot:', worstItem.value);
}

function onDropToWorst() {
  console.log('PyramidEdit: Drop to worst slot');
  onWorstSlotClick();
}

function onDropToOfficialPool() {
  if (!selectedItem.value) {
    console.log('PyramidEdit: No selected item for official pool drop');
    return;
  }
  // Check if item belongs to official
  const isOfficial = !props.communityItems.some(i => i.id === selectedItem.value!.id);
  if (!isOfficial) {
    console.log('PyramidEdit: Item is from community, cannot drop to official pool');
    return;
  }
  const slot = findSlotContaining(selectedItem.value.id);
  const fromWorst = worstItem.value?.id === selectedItem.value.id;
  if (slot) {
    slot.image = null;
    console.log('PyramidEdit: Removed item from slot for official pool drop:', slot);
  } else if (fromWorst) {
    worstItem.value = null;
    console.log('PyramidEdit: Removed item from worst for official pool drop:', worstItem.value);
  }
  if (!officialPool.value.some(i => i.id === selectedItem.value!.id)) {
    officialPool.value.push(selectedItem.value);
    officialPool.value = officialPool.value.sort(sortFunction);
    console.log('PyramidEdit: Added item back to official pool:', officialPool.value);
  }
  selectedItem.value = null;
  draggedItem.value = null;
  droppableSlot.value = null;
}

function onDropToCommunityPool() {
  if (!selectedItem.value) {
    console.log('PyramidEdit: No selected item for community pool drop');
    return;
  }
  // Check if item belongs to community
  const isCommunity = props.communityItems.some(i => i.id === selectedItem.value!.id);
  if (!isCommunity) {
    console.log('PyramidEdit: Item is from official, cannot drop to community pool');
    return;
  }
  const slot = findSlotContaining(selectedItem.value.id);
  const fromWorst = worstItem.value?.id === selectedItem.value.id;
  if (slot) {
    slot.image = null;
    console.log('PyramidEdit: Removed item from slot for community pool drop:', slot);
  } else if (fromWorst) {
    worstItem.value = null;
    console.log('PyramidEdit: Removed item from worst for community pool drop:', worstItem.value);
  }
  if (!communityPool.value.some(i => i.id === selectedItem.value!.id)) {
    communityPool.value.push(selectedItem.value);
    communityPool.value = communityPool.value.sort(sortFunction);
    console.log('PyramidEdit: Added item back to community pool:', communityPool.value);
  }
  selectedItem.value = null;
  draggedItem.value = null;
  droppableSlot.value = null;
}

function showAddItemPopup() {
  showAddPopup.value = true;
  console.log('PyramidEdit: Showing add item popup');
}
function addNewItem(newItem: PyramidItem) {
  communityPool.value = [newItem, ...communityPool.value];
  console.log('PyramidEdit: Added new item to community pool:', newItem);
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'add_item', game_id: gameId.value, item_id: newItem.id });
  }
  showAddPopup.value = false;
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

function removeUsedFromPools() {
  const usedIds = new Set<string>();
  pyramid.value.forEach(row => {
    row.forEach(slot => {
      if (slot.image) {
        usedIds.add(slot.image.id);
      }
    });
  });
  if (worstItem.value) {
    usedIds.add(worstItem.value.id);
  }
  officialPool.value = officialPool.value.filter(item => !usedIds.has(item.id));
  communityPool.value = communityPool.value.filter(item => !usedIds.has(item.id));
}

function toRoman(num: number): string {
  const numerals = ['I', 'II', 'III', 'IV'];
  return numerals[num - 1] || `${num}`;
}

function submitPyramid() {
  console.log('PyramidEdit: Submitting pyramid and worst item:', { pyramid: pyramid.value, worstItem: worstItem.value });
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'vote', game_id: gameId.value });
  }
  isSubmitting.value = true;
  emit('submit', { pyramid: pyramid.value, worstItem: worstItem.value });
}

function showDescription(item: PyramidItem) {
  describedItem.value = item;
  showTab.value = true;
  displayedDescription.value = '';
  selectedInfoIcon.value = item.id; // Set the selected info icon
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'view_description', game_id: gameId.value, item_id: item.id });
  }
  startTypingAnimation(item.description || 'No description available.');
}
function startTypingAnimation(fullDescription: string) {
  if (typingInterval) {
    clearInterval(typingInterval);
  }
  // Convert line breaks to <br> tags and preserve existing HTML
  const formattedDescription = fullDescription.replace(/\n/g, '<br>');
  const chars = formattedDescription.split(''); // Split into individual characters to handle HTML properly

  let index = 0;
  displayedDescription.value = '';

  typingInterval = setInterval(() => {
    if (index < chars.length) {
      displayedDescription.value += chars[index];
      index++;
    } else {
      clearInterval(typingInterval!);
      typingInterval = null;
    }
  }, 40);
}

function closeTab() {
  showTab.value = false;
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
  describedItem.value = null;
  displayedDescription.value = '';
  selectedInfoIcon.value = null; // Reset the selected info icon
}
</script>

<style scoped>
.box {
  padding: 0 !important;
}
.section {
  padding: 0.2rem 0.1rem;
  background-color: #000000;
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
  overflow-x: hidden;
}
.pyramid-row-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  margin-top: -22px; /* Tighter vertical overlap */
}
.pyramid-row-container:first-child {
  margin-top: 0;
}
.pyramid-row-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
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
  position: relative;
}
.pyramid-slot.drop-hover {
  background-color: #3298dc;
  transform: scale(1.05);
  border-color: #3298dc;
}
.slot-label-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}
.slot-points {
  font-size: 1rem;
  font-weight: bold;
  color: #22b573 !important;
}
.animation-container {
  position: absolute;
  right: -70px;
  top: 50%;
  transform: translateY(-50%);
  width: 60px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.animated-points {
  font-size: 1rem;
  font-weight: bold;
  color: #22b573 !important;
  animation: floatAndFade 1s ease-out forwards;
}
@keyframes floatAndFade {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(-30px);
    opacity: 0;
  }
}
.worst-item-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: max-content;
  margin: 0.3rem auto;
  overflow-x: hidden;
}
.worst-item-container .subtitle {
  width: 100%;
  text-align: center;
}
.worst-row-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
}
.worst-slot {
  border: 2px solid #ff3333;
  background-color: #3d1f1f;
  max-width: 100px;
  max-height: 100px;
  min-width: 60px;
  min-height: 60px;
  box-sizing: border-box;
  position: relative;
}
.worst-slot.drop-hover {
  background-color: #ff3333;
  border: 2px solid #ff3333;
  transform: scale(1.05);
}
.worst-slot-label-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}
.worst-slot-points {
  font-size: 1rem;
  font-weight: bold;
}
.worst-animation-container {
  position: absolute;
  right: -70px;
  top: 50%;
  transform: translateY(-50%);
  width: 60px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
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
.pool-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
}
.pool-controls .field {
  width: 200px;
  margin-bottom: 0 !important;
}
.pool-controls .input {
  background-color: #2a2a2a;
  color: white;
  border-color: #444;
}
.pool-controls .icon {
  color: #bbb;
}
.image-pool {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  justify-content: center;
  border: 2px dashed #666;
  padding: 4px;
  margin-top: 0.5rem;
  background-color: #1f1f1f;
  width: 100%;
  max-width: 660px; /* Normal proportions for 4 columns */
  margin-left: auto;
  margin-right: auto;
}
.image-pool .pyramid-slot.image-box {
  width: 100% !important;
  max-width: none !important;
  height: 140px !important; /* More proportional height for desktop */
  max-height: 140px !important;
  min-height: 100px;
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
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.8);
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0.2rem;
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
  border-color: #00e8e0;
  box-shadow: 0 0 15px rgba(0, 232, 224, 0.5);
}

/* Hexagon Styles for Interactive Editor */
.hex-outer {
  width: 90px;
  height: 104px;
  position: relative;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: #1e1e1e;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hex-border {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: #00e8e0; /* Default cyan fallback */
  z-index: 1;
}
.hex-inner {
  width: calc(100% - 8px); /* Thicker border in editor */
  height: calc(100% - 8px);
  background: #0c0c0c;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  z-index: 2;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hex-outer.worst .hex-border {
  background: #ff5555;
}

.rank-tag {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 4px;
  border-radius: 2px;
  background: #00e8e0;
  z-index: 10;
  pointer-events: none;
  box-shadow: 0 0 5px rgba(0, 232, 224, 0.5);
}
.hex-outer.worst .rank-tag {
  background: #ff5555;
}

.pyramid-slot {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  margin: 0 !important;
  width: 95px; /* Slightly wider to match hex */
}
.pyramid-row {
  display: flex;
  justify-content: center;
  gap: 6px; /* Tighter horizontal gap */
}
.highlight-empty .hex-border {
  background: linear-gradient(135deg, #00e8e0, transparent);
  animation: pulseHex 1s infinite alternate;
}
@keyframes pulseHex {
  from { opacity: 0.3; }
  to { opacity: 1; }
}

@media screen and (max-width: 767px) {
  .hex-outer {
    width: 70px;
    height: 80px;
  }
}

.main-game-title {
  font-family: 'Outfit', 'Inter', sans-serif;
  font-size: 2.5rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 1rem 0 0.2rem;
  color: #fff;
  text-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  line-height: 1.1;
}

.main-game-title :deep(span) {
  color: #00e8e0 !important;
}

.game-subtitle {
  font-size: 1.25rem;
  color: #00e8e0;
  letter-spacing: 2px;
  margin-bottom: 2rem;
  text-transform: uppercase;
  font-weight: 700;
  opacity: 0.9;
  line-height: 1.4;
}

.subtitle {
  color: #eee;
  font-size: 24px;
  font-weight: bold;
  margin: 0.3rem 0;
  text-align: center;
  margin-bottom: 8px !important;
}
.button.is-primary {
  margin: 1rem;
}
.info-icon {
  position: absolute;
  top: 2px;
  right: 2px;
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
@media screen and (min-width: 768px) {
  .description-tab {
    width: 400px; /* Matches image-pool: 4 * 90px + 3 * 0.2rem + 2 * 0.3rem + 2px */
    left: 0;
    right: 0;
    margin-left: auto;
    margin-right: auto;
    transform: translateY(100%);
  }
  .description-tab.show {
    transform: translateY(0);
  }
}
.question-text {
  color: #00e8e0;
  font-weight: bold;
  margin-bottom: 0.5rem;
  text-align: center;
}
.answer-text {
  color: #eee;

}
 .info-icon.selected {
  color: #c4ff00;
  border: none !important;
}
@media screen and (max-width: 767px) {
  .section {
    padding: 0.1rem 0;
  }
  .pyramid {
    width: 100%;
    padding: 0 4px;
  }
  .pyramid-row-container {
    width: 100%;
    margin-top: -20px;
  }
  .pyramid-row {
    gap: 2px;
  }
  .hex-outer {
    width: 23vw;
    height: 26.5vw;
    max-width: 88px;
    max-height: 102px;
  }
  .hex-inner {
    width: calc(100% - 4px);
    height: calc(100% - 4px);
  }
  .pyramid-slot {
    width: 23vw;
    height: 26.5vw;
    max-width: 88px;
    max-height: 102px;
    min-width: 0;
    min-height: 0;
    padding: 0 !important;
  }
  .slot-label-container {
    gap: 0.05rem;
  }
  .slot-points {
    font-size: 0.8rem;
  }
  .animation-container {
    right: -60px;
    width: 50px;
    height: 90px;
  }
  .animated-points {
    font-size: 0.8rem;
  }
  .worst-item-container {
    overflow-x: hidden;
  }
  .worst-item-container .subtitle {
    width: 100%;
    text-align: center;
  }
  .worst-row-wrapper {
    position: relative;
  }
  .worst-slot {
    width: 23vw;
    height: 26.5vw;
    max-width: 88px;
    max-height: 102px;
    min-width: 0;
    min-height: 0;
    padding: 0 !important;
    border: 2px solid #ff3333;
  }
  .worst-slot.drop-hover {
    border: 2px solid #ff3333;
  }
  .worst-slot-label-container {
    gap: 0.05rem;
  }
  .worst-slot-points {
    font-size: 0.8rem;
  }
  .worst-animation-container {
    right: -60px;
    width: 50px;
    height: 90px;
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
    grid-template-columns: repeat(3, 1fr);
    width: calc(100% - 30px);
    max-width: 380px;
    gap: 0;
    padding: 2px;
  }
  .image-box {
    width: 100% !important;
    height: 32vw;
    max-height: 140px;
    min-width: 0;
    max-width: none;
  }
  .image-label {
    font-size: 0.75rem;
    padding: 0.1rem;
  }
  .tier-label {
    font-size: 0.8rem;
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
.clear-link-wrapper {
  position: relative;
}
.confirm-tooltip {
  position: absolute;
  background-color: #2a2a2a;
  color: white;
  padding: 0.5rem;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  z-index: 100;
  width: 250px;
  text-align: center;
  top: 100%;
  left: 0;
}
.confirm-tooltip:before {
  content: "";
  position: absolute;
  top: -10px;
  left: 10px;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid #2a2a2a;
}
.buttons {
  justify-content: center;
  margin-top: 0.5rem;
}
@media screen and (max-width: 767px) {
  .confirm-tooltip {
    left: auto;
    right: 0;
    width: 200px;
  }
  .confirm-tooltip:before {
    left: auto;
    right: 10px;
  }
}
.image-pool {
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
  overflow-y: auto;
  
}
</style>

