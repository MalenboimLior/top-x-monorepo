<template>
  <section v-if="content" class="game-type-info">
    <div class="game-type-info__grid">
      <!-- Media/Image Side -->
      <div class="game-type-info__media">
        <div v-if="content.images.length" class="game-type-info__gallery">
          <figure
            v-for="image in content.images.slice(0, 1)"
            :key="image"
            class="game-type-info__image-wrapper"
          >
            <img
              :src="image"
              :alt="`${content.displayName} preview`"
              loading="lazy"
            />
          </figure>
        </div>
      </div>

      <!-- Content Side -->
      <div class="game-type-info__content">
        <h2 class="game-type-info__title">
          <font-awesome-icon :icon="['fas', 'circle-info']" />
          {{ content.displayName }}
        </h2>
        
        <div class="game-type-info__field">
           <span class="game-type-info__label">{{ t('gameInfo.goal') }}</span>
           <p class="game-type-info__text">{{ content.goal }}</p>
        </div>

        <div class="game-type-info__field">
           <span class="game-type-info__label">{{ t('gameInfo.howToPlay') }}</span>
           <p class="game-type-info__text">{{ content.instructions }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocaleStore } from '@/stores/locale';

const props = withDefaults(
  defineProps<{
    gameTypeId?: string | null;
  }>(),
  {
    gameTypeId: null,
  },
);

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const content = computed(() => {
  if (!props.gameTypeId) {
    return null;
  }
  return localeStore.getGameTypeContent(props.gameTypeId);
});
</script>

<style scoped>
.game-type-info {
  display: block;
}

.game-type-info__grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: var(--space-6);
  align-items: center;
}

.game-type-info__media {
  width: 100%;
}

.game-type-info__gallery {
  display: flex;
}

.game-type-info__image-wrapper {
  margin: 0;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(0, 232, 224, 0.18);
  background: rgba(0, 232, 224, 0.06);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  aspect-ratio: 16 / 10;
  width: 100%;
}

.game-type-info__image-wrapper img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.game-type-info__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  text-align: start;
}

.game-type-info__title {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  font-size: clamp(1.8rem, 1.5vw + 1.2rem, 2.5rem);
  font-weight: 800;
  color: var(--color-text-primary);
}

.game-type-info__title svg {
  color: var(--bulma-primary);
  font-size: 0.8em;
}

.game-type-info__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.game-type-info__label {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  color: var(--bulma-primary);
}

.game-type-info__text {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
  font-size: 1.05rem;
}

@media (max-width: 60rem) {
  .game-type-info__grid {
    grid-template-columns: 1fr;
    gap: var(--space-6);
  }
  
  .game-type-info__content {
    text-align: center;
    align-items: center;
  }
  
  .game-type-info__field {
     align-items: center;
  }
}
</style>
