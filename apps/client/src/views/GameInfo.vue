<!-- Updated GameInfo.vue -->
<template>
  <div class="page-container game-info-page section-stack">
    <section class="layout-container section-stack game-summary">
      <div class="summary-grid surface">
        <div class="summary-media">
          <GameMediaSection
            :game="game"
            :show-featured-label="true"
            :featured-label="t('home.labels.featured')"
            :daily-challenge-active="Boolean(game.dailyChallengeActive)"
            :daily-challenge-label="t('home.labels.dailyChallenge')"
            :share-text="shareText"
          />
        </div>
        <div class="summary-details">
          <div class="summary-header">
            <span class="summary-eyebrow">{{ t('gameInfo.featuredGame') }}</span>
            <h1 class="summary-title">{{ game.name }}</h1>
            <p class="summary-description">{{ game.description }}</p>
          </div>
          <GameStatsDisplay :stats="stats" />
          <GameCreatorInfo :game="game" />
          <div v-if="game.gameInstruction" class="how-to-play">
            <div class="how-to-play__header">
              <font-awesome-icon :icon="['fas', 'circle-info']" />
              <h3 class="how-to-play__title">{{ t('gameInfo.howToPlay') }}</h3>
            </div>
            <p class="how-to-play__content">{{ game.gameInstruction }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="layout-container game-actions">
      <div class="surface action-card">
        <CustomButton
          type="is-primary is-large"
          :label="t('home.playNow')"
          @click="playGame"
        />
      </div>
    </section>

    <section v-if="game.gameTypeId" class="layout-container game-type-section">
      <div class="surface">
        <GameTypeInfo :game-type-id="game.gameTypeId" />
      </div>
    </section>

    <section class="layout-container section-stack leaderboard-section">
      <div class="section-heading">
        <h2 class="section-title">
          <font-awesome-icon :icon="['fas', 'trophy']" />
          {{ t('gameInfo.topCharts') }}
        </h2>
        <p class="section-subtitle">{{ t('gameInfo.topChartsSubtitle') }}</p>
      </div>
      <div class="surface">
        <Leaderboard :game-id="gameId" />
      </div>
    </section>

    <section v-if="game.dailyChallengeActive" class="layout-container section-stack daily-challenges-section">
      <div class="section-heading">
        <h2 class="section-title">
          <font-awesome-icon :icon="['fas', 'bolt']" />
          {{ t('gameInfo.dailyChallenges') }}
        </h2>
        <p class="section-subtitle">{{ t('gameInfo.dailyChallengesSubtitle') }}</p>
      </div>
      <div class="surface">
        <DailyChallenges :gameId="gameId" />
      </div>
    </section>

    <section v-if="game.gameTypeId" class="layout-container similar-games-section">
      <SimilarGamesSection :game-type-id="game.gameTypeId" :current-game-id="gameId" :limit="6" />
    </section>

    <section class="layout-container build-section">
      <div class="surface build-card">
        <div class="build-copy">
          <h3>
            <font-awesome-icon :icon="['fas', 'edit']" />
            {{ t('gameInfo.buildYourOwn') }}
          </h3>
          <p>{{ t('gameInfo.buildDescription') }}</p>
        </div>
        <CustomButton
          type="is-info"
          :label="t('gameInfo.createNow')"
          @click="buildGame"
        />
      </div>
      <p class="build-hint">{{ t('gameInfo.buildHint') }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHead } from '@vueuse/head';
import { getGame, getGameStats } from '@/services/game';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import Leaderboard from '@/components/Leaderboard.vue';
import DailyChallenges from '@/components/DailyChallenges.vue';
import GameTypeInfo from '@/components/GameTypeInfo.vue';
import GameMediaSection from '@/components/GameMediaSection.vue';
import GameStatsDisplay from '@/components/GameStatsDisplay.vue';
import GameCreatorInfo from '@/components/GameCreatorInfo.vue';
import SimilarGamesSection from '@/components/SimilarGamesSection.vue';
import { useUserStore } from '@/stores/user';
import { useLocaleStore } from '@/stores/locale';
import { Game } from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
import fallbackImg from '@/assets/images/fallback.png';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

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

const shareText = computed(() => {
  if (game.value.shareText) {
    return game.value.shareText;
  }
  return `Check out ${game.value.name} on TOP-X! 🎮`;
});

useHead(() => ({
  title: game.value.name ? `TOP-X: ${game.value.name}` : 'TOP-X: Game Info',
  meta: [
    {
      name: 'description',
      content: game.value.description || `Play ${game.value.name || 'this game'} on TOP-X. Compete with friends, climb leaderboards, and challenge yourself!`,
    },
  ],
}));

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

function buildGame() {
  if (!userStore.user) {
    alert(t('gameInfo.loginToBuild'));
    return;
  }
  router.push(`/build?type=${game.value.gameTypeId}`);
}
</script>

<style scoped>
.game-info-page {
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
  display: flex;
  flex-direction: column;
}

.summary-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
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

.how-to-play {
  padding: var(--space-5);
  border-radius: var(--space-4);
  background: rgba(0, 232, 224, 0.05);
  border: 1px solid rgba(0, 232, 224, 0.16);
}

.how-to-play__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.how-to-play__header svg {
  color: var(--bulma-primary);
  font-size: 1.2rem;
}

.how-to-play__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffffff;
}

.how-to-play__content {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
}

.game-type-section,
.leaderboard-section,
.daily-challenges-section,
.similar-games-section,
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
  padding: clamp(var(--space-5), 4vw, var(--space-7));
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
    --section-stack-gap: var(--space-9);
  }

  .summary-grid {
    gap: var(--space-6);
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
  .build-card {
    padding: var(--space-6);
  }
}
</style>
