<template>
  <article
    class="game-card"
    :class="[`game-card--${size}`]"
    @click="handleSelect"
  >
    <div class="game-card__media">
      <img :src="game.image" :alt="`${game.name} image`" loading="lazy" />
      <div v-if="mediaLabels.length" class="game-card__labels-top">
        <span
          v-for="label in mediaLabels"
          :key="label.text + label.variant"
          class="game-card__media-badge"
          :class="`game-card__media-badge--${label.variant}`"
        >
          <font-awesome-icon v-if="label.icon" :icon="label.icon" />
          <span>{{ label.text }}</span>
        </span>
      </div>
    </div>
    <div class="game-card__content">
      <h3 class="game-card__title">{{ game.name }}</h3>
      <p class="game-card__description">{{ game.description }}</p>
      <div v-if="hasStats" class="game-card__stats">
        <div v-for="stat in statItems" :key="stat.key" class="game-card__stat" :title="stat.label">
          <span class="game-card__stat-icon" role="img" :aria-label="stat.label">
            <font-awesome-icon :icon="stat.icon" />
          </span>
          <span class="game-card__stat-value">{{ stat.value }}</span>
        </div>
      </div>
      <div v-if="playLabel || creator" class="game-card__footer">
        <div v-if="playLabel" class="game-card__footer-button">
          <CustomButton :type="buttonType" :label="playLabel" @click.stop="handlePlay" />
        </div>
        <div v-if="creator" class="game-card__creator">
          By <a :href="`https://top-x.co/profile?userid=${creator.userid}`" @click.stop>{{ creator.username }}</a>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import type { Game } from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useLocaleStore } from '@/stores/locale';
import { formatNumber } from '@top-x/shared/utils/format';

const props = defineProps({
  game: {
    type: Object as PropType<Game>,
    required: true,
  },
  stats: {
    type: Object as PropType<Partial<GameStats> | null>,
    default: () => ({}),
  },
  size: {
    type: String as PropType<'featured' | 'standard'>,
    default: 'standard',
  },
  showFeaturedLabel: {
    type: Boolean,
    default: false,
  },
  featuredLabel: {
    type: String,
    default: '',
  },
  dailyChallengeActive: {
    type: Boolean,
    default: false,
  },
  dailyChallengeLabel: {
    type: String,
    default: '',
  },
  creator: {
    type: Object as PropType<{ userid: string; username: string } | undefined>,
    default: undefined,
  },
  playLabel: {
    type: String,
    default: '',
  },
  buttonType: {
    type: String,
    default: 'is-primary',
  },
});

const emit = defineEmits<{
  (event: 'select', gameId: string, gameTypeId: string): void;
  (event: 'play', gameId: string, gameTypeId: string): void;
}>();

type MediaLabelVariant = 'featured' | 'daily';

type MediaLabel = {
  text: string;
  variant: MediaLabelVariant;
  icon: [string, string];
};

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const mediaLabels = computed<MediaLabel[]>(() => {
  const labels: MediaLabel[] = [];
  if (props.showFeaturedLabel && props.featuredLabel) {
    labels.push({ text: props.featuredLabel, variant: 'featured', icon: ['fas', 'trophy'] });
  }
  if (props.dailyChallengeActive && props.dailyChallengeLabel) {
    labels.push({ text: props.dailyChallengeLabel, variant: 'daily', icon: ['fas', 'bolt'] });
  }
  return labels;
});

const statItems = computed(() => {
  const stats = props.stats || {};
  const items = [
    {
      key: 'totalPlayers',
      value: stats.totalPlayers,
      icon: ['fas', 'user-group'] as [string, string],
      label: t('home.stats.players'),
    },
    {
      key: 'favorites',
      value: stats.favoriteCounter,
      icon: ['fas', 'heart'] as [string, string],
      label: t('home.stats.favorites'),
    },
    {
      key: 'sessionsPlayed',
      value: stats.sessionsPlayed,
      icon: ['fas', 'gamepad'] as [string, string],
      label: t('home.stats.sessions'),
    },
  ];

  return items
    .filter((item) => typeof item.value === 'number')
    .map((item) => ({
      ...item,
      value: formatNumber((item.value as number) ?? 0),
    }));
});

const hasStats = computed(() => statItems.value.length > 0);

function handleSelect() {
  emit('select', props.game.id, props.game.gameTypeId);
}

function handlePlay() {
  emit('play', props.game.id, props.game.gameTypeId);
}
</script>

<style scoped>
.game-card__media-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: 12px;
  font-size: var(--font-size-200);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.game-card__media-badge:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.game-card__media-badge svg {
  font-size: 0.9rem;
}

.game-card__media-badge--featured {
  background: linear-gradient(135deg, rgba(255, 201, 20, 0.35), rgba(255, 215, 0, 0.25));
  color: #ffd85c;
  border: 1.5px solid rgba(255, 201, 20, 0.5);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.game-card__media-badge--daily {
  background: linear-gradient(135deg, rgba(0, 232, 224, 0.35), rgba(0, 232, 224, 0.25));
  color: #00e8e0;
  border: 1.5px solid rgba(0, 232, 224, 0.5);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.game-card__labels-top {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  right: var(--space-3);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  z-index: 3;
}

.game-card__footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-2);
}

.game-card__footer-button {
  width: 100%;
  display: flex;
  justify-content: center;
}

.game-card__footer-button :deep(.button) {
  padding: var(--space-3) var(--space-5);
  font-size: 1rem;
  font-weight: 700;
  border-radius: 14px;
  transition: all 0.25s ease;
  box-shadow: 0 4px 16px rgba(0, 232, 224, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  width: auto;
}

.game-card__footer-button :deep(.button:hover) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 232, 224, 0.35);
}

.game-card__footer-button :deep(.button.is-primary) {
  background: linear-gradient(135deg, var(--bulma-primary), #00b8b0) !important;
  border: none !important;
  color: #000000 !important;
}

.game-card__footer-button :deep(.button.is-primary:hover) {
  background: linear-gradient(135deg, #00e8e0, var(--bulma-primary)) !important;
  color: #000000 !important;
}

.game-card__creator {
  font-weight: 500;
  font-size: var(--font-size-300);
  color: rgba(255, 255, 255, 0.5);
  align-self: flex-end;
  text-align: right;
  width: 100%;
}

.game-card__creator a {
  color: var(--bulma-primary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.game-card__creator a:hover {
  color: #00e8e0;
  text-decoration: underline;
}

.game-card__title {
  padding-inline-start: 20px;
  font-size: 1.35rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.game-card--featured .game-card__title {
  font-size: clamp(1.4rem, 2vw + 1rem, 1.75rem);
}

.game-card__description {
  padding-inline-start: 20px;
  margin: 0;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.55;
}

.game-card__stats {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--space-3);
  margin: var(--space-4) 0;
  padding: var(--space-3);
  
  overflow-x: auto;
}

.game-card__stat {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: 10px;
  background: rgba(0, 232, 224, 0.12);
  border: 1px solid rgba(0, 232, 224, 0.25);
  transition: all 0.2s ease;
  cursor: default;
  flex-shrink: 0;
  white-space: nowrap;
}

.game-card__stat:hover {
  background: rgba(0, 232, 224, 0.18);
  border-color: rgba(0, 232, 224, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 232, 224, 0.2);
}

.game-card__stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(0, 232, 224, 0.3), rgba(0, 232, 224, 0.2));
  color: var(--bulma-primary);
  font-size: 1rem;
  flex-shrink: 0;
}

.game-card__stat-value {
  color: #ffffff;
  font-weight: 700;
  font-size: 1.1rem;
  line-height: 1;
}
</style>
