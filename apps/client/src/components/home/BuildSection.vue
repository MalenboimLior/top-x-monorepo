<template>
  <section class="build-section layout-container section-stack" :class="{ 'is-rtl': isRTL }">
    <header class="build-header section-header">
      <div class="section-header__content">
        <h2 class="section-title">{{ title }}</h2>
        <p class="section-subtitle">{{ subtitle }}</p>
      </div>
     
    </header>

    <div v-if="gameTypes.length" class="build-carousel" :class="{ 'is-rtl': isRTL }">
      <button
        v-if="hasMultiplePages"
        class="build-carousel-arrow build-carousel-arrow--prev"
        :disabled="!canGoPrev"
        @click="goToPrevPage"
        :aria-label="prevAriaLabel"
      >
        <font-awesome-icon :icon="prevArrowIcon" />
      </button>

      <div class="build-carousel-viewport">
        <div
          class="build-carousel-track"
          :style="{ transform: `translateX(-${currentPage * 100}%)` }"
        >
          <div
            v-for="(pageItems, pageIndex) in paginatedGameTypes"
            :key="`page-${pageIndex}`"
            class="build-carousel-page"
          >
            <button
              v-for="gameType in pageItems"
              :key="gameType.id"
              type="button"
              class="build-card"
              @click="handleSelect(gameType.id)"
            >
              <span class="build-card__icon" aria-hidden="true">
                <font-awesome-icon :icon="resolveIcon(gameType.id)" />
              </span>
              <span class="build-card__body">
                <span class="build-card__name">{{ gameType.name }}</span>
                <span v-if="gameType.description" class="build-card__description">
                  {{ gameType.description }}
                </span>
              </span>
              <span class="build-card__cta">
                {{ ctaTile }}
                <font-awesome-icon :icon="isRTL ? ['fas', 'arrow-left'] : ['fas', 'arrow-right']" />
              </span>
            </button>
          </div>
        </div>
      </div>

      <button
        v-if="hasMultiplePages"
        class="build-carousel-arrow build-carousel-arrow--next"
        :disabled="!canGoNext"
        @click="goToNextPage"
        :aria-label="nextAriaLabel"
      >
        <font-awesome-icon :icon="nextArrowIcon" />
      </button>
    </div>
    <p v-else class="empty-state">{{ emptyMessage }}</p>
    <div class="build-header__actions">
      <CustomButton type="is-primary" :label="freeCta" @click="emit('openAll')" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted, watch } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { GameType } from '@top-x/shared/types/game';
import { DEFAULT_GAME_TYPE_ICON, GAME_TYPE_ICON_MAP } from '@top-x/shared/constants/gameTypes';
import { useLocaleStore } from '@/stores/locale';

interface BuildSectionProps {
  title: string;
  subtitle: string;
  gameTypes: GameType[];
  primaryCta: string;
  freeCta: string;
  tileCta?: string;
  emptyMessage: string;
}

const props = withDefaults(defineProps<BuildSectionProps>(), {
  tileCta: '',
});

const emit = defineEmits<{
  (event: 'openAll'): void;
  (event: 'openFree'): void;
  (event: 'selectType', gameTypeId: string): void;
}>();

const localeStore = useLocaleStore();
const isRTL = computed(() => localeStore.direction === 'rtl');

const ctaTile = computed(() => props.tileCta || localeStore.translate('home.buildSection.cta'));

const currentPage = ref(0);
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200);

const updateWidth = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(() => {
  window.addEventListener('resize', updateWidth);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth);
});

const itemsPerPage = computed(() => {
  if (windowWidth.value < 600) return 1;
  if (windowWidth.value < 960) return 3;
  return 5;
});

// Paginate game types dynamically
const paginatedGameTypes = computed(() => {
  const pages = [];
  for (let i = 0; i < props.gameTypes.length; i += itemsPerPage.value) {
    pages.push(props.gameTypes.slice(i, i + itemsPerPage.value));
  }
  return pages;
});

// Reset page when items per page changes (e.g. resize)
watch(itemsPerPage, () => {
  currentPage.value = 0;
});

const hasMultiplePages = computed(() => paginatedGameTypes.value.length > 1);
const canGoPrev = computed(() => currentPage.value > 0);
const canGoNext = computed(() => currentPage.value < paginatedGameTypes.value.length - 1);

// RTL-aware computed properties
// RTL-aware computed properties
const prevArrowIcon = computed(() => ['fas', 'chevron-left']);
const nextArrowIcon = computed(() => ['fas', 'chevron-right']);

const prevAriaLabel = computed(() => isRTL.value ? 'Go to next page' : 'Go to previous page');
const nextAriaLabel = computed(() => isRTL.value ? 'Go to previous page' : 'Go to next page');

