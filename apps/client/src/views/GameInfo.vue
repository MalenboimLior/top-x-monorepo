<!-- Updated GameInfo.vue -->
<template>
  <div class="game-info-page section-stack">
    <section class="layout-container section-stack game-summary">
      <div class="summary-grid surface">
        <div class="summary-media">
          <img :src="game.image" :alt="`${game.name} image`" class="summary-image" />
          <div v-if="gamePills.length" class="summary-badges">
            <span
              v-for="pill in gamePills"
              :key="pill.text + pill.variant"
              class="summary-badge"
              :class="`summary-badge--${pill.variant}`"
            >
              <font-awesome-icon v-if="pill.icon" :icon="pill.icon" />
              <span>{{ pill.text }}</span>
            </span>
          </div>
        </div>
        <div class="summary-details">
          <div class="summary-header">
            <span class="summary-eyebrow">Featured Game</span>
            <h1 class="summary-title">{{ game.name }}</h1>
            <p class="summary-description">{{ game.description }}</p>
          </div>
          <div class="summary-meta">
            <div class="meta-card">
              <div class="meta-card__icon">
                <font-awesome-icon :icon="['fas', 'gamepad']" />
              </div>
              <div class="meta-card__body">
                <p class="meta-card__label">Game Type</p>
                <p class="meta-card__value">{{ game.gameTypeId || 'Coming Soon' }}</p>
              </div>
            </div>
            <div class="meta-card" v-if="game.gameHeader">
              <div class="meta-card__icon">
                <font-awesome-icon :icon="['fas', 'table']" />
              </div>
              <div class="meta-card__body">
                <p class="meta-card__label">Header</p>
                <p class="meta-card__value">{{ game.gameHeader }}</p>
              </div>
            </div>
            <div class="meta-card" v-if="game.gameInstruction">
              <div class="meta-card__icon">
                <font-awesome-icon :icon="['fas', 'circle-info']" />
              </div>
              <div class="meta-card__body">
                <p class="meta-card__label">How to Play</p>
                <p class="meta-card__value">{{ game.gameInstruction }}</p>
              </div>
            </div>
          </div>
          <div v-if="hasCounters" class="summary-stats">
            <div
              v-for="counter in counterList"
              :key="counter.key"
              class="summary-stat"
              :title="counter.label"
            >
              <span class="summary-stat__icon" role="img" :aria-label="counter.label">
                <font-awesome-icon :icon="counter.icon" />
              </span>
              <div class="summary-stat__content">
                <span class="summary-stat__value">{{ formatCounter(counter.value) }}</span>
                <span class="summary-stat__label">{{ counter.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="game.gameTypeId" class="layout-container game-type-section">
      <div class="surface">
        <GameTypeInfo :game-type-id="game.gameTypeId" />
      </div>
    </section>

    <section class="layout-container game-actions">
      <div class="surface action-card">
        <CustomButton
          type="is-primary is-large"
          label="Play Now"
          @click="playGame"
        />
        <button
          class="ghost-button"
          type="button"
          :class="{ 'is-active': isFavorite }"
          :aria-pressed="isFavorite"
          @click="toggleFavoriteStatus"
        >
          <font-awesome-icon :icon="['fas', 'heart']" />
          {{ isFavorite ? 'Remove Favorite' : 'Add to Favorites' }}
        </button>
        <button class="ghost-button" type="button" @click="backToGames">
          Back to Games
        </button>
      </div>
    </section>

    <section class="layout-container section-stack leaderboard-section">
      <div class="section-heading">
        <h2 class="section-title">
          <font-awesome-icon :icon="['fas', 'trophy']" />
          Leaderboard
        </h2>
        <p class="section-subtitle">See who is dominating this challenge.</p>
      </div>
      <div class="surface">
        <Leaderboard :game-id="gameId" />
      </div>
    </section>

    <section v-if="game.dailyChallengeActive" class="layout-container section-stack daily-challenges-section">
      <div class="section-heading">
        <h2 class="section-title">
          <font-awesome-icon :icon="['fas', 'bolt']" />
          Daily Challenges
        </h2>
        <p class="section-subtitle">A fresh leaderboard every 24 hours.</p>
      </div>
      <div class="surface">
        <DailyChallenges :gameId="gameId" />
      </div>
    </section>

    <section class="layout-container build-section">
      <div class="surface build-card">
        <div class="build-copy">
          <h3>
            <font-awesome-icon :icon="['fas', 'edit']" />
            Build your own game
          </h3>
          <p>Design custom experiences and share them with the community.</p>
        </div>
        <CustomButton
          type="is-info"
          label="Create now"
          @click="buildGame"
        />
      </div>
      <p class="build-hint">(only for registered users)</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getGame, getGameStats } from '@/services/game';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import Leaderboard from '@/components/Leaderboard.vue';
import DailyChallenges from '@/components/DailyChallenges.vue';
import GameTypeInfo from '@/components/GameTypeInfo.vue';
import { useUserStore } from '@/stores/user';
import { Game } from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
import fallbackImg from '@/assets/images/fallback.png';
import { formatNumber } from '@top-x/shared/utils/format';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const gameId = ref(route.query.game as string);
const game = ref<Game>({
  id: '',
  name: '',
  description: '',
  gameTypeId: '',
  active: true,
  image: '',
  vip: [],
  custom: {} as any,
  language: 'en',
});
const stats = ref<Partial<GameStats>>({});

const isFavorite = computed(() => (gameId.value ? userStore.isGameFavorite(gameId.value) : false));

type GamePillVariant = 'featured' | 'daily';

type GamePill = {
  text: string;
  variant: GamePillVariant;
  icon: [string, string];
};

const gamePills = computed<GamePill[]>(() => {
  const pills: GamePill[] = [];
  // You can add logic here to determine if it's featured
  pills.push({ text: 'Top Pick', variant: 'featured', icon: ['fas', 'trophy'] });
  if (game.value.dailyChallengeActive) {
    pills.push({ text: 'Daily Challenge', variant: 'daily', icon: ['fas', 'bolt'] });
  }
  return pills;
});

const counterList = computed(() => {
  const counters = stats.value;
  return [
    { 
      key: 'players', 
      label: 'Players', 
      value: counters.totalPlayers,
      icon: ['fas', 'user-group'] as [string, string],
    },
    {
      key: 'favorites',
      label: 'Favorites',
      value: counters.favoriteCounter,
      icon: ['fas', 'heart'] as [string, string],
    },
    { 
      key: 'sessions', 
      label: 'Sessions', 
      value: counters.sessionsPlayed,
      icon: ['fas', 'gamepad'] as [string, string],
    },
  ].filter((entry) => typeof entry.value === 'number' && entry.value !== undefined);
});
const hasCounters = computed(() => counterList.value.length > 0);

function toggleFavoriteStatus() {
  if (!gameId.value) {
    return;
  }

  if (!userStore.user) {
    alert('Please log in to manage favorites.');
    return;
  }

  void userStore.toggleFavorite(gameId.value);
}

const formatCounter = (value?: number) => formatNumber(value ?? 0);

onMounted(async () => {
  if (!gameId.value) {
    console.error('GameInfo: No gameId provided');
    router.push('/');
    return;
  }

  try {
    const [gameResult, statsResult] = await Promise.all([
      getGame(gameId.value),
      getGameStats(gameId.value),
    ]);

    if (statsResult.error) {
      console.error('GameInfo: Error loading stats:', statsResult.error);
    }
    stats.value = statsResult.stats || {};

    if (gameResult.error || !gameResult.game) {
      console.error('GameInfo: Error loading game:', gameResult.error || 'Game not found');
      router.push('/');
      return;
    }

    const data = gameResult.game;
    game.value = {
      ...data,
      image: data.image || fallbackImg,
    };
    console.log('GameInfo: Game data fetched:', game.value);

    if (analytics) {
      logEvent(analytics, 'page_view', { page_name: 'game_info', game_id: gameId.value });
    }
  } catch (error: any) {
    console.error('GameInfo: Error fetching game data:', error.message, error);
  }
});

function playGame() {
  const trackGameId = gameId.value || 'unknown';
  if (analytics) {
    logEvent(analytics, 'select_game', { game_id: trackGameId });
  }
  router.push(`/games/${game.value.gameTypeId}?game=${gameId.value}`);
}

function backToGames() {
  router.push('/');
}

function buildGame() {
  if (!userStore.user) {
    // Optionally prompt login or show message
    alert('Please log in to build your own game.');
    return;
  }
  router.push(`/build?type=${game.value.gameTypeId}`);
}
</script>

<style scoped>
.game-info-page {
  min-height: 100vh;
  background: radial-gradient(circle at top, rgba(0, 232, 224, 0.18), transparent 55%),
    radial-gradient(circle at bottom right, rgba(196, 255, 0, 0.12), transparent 60%),
    #000;
  color: var(--bulma-text);
  padding: clamp(var(--space-6), 8vh, var(--space-9)) clamp(var(--space-4), 4vw, var(--space-6))
    var(--space-12);
  box-sizing: border-box;
  width: 100%;
  --section-stack-gap: var(--space-11);
}

.game-summary {
  --section-stack-gap: var(--space-7);
}

.summary-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(0, 1.3fr);
  gap: var(--space-7);
  align-items: flex-start;
}

