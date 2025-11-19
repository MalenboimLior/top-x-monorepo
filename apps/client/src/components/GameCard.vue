<template>
  <article class="game-card" :class="[`game-card--${size}`]" @click="handleSelect">
    <div class="game-card__media" :dir="mediaDirection">
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
      <div
        v-if="displayGameType"
        class="game-card__type-overlay"
        :title="gameTypeLabel"
        role="img"
        :aria-label="gameTypeLabel"
      >
        <font-awesome-icon :icon="gameTypeIcon" />
      </div>
      <button
        type="button"
        class="game-card__favorite"
        :class="{ 'game-card__favorite--active': isFavorite }"
        :aria-pressed="isFavorite ? 'true' : 'false'"
        :aria-label="favoriteButtonLabel"
        :title="favoriteButtonTitle"
        :disabled="isFavoriteBusy"
        @click.stop="handleToggleFavorite"
      >
        <font-awesome-icon :icon="['fas', 'heart']" />
      </button>
    </div>
    <div class="game-card__content">
      <h3 class="game-card__title">{{ game.name }}</h3>
      <p class="game-card__description">{{ game.description }}</p>
      <div v-if="hasStats" class="game-card__stats" dir="ltr">
        <div v-for="stat in statItems" :key="stat.key" class="game-card__stat" :title="stat.label">
          <span class="game-card__stat-icon" role="img" :aria-label="stat.label">
            <font-awesome-icon :icon="stat.icon" />
          </span>
          <span class="game-card__stat-value">{{ stat.value }}</span>
        </div>
      </div>
      <div class="game-card__footer">
        <div v-if="playLabel" class="game-card__footer-button">
          <CustomButton :type="buttonType" :label="playLabel" @click.stop="handlePlay" />
        </div>
        <div v-if="resolvedCreator" class="game-card__creator" dir="ltr">
          <div class="game-card__creator-avatar">
            <img :src="creatorImage" :alt="creatorAltText" loading="lazy" />
          </div>
          <div class="game-card__creator-meta">
            <span class="game-card__creator-label">{{ creatorLabel }}</span>
            <a :href="creatorProfileUrl" @click.stop>{{ resolvedCreator.username }}</a>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { PropType } from 'vue';
import type { Game, GameBadgeKey, GameCreator } from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';
import { formatNumber } from '@top-x/shared/utils/format';
import { GAME_BADGE_DEFINITIONS, DEFAULT_TOPX_CREATOR } from '@top-x/shared/constants/gameBadges';
import { GAME_TYPE_ICON_MAP, DEFAULT_GAME_TYPE_ICON } from '@top-x/shared/constants/gameTypes';

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
    type: Object as PropType<GameCreator | undefined>,
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

type MediaLabelVariant = 'featured' | 'daily' | `badge-${GameBadgeKey}`;

type MediaLabel = {
  text: string;
  variant: MediaLabelVariant;
  icon: [string, string];
};

const BADGE_LABEL_LIMIT = 5;

const localeStore = useLocaleStore();
const userStore = useUserStore();
const t = (key: string) => localeStore.translate(key);

const mediaDirection = computed(() => localeStore.direction);

function isGameBadgeKey(value: string): value is GameBadgeKey {
  return Object.prototype.hasOwnProperty.call(GAME_BADGE_DEFINITIONS, value);
}

const badgeLanguage = computed<'en' | 'il'>(() => (localeStore.language === 'il' ? 'il' : 'en'));

const badgeLabels = computed<MediaLabel[]>(() => {
  const language = badgeLanguage.value;
  return (props.game.badges ?? [])
    .filter((badge): badge is GameBadgeKey => isGameBadgeKey(badge))
    .map((badge) => {
      const definition = GAME_BADGE_DEFINITIONS[badge];
      return {
        text: definition.labels[language],
        variant: `badge-${badge}` as MediaLabelVariant,
        icon: definition.icon,
      };
    });
});

const mediaLabels = computed<MediaLabel[]>(() => {
  const labels: MediaLabel[] = [];
  if (props.showFeaturedLabel && props.featuredLabel) {
    labels.push({ text: props.featuredLabel, variant: 'featured', icon: ['fas', 'trophy'] });
  }
  if (props.dailyChallengeActive && props.dailyChallengeLabel) {
    labels.push({ text: props.dailyChallengeLabel, variant: 'daily', icon: ['fas', 'bolt'] });
  }
  const remainingSlots = BADGE_LABEL_LIMIT - labels.length;
  if (remainingSlots > 0) {
    labels.push(...badgeLabels.value.slice(0, remainingSlots));
  }
  return labels;
});