function normalizeGameTypeId(value: string | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function resolveIcon(gameTypeId: string | undefined) {
  const normalized = normalizeGameTypeId(gameTypeId);
  return GAME_TYPE_ICON_MAP[normalized] ?? DEFAULT_GAME_TYPE_ICON;
}

function handleSelect(gameTypeId: string) {
  emit('selectType', gameTypeId);
}



function goToPrevPage() {
  if (canGoPrev.value) {
    currentPage.value--;
  }
}

function goToNextPage() {
  if (canGoNext.value) {
    currentPage.value++;
  }
}

// Reset to first page when game types change
watch(() => props.gameTypes, () => {
  currentPage.value = 0;
}, { immediate: true });
</script>

<style scoped>
.build-section {
  --section-stack-gap: clamp(var(--space-2), 2vh, var(--space-3));
}

.build-section.is-rtl {
  direction: rtl;
}

.build-header {
  align-items: center;
  gap: clamp(var(--space-5), 5vw, var(--space-7));
}

.section-header__content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(0.4rem, 1vw, 0.6rem);
  padding-block: clamp(1.1rem, 2.4vw, 1.6rem);
  padding-inline: 0;
  background: transparent;
  text-align: start;
}

.section-header__content::before,
.section-header__content::after {
  display: none; /* Removed for flat design */
}

.build-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(var(--space-3), 2vw, var(--space-4));
  justify-content: center;
}

/* Hero-style button */
.build-header__actions .button {
  padding-inline: var(--space-8);
  font-weight: 700;
}

.section-title {
  margin: 0;
  font-size: clamp(1.5rem, 1.2vw + 1.5rem, 3rem);
  font-weight: 800;
  color: var(--color-text-primary);
}

.section-subtitle {
  margin: 0;
  font-size: clamp(1rem, 0.9vw + 1rem, 1.5rem);
  color: var(--color-text-secondary);
  font-weight: 500;
  max-width: 36rem;
}


.build-section.is-rtl .build-header__actions {
  justify-content: center;
}

.build-carousel {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.build-carousel.is-rtl {
  direction: ltr; /* Keep flex direction LTR for proper arrow positioning */
}

.build-carousel-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.build-carousel-arrow:hover:not(:disabled) {
  background-color: var(--color-bg-card-hover);
  border-color: var(--color-border-primary);
  color: var(--bulma-primary);
}

.build-carousel-arrow:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--color-bg-secondary) !important;
}

.build-carousel-arrow--prev {
  order: -1;
}

.build-carousel-arrow--next {
  order: 1;
}

.build-carousel-viewport {
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.build-carousel-track {
  display: flex;
  transition: transform var(--transition-base) ease;
  width: 100%;
}

.build-carousel-page {
  flex: 0 0 100%;
  display: flex;
  justify-content: center;
  gap: clamp(var(--space-5), 3vw, var(--space-6));
  padding: 0 var(--space-2);
  box-sizing: border-box;
}

.build-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(var(--space-5), 2.5vw, var(--space-6));
  padding: clamp(var(--space-6), 3vw, var(--space-7));
  border-radius: 28px;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  color: var(--color-text-primary);
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
  flex: 1;
  min-width: 180px;
  max-width: 200px;
}

.build-card::before,
.build-card::after {
  display: none; /* Removed for flat design */
}

.build-card:hover,
.build-card:focus-visible {
  outline: none;
  border-color: var(--color-border-primary);
  background-color: var(--color-bg-card-hover);
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
}

.build-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: clamp(3.4rem, 8vw, 4.2rem);
  height: clamp(3.4rem, 8vw, 4.2rem);
  border-radius: 20px;
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  font-size: clamp(1.35rem, 4vw, 1.6rem);
  color: var(--bulma-primary);
}

.build-card__body {
  display: flex;
  flex-direction: column;
  gap: clamp(0.45rem, 1.2vw, 0.7rem);
  align-items: center;
}

.build-card__name {
  font-size: clamp(1.2rem, 2.5vw, 1.4rem);
  font-weight: 700;
}

.build-card__description {
  color: var(--color-text-secondary);
  font-size: clamp(0.95rem, 2vw, 1.05rem);
  line-height: 1.55;
}

.build-card__cta {
  display: inline-flex;
  align-items: center;
  gap: clamp(0.4rem, 1.1vw, 0.6rem);
  font-weight: 600;
  color: var(--color-accent);
  background-color: var(--color-accent-bg);
  border: 1px solid var(--color-border-accent);
  border-radius: 999px;
  padding: 0.55rem 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.build-section.is-rtl .build-card::after {
  inset-inline-end: auto;
  inset-inline-start: -15%;
}

.build-section.is-rtl .build-card__cta {
  flex-direction: row-reverse;
}

@media (max-width: 64rem) {
  .build-header {
    align-items: flex-start;
  }

  .build-header__actions {
    justify-content: center;
  }

  .build-carousel-arrow {
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 48rem) {
  .build-carousel-page {
    gap: var(--space-4);
  }

  .build-card {
    min-width: 160px;
    max-width: 220px;
  }
}

@media (max-width: 37.5rem) {
  .build-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .section-header__content {
    align-items: center; /* Ensure content items are centered */
    text-align: center;
    width: 100%;
  }

  .build-carousel-arrow {
    width: 32px;
    height: 32px;
  }

  .build-carousel-page {
    gap: var(--space-3);
    padding: 0 var(--space-1);
  }

  .build-card {
    min-width: 240px;
    max-width: 320px;
    padding: var(--space-6);
  }

  .build-card__icon {
    width: clamp(3.2rem, 18vw, 3.7rem);
    height: clamp(3.2rem, 18vw, 3.7rem);
  }
}
</style>

