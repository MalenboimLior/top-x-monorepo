<template>
  <section class="build-section layout-container section-stack" :class="{ 'is-rtl': isRTL }">
    <header class="build-header section-header">
      <div class="section-header__content">
        <h2 class="section-title">{{ title }}</h2>
        <p class="section-subtitle">{{ subtitle }}</p>
      </div>
     
    </header>

    <div v-if="gameTypes.length" class="build-grid">
      <button
        v-for="gameType in gameTypes"
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
    <p v-else class="empty-state">{{ emptyMessage }}</p>
    <div class="build-header__actions">
      <CustomButton type="is-primary" :label="freeCta" @click="emit('openAll')" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
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
  padding-inline: clamp(1.5rem, 3vw, 2.1rem);
  padding-inline-start: clamp(2.4rem, 5vw, 3.2rem);
  background: transparent;
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

.section-title {
  margin: 0;
  font-size: clamp(1rem, 0.7vw + 1rem, 2rem);
  font-weight: 800;
  color: var(--color-text-primary);
}

.section-subtitle {
  margin: 0;
  font-size: clamp(0.75rem, 0.7vw + 0.7rem, 1rem);
  color: var(--color-text-secondary);
  font-weight: 500;
  max-width: 36rem;
}

.build-section.is-rtl .section-header__content {
  padding-inline-start: clamp(1.5rem, 3vw, 2.1rem);
  padding-inline-end: clamp(2.4rem, 5vw, 3.2rem);
  text-align: right;
}


.build-section.is-rtl .build-header__actions {
  justify-content: center;
}

.build-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: clamp(var(--space-5), 3vw, var(--space-6));
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
  transition: border-color 0.25s ease, background-color 0.25s ease;
  overflow: hidden;
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

  .section-header__content {
    padding-inline: clamp(1.2rem, 4vw, 1.6rem);
    padding-inline-start: clamp(2.1rem, 6vw, 2.6rem);
  }
}

@media (max-width: 37.5rem) {
  .build-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .build-card {
    align-items: center;
  }

  .build-card__icon {
    width: clamp(3.2rem, 18vw, 3.7rem);
    height: clamp(3.2rem, 18vw, 3.7rem);
  }

  .section-header__content {
    padding-inline: clamp(1.1rem, 4vw, 1.4rem);
    padding-inline-start: clamp(1.8rem, 6vw, 2.2rem);
  }
}
</style>

