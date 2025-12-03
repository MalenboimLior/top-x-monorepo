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
  maxRows?: number;
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
  maxRows: undefined,
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

const availableRows = computed(() => {
  if (!props.games.length) {
    return 0;
  }
  return Math.max(1, Math.ceil(props.games.length / sanitizedItemsPerRow.value));
});

const rowsCap = computed(() => {
  if (availableRows.value === 0) {
    return 0;
  }
  const cap = props.maxRows === undefined || props.maxRows === null ? availableRows.value : Math.trunc(props.maxRows);
  return Math.max(1, Math.min(availableRows.value, cap));
});

const currentRows = ref(0);

watch(
  [rowsCap, sanitizedInitialRows],
  () => {
    if (rowsCap.value === 0) {
      currentRows.value = 0;
      return;
    }
    const initial = sanitizedInitialRows.value > 0 ? sanitizedInitialRows.value : 1;
    currentRows.value = Math.min(initial, rowsCap.value);
  },
  { immediate: true },
);

watch(
  () => props.games.length,
  () => {
    if (rowsCap.value === 0) {
      currentRows.value = 0;
      return;
    }
    currentRows.value = Math.min(currentRows.value || 1, rowsCap.value);
  },
);

const visibleCount = computed(() => sanitizedItemsPerRow.value * currentRows.value);
const visibleGames = computed(() => props.games.slice(0, visibleCount.value));

const showMoreAvailable = computed(() => rowsCap.value > 0 && currentRows.value < rowsCap.value);

function handleShowMore() {
  if (!showMoreAvailable.value) {
    return;
  }
  currentRows.value = Math.min(rowsCap.value, currentRows.value + sanitizedRowsIncrement.value);
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
  --section-stack-gap: clamp(var(--space-2), 2vh, var(--space-3));
}

.game-section.is-rtl {
  direction: rtl;
}

.section-header__content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(0.3rem, 0.8vw, 0.45rem);
  padding-block: clamp(0.8rem, 2vw, 1.2rem);
  padding-inline: clamp(1.2rem, 2.4vw, 1.6rem);
  padding-inline-start: clamp(1.8rem, 4vw, 2.4rem);
  background: transparent;
}

.section-header__content::before,
.section-header__content::after {
  display: none; /* Removed for flat design */
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

.game-section.is-rtl .section-header__content {
  padding-inline-start: clamp(1.2rem, 2.4vw, 1.6rem);
  padding-inline-end: clamp(1.8rem, 4vw, 2.4rem);
  text-align: right;
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
    padding-inline: clamp(1rem, 3.4vw, 1.4rem);
    padding-inline-start: clamp(1.6rem, 5vw, 2.1rem);
  }
}

@media (max-width: 37.5rem) {
  .game-section__grid {
    grid-template-columns: 1fr;
  }

  .section-header__content {
    padding-inline: clamp(0.9rem, 4vw, 1.2rem);
    padding-inline-start: clamp(1.4rem, 6vw, 1.8rem);
  }
}
</style>

