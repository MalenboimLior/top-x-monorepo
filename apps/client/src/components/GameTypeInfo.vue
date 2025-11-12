<template>
  <section v-if="content" class="game-type-info">
    <div class="game-type-info__header">
      <h2 class="game-type-info__title">
        <font-awesome-icon :icon="['fas', 'circle-info']" />
        {{ content.displayName }}
      </h2>
      <p class="game-type-info__description">
        {{ content.instructions }}
      </p>
    </div>

    <div v-if="content.images.length" class="game-type-info__gallery">
      <figure
        v-for="image in content.images"
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

const content = computed(() => {
  if (!props.gameTypeId) {
    return null;
  }
  return localeStore.getGameTypeContent(props.gameTypeId);
});
</script>

<style scoped>
.game-type-info {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.game-type-info__header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-align: center;
}

.game-type-info__title {
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: clamp(1.6rem, 1vw + 1.1rem, 2.1rem);
  font-weight: 700;
}

.game-type-info__title svg {
  color: var(--bulma-primary);
  font-size: 1.4rem;
}

.game-type-info__description {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  max-width: 48rem;
  margin-inline: auto;
  line-height: 1.6;
  font-size: 1rem;
}

.game-type-info__gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.game-type-info__image-wrapper {
  margin: 0;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(0, 232, 224, 0.18);
  background: rgba(0, 232, 224, 0.06);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}

.game-type-info__image-wrapper img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 600px) {
  .game-type-info__description {
    font-size: 0.95rem;
  }

  .game-type-info__gallery {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
}
</style>

