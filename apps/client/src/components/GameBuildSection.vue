<template>
  <section class="game-build-section layout-container" :class="{ 'is-rtl': isRTL }">
    <div class="game-build-section-glow"></div>
    <div class="game-build-section__grid">
      <div class="game-build-section__content fade-in-up" :style="{ animationDelay: '0.1s' }">
        <header class="game-build-section__header">
          <h2 class="game-build-section__title text-gradient-primary">
            <font-awesome-icon :icon="['fas', 'edit']" class="title-icon" />
            {{ t('gameInfo.buildYourOwn') }}
          </h2>
          <div class="game-build-section__description">
             <p>{{ t('gameInfo.buildDescription') }}</p>
             <p class="build-hint">{{ t('gameInfo.buildHint') }}</p>
          </div>
        </header>

        <div class="game-build-section__action">
          <CustomButton 
            type="is-primary" 
            :label="t('gameInfo.createNow')" 
            @click="$emit('build')" 
          />
        </div>
      </div>

      <div class="game-build-section__visual fade-in-up" :style="{ animationDelay: '0.3s' }">
        <!-- Visual Component: Floating Builder Icon -->
        <div class="floating-element build-icon">
          <span class="icon-emoji">🛠️</span>
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
  (e: 'build'): void;
}>();

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);
const isRTL = computed(() => localeStore.direction === 'rtl');
</script>

<style scoped>
@import '@/styles/components/Home.css';

.game-build-section {
    position: relative;
    padding: clamp(3rem, 5vw, 4rem) 0;
    overflow: hidden;
}

.game-build-section.is-rtl {
    direction: rtl;
}

.game-build-section-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at center, rgba(0, 232, 224, 0.08) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
}

.game-build-section__grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: clamp(2rem, 5vw, 4rem);
    align-items: center;
    position: relative;
    z-index: 1;
}

.game-build-section__content {
    display: flex;
    flex-direction: column;
    gap: clamp(1.5rem, 2vw, 2rem);
}

.game-build-section__title {
    font-size: clamp(2rem, 2.5vw + 1rem, 3.5rem);
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 1rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
}

.title-icon {
    font-size: 0.8em;
    color: var(--bulma-primary);
}

.game-build-section__description p {
    font-size: clamp(1.1rem, 1vw + 0.8rem, 1.3rem);
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin-bottom: 0.5rem;
}

.build-hint {
    font-size: 0.9rem !important;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted) !important;
}

.game-build-section__visual {
    display: flex;
    justify-content: center;
    align-items: center;
}

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
  transform: rotate(-5deg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: float-slow 7s ease-in-out infinite 0.5s;
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
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-15px) rotate(-5deg); }
}

@media (max-width: 48rem) {
    .game-build-section__grid {
        grid-template-columns: 1fr;
        text-align: center;
    }
    
    .game-build-section__content {
        align-items: center;
    }
    
    .game-build-section__visual {
        order: -1;
        margin-bottom: 1rem;
    }
}
</style>
