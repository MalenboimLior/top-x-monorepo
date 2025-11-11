<template>
  <section
    ref="rootRef"
    :id="sectionId"
    class="game-section layout-container section-stack"
    :class="{ 'is-rtl': isRTL }"
  >
    <header class="section-header">
      <div class="section-header__content">
        <h2 class="section-title">{{ title }}</h2>
        <p v-if="subtitle" class="section-subtitle">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </header>

    <div
      v-if="visibleGames.length"
      class="game-section__grid game-grid"
      :class="gridClasses"
      :style="gridStyle"
    >
      <slot
        v-for="game in visibleGames"
        :key="game.id"
        :game="game"
        :stats="gameStats?.[game.id]"
      />
    </div>

    <p v-else-if="emptyMessage" class="empty-state">{{ emptyMessage }}</p>

    <div v-if="showMoreAvailable" class="game-section__footer">
      <CustomButton
        class="game-section__more"
        type="is-secondary"
        :label="showMoreText"
        @click="handleShowMore"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useLocaleStore } from '@/stores/locale';
import type { Game } from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';

interface GameSectionProps {
  title: string;
  subtitle?: string;
  games: Game[];
  gameStats?: Record<string, Partial<GameStats>>;
  emptyMessage?: string;
  itemsPerRow?: number;
  initialRows?: number;
  rowsIncrement?: number;
  gridVariant?: string;
  sectionId?: string;
  showMoreLabel?: string;
}

const props = withDefaults(defineProps<GameSectionProps>(), {
  subtitle: '',
  games: () => [],
  gameStats: () => ({}),
  emptyMessage: '',
  itemsPerRow: 3,
  initialRows: 1,
  rowsIncrement: undefined,
  gridVariant: '',
  sectionId: undefined,
  showMoreLabel: '',
});

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const sanitizedItemsPerRow = computed(() => Math.max(1, Math.trunc(props.itemsPerRow)));
const sanitizedInitialRows = computed(() => Math.max(0, Math.trunc(props.initialRows)));
const sanitizedRowsIncrement = computed(() => {
  const fallback = sanitizedInitialRows.value > 0 ? sanitizedInitialRows.value : 1;
  const value = props.rowsIncrement === undefined ? fallback : props.rowsIncrement;
  return Math.max(1, Math.trunc(value));
});

const maxRows = computed(() => {
  if (!props.games.length) {
    return 0;
  }
  return Math.max(1, Math.ceil(props.games.length / sanitizedItemsPerRow.value));
});

const currentRows = ref(0);

watch(
  [maxRows, sanitizedInitialRows],
  () => {
    if (maxRows.value === 0) {
      currentRows.value = 0;
      return;
    }
    const initial = sanitizedInitialRows.value > 0 ? sanitizedInitialRows.value : 1;
    currentRows.value = Math.min(initial, maxRows.value);
  },
  { immediate: true },
);

watch(
  () => props.games.length,
  () => {
    if (maxRows.value === 0) {
      currentRows.value = 0;
      return;
    }
    currentRows.value = Math.min(currentRows.value || 1, maxRows.value);
  },
);

const visibleCount = computed(() => sanitizedItemsPerRow.value * currentRows.value);
const visibleGames = computed(() => props.games.slice(0, visibleCount.value));

const showMoreAvailable = computed(() => maxRows.value > 0 && currentRows.value < maxRows.value);

function handleShowMore() {
  if (!showMoreAvailable.value) {
    return;
  }
  currentRows.value = Math.min(maxRows.value, currentRows.value + sanitizedRowsIncrement.value);
}

const gridClasses = computed(() => {
  if (!props.gridVariant) {
    return [];
  }
  return [`game-grid--${props.gridVariant}`];
});

const gridStyle = computed(() => ({
  '--game-grid-columns': sanitizedItemsPerRow.value.toString(),
}));

const showMoreText = computed(() => props.showMoreLabel || t('home.showMore'));
const isRTL = computed(() => localeStore.direction === 'rtl');

const rootRef = ref<HTMLElement | null>(null);
defineExpose({ el: rootRef });
</script>

<style scoped>
.game-section {
  --section-stack-gap: clamp(var(--space-7), 6vh, var(--space-8));
}

.game-section.is-rtl {
  direction: rtl;
}

.section-header__content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(0.4rem, 1vw, 0.6rem);
  padding-block: clamp(1.1rem, 2.4vw, 1.6rem);
  padding-inline: clamp(1.5rem, 3vw, 2.1rem);
  padding-inline-start: clamp(2.4rem, 5vw, 3.2rem);
  border-radius: 24px;
  background: radial-gradient(circle at top left, rgba(0, 232, 224, 0.16), transparent 55%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.6));
  border: 1px solid rgba(0, 232, 224, 0.18);
  box-shadow: 0 26px 48px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

.section-header__content::before {
  content: '';
  position: absolute;
  inset-block: clamp(0.75rem, 2vw, 1.1rem);
  inset-inline-start: clamp(0.9rem, 2vw, 1.2rem);
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(0, 232, 224, 0.9), rgba(196, 255, 0, 0.9));
  box-shadow: 0 0 18px rgba(0, 232, 224, 0.6);
}

.section-header__content::after {
  content: '';
  position: absolute;
  inset-inline-end: -25%;
  inset-block-start: -45%;
  width: 60%;
  height: 120%;
  background: radial-gradient(circle, rgba(196, 255, 0, 0.18), transparent 60%);
  opacity: 0.7;
  pointer-events: none;
}

.section-title {
  margin: 0;
  font-size: clamp(var(--font-size-700), 2vw + 1rem, var(--font-size-1000));
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 18px 46px rgba(0, 232, 224, 0.35);
}

.section-subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  font-weight: 500;
  max-width: 36rem;
}

.game-section.is-rtl .section-header__content {
  padding-inline-start: clamp(1.5rem, 3vw, 2.1rem);
  padding-inline-end: clamp(2.4rem, 5vw, 3.2rem);
  text-align: right;
}

.game-section.is-rtl .section-header__content::before {
  inset-inline-start: auto;
  inset-inline-end: clamp(0.9rem, 2vw, 1.2rem);
}

.game-section.is-rtl .section-header__content::after {
  inset-inline-end: auto;
  inset-inline-start: -25%;
}

.game-section__grid {
  display: grid;
  gap: var(--space-6);
  grid-template-columns: repeat(var(--game-grid-columns, 1), minmax(220px, 1fr));
}

.game-section__footer {
  display: flex;
  justify-content: center;
}

.game-section__more {
  min-width: 12rem;
}

@media (max-width: 64rem) {
  .game-section__grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .section-header__content {
    padding-inline: clamp(1.2rem, 4vw, 1.6rem);
    padding-inline-start: clamp(2.1rem, 6vw, 2.6rem);
  }
}

@media (max-width: 37.5rem) {
  .game-section__grid {
    grid-template-columns: 1fr;
  }

  .section-header__content {
    padding-inline: clamp(1.1rem, 4vw, 1.4rem);
    padding-inline-start: clamp(1.8rem, 6vw, 2.2rem);
  }
}
</style>

