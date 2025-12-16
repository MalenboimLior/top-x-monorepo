<template>
  <section class="promo-stage layout-container" :class="{ 'is-rtl': isRTL }">
    <div class="promo-stage-glow"></div>
    <div class="promo-stage__grid">
      <div class="promo-stage__content fade-in-up" :style="{ animationDelay: '0.1s' }">
        <header class="promo-stage__header">
          <h2 class="promo-stage__title text-gradient-secondary">{{ t('home.brandsStage.title') }}</h2>
          <div class="promo-stage__description">
            <ul class="promo-stage__list">
              <li class="promo-stage__item promo-stage__item--secondary">{{ t('home.brandsStage.lines.1') }}</li>
              <li class="promo-stage__item promo-stage__item--secondary">{{ t('home.brandsStage.lines.2') }}</li>
              <li class="promo-stage__item promo-stage__item--secondary">{{ t('home.brandsStage.lines.3') }}</li>
            </ul>
          </div>
        </header>

        <div class="promo-stage__action">
          <CustomButton 
            type="is-secondary" 
            :label="t('home.brandsStage.button')" 
            @click="$emit('contact')" 
          />
        </div>
      </div>

      <div class="promo-stage__visual fade-in-up" :style="{ animationDelay: '0.3s' }">
        <!-- Visual Component: Floating Briefcase/Instrument -->
        <div class="floating-element brand-icon">
          <span class="icon-emoji">🤝</span>
        </div>
      </div>
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
@import '@/styles/components/Home.css';

.floating-element {
  width: 180px;
  height: 180px;
  background: var(--color-bg-secondary);
  border-radius: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  transform: rotate(-5deg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: float-slow 6s ease-in-out infinite;
}

.icon-emoji {
  font-size: 5rem;
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.2));
}

@keyframes float-slow {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-20px) rotate(-5deg); }
}
</style>