.summary-media {
  position: relative;
  border-radius: var(--space-6);
  overflow: hidden;
  border: 1px solid rgba(0, 232, 224, 0.22);
  background: radial-gradient(circle at 30% 20%, rgba(0, 232, 224, 0.35), rgba(0, 0, 0, 0.85));
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.55);
}

.summary-image {
  display: block;
  width: 100%;
  height: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.summary-badges {
  position: absolute;
  inset-block-start: var(--space-3);
  inset-inline: var(--space-3);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  z-index: 2;
}

.summary-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: 999px;
  font-size: var(--font-size-200);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.summary-badge:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.summary-badge svg {
  font-size: 0.9rem;
}

.summary-badge--featured {
  background: linear-gradient(135deg, rgba(255, 201, 20, 0.35), rgba(255, 215, 0, 0.25));
  color: #ffd85c;
  border: 1.5px solid rgba(255, 201, 20, 0.5);
}

.summary-badge--daily {
  background: linear-gradient(135deg, rgba(0, 232, 224, 0.35), rgba(0, 232, 224, 0.25));
  color: #00e8e0;
  border: 1.5px solid rgba(0, 232, 224, 0.5);
}

.summary-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.summary-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.summary-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: var(--font-size-300);
  color: rgba(255, 255, 255, 0.55);
}

