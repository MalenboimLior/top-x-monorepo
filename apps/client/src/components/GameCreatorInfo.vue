<template>
  <div v-if="resolvedCreator" class="game-creator-info">
    <div class="game-creator-info__avatar">
      <img :src="creatorImage" :alt="creatorAltText" loading="lazy" />
    </div>
    <div class="game-creator-info__meta">
      <span class="game-creator-info__label">{{ creatorLabel }}</span>
      <RouterLink :to="{ path: '/profile', query: { userid: resolvedCreator?.userid } }" class="game-creator-info__username" @click.stop>{{ resolvedCreator.username }}</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import { RouterLink } from 'vue-router';
import type { Game, GameCreator } from '@top-x/shared/types/game';
import { useLocaleStore } from '@/stores/locale';
import { DEFAULT_TOPX_CREATOR } from '@top-x/shared/constants/gameBadges';

const props = defineProps({
  game: {
    type: Object as PropType<Game>,
    required: true,
  },
  creator: {
    type: Object as PropType<GameCreator | undefined>,
    default: undefined,
  },
});

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const resolvedCreator = computed<GameCreator | undefined>(() => {
  const explicitCreator = props.creator ?? props.game.creator;
  if (explicitCreator) {
    return {
      ...explicitCreator,
      image: explicitCreator.image || DEFAULT_TOPX_CREATOR.image,
    };
  }

  if (props.game.community === false) {
    return DEFAULT_TOPX_CREATOR;
  }

  return undefined;
});

const creatorImage = computed(() => resolvedCreator.value?.image || DEFAULT_TOPX_CREATOR.image);
const creatorLabel = computed(() => t('gameCard.creator.label'));
const creatorAltText = computed(() =>
  resolvedCreator.value ? `${resolvedCreator.value.username} avatar` : t('gameCard.creator.fallbackAlt'),
);
</script>

<style scoped>
.game-creator-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--space-4);
  background: rgba(0, 232, 224, 0.05);
  border: 1px solid rgba(0, 232, 224, 0.16);
}

.game-creator-info__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(0, 232, 224, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  flex-shrink: 0;
}

.game-creator-info__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.game-creator-info__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.game-creator-info__label {
  font-size: var(--font-size-200);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.game-creator-info__username {
  color: var(--bulma-primary);
  text-decoration: none;
  font-weight: 700;
  transition: color 0.2s ease;
}

.game-creator-info__username:hover {
  color: #00e8e0;
}
</style>

