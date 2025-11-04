<template>
  <article
    class="game-card"
    :class="[`game-card--${size}`]"
    @click="handleSelect"
  >
    <div class="game-card__media">
      <img :src="game.image" :alt="`${game.name} image`" loading="lazy" />
      <div v-if="mediaLabels.length" class="game-card__labels">
        <span
          v-for="label in mediaLabels"
          :key="label.text + label.variant"
          class="game-card__media-label"
          :class="`game-card__media-label--${label.variant}`"
        >
          <font-awesome-icon v-if="label.icon" :icon="label.icon" />
          <span>{{ label.text }}</span>
        </span>
      </div>
    </div>
    <div class="game-card__content">
      <div class="game-card__meta" v-if="badge || creatorLabel">
        <span
          v-if="badge"
          class="game-card__badge"
          :class="{ 'game-card__badge--alt': badgeVariant === 'alt' }"
        >
          {{ badge }}
        </span>
        <span v-if="creatorLabel" class="game-card__creator">{{ creatorLabel }}</span>
      </div>
      <h3 class="game-card__title">{{ game.name }}</h3>
      <p class="game-card__description">{{ game.description }}</p>
      <div v-if="hasStats" class="game-card__stats">
        <div v-for="stat in statItems" :key="stat.key" class="game-card__stat">
          <span class="game-card__stat-icon" role="img" :aria-label="stat.label">
            <font-awesome-icon :icon="stat.icon" />
          </span>
          <span class="game-card__stat-value">{{ stat.value }}</span>
          <span class="game-card__stat-label">{{ stat.label }}</span>
        </div>
      </div>
      <div v-if="playLabel" class="game-card__footer">
        <CustomButton :type="buttonType" :label="playLabel" @click.stop="handlePlay" />
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
  badge: {
    type: String,
    default: '',
  },
  badgeVariant: {
    type: String as PropType<'default' | 'alt'>,
    default: 'default',
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
  creatorLabel: {
    type: String,
    default: '',
  },
  playLabel: {
    type: String,
    default: '',
  },
  buttonType: {
    type: String,
    default: 'is-primary is-small',
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
      value: stats.favorites,
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