function humanizeGameTypeId(value: string): string {
  if (!value) {
    return t('gameCard.type.default');
  }
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\w/, (char) => char.toUpperCase());
}

const rawGameTypeId = computed(() => props.game.gameTypeId?.trim() ?? '');
const normalizedGameTypeId = computed(() => rawGameTypeId.value.toLowerCase());

const gameTypeIcon = computed(() => GAME_TYPE_ICON_MAP[normalizedGameTypeId.value] ?? DEFAULT_GAME_TYPE_ICON);

const gameTypeTranslationKey = computed(() =>
  rawGameTypeId.value ? `gameCard.type.${rawGameTypeId.value}` : 'gameCard.type.default',
);

const translatedGameType = computed(() => t(gameTypeTranslationKey.value));

const gameTypeLabel = computed(() => {
  if (!rawGameTypeId.value) {
    return translatedGameType.value;
  }
  return translatedGameType.value !== gameTypeTranslationKey.value
    ? translatedGameType.value
    : humanizeGameTypeId(rawGameTypeId.value);
});

const displayGameType = computed(() => Boolean(rawGameTypeId.value));

const favoriteBaseline = ref(typeof props.stats?.favoriteCounter === 'number' ? props.stats.favoriteCounter : 0);
const initialFavorite = ref(userStore.isGameFavorite(props.game.id));
const hasBootstrappedFavorite = ref(false);

watch(
  () => props.game.id,
  () => {
    favoriteBaseline.value = typeof props.stats?.favoriteCounter === 'number' ? props.stats.favoriteCounter : 0;
    initialFavorite.value = userStore.isGameFavorite(props.game.id);
    hasBootstrappedFavorite.value = false;
  },
  { immediate: true },
);

watch(
  () => userStore.profile?.favoriteGames,
  () => {
    if (!hasBootstrappedFavorite.value) {
      initialFavorite.value = userStore.isGameFavorite(props.game.id);
      hasBootstrappedFavorite.value = true;
    }
  },
  { immediate: true },
);

watch(
  () => props.stats?.favoriteCounter,
  (value) => {
    if (typeof value === 'number') {
      favoriteBaseline.value = value;
      initialFavorite.value = userStore.isGameFavorite(props.game.id);
    } else {
      favoriteBaseline.value = 0;
    }
  },
);

const isFavorite = computed(() => userStore.isGameFavorite(props.game.id));

const favoriteCount = computed(() => {
  const diff = (isFavorite.value ? 1 : 0) - (initialFavorite.value ? 1 : 0);
  const nextValue = favoriteBaseline.value + diff;
  return nextValue < 0 ? 0 : nextValue;
});

const formattedFavoriteCount = computed(() => formatNumber(favoriteCount.value));

const statItems = computed(() => {
  const stats = props.stats || {};
  const items = [];

  if (typeof stats.sessionsPlayed === 'number') {
    items.push({
      key: 'sessionsPlayed',
      value: formatNumber(stats.sessionsPlayed),
      icon: ['fas', 'gamepad'] as [string, string],
      label: t('home.stats.sessions'),
    });
  }

  items.push({
    key: 'favorites',
    value: formattedFavoriteCount.value,
    icon: ['fas', 'heart'] as [string, string],
    label: t('home.stats.favorites'),
  });

  return items;
});

const hasStats = computed(() => statItems.value.length > 0);

const favoriteButtonLabel = computed(() =>
  isFavorite.value ? t('gameCard.favorite.remove') : t('gameCard.favorite.add'),
);

const favoriteButtonTitle = computed(() =>
  isFavorite.value ? t('gameCard.favorite.removeTitle') : t('gameCard.favorite.addTitle'),
);

const isFavoriteBusy = ref(false);

async function handleToggleFavorite() {
  if (isFavoriteBusy.value) {
    return;
  }
  isFavoriteBusy.value = true;
  try {
    await userStore.toggleFavorite(props.game.id);
  } finally {
    isFavoriteBusy.value = false;
  }
}

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
const creatorProfileUrl = computed(() =>
  resolvedCreator.value ? `https://top-x.co/profile?userid=${resolvedCreator.value.userid}` : '',
);
const creatorLabel = computed(() => t('gameCard.creator.label'));
const creatorAltText = computed(() =>
  resolvedCreator.value ? `${resolvedCreator.value.username} avatar` : t('gameCard.creator.fallbackAlt'),
);

function handleSelect() {
  emit('select', props.game.id, props.game.gameTypeId);
  emit('play', props.game.id, props.game.gameTypeId);
}

function handlePlay() {
  emit('play', props.game.id, props.game.gameTypeId);
}
</script>