.summary-title {
  margin: 0;
  font-size: clamp(2.2rem, 2.2vw + 1.6rem, 3.4rem);
  font-weight: 800;
  line-height: 1.05;
  color: #ffffff;
  text-shadow: 0 18px 35px rgba(0, 232, 224, 0.15);
}

.summary-description {
  margin: 0;
  max-width: 42rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: clamp(1.05rem, 1.1vw + 0.8rem, 1.2rem);
  line-height: 1.65;
}

.summary-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: var(--space-4);
}

.meta-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-5);
  border-radius: var(--space-4);
  background: rgba(0, 232, 224, 0.05);
  border: 1px solid rgba(0, 232, 224, 0.16);
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  min-height: 140px;
}

.meta-card:hover {
  transform: translateY(-3px);
  border-color: rgba(0, 232, 224, 0.32);
  background: rgba(0, 232, 224, 0.08);
}

.meta-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.9rem;
  background: linear-gradient(135deg, rgba(0, 232, 224, 0.32), rgba(0, 232, 224, 0.18));
  color: var(--bulma-primary);
  font-size: 1.1rem;
  flex-shrink: 0;
}

.meta-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.meta-card__label {
  margin: 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.55);
}

.meta-card__value {
  margin: 0;
  font-size: 1rem;
  color: #ffffff;
  line-height: 1.5;
}

