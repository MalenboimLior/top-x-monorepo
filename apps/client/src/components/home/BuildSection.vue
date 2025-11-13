<template>
  <section class="build-section layout-container section-stack" :class="{ 'is-rtl': isRTL }">
    <header class="build-header section-header">
      <div class="section-header__content">
        <h2 class="section-title">{{ title }}</h2>
        <p class="section-subtitle">{{ subtitle }}</p>
      </div>
      <div class="build-header__actions">
        <CustomButton type="is-primary" :label="primaryCta" @click="emit('openAll')" />
        <CustomButton type="is-secondary" :label="freeCta" @click="emit('openFree')" />
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
  --section-stack-gap: clamp(var(--space-4), 4vh, var(--space-5));
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

.build-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(var(--space-3), 2vw, var(--space-4));
  justify-content: flex-end;
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

.build-section.is-rtl .section-header__content {
  padding-inline-start: clamp(1.5rem, 3vw, 2.1rem);
  padding-inline-end: clamp(2.4rem, 5vw, 3.2rem);
  text-align: right;
}

.build-section.is-rtl .section-header__content::before {
  inset-inline-start: auto;
  inset-inline-end: clamp(0.9rem, 2vw, 1.2rem);
}

.build-section.is-rtl .section-header__content::after {
  inset-inline-end: auto;
  inset-inline-start: -25%;
}

.build-section.is-rtl .build-header__actions {
  justify-content: flex-start;
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
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.72));
  border: 1px solid rgba(0, 232, 224, 0.16);
  color: #ffffff;
  text-align: center;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.3s ease, border-color 0.25s ease;
  overflow: hidden;
}

.build-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle at top left, rgba(0, 232, 224, 0.18), transparent 60%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.build-card::after {
  content: '';
  position: absolute;
  inset-inline-end: -15%;
  inset-block-start: -35%;
  width: 40%;
  height: 120%;
  background: radial-gradient(circle, rgba(196, 255, 0, 0.25), transparent 65%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.build-card:hover,
.build-card:focus-visible {
  outline: none;
  transform: translateY(-6px);
  border-color: rgba(0, 232, 224, 0.45);
  box-shadow: 0 42px 68px rgba(0, 0, 0, 0.55);
}

.build-card:hover::before,
.build-card:focus-visible::before,
.build-card:hover::after,
.build-card:focus-visible::after {
  opacity: 1;
}

.build-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: clamp(3.4rem, 8vw, 4.2rem);
  height: clamp(3.4rem, 8vw, 4.2rem);
  border-radius: 20px;
  background: radial-gradient(circle, rgba(0, 232, 224, 0.28), rgba(0, 232, 224, 0));
  border: 1px solid rgba(0, 232, 224, 0.45);
  font-size: clamp(1.35rem, 4vw, 1.6rem);
  color: #00e8e0;
  box-shadow: 0 18px 34px rgba(0, 232, 224, 0.25);
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
  color: rgba(255, 255, 255, 0.68);
  font-size: clamp(0.95rem, 2vw, 1.05rem);
  line-height: 1.55;
}

.build-card__cta {
  display: inline-flex;
  align-items: center;
  gap: clamp(0.4rem, 1.1vw, 0.6rem);
  font-weight: 600;
  color: #c4ff00;
  background: rgba(196, 255, 0, 0.12);
  border: 1px solid rgba(196, 255, 0, 0.45);
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
    justify-content: flex-start;
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

  .build-header__actions {
    width: 100%;
  }

  .build-header__actions > * {
    flex: 1;
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

