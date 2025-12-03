<template>
  <section class="game-section layout-container section-stack" :class="{ 'is-rtl': isRTL }">
    <header class="section-header">
      <div class="section-header__content">
        <h2 class="section-title">{{ t('home.brandsStage.title') }}</h2>
        <p class="section-subtitle">{{ t('home.brandsStage.lines.1') }}</p>
        <p class="section-subtitle">{{ t('home.brandsStage.lines.2') }}</p>
        <p class="section-subtitle">{{ t('home.brandsStage.lines.3') }}</p>
      </div>
    </header>
    <div class="promo-stage__actions">
      <CustomButton type="is-secondary" :label="t('home.brandsStage.button')" @click="$emit('contact')" />
    </div>
  </section>
</template>

<script setup lang="ts">
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { computed } from 'vue';
import { useLocaleStore } from '@/stores/locale';

defineEmits<{
  (e: 'contact'): void;
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

</style>