.summary-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.summary-stat {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--space-4);
  border: 1px solid rgba(0, 232, 224, 0.28);
  background: rgba(255, 255, 255, 0.05);
  min-width: 160px;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  cursor: default;
}

.summary-stat:hover {
  transform: translateY(-2px);
  border-color: rgba(0, 232, 224, 0.45);
  background: rgba(0, 232, 224, 0.12);
  box-shadow: 0 2px 8px rgba(0, 232, 224, 0.2);
}

.summary-stat__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.85rem;
  background: linear-gradient(135deg, rgba(0, 232, 224, 0.3), rgba(0, 232, 224, 0.2));
  color: var(--bulma-primary);
  font-size: 1.1rem;
  flex-shrink: 0;
}

.summary-stat__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.summary-stat__value {
  font-size: 1.3rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
}

.summary-stat__label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.6);
}

.game-type-section,
.leaderboard-section,
.daily-challenges-section,
.build-section {
  --section-stack-gap: var(--space-6);
}

.game-actions {
  margin-block: var(--space-4);
}

.action-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  flex-wrap: wrap;
  padding: clamp(var(--space-5), 4vw, var(--space-7));
}

.ghost-button {
  background: transparent;
  border: 1px solid rgba(0, 232, 224, 0.28);
  color: var(--bulma-text);
  padding: 0.9rem 1.8rem;
  border-radius: 999px;
  font-weight: 600;
  letter-spacing: 0.04em;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.ghost-button svg {
  font-size: 0.95rem;
}

.ghost-button:hover {
  background: rgba(0, 232, 224, 0.12);
  border-color: rgba(0, 232, 224, 0.45);
  color: #ffffff;
}

.ghost-button.is-active {
  background: rgba(0, 232, 224, 0.18);
  border-color: rgba(0, 232, 224, 0.6);
  color: #ffffff;
}

.ghost-button.is-active svg {
  color: var(--bulma-primary);
}

.section-heading {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  text-align: center;
}

.section-title {
  margin: 0;
  font-size: clamp(1.8rem, 1vw + 1.2rem, 2.4rem);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  color: #ffffff;
}

.section-title svg {
  color: var(--bulma-primary);
  font-size: 1.4rem;
}

.section-subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
}

.build-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
}

.build-card {
  width: min(960px, 100%);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
  text-align: center;
  padding: clamp(var(--space-6), 5vw, var(--space-8));
}

.build-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: center;
}

.build-copy h3 {
  margin: 0;
  font-size: 1.45rem;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: #ffffff;
}

.build-copy h3 svg {
  color: var(--bulma-primary);
}

.build-copy p {
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
  max-width: 32rem;
}

.build-hint {
  margin: 0;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (max-width: 75rem) {
  .summary-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .summary-details {
    align-items: flex-start;
  }
}

@media (max-width: 48rem) {
  .game-info-page {
    padding: var(--space-10) clamp(var(--space-3), 6vw, var(--space-4)) var(--space-10);
    --section-stack-gap: var(--space-9);
  }

  .summary-grid {
    gap: var(--space-6);
  }

  .summary-meta {
    grid-template-columns: 1fr;
  }

  .summary-stats {
    justify-content: center;
  }

  .summary-stat {
    flex: 1 1 calc(50% - var(--space-3));
    min-width: auto;
  }

  .action-card {
    flex-direction: column;
    align-items: stretch;
  }

  .action-card > * {
    width: 100%;
  }
}

@media (max-width: 37.5rem) {
  .summary-badges {
    inset-block-start: var(--space-2);
    inset-inline: var(--space-2);
  }

  .summary-badge {
    font-size: 0.65rem;
    padding: 0.4rem 0.75rem;
  }

  .summary-stat {
    flex: 1 1 100%;
  }

  .build-card {
    padding: var(--space-6);
  }
}
</style>
