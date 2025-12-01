<template>
  <div class="game-media-section">
    <div class="game-media-section__image-wrapper">
      <img 
        v-if="game.image"
        :src="game.image" 
        :alt="`${game.name} image`" 
        class="game-media-section__image" 
      />
      <div
        v-else
        class="game-media-section__image-placeholder"
        :style="placeholderStyle"
      >
        <span>{{ game.name}}</span>
      </div>
      <div v-if="mediaLabels.length" class="game-media-section__labels">
        <span
          v-for="label in mediaLabels"
          :key="label.text + label.variant"
          class="game-media-section__badge"
          :class="`game-media-section__badge--${label.variant}`"
        >
          <font-awesome-icon v-if="label.icon" :icon="label.icon" />
          <span>{{ label.text }}</span>
        </span>
      </div>
      <div
        v-if="displayGameType"
        class="game-media-section__type-overlay"
        :title="gameTypeLabel"
        role="img"
        :aria-label="gameTypeLabel"
      >
        <font-awesome-icon :icon="gameTypeIcon" />
      </div>
      <button
        type="button"
        class="game-media-section__favorite"
        :class="{ 'game-media-section__favorite--active': isFavorite }"
        :aria-pressed="isFavorite ? 'true' : 'false'"
        :aria-label="favoriteButtonLabel"
        :title="favoriteButtonTitle"
        :disabled="isFavoriteBusy"
        @click.stop="handleToggleFavorite"
      >
        <font-awesome-icon :icon="['fas', 'heart']" />
      </button>
    </div>
    <div class="game-media-section__actions">
      <ShareButton
        v-if="shareText && game.image"
        :share-text="shareText"
        :image-url="game.image"
        :file-name="game.name"
      />
      <CustomButton
        v-if="!user"
        type="is-info"
        label="Login with X"
        :icon="['fab', 'x-twitter']"
        @click="handleLogin"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PropType } from 'vue';
import type { Game, GameBadgeKey } from '@top-x/shared/types/game';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ShareButton from '@/components/ShareButton.vue';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';
import { GAME_BADGE_DEFINITIONS } from '@top-x/shared/constants/gameBadges';
import { GAME_TYPE_ICON_MAP, DEFAULT_GAME_TYPE_ICON } from '@top-x/shared/constants/gameTypes';

const props = defineProps({
  game: {
    type: Object as PropType<Game>,
    required: true,
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
  shareText: {
    type: String,
    default: '',
  },
});

const localeStore = useLocaleStore();
const userStore = useUserStore();
const user = computed(() => userStore.user);
const t = (key: string) => localeStore.translate(key);

// Gradient placeholder style
const placeholderStyle = computed(() => {
  const style: Record<string, string> = {};
  
  // Check if game has custom gradient colors
  if (props.game.imageGradient && Array.isArray(props.game.imageGradient) && props.game.imageGradient.length === 2) {
    const [startColor, endColor] = props.game.imageGradient;
    if (startColor && endColor) {
      style.background = `linear-gradient(135deg, ${startColor} 0%, ${endColor} 100%)`;
      style.backgroundImage = `linear-gradient(135deg, ${startColor} 0%, ${endColor} 100%)`; // Ensure it overrides
      if (import.meta.env.DEV) {
        console.log('GameMediaSection: Using custom gradient', { startColor, endColor, gameId: props.game.id });
      }
    } else {
      // Use new CSS variables for gradient defaults
      style.background = 'linear-gradient(135deg, var(--color-game-gradient-start) 0%, var(--color-game-gradient-end) 100%)';
    }
  } else {
    // Use new CSS variables for gradient defaults
    style.background = 'linear-gradient(135deg, var(--color-game-gradient-start) 0%, var(--color-game-gradient-end) 100%)';
    if (import.meta.env.DEV) {
      console.log('GameMediaSection: Using default gradient', { 
        hasImageGradient: !!props.game.imageGradient,
        imageGradient: props.game.imageGradient,
        gameId: props.game.id 
      });
    }
  }
  
  // Set text color
  if (props.game.imageGradientTextColor) {
    style.color = props.game.imageGradientTextColor;
  } else {
    style.color = 'var(--color-game-gradient-text)';
  }
  
  return style;
});

type MediaLabelVariant = 'featured' | 'daily' | `badge-${GameBadgeKey}`;

type MediaLabel = {
  text: string;
  variant: MediaLabelVariant;
  icon: [string, string];
};

const BADGE_LABEL_LIMIT = 5;

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

const isFavorite = computed(() => userStore.isGameFavorite(props.game.id));

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

async function handleLogin() {
  await userStore.loginWithX();
}
</script>

<style scoped>
.game-media-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.game-media-section__image-wrapper {
  position: relative;
  border-radius: var(--space-6);
  overflow: hidden;
  border: 1px solid rgba(0, 232, 224, 0.22);
  background-color: var(--color-bg-secondary);
  aspect-ratio: 4 / 3;
}

.game-media-section__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.game-media-section__image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* background gradient is set inline via :style, fallback uses new gradient CSS variables */
  background: linear-gradient(135deg, var(--color-game-gradient-start) 0%, var(--color-game-gradient-end) 100%);
  color: var(--color-game-gradient-text);
  font-size: clamp(1.75rem, 5vw, 3rem);
  font-weight: 700;
  padding: 2rem;
  text-align: center;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

.game-media-section__labels {
  position: absolute;
  inset-block-start: var(--space-3);
  inset-inline: var(--space-3);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  z-index: 2;
}

.game-media-section__badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: 999px;
  font-size: var(--font-size-200);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  backdrop-filter: none;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.game-media-section__badge:hover {
  transform: none;
}

.game-media-section__badge svg {
  font-size: 0.9rem;
}

.game-media-section__badge--featured {
  background-color: rgba(255, 201, 20, 0.3);
  color: #ffd85c;
  border: 1.5px solid rgba(255, 201, 20, 0.5);
}

.game-media-section__badge--daily {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
  border: 1.5px solid var(--color-border-primary);
}

.game-media-section__badge--badge-onFire {
  background-color: rgba(255, 135, 66, 0.3);
  color: #ffbb7c;
  border: 1.5px solid rgba(255, 135, 66, 0.5);
}

.game-media-section__badge--badge-hardcore {
  background-color: rgba(123, 97, 255, 0.3);
  color: #bfa8ff;
  border: 1.5px solid rgba(123, 97, 255, 0.45);
}

.game-media-section__badge--badge-womenOnly {
  background-color: rgba(255, 105, 180, 0.3);
  color: #ffb6d9;
  border: 1.5px solid rgba(255, 105, 180, 0.45);
}

.game-media-section__type-overlay {
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
  z-index: 3;
}

.game-media-section__favorite {
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

.game-media-section__favorite:hover:not(:disabled) {
  transform: scale(1.05);
  color: #ff5c8d;
  border-color: rgba(255, 92, 141, 0.8);
}

.game-media-section__favorite--active {
  background: rgba(255, 92, 141, 0.2);
  color: #ff5c8d;
  border-color: rgba(255, 92, 141, 0.8);
}

.game-media-section__favorite:disabled {
  cursor: wait;
  opacity: 0.7;
}

.game-media-section__actions {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  flex-wrap: wrap;
}
</style>

