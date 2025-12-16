<template>
  <section class="promo-stage layout-container" :class="{ 'is-rtl': isRTL }">
    <div class="promo-stage-glow"></div>
    <div class="promo-stage__grid">
      <div class="promo-stage__content fade-in-up" :style="{ animationDelay: '0.1s' }">
        <header class="promo-stage__header">
          <h2 class="promo-stage__title text-gradient-primary">{{ t('home.developersStage.title') }}</h2>
          <div class="promo-stage__description">
            <ul class="promo-stage__list">
              <li class="promo-stage__item">{{ t('home.developersStage.lines.1') }}</li>
              <li class="promo-stage__item">{{ t('home.developersStage.lines.2') }}</li>
              <li class="promo-stage__item">{{ t('home.developersStage.lines.3') }}</li>
              <li class="promo-stage__item">{{ t('home.developersStage.lines.4') }}</li>
            </ul>
          </div>
        </header>

        <div class="promo-stage__action">
          <CustomButton 
            type="is-primary" 
            :label="t('home.developersStage.button')" 
            @click="$emit('submit')" 
          />
        </div>
      </div>

      <div class="promo-stage__visual fade-in-up" :style="{ animationDelay: '0.3s' }">
        <!-- Visual Component: Floating Terminal/Code -->
        <div class="floating-element dev-icon">
          <span class="icon-emoji">💻</span>
          <div class="code-lines">
            <div class="code-line long"></div>
            <div class="code-line short"></div>
            <div class="code-line medium"></div>
          </div>
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
  (e: 'submit'): void;
}>();

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);
const isRTL = computed(() => localeStore.direction === 'rtl');
</script>

<style scoped>
@import '@/styles/components/Home.css';

.floating-element {
  width: 200px;
  height: 200px;
  background: #1e1e1e;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  transform: rotate(5deg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: float-slow 7s ease-in-out infinite 1s;
}

.icon-emoji {
  font-size: 4rem;
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.2));
}

.code-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 60%;
}

.code-line {
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.code-line.long { width: 100%; }
.code-line.medium { width: 80%; }
.code-line.short { width: 50%; }

@keyframes float-slow {
  0%, 100% { transform: translateY(0) rotate(5deg); }
  50% { transform: translateY(-15px) rotate(5deg); }
}
</style>