<style scoped>
.game-card {
  position: relative;
  display: flex;
  flex-direction: column;
  inline-size: min(320px, 100%);
  /*min-block-size: 520px;*/
  border-radius: 28px;
  border: none;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.game-card--featured {
  inline-size: min(360px, 100%);
/*min-block-size: 560px;*/}

.game-card__media {
  position: relative;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.6);
}

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
  background-color: rgba(255, 201, 20, 0.3);
  color: #ffd85c;
  border: 1.5px solid rgba(255, 201, 20, 0.5);
}

.game-card__media-badge--daily {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
  border: 1.5px solid var(--color-border-primary);
}

.game-card__media-badge--badge-onFire {
  background-color: rgba(255, 135, 66, 0.3);
  color: #ffbb7c;
  border: 1.5px solid rgba(255, 135, 66, 0.5);
}

.game-card__media-badge--badge-hardcore {
  background-color: rgba(123, 97, 255, 0.3);
  color: #bfa8ff;
  border: 1.5px solid rgba(123, 97, 255, 0.45);
}

.game-card__media-badge--badge-womenOnly {
  background-color: rgba(255, 105, 180, 0.3);
  color: #ffb6d9;
  border: 1.5px solid rgba(255, 105, 180, 0.45);
}

.game-card__labels-top {
  position: absolute;
  top: var(--space-3);
  inset-inline-start: var(--space-3);
  inset-inline-end: calc(var(--space-3) + 48px);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  z-index: 3;
}

.game-card__favorite {
  position: absolute;
  top: var(--space-3);
  inset-inline-end: var(--space-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.45);
  color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(6px);
  cursor: pointer;
  transition: transform 0.2s ease, color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  z-index: 4;
}

.game-card__favorite:hover:not(:disabled) {
  transform: scale(1.05);
  color: #ff5c8d;
  border-color: rgba(255, 92, 141, 0.8);
}

.game-card__favorite--active {
  background: rgba(255, 92, 141, 0.2);
  color: #ff5c8d;
  border-color: rgba(255, 92, 141, 0.8);
}

.game-card__favorite:disabled {
  cursor: wait;
  opacity: 0.7;
}

.game-card__type-overlay {
  position: absolute;
  inset-inline-end: var(--space-3);
  inset-block-end: var(--space-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 16px;
  background-color: var(--color-primary-bg);
  border: 1.5px solid var(--color-border-primary);
  color: var(--bulma-primary);
}

.game-card__content {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  /*gap: var(--space-3);*/
  padding: var(--space-3);
}

.game-card__footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

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
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  width: auto;
}

.game-card__footer-button :deep(.button:hover) {
  transform: none;
}

.game-card__footer-button :deep(.button.is-primary) {
  background-color: var(--bulma-primary) !important;
  border: 1px solid var(--bulma-primary) !important;
  color: var(--color-text-on-primary) !important;
}

.game-card__footer-button :deep(.button):focus-visible {
  outline: 2px solid var(--bulma-primary);
  outline-offset: 4px;
}

.game-card__footer-button :deep(.button.is-primary:hover) {
  background-color: var(--color-primary-hover, var(--bulma-primary)) !important;
  border-color: var(--color-primary-hover, var(--bulma-primary)) !important;
  color: var(--color-text-on-primary) !important;
}

.game-card__creator {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0;
}

.game-card__creator-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(0, 232, 224, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  flex-shrink: 0;
}

.game-card__creator-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.game-card__creator-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.game-card__creator-label {
  font-size: var(--font-size-200);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.game-card__creator a {
  color: var(--bulma-primary);
  text-decoration: none;
  font-weight: 700;
  transition: color 0.2s ease;
}

.game-card__creator a:hover {
  color: #00e8e0;
}

.game-card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin: var(--space-4) 0;
  padding-inline: var(--space-3);
  flex-wrap: wrap;
}

.game-card__type {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: 10px;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: var(--font-size-200);
  font-weight: 700;
  flex-shrink: 0;
}

.game-card__type-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  color: var(--bulma-primary);
}

.game-card__type-label {
  color: inherit;
}

.game-card__title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.game-card--featured .game-card__title {
  font-size: clamp(1.4rem, 2vw + 1rem, 1.75rem);
}

.game-card__description {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.55;
  line-clamp: 2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.game-card__stats {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--space-4);
  margin: var(--space-3) 0 0;
  padding: 0;
  overflow-x: auto;
}

.game-card__stat {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
  white-space: nowrap;
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: 1rem;
}

.game-card__stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  color: var(--bulma-primary);
  font-size: 0.9rem;
}

.game-card__stat-value {
  color: var(--color-text-primary);
  font-weight: 700;
  font-size: 1rem;
  line-height: 1;
}
</style>
