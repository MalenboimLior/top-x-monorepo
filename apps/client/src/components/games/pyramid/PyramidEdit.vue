
<!-- PyramidEdit.vue -->
<template>
  <section class="section">
    <div class="container has-text-centered">
      <h1 class="main-game-title" v-html="props.gameHeader"></h1>
      <p class="game-subtitle" v-html="props.gameInstruction"></p>
      
      <!-- Step Instruction -->
      <div class="step-guide-container">
        <div class="step-guide" :class="[
          { 'step-2-active': !!selectedItem },
          { 'step-3-active': isPyramidFull && !selectedItem }
        ]">
          <div class="step-item step-1">
            <span class="step-number">1</span>
            <span class="step-text">{{ t('games.pyramid.step1') }}</span>
          </div>
          <div class="step-arrow arrow-1" :style="{ '--arrow-rotation': localeStore.direction === 'rtl' ? '180deg' : '0deg' }">
            <font-awesome-icon :icon="['fas', 'arrow-right']" class="arrow-icon" />
          </div>
          <div class="step-item step-2">
            <span class="step-number">2</span>
            <span class="step-text">{{ t('games.pyramid.step2') }}</span>
          </div>
          <div class="step-arrow arrow-2" :style="{ '--arrow-rotation': localeStore.direction === 'rtl' ? '180deg' : '0deg' }">
            <font-awesome-icon :icon="['fas', 'arrow-right']" class="arrow-icon" />
          </div>
          <div class="step-item step-3">
            <span class="step-number">3</span>
            <span class="step-text">{{ t('games.pyramid.step3') }}</span>
          </div>
        </div>
      </div>

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
                  { 'can-swap': (selectedItem || draggedItem) && slot.image && !isSelected(slot.image) },
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
                      <div v-if="(selectedItem || draggedItem) && !isSelected(slot.image)" class="swap-badge-mobile">
                        <font-awesome-icon :icon="['fas', 'arrows-rotate']" />
                      </div>
                      <div v-if="isSelected(slot.image)" class="remove-item-badge" @click.stop="removeItemFromSlot(rowIndex, colIndex)">
                        <font-awesome-icon :icon="['fas', 'trash-can']" />
                      </div>
                      <img :src="slot.image.src" class="draggable-image" crossorigin="anonymous" />
                    </div>
                    <div v-else class="slot-label-container">
                      <div class="tier-label">{{ toRoman(rowIndex + 1) }}</div>
                      <div class="slot-points has-text-success">+{{ rows[rowIndex]?.points || 0 }}</div>
                    </div>
                  </div>
                  
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
              { 'can-swap': (selectedItem || draggedItem) && worstItem && !isSelected(worstItem) },
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
                  <div v-if="(selectedItem || draggedItem) && !isSelected(worstItem)" class="swap-badge-mobile">
                    <font-awesome-icon :icon="['fas', 'arrows-rotate']" />
                  </div>
                  <div v-if="isSelected(worstItem)" class="remove-item-badge danger" @click.stop="removeWorstItem">
                    <font-awesome-icon :icon="['fas', 'trash-can']" />
                  </div>
                  <img :src="worstItem.src" class="draggable-image" crossorigin="anonymous" />
                </div>
                <div v-else class="worst-slot-label-container">
                  <div class="tier-label has-text-danger">{{ t('games.pyramid.worst') }}</div>
                  <div class="worst-slot-points has-text-danger">{{ props.worstPoints || 0 }}</div>
                </div>
              </div>
            </div>
          </div>
          <!-- Animation container for worst slot -->
          <div v-if="worstAnimatedPoints" class="worst-animation-container">
            <div class="animated-points has-text-danger">{{ worstAnimatedPoints }}</div>
          </div>
        </div>
      </div>
