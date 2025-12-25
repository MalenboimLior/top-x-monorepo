<template>
  <div class="pyramid-builder">
    <!-- Items Section -->
    <section ref="itemsSection" class="config-section">
      <button
        type="button"
        class="section-toggle"
        @click="toggleSection('items')"
      >
        <span class="section-toggle__title">{{ t('build.pyramid.items.title', { count: config.items.length }) }}</span>
        <span class="section-toggle__icon" :class="{ 'section-toggle__icon--open': showItems }">
          ▼
        </span>
      </button>
      
      <div v-if="showItems" class="section-content">
        <!-- Pool Header and Sort Items at top -->
        <div class="items-header">
          <div class="field">
            <label class="field-label">{{ t('build.pyramid.items.poolHeader') }}</label>
            <input 
              class="field-input" 
              v-model="config.poolHeader" 
              :placeholder="t('build.pyramid.items.poolHeader')" 
            />
          </div>
          
          <div class="sort-options">
            <label class="field-label">{{ t('build.pyramid.items.sortItems') }}</label>
            <div class="sort-controls">
              <div class="field">
                <select v-model="config.sortItems.orderBy" class="field-select">
                  <option value="id">{{ t('build.pyramid.items.sortById') }}</option>
                  <option value="label">{{ t('build.pyramid.items.sortByLabel') }}</option>
                  <option value="color">{{ t('build.pyramid.items.sortByColor') }}</option>
                  <option value="name">{{ t('build.pyramid.items.sortByName') }}</option>
                </select>
              </div>
              <div class="field">
                <select v-model="config.sortItems.order" class="field-select">
                  <option value="asc">{{ t('build.pyramid.items.ascending') }}</option>
                  <option value="desc">{{ t('build.pyramid.items.descending') }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Items Grid -->
        <div v-if="config.items.length > 0" class="items-grid">
          <div
            v-for="(item, index) in config.items"
            :key="index"
            class="item-card"
          >
            <div class="item-card__image-wrapper">
              <ImageUploader
                v-model="item.src"
                :uploadFolder="`pyramid/${validatedGameId}`"
                :cropWidth="250"
                :cropHeight="250"
              />
            </div>
            <div class="item-card__fields">
              <input
                v-model="item.label"
                :placeholder="t('build.pyramid.items.displayName')"
                class="field-input field-input--compact"
                @input="updateItemId(index)"
              />
              <input
                v-model="item.name"
                :placeholder="t('build.pyramid.items.searchName')"
                class="field-input field-input--compact"
                @input="updateItemId(index)"
              />
            </div>
            <button
              type="button"
              class="item-card__remove"
              @click="removeItem(index)"
              :title="t('build.pyramid.items.removeItem')"
            >
              ×
            </button>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <p>{{ t('build.pyramid.items.empty') }}</p>
          <CustomButton
            type="is-primary"
            :label="t('build.pyramid.items.addFirstItem')"
            @click="openAddItemModal"
          />
        </div>

        <div class="section-footer">
          <CustomButton
            type="is-light"
            :label="t('build.pyramid.items.addItem')"
            @click="openAddItemModal"
          />
        </div>
      </div>
    </section>

    <!-- Rows Section -->
    <section ref="rowsSection" class="config-section">
      <button
        type="button"
        class="section-toggle"
        @click="toggleSection('rows')"
      >
        <span class="section-toggle__title">{{ t('build.pyramid.rows.title', { count: config.rows.length }) }}</span>
        <span class="section-toggle__icon" :class="{ 'section-toggle__icon--open': showRows }">
          ▼
        </span>
      </button>
      
      <div v-if="showRows" class="section-content">
        <div class="rows-header">
          <label class="toggle">
            <input type="checkbox" v-model="config.HideRowLabel" />
            <span>{{ t('build.pyramid.rows.hideRowLabel') }}</span>
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="config.worstShow" />
            <span>{{ t('build.pyramid.rows.showWorst') }}</span>
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="config.hideInfoButton" />
            <span>Hide Info Button</span>
          </label>
        </div>

        <div v-if="config.worstShow" class="worst-fields">
          <div class="field">
            <label class="field-label">{{ t('build.pyramid.rows.worstHeader') }}</label>
            <input 
              class="field-input" 
              v-model="config.worstHeader" 
              :placeholder="t('build.pyramid.rows.worstHeader')" 
            />
          </div>
          <div class="field">
            <label class="field-label">{{ t('build.pyramid.rows.worstPoints') }}</label>
            <input 
              class="field-input" 
              type="number" 
              v-model.number="config.worstPoints" 
              :placeholder="t('build.pyramid.rows.worstPoints')" 
            />
          </div>
        </div>

        <div v-if="config.rows.length > 0" class="rows-list">
          <div
            v-for="(row, index) in config.rows"
            :key="index"
            class="row-card"
          >
            <div class="row-card__fields">
              <div class="field">
                <label class="field-label">{{ t('build.pyramid.rows.label') }}</label>
                <input v-model="row.label" :placeholder="t('build.pyramid.rows.label')" class="field-input" />
              </div>
              <div class="field">
                <label class="field-label">{{ t('build.pyramid.rows.points') }}</label>
                <input type="number" v-model.number="row.points" :placeholder="t('build.pyramid.rows.points')" class="field-input" />
              </div>
              <div class="field">
                <label class="field-label">{{ t('build.pyramid.rows.color') }}</label>
                <input v-model="row.color" :placeholder="t('build.pyramid.rows.color')" class="field-input" />
              </div>
            </div>
            <button
              type="button"
              class="row-card__remove"
              @click="removeRow(index)"
              :title="t('build.pyramid.rows.removeRow')"
            >
              ×
            </button>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <p>{{ t('build.pyramid.rows.empty') }}</p>
          <CustomButton
            type="is-primary"
            :label="t('build.pyramid.rows.addFirstRow')"
            @click="addRow"
          />
        </div>

        <div class="section-footer">
          <CustomButton
            type="is-light"
            :label="t('build.pyramid.rows.addRow')"
            @click="addRow"
          />
        </div>
      </div>
    </section>

    <!-- Share Image Title -->
    <div class="field">
      <label class="field-label">{{ t('build.pyramid.shareImageTitle') }}</label>
      <input class="field-input" v-model="config.shareImageTitle" :placeholder="t('build.pyramid.shareImageTitle')" />
    </div>

    <!-- Stats Reveal Date -->
    <div class="field">
      <label class="toggle">
        <input type="checkbox" v-model="enableStatsRevealDate" />
        <span>{{ t('build.pyramid.statsRevealDate.enable') }}</span>
      </label>
      <div v-if="enableStatsRevealDate" class="field" style="margin-top: 0.5rem;">
        <label class="field-label">{{ t('build.pyramid.statsRevealDate.label') }}</label>
        <input 
          type="datetime-local" 
          class="field-input" 
          v-model="statsRevealDateLocal" 
          :placeholder="t('build.pyramid.statsRevealDate.placeholder')"
        />
        <p v-if="statsRevealDateLocal" class="field-help">
          {{ t('build.pyramid.statsRevealDate.help', { date: formatDateForDisplay(statsRevealDateLocal) }) }}
        </p>
      </div>
    </div>

    <!-- Community Items Section -->
    <section ref="communitySection" class="config-section">
      <button
        type="button"
        class="section-toggle"
        @click="toggleSection('community')"
      >
        <span class="section-toggle__title">{{ t('build.pyramid.community.title', { count: config.communityItems.length }) }}</span>
        <span class="section-toggle__icon" :class="{ 'section-toggle__icon--open': showCommunity }">
          ▼
        </span>
      </button>
      
      <div v-if="showCommunity" class="section-content">
        <!-- Community Header at top -->
        <div class="field">
          <label class="field-label">{{ t('build.pyramid.community.header') }}</label>
          <input 
            class="field-input" 
            v-model="config.communityHeader" 
            :placeholder="t('build.pyramid.community.header')" 
          />
        </div>

        <!-- Community Items Grid -->
        <div v-if="config.communityItems.length > 0" class="items-grid">
          <div
            v-for="(item, index) in config.communityItems"
            :key="index"
            class="item-card"
          >
            <div class="item-card__image-wrapper">
              <ImageUploader
                v-model="item.src"
                :uploadFolder="`pyramid/${validatedGameId}`"
                :cropWidth="200"
                :cropHeight="200"
              />
            </div>
            <div class="item-card__fields">
              <input
                v-model="item.label"
                :placeholder="t('build.pyramid.items.displayName')"
                class="field-input field-input--compact"
                @input="updateCommunityItemId(index)"
              />
              <input
                v-model="item.name"
                :placeholder="t('build.pyramid.items.searchName')"
                class="field-input field-input--compact"
                @input="updateCommunityItemId(index)"
              />
            </div>
            <button
              type="button"
              class="item-card__remove"
              @click="removeCommunityItem(index)"
              :title="t('build.pyramid.items.removeItem')"
            >
              ×
            </button>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <p>{{ t('build.pyramid.community.empty') }}</p>
          <CustomButton
            type="is-primary"
            :label="t('build.pyramid.community.addFirstItem')"
            @click="openAddCommunityItemModal"
          />
        </div>

        <div class="section-footer">
          <CustomButton
            type="is-light"
            :label="t('build.pyramid.community.addItem')"
            @click="openAddCommunityItemModal"
          />
        </div>
      </div>
    </section>

    <!-- Add Item Modal -->
    <div class="modal" :class="{ 'is-active': showAddItemModal }">
      <div class="modal-background" @click="closeAddItemModal"></div>
      <div class="modal-content box has-background-dark has-text-white">
        <button class="delete is-large" aria-label="close" @click="closeAddItemModal"></button>
        <h2 class="title has-text-white">{{ t('build.pyramid.modal.title') }}</h2>
        
        <div class="field">
          <label class="label has-text-white">{{ t('build.pyramid.modal.imageLabel') }}</label>
          <ImageUploader
            v-model="newItem.src"
            :uploadFolder="`pyramid/${validatedGameId}`"
            :cropWidth="250"
            :cropHeight="250"
          />
          <p v-if="!newItem.src" class="help has-text-warning">{{ t('build.pyramid.modal.imageRequired') }}</p>
        </div>

        <div class="field">
          <label class="label has-text-white">{{ t('build.pyramid.items.displayName') }}</label>
          <input
            class="input is-dark"
            v-model="newItem.label"
            :placeholder="t('build.pyramid.modal.displayNamePlaceholder')"
            :disabled="!newItem.src"
          />
        </div>

        <div class="field">
          <label class="label has-text-white">{{ t('build.pyramid.items.searchName') }}</label>
          <input
            class="input is-dark"
            v-model="newItem.name"
            :placeholder="t('build.pyramid.modal.searchNamePlaceholder')"
            :disabled="!newItem.src || !newItem.label"
          />
        </div>

        <div class="buttons">
          <button
            class="button is-success"
            @click="saveNewItem"
            :disabled="!newItem.src || !newItem.label"
          >
            {{ t('build.pyramid.modal.save') }}
          </button>
          <button class="button is-text has-text-white" @click="closeAddItemModal">
            {{ t('build.pyramid.modal.cancel') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add Community Item Modal -->
    <div class="modal" :class="{ 'is-active': showAddCommunityItemModal }">
      <div class="modal-background" @click="closeAddCommunityItemModal"></div>
      <div class="modal-content box has-background-dark has-text-white">
        <button class="delete is-large" aria-label="close" @click="closeAddCommunityItemModal"></button>
        <h2 class="title has-text-white">{{ t('build.pyramid.modal.title') }}</h2>
        
        <div class="field">
          <label class="label has-text-white">{{ t('build.pyramid.modal.imageLabel') }}</label>
          <ImageUploader
            v-model="newCommunityItem.src"
            :uploadFolder="`pyramid/${validatedGameId}`"
            :cropWidth="200"
            :cropHeight="200"
          />
          <p v-if="!newCommunityItem.src" class="help has-text-warning">{{ t('build.pyramid.modal.imageRequired') }}</p>
        </div>

        <div class="field">
          <label class="label has-text-white">{{ t('build.pyramid.items.displayName') }}</label>
          <input
            class="input is-dark"
            v-model="newCommunityItem.label"
            :placeholder="t('build.pyramid.modal.displayNamePlaceholder')"
            :disabled="!newCommunityItem.src"
          />
        </div>

        <div class="field">
          <label class="label has-text-white">{{ t('build.pyramid.items.searchName') }}</label>
          <input
            class="input is-dark"
            v-model="newCommunityItem.name"
            :placeholder="t('build.pyramid.modal.searchNamePlaceholder')"
            :disabled="!newCommunityItem.src || !newCommunityItem.label"
          />
        </div>

        <div class="buttons">
          <button
            class="button is-success"
            @click="saveNewCommunityItem"
            :disabled="!newCommunityItem.src || !newCommunityItem.label"
          >
            {{ t('build.pyramid.modal.save') }}
          </button>
          <button class="button is-text has-text-white" @click="closeAddCommunityItemModal">
            {{ t('build.pyramid.modal.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, nextTick } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';
import { useLocaleStore } from '@/stores/locale';
import type { PyramidConfig, PyramidItem, PyramidRow } from '@top-x/shared/types/pyramid';

// Deep equality check to avoid unnecessary emissions
function isEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Utility: Generate slug from text
function generateSlug(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
}

// Utility: Create random item ID
function createItemId(): string {
  return `item_${Math.random().toString(36).slice(2, 8)}`;
}

const props = defineProps<{
  modelValue: PyramidConfig;
  gameId?: string;
}>();
const emit = defineEmits(['update:modelValue']);

const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);

// Section state
const activeSection = ref<string | null>(null);
const showItems = computed(() => activeSection.value === 'items');
const showRows = computed(() => activeSection.value === 'rows');
const showCommunity = computed(() => activeSection.value === 'community');

// Section refs for scrolling
const itemsSection = ref<HTMLElement | null>(null);
const rowsSection = ref<HTMLElement | null>(null);
const communitySection = ref<HTMLElement | null>(null);

// Modal state
const showAddItemModal = ref(false);
const showAddCommunityItemModal = ref(false);
const newItem = ref<Partial<PyramidItem>>({ id: '', label: '', name: '', src: '', active: true, source: '' });
const newCommunityItem = ref<Partial<PyramidItem>>({ id: '', label: '', name: '', src: '', active: true, source: '' });

// Initialize config with a deep clone of modelValue
const config = ref<PyramidConfig>(JSON.parse(JSON.stringify(props.modelValue || {
  items: [],
  rows: [],
  sortItems: { orderBy: 'id', order: 'asc' },
  HideRowLabel: false,
  shareImageTitle: '',
  poolHeader: '',
  worstHeader: '',
  worstPoints: 0,
  worstShow: false,
  communityItems: [],
  communityHeader: '',
  hideInfoButton: false,
  statsRevealDate: undefined,
})));

// Stats reveal date management
const enableStatsRevealDate = ref(!!config.value.statsRevealDate);
const statsRevealDateLocal = ref<string>('');

// Convert ISO string to datetime-local format
function isoToLocalDateTime(isoString: string | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Convert datetime-local format to ISO string
function localDateTimeToIso(localDateTime: string): string {
  if (!localDateTime) return '';
  const date = new Date(localDateTime);
  if (isNaN(date.getTime())) return '';
  return date.toISOString();
}

// Format date for display
function formatDateForDisplay(localDateTime: string): string {
  if (!localDateTime) return '';
  const date = new Date(localDateTime);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

// Initialize statsRevealDateLocal from config
if (config.value.statsRevealDate) {
  statsRevealDateLocal.value = isoToLocalDateTime(config.value.statsRevealDate);
}

// Watch enableStatsRevealDate
watch(enableStatsRevealDate, (enabled) => {
  if (!enabled) {
    config.value.statsRevealDate = undefined;
    statsRevealDateLocal.value = '';
  } else if (!statsRevealDateLocal.value) {
    // Set default to tomorrow if enabling for the first time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    statsRevealDateLocal.value = isoToLocalDateTime(tomorrow.toISOString());
    config.value.statsRevealDate = tomorrow.toISOString();
  }
});

// Watch statsRevealDateLocal and update config
watch(statsRevealDateLocal, (newValue) => {
  if (enableStatsRevealDate.value && newValue) {
    config.value.statsRevealDate = localDateTimeToIso(newValue);
  } else if (!newValue) {
    config.value.statsRevealDate = undefined;
  }
});

// Ensure all items have valid IDs
function ensureItemIds() {
  config.value.items.forEach((item, index) => {
    if (!item.id || item.id.trim() === '') {
      const slug = generateSlug(item.label || item.name);
      item.id = slug || createItemId();
    }
  });
  config.value.communityItems.forEach((item, index) => {
    if (!item.id || item.id.trim() === '') {
      const slug = generateSlug(item.label || item.name);
      item.id = slug || createItemId();
    }
  });
}

// Validate gameId to ensure safe uploadFolder path
const validatedGameId = computed(() => {
  const id = props.gameId || `temp-${Date.now()}`;
  return id.replace(/[\/\\]/g, '');
});

// Watch modelValue for changes and update config
watch(() => props.modelValue, (newVal) => {
  if (newVal && !isEqual(newVal, config.value)) {
    console.log('AddPyramid: modelValue changed, updating config', newVal);
    config.value = JSON.parse(JSON.stringify(newVal));
    ensureItemIds();
    // Update stats reveal date UI state
    enableStatsRevealDate.value = !!config.value.statsRevealDate;
    if (config.value.statsRevealDate) {
      statsRevealDateLocal.value = isoToLocalDateTime(config.value.statsRevealDate);
    } else {
      statsRevealDateLocal.value = '';
    }
  }
}, { deep: true });

// Watch config for changes and emit update:modelValue only if different
watch(config, (newVal) => {
  if (!isEqual(newVal, props.modelValue)) {
    console.log('AddPyramid: config changed, emitting update:modelValue', newVal);
    emit('update:modelValue', JSON.parse(JSON.stringify(newVal)));
  }
}, { deep: true });

// Watch items and communityItems to auto-update IDs
watch(() => config.value.items, () => {
  ensureItemIds();
}, { deep: true });

watch(() => config.value.communityItems, () => {
  ensureItemIds();
}, { deep: true });

// Debug initial load
onMounted(() => {
  console.log('AddPyramid: Mounted with modelValue:', props.modelValue);
  console.log('AddPyramid: Initial config:', config.value);
  ensureItemIds();
});

// Toggle section
function toggleSection(section: string) {
  const wasOpen = activeSection.value === section;
  activeSection.value = wasOpen ? null : section;
  
  if (!wasOpen) {
    nextTick(() => {
      setTimeout(() => {
        const navbar = document.querySelector('.navbar') as HTMLElement;
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        
        let sectionElement: HTMLElement | null = null;
        switch (section) {
          case 'items':
            sectionElement = itemsSection.value;
            break;
          case 'rows':
            sectionElement = rowsSection.value;
            break;
          case 'community':
            sectionElement = communitySection.value;
            break;
        }
        
        if (sectionElement) {
          const toggleButton = sectionElement.querySelector('.section-toggle') as HTMLElement;
          const targetElement = toggleButton || sectionElement;
          
          if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetY = rect.top + scrollTop - navbarHeight;
            window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
          }
        }
      }, 50);
    });
  }
}

// Update item ID when label/name changes
function updateItemId(index: number) {
  const item = config.value.items[index];
  if (item) {
    const slug = generateSlug(item.label || item.name);
    item.id = slug || createItemId();
  }
}

// Update community item ID when label/name changes
function updateCommunityItemId(index: number) {
  const item = config.value.communityItems[index];
  if (item) {
    const slug = generateSlug(item.label || item.name);
    item.id = slug || createItemId();
  }
}

// Modal functions
function openAddItemModal() {
  newItem.value = { id: '', label: '', name: '', src: '', active: true, source: '' };
  showAddItemModal.value = true;
}

function closeAddItemModal() {
  showAddItemModal.value = false;
  newItem.value = { id: '', label: '', name: '', src: '', active: true, source: '' };
}

function saveNewItem() {
  if (!newItem.value.src || !newItem.value.label) return;
  
  const slug = generateSlug(newItem.value.label || newItem.value.name);
  const item: PyramidItem = {
    id: slug || createItemId(),
    label: newItem.value.label || '',
    name: newItem.value.name || '',
    src: newItem.value.src || '',
    active: true,
    source: '',
  };
  
  config.value.items.push(item);
  closeAddItemModal();
}

function openAddCommunityItemModal() {
  newCommunityItem.value = { id: '', label: '', name: '', src: '', active: true, source: '' };
  showAddCommunityItemModal.value = true;
}

function closeAddCommunityItemModal() {
  showAddCommunityItemModal.value = false;
  newCommunityItem.value = { id: '', label: '', name: '', src: '', active: true, source: '' };
}

function saveNewCommunityItem() {
  if (!newCommunityItem.value.src || !newCommunityItem.value.label) return;
  
  const slug = generateSlug(newCommunityItem.value.label || newCommunityItem.value.name);
  const item: PyramidItem = {
    id: slug || createItemId(),
    label: newCommunityItem.value.label || '',
    name: newCommunityItem.value.name || '',
    src: newCommunityItem.value.src || '',
    active: true,
    source: '',
  };
  
  config.value.communityItems.push(item);
  closeAddCommunityItemModal();
}

// Item management
function removeItem(index: number) {
  config.value.items.splice(index, 1);
}

// Row management
function addRow() {
  config.value.rows.push({ id: 0, label: '', points: 0 });
}

function removeRow(index: number) {
  config.value.rows.splice(index, 1);
}

// Community item management
function removeCommunityItem(index: number) {
  config.value.communityItems.splice(index, 1);
}
</script>

<style scoped>
.pyramid-builder {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Section Toggle (Collapsible) */
.section-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0.75rem;
  background: var(--color-bg-secondary);
  border: none;
  border-bottom: 2px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 0.5rem;
}

.section-toggle:hover {
  background: var(--color-primary-bg);
  border-bottom-color: var(--bulma-primary);
  color: var(--bulma-primary);
}

.section-toggle:hover .section-toggle__icon {
  color: var(--bulma-primary);
}

.section-toggle__title {
  color: inherit;
}

.section-toggle__icon {
  transition: transform 0.2s ease, color 0.2s ease;
  font-size: 1rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.section-toggle__icon--open {
  transform: rotate(180deg);
}

.config-section {
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-subtle);
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.section-footer {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--color-border-subtle);
}

/* Items Header */
.items-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border-subtle);
}

.sort-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sort-controls {
  display: flex;
  gap: 0.75rem;
}

.sort-controls .field {
  flex: 1;
}

/* Items Grid */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

@media (min-width: 64rem) {
  .items-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 37.5rem) {
  .items-grid {
    grid-template-columns: 1fr;
  }
}

.item-card {
  position: relative;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.item-card__image-wrapper {
  width: 100%;
}

.item-card__image-wrapper :deep(.image-uploader) {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.item-card__image-wrapper :deep(.uploader-current-image) {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-base);
}

.item-card__image-wrapper :deep(.uploader-button) {
  width: 100%;
  min-width: auto;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
}

.item-card__fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item-card__remove {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  line-height: 1;
}

.item-card__remove:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}

/* Rows */
.rows-header {
  display: flex;
  gap: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border-subtle);
  flex-wrap: wrap;
}

.worst-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border-subtle);
}

.rows-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.row-card {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-md);
  align-items: flex-start;
}

.row-card__fields {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
}

.row-card__remove {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid var(--color-border-base);
  color: var(--color-text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
}

.row-card__remove:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
}

/* Fields */
.field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.field-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
}

.field-input,
.field-select {
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
}

.field-input:focus,
.field-select:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.field-input--compact {
  font-size: 0.85rem;
  padding: 0.35rem 0.5rem;
}

.field-help {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  margin-top: 0.25rem;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-primary);
  cursor: pointer;
}

.toggle input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: var(--bulma-primary);
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  background: var(--color-bg-card);
  border: 1px dashed var(--color-border-base);
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
}

.empty-state p {
  margin-bottom: 1rem;
}

/* Modal */
.modal-content {
  max-width: 500px;
  width: 90%;
}

@media (max-width: 768px) {
  .row-card__fields {
    grid-template-columns: 1fr;
  }

  .sort-controls {
    flex-direction: column;
  }

  .worst-fields {
    grid-template-columns: 1fr;
  }
}
</style>
