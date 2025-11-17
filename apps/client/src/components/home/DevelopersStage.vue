<template>
  <section class="game-section layout-container section-stack" :class="{ 'is-rtl': isRTL }">
    <header class="section-header">
      <div class="section-header__content">
        <h2 class="section-title">{{ t('home.developersStage.title') }}</h2>
        <p class="section-subtitle">{{ t('home.developersStage.lines.1') }}</p>
        <p class="section-subtitle">{{ t('home.developersStage.lines.2') }}</p>
        <p class="section-subtitle">{{ t('home.developersStage.lines.3') }}</p>
        <p class="section-subtitle">{{ t('home.developersStage.lines.4') }}</p>
      </div>
    </header>
    <div class="promo-stage__actions">
      <CustomButton type="is-primary" :label="t('home.developersStage.button')" @click="$emit('submit')" />
    </div>
  </section>
</template>

<script setup lang="ts">
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { computed } from 'vue';
import { useLocaleStore } from '@/stores/locale';

defineEmits<{
  (e: 'submit'): void;
}>();

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);
const isRTL = computed(() => localeStore.direction === 'rtl');
</script>

<style scoped>
.promo-stage__actions {
  display: flex;
  justify-content: center;
}

/* Match GameSection header styling */
.section-header__content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(0.3rem, 0.8vw, 0.45rem);
  padding-block: clamp(0.8rem, 2vw, 1.2rem);
  padding-inline: clamp(1.2rem, 2.4vw, 1.6rem);
  padding-inline-start: clamp(1.8rem, 4vw, 2.4rem);
  border-radius: 18px;
  background: radial-gradient(circle at top left, rgba(0, 232, 224, 0.12), transparent 55%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.58));
  border: 1px solid rgba(0, 232, 224, 0.14);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.section-header__content::before {
  content: '';
  position: absolute;
  inset-block: clamp(0.6rem, 1.6vw, 0.9rem);
  inset-inline-start: clamp(0.75rem, 1.8vw, 1rem);
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(0, 232, 224, 0.9), rgba(196, 255, 0, 0.9));
  box-shadow: 0 0 14px rgba(0, 232, 224, 0.5);
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
  font-size: clamp(1rem, 0.7vw + 1rem, 2rem);
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 12px 28px rgba(0, 232, 224, 0.3);
}

.section-subtitle {
  margin: 0;
  font-size: clamp(0.75rem, 0.7vw + 0.7rem, 1rem);
  color: rgba(255, 255, 255, 0.72);
  font-weight: 500;
  max-width: 36rem;
}

.game-section.is-rtl .section-header__content {
  padding-inline-start: clamp(1.2rem, 2.4vw, 1.6rem);
  padding-inline-end: clamp(1.8rem, 4vw, 2.4rem);
  text-align: right;
}

.game-section.is-rtl .section-header__content::before {
  inset-inline-start: auto;
  inset-inline-end: clamp(0.75rem, 1.8vw, 1rem);
}

.game-section.is-rtl .section-header__content::after {
  inset-inline-end: auto;
  inset-inline-start: -25%;
}
</style>