<div style="padding: 10px;">
      <button 
        class="btn-primary vote-button"
        :class="{ 'pulse-vote': isPyramidFull }"
        :disabled="isSubmitting"
        @click="submitPyramid"
      >
        <span class="btn-content">
          {{ t('games.pyramid.placeVote') }}
          <i class="fas fa-arrow-right btn-icon" :class="{ 'fa-flip-horizontal': localeStore.direction === 'rtl' }"></i>
        </span>
        <div class="btn-glow"></div>
      </button>
      </div>
      
      <!-- Pool Scroll Indicator for Mobile -->
      <div v-if="!selectedItem && isTouchDevice" class="pool-scroll-hint" @click="scrollToPool">
        <span class="hint-text">{{ t('games.pyramid.scrollToPool') }}</span>
        <font-awesome-icon :icon="['fas', 'chevron-down']" class="hint-icon" />
      </div>

      <div class="pool-controls mb-4" id="item-pool-scroll-target">
       
        <div class="field">
          <div class="control has-icons-left has-icons-right">
            <input
              class="input is-dark"
              type="text"
              :placeholder="t('games.pyramid.search')"
              v-model="searchQuery"
            />
            <span class="icon is-left">
              <font-awesome-icon :icon="['fas', 'search']" />
            </span>
            <span v-if="searchQuery" class="icon is-right is-clickable" @click="searchQuery = ''">
              <font-awesome-icon :icon="['fas', 'circle-xmark']" />
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
      <h2 class="subtitle has-text-white" style="font-size: 20px;">{{ props.poolHeader }}</h2>
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
          <div v-if="isSelected(image)" class="selection-badge">
            {{ t('games.pyramid.selected') }}
          </div>
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
         type="is-primary"
          :label="t('games.pyramid.addNewItem')"
          :icon="['fas', 'plus']"
          @click="showAddItemPopup"
        />
      </div>
      <h2 class="subtitle has-text-white" style="font-size: 20px;">{{ props.communityHeader || t('games.pyramid.communityItems') }}</h2>
      
      <div class="image-pool drop-zone" @dragover.prevent @drop="onDropToCommunityPool">
        <div
          v-if="filteredCommunityPool.length === 0"
          class="empty-community-message"
        >
          <p class="has-text-centered has-text-grey-light">{{ t('games.pyramid.noCommunityItems') }}</p>
        </div>
        <div
          v-for="image in filteredCommunityPool"
          :key="image.id"
          class="pyramid-slot image-box slot-style dark-slot"
          :class="{ 'selected': isSelected(image) }"
          :draggable="!isTouchDevice"
          @dragstart="() => onDragStart(image)"
          @click.stop="() => onTapSelect(image)"
        >
          <div v-if="isSelected(image)" class="selection-badge">
            {{ t('games.pyramid.selected') }}
          </div>
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
          <p class="question-text">{{ t('games.pyramid.questionAbout') }}{{ describedItem?.label }}?</p>
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
import { faCircleInfo, faSearch, faEraser, faPlus, faArrowRight, faChevronDown, faArrowsRotate, faCircleXmark, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { useRoute } from 'vue-router';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import PyramidAddItemPopup from '@/components/games/pyramid/PyramidAddItemPopup.vue';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';

library.add(faCircleInfo, faSearch, faEraser, faPlus, faArrowRight, faChevronDown, faArrowsRotate, faCircleXmark, faTrashCan);

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
const isPyramidFull = computed(() => {
  const pyramidFull = pyramid.value.every(row => row.every(slot => !!slot.image));
  const worstFull = worstShow.value ? !!worstItem.value : true;
  return pyramidFull && worstFull;
});
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

const scrollToPool = () => {
  const target = document.getElementById('item-pool-scroll-target');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

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

function removeItemFromSlot(row: number, col: number) {
  const item = pyramid.value[row][col].image;
  if (!item) return;

  pyramid.value[row][col].image = null;
  
  // Return to pool - check if it's an official item
  const isOfficial = props.items.some(i => i.id === item.id);
  if (isOfficial) {
    if (!officialPool.value.some(i => i.id === item.id)) {
      officialPool.value.push(item);
      officialPool.value = officialPool.value.sort(sortFunction);
    }
  } else {
    // If not official, it's community (either from props or newly added)
    if (!communityPool.value.some(i => i.id === item.id)) {
      communityPool.value.push(item);
      communityPool.value = communityPool.value.sort(sortFunction);
    }
  }

  selectedItem.value = null;
  draggedItem.value = null;
}

function removeWorstItem() {
  const item = worstItem.value;
  if (!item) return;

  worstItem.value = null;

  // Return to pool - check if it's an official item
  const isOfficial = props.items.some(i => i.id === item.id);
  if (isOfficial) {
    if (!officialPool.value.some(i => i.id === item.id)) {
      officialPool.value.push(item);
      officialPool.value = officialPool.value.sort(sortFunction);
    }
  } else {
    // If not official, it's community
    if (!communityPool.value.some(i => i.id === item.id)) {
      communityPool.value.push(item);
      communityPool.value = communityPool.value.sort(sortFunction);
    }
  }

  selectedItem.value = null;
  draggedItem.value = null;
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
  
  // Check if description contains HTML tags
  const hasHTML = /<[^>]+>/.test(formattedDescription);
  
  if (hasHTML) {
    // If HTML is present, show it immediately to avoid breaking tags
    displayedDescription.value = formattedDescription;
    return;
  }
  
  // For plain text, use typing animation
  const chars = formattedDescription.split('');

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
  overflow: hidden !important;
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
  overflow: hidden !important;
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
  direction: ltr;
}
.animation-container, .worst-animation-container {
  position: absolute;
  right: -75px;
  top: 50%;
  transform: translateY(-50%);
  width: 70px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 2000;
}
.animated-points {
  font-size: 2rem;
  font-weight: 900;
  color: #c4ff00 !important; /* Vibrant Lime */
  animation: pointsPopFade 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  direction: ltr;
  white-space: nowrap;
  text-shadow: 0 4px 15px rgba(0,0,0,0.6);
  filter: drop-shadow(0 0 10px rgba(196, 255, 0, 0.5));
}
.animated-points.has-text-danger {
  color: #ff3333 !important;
  filter: drop-shadow(0 0 10px rgba(255, 51, 51, 0.5));
}
@keyframes pointsPopFade {
  0% { transform: translateY(40px) scale(0) rotate(-10deg); opacity: 0; }
  30% { transform: translateY(0) scale(1.4) rotate(5deg); opacity: 1; }
  50% { transform: translateY(-10px) scale(1.1) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-90px) scale(0.8); opacity: 0; }
}
.worst-item-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: max-content;
  margin: 0.3rem auto;
  overflow: hidden !important;
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
  overflow: hidden !important;
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
  direction: ltr;
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
  overflow: hidden !important;
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
  box-shadow: 0 0 20px rgba(0, 232, 224, 0.8);
  animation: pulse-selected 2s infinite;
  transform: scale(1.05);
  z-index: 50;
}

@keyframes pulse-selected {
  0% { box-shadow: 0 0 10px rgba(0, 232, 224, 0.5); }
  50% { box-shadow: 0 0 25px rgba(0, 232, 224, 0.9), 0 0 40px rgba(0, 232, 224, 0.4); }
  100% { box-shadow: 0 0 10px rgba(0, 232, 224, 0.5); }
}

/* Step Guide Styles */
.step-guide-container {
  display: flex;
      margin-bottom: 10px; /* More space for the guide */

  justify-content: center;
  perspective: 1000px;
}

.step-guide {
  display: flex;
  align-items: center;
  background: rgba(30, 30, 30, 0.8);
  padding: 0.8rem 1.5rem;
  border-radius: 50px;
  border: 1px solid #333;
  backdrop-filter: blur(10px);
  gap: 1.5rem;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.step-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  transition: all 0.3s ease;
  opacity: 0.5;
  flex: 1;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 0.9rem;
  color: #fff;
  flex-shrink: 0;
}

.step-text {
  font-weight: 600;
  font-size: 0.95rem;
  white-space: nowrap;
  flex: 1;
}

.step-arrow {
  display: flex;
  align-items: center;
  opacity: 0.3;
  transition: transform 0.3s ease;
  transform: rotate(var(--arrow-rotation, 0deg));
}

.arrow-icon {
  font-size: 1rem;
  color: #00e8e0;
}

/* Step 1 Active */
.step-guide:not(.step-2-active):not(.step-3-active) .step-1 {
  opacity: 1;
  transform: scale(1.05);
}
.step-guide:not(.step-2-active):not(.step-3-active) .step-1 .step-number {
  background: #00e8e0;
  box-shadow: 0 0 15px rgba(0, 232, 224, 0.5);
}

/* Step 2 Active */
.step-2-active {
  border-color: #00e8e0;
  background: rgba(0, 232, 224, 0.1);
}

.step-2-active .step-2 {
  opacity: 1;
  transform: scale(1.05);
}

.step-2-active .step-2 .step-number {
  background: #c4ff00;
  color: #000;
  box-shadow: 0 0 15px rgba(196, 255, 0, 0.5);
}

.step-2-active .arrow-1 {
  opacity: 1;
  animation: slideArrow 1s infinite;
}

/* Step 3 Active */
.step-3-active {
  border-color: #c4ff00;
  background: rgba(196, 255, 0, 0.1);
}

.step-3-active .step-3 {
  opacity: 1;
  transform: scale(1.05);
}

.step-3-active .step-3 .step-number {
  background: #ffaa00;
  color: #000;
  box-shadow: 0 0 15px rgba(255, 170, 0, 0.5);
}

.step-3-active .arrow-2 {
  opacity: 1;
  animation: slideArrow 1s infinite;
}

/* Vote Pulse */
.pulse-vote {
  animation: pulseVote 2s infinite !important;
  transform: scale(1.05);
}

@keyframes pulseVote {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 232, 224, 0.7); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(0, 232, 224, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 232, 224, 0); }
}

@keyframes slideArrow {
  0% {
    transform: translateX(-5px) rotate(var(--arrow-rotation, 0deg));
    opacity: 0.3;
  }
  50% {
    transform: translateX(5px) rotate(var(--arrow-rotation, 0deg));
    opacity: 1;
  }
  100% {
    transform: translateX(-5px) rotate(var(--arrow-rotation, 0deg));
    opacity: 0.3;
  }
}

/* In RTL, because the container is rotated 180deg, 
   translateX(-5px) actually moves it visually to the Right, 
   and translateX(5px) to the Left. 
   Since Step 1 is on the Right and Step 2 is on the Left in RTL, 
   this animation naturally works as a slide from Right to Left. */

.highlight-empty .hex-border {
  background: linear-gradient(135deg, #00e8e0, #c4ff00);
  background-size: 200% 200%;
  animation: flowGradient 2s infinite, pulseHighlight 1s infinite alternate;
  z-index: 10;
}

@keyframes flowGradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes pulseHighlight {
  from { opacity: 0.4; filter: brightness(1); }
  to { opacity: 1; filter: brightness(1.5); box-shadow: 0 0 15px rgba(196, 255, 0, 0.3); }
}

/* Swap Indicator Logic */
.swap-badge-mobile {
  position: absolute;
  top: 50%;
  left: 50%;
  margin-top: -15px; /* Half of height to center */
  margin-left: -15px; /* Half of width to center */
  background: rgba(0, 0, 0, 0.7);
  color: #00e8e0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  z-index: 50;
  box-shadow: 0 0 15px rgba(0, 232, 224, 0.5);
  animation: rotateSwap 3s linear infinite;
  border: 1px solid #00e8e0;
  pointer-events: none;
}

@keyframes rotateSwap {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.selection-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-15deg);
  background: #00e8e0;
  color: #000;
  padding: 0.2rem 0.8rem;
  font-weight: 900;
  font-size: 0.8rem;
  text-transform: uppercase;
  border-radius: 4px;
  z-index: 30;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  pointer-events: none;
  border: 1px solid #fff;
}

@media screen and (max-width: 767px) {
  .step-guide {
    padding: 0.5rem 1rem;
    gap: 0.8rem;
    width: 95%;
  }
  .step-text {
    font-size: 0.8rem;
    white-space: normal;
    text-align: inherit;
    line-height: 1.2;
  }
  .step-item {
    gap: 0.5rem;
  }
  .step-number {
    width: 22px;
    height: 22px;
    font-size: 0.8rem;
    min-width: 22px;
  }
  .step-guide-container {
    margin-bottom: 20px; /* More space for the guide */
  }
  .step-guide {
    gap: 0.5rem;
    padding: 0.5rem 0.8rem;
  }
}

/* Pool Scroll Hint */
.pool-scroll-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem auto;
  padding: 0.8rem;
  background: rgba(196, 255, 0, 0.1);
  border: 1px dashed #c4ff00;
  border-radius: 12px;
  color: #c4ff00;
  font-weight: 700;
  cursor: pointer;
  animation: bounceHint 2s infinite;
  width: fit-content;
}

@keyframes bounceHint {
  0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
  40% {transform: translateY(-5px);}
  60% {transform: translateY(-3px);}
}

.hint-text {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hint-icon {
  font-size: 1.2rem;
}

/* Slot Interaction */
.hex-outer:hover {
  transform: scale(1.02);
  filter: brightness(1.2);
}

.image-pool .pyramid-slot:hover {
  transform: translateY(-5px);
  border-color: #555;
  background: #252525;
}

.image-pool .pyramid-slot.selected:hover {
  transform: translateY(-5px) scale(1.05);
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
  overflow: hidden !important;
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
  overflow: hidden !important;
}
.pyramid-row {
  display: flex;
  justify-content: center;
  gap: 6px; /* Tighter horizontal gap */
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
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 0 5px rgba(0,0,0,0.5);
}

.info-icon:hover {
  transform: scale(1.3);
  background-color: #00e8e0;
  color: #000;
  box-shadow: 0 0 10px rgba(0, 232, 224, 0.6);
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
    font-size: 1.4rem;
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
    right: -55px;
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
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  z-index: 1000;
  width: 280px;
  text-align: center;
  top: calc(100% + 15px);
  left: 50%;
  transform: translateX(-50%);
  border: 1px solid #444;
}
.confirm-tooltip:before {
  content: "";
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid #444;
}
.confirm-tooltip:after {
  content: "";
  position: absolute;
  top: -9px;
  left: 50%;
  transform: translateX(-50%);
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
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 320px;
    box-shadow: 0 0 0 100vmax rgba(0,0,0,0.7), 0 10px 25px rgba(0,0,0,0.5);
  }
  .confirm-tooltip:before, .confirm-tooltip:after {
    display: none;
  }
}
.empty-community-message {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  width: 100%;
  min-height: 140px;
  grid-column: 1 / -1;
}

.image-pool {
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
  overflow-y: auto;
}

/* Remove Item Badge */
.remove-item-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.95);
  color: #ff3860;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  z-index: 60;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 1px solid #ff3860;
}

.remove-item-badge:hover {
  transform: translate(-50%, -50%) scale(1.15);
  background: #ff3860;
  color: white;
}

.remove-item-badge.danger {
  color: #fff;
  background: #ff3860;
  border-color: #fff;
}

/* Vote Button - Matching HeroSection btn-primary style */
.vote-button {
  position: relative;
  padding: 1rem 2rem;
  background: var(--color-primary);
  color: #000;
  font-weight: 700;
  font-size: 1.1rem;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
  min-width: 180px;
}

.vote-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 232, 224, 0.3);
}

.vote-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.vote-button .btn-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
}

.vote-button .btn-icon {
  transition: transform 0.2s ease;
}

.vote-button:hover:not(:disabled) .btn-icon {
  transform: translateX(4px);
}

.vote-button:hover:not(:disabled) .btn-icon.fa-flip-horizontal {
  transform: translateX(-4px);
}

.vote-button .btn-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
  transform: scale(0);
  transition: transform 0.4s ease;
  z-index: 1;
}

.vote-button:hover:not(:disabled) .btn-glow {
  transform: scale(1);
}

.vote-button.pulse-vote {
  background: linear-gradient(135deg, #00e8e0 0%, #c4ff00 100%);
  animation: pulseVoteAttractive 2s infinite;
}

@keyframes pulseVoteAttractive {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(196, 255, 0, 0.7); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(196, 255, 0, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(196, 255, 0, 0); }
}

.is-clickable {
  cursor: pointer;
}
</style>

