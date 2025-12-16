<template>
  <div class="page-container game-info-page section-stack">
    <!-- Hero Card Section -->
    <section class="game-hero-card surface">
      <!-- Media/Image Side -->
      <div class="game-hero-media">
        <GameMediaSection
          :game="game"
          :show-featured-label="true"
          :featured-label="t('home.labels.featured')"
          :daily-challenge-active="Boolean(game.dailyChallengeActive)"
          :daily-challenge-label="t('home.labels.dailyChallenge')"
          :share-text="shareText"
          class="hero-media-component"
        />
      </div>

      <!-- Details/Content Side -->
      <div class="game-hero-content">
        <!-- Close/Back Button -->
        <button class="close-button" @click="goBack" :aria-label="t('common.close')">
          <font-awesome-icon :icon="['fas', 'xmark']" />
        </button>

        <!-- Header -->
        <div class="hero-header">
          <span class="hero-eyebrow">{{ t('gameInfo.featuredGame') }}</span>
          <h1 class="hero-title">{{ game.name }}</h1>
          <p class="hero-description">{{ game.description }}</p>
        </div>

        <!-- Meta/Stats Row -->
        <div class="hero-stats-row" dir="ltr">
          <div class="hero-stat" v-if="stats.sessionsPlayed" :title="t('home.stats.sessions')">
            <span class="hero-stat-icon"><font-awesome-icon :icon="['fas', 'eye']" /></span>
            <span class="hero-stat-value">{{ formatNumber(stats.sessionsPlayed) }}</span>
          </div>

          <div class="hero-stat" :title="t('home.stats.favorites')">
            <span class="hero-stat-icon"><font-awesome-icon :icon="['fas', 'heart']" /></span>
            <span class="hero-stat-value">{{ formatNumber(totalFavorites) }}</span>
          </div>
          
           <!-- Creator Info Inline -->
          <div v-if="resolvedCreator" class="hero-creator">
             <div class="hero-creator-avatar">
                <img :src="creatorImage" :alt="creatorAltText" loading="lazy" />
             </div>
             <div class="hero-creator-details">
                <span class="hero-creator-by">{{ t('gameCard.creator.label') }}</span>
                <a :href="creatorProfileUrl" class="hero-creator-name" @click.stop>@{{ resolvedCreator.username }}</a>
             </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="hero-actions">
           <CustomButton
            type="is-primary is-large"
            class="play-button"
            :label="t('home.playNow')"
            @click="playGame"
          />
          <ShareButton
            v-if="shareText"
            :share-text="shareText"
            :image-url="game.image"
            :file-name="game.name"
            class="action-icon-button"
          />
        </div>
        
         <!-- Instructions / Info -->
         <div v-if="game.gameInstruction" class="hero-instructions">
            <div class="hero-instructions-title">
               <font-awesome-icon :icon="['fas', 'circle-info']" />
               <span>{{ t('gameInfo.howToPlay') }}</span>
            </div>
            <p>{{ game.gameInstruction }}</p>
         </div>

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
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHead } from '@vueuse/head';
import { getGame, getGameStats } from '@/services/game';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ShareButton from '@/components/ShareButton.vue';
import Leaderboard from '@/components/Leaderboard.vue';
import DailyChallenges from '@/components/DailyChallenges.vue';
import GameTypeInfo from '@/components/GameTypeInfo.vue';
import GameMediaSection from '@/components/GameMediaSection.vue';
import SimilarGamesSection from '@/components/SimilarGamesSection.vue';
import { useUserStore } from '@/stores/user';
import { useLocaleStore } from '@/stores/locale';
import { Game, GameCreator } from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
import { formatNumber } from '@top-x/shared/utils/format';
import { DEFAULT_TOPX_CREATOR } from '@top-x/shared/constants/gameBadges';

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

// Favorite Logic to sync with store
const favoriteBaseline = ref(0);
const initialFavorite = ref(false);

const isFavorite = computed(() => userStore.isGameFavorite(game.value.id));

watch(
  () => stats.value.favoriteCounter,
  (value) => {
    if (typeof value === 'number') {
      favoriteBaseline.value = value;
      // When stats load, check initial state
      initialFavorite.value = userStore.isGameFavorite(game.value.id);
    }
  }
);

const totalFavorites = computed(() => {
  const diff = (isFavorite.value ? 1 : 0) - (initialFavorite.value ? 1 : 0);
  const nextValue = (favoriteBaseline.value || 0) + diff;
  return nextValue < 0 ? 0 : nextValue;
});


const shareText = computed(() => {
  if (game.value.shareText) {
    return game.value.shareText;
  }
  return `Check out ${game.value.name} on TOP-X! 🎮`;
});

// Creator Logic
const resolvedCreator = computed<GameCreator | undefined>(() => {
  const explicitCreator = game.value.creator;
  if (explicitCreator) {
    return {
      ...explicitCreator,
      image: explicitCreator.image || DEFAULT_TOPX_CREATOR.image,
    };
  }
  if (game.value.community === false) {
    return DEFAULT_TOPX_CREATOR;
  }
  return undefined;
});

const creatorImage = computed(() => resolvedCreator.value?.image || DEFAULT_TOPX_CREATOR.image);
const creatorProfileUrl = computed(() =>
  resolvedCreator.value ? `https://top-x.co/profile?userid=${resolvedCreator.value.userid}` : '',
);
const creatorAltText = computed(() =>
  resolvedCreator.value ? `${resolvedCreator.value.username} avatar` : 'Creator avatar',
);


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
    
    // Check if game is active - if not, redirect home (game is not playable)
    if (!data.active) {
      console.error('GameInfo: Game is not active, redirecting home');
      router.push('/');
      return;
    }
    
    game.value = {
      ...data,
      image: data.image || undefined,
    };
    
    // Initial favorite check
    initialFavorite.value = userStore.isGameFavorite(data.id);

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

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/');
  }
}
</script>

<style scoped>
.game-info-page {
  --section-stack-gap: var(--space-4);
  max-width: 1400px;
  margin-inline: auto;
  padding-inline: var(--space-4);
}

/* Hero Card Styling */
.game-hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: var(--space-6);
  padding: var(--space-5);
  border-radius: 28px;
  background-color: var(--color-surface);
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.game-hero-media {
  display: flex;
  flex-direction: column;
}

/* Force GameMediaSection to fill height nicely */
.hero-media-component {
  height: 100%;
}
.hero-media-component :deep(.game-media-section__image-wrapper) {
  height: 100%;
  aspect-ratio: auto;
  min-height: 400px;
  border-radius: 20px;
}

.game-hero-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  position: relative;
  padding-block: var(--space-2);
}

/* Close Button */
.close-button {
  position: absolute;
  top: 0;
  inset-inline-end: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--color-border-base);
  border-radius: 50%;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}
.close-button:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-text-primary);
}

.hero-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-inline-end: 40px; /* Space for close button */
}

.hero-eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: var(--font-size-200);
  color: var(--color-text-muted);
  font-weight: 600;
}

.hero-title {
  margin: 0;
  font-size: clamp(2.5rem, 3vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  color: var(--color-text-primary);
}

.hero-description {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
  max-width: 65ch;
}

/* Stats Row - Mimics GameCard stats but inline */
.hero-stats-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-5);
  padding-block: var(--space-2);
  border-block: 1px solid rgba(255, 255, 255, 0.08); /* Divider like sketch maybe? */
}

.hero-stat {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: 1.1rem;
}

.hero-stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: var(--color-bg-secondary);
  color: var(--bulma-primary);
  font-size: 0.9rem;
}

.hero-creator {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-inline-start: auto; /* Push to end if possible */
}

.hero-creator-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid var(--bulma-primary);
}
.hero-creator-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.hero-creator-details {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
}
.hero-creator-by {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
}
.hero-creator-name {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text-primary);
    text-decoration: none;
}
.hero-creator-name:hover {
    color: var(--bulma-primary);
}

/* Actions */
.hero-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.play-button {
  flex-grow: 1; /* Make it big */
}
.play-button :deep(.button) {
  width: 100%;
  height: 60px; /* Taller */
  font-size: 1.3rem;
  border-radius: 16px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 800;
}

.action-icon-button :deep(.button) {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  border-color: var(--color-border-base);
  background: transparent;
  color: var(--color-text-primary);
  font-size: 1.4rem;
}
.action-icon-button :deep(.button:hover) {
    border-color: var(--bulma-primary);
    color: var(--bulma-primary);
}

/* Instructions */
.hero-instructions {
  background: var(--color-bg-secondary);
  border-radius: 16px;
  padding: var(--space-4);
  margin-top: var(--space-2);
}
.hero-instructions-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--bulma-primary);
  font-weight: 700;
  margin-bottom: var(--space-2);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.hero-instructions p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
}

.game-type-section,
.leaderboard-section,
.daily-challenges-section,
.similar-games-section,
.build-section {
  --section-stack-gap: var(--space-3);
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
  color: var(--color-text-primary);
}

.section-title svg {
  color: var(--bulma-primary);
  font-size: 1.4rem;
}

.section-subtitle {
  margin: 0;
  color: var(--color-text-tertiary);
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
  border-radius: 28px; /* Match recent style */
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
  color: var(--color-text-primary);
}

.build-copy h3 svg {
  color: var(--bulma-primary);
}

.build-copy p {
  margin: 0;
  color: var(--color-text-secondary);
  max-width: 32rem;
}

.build-hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (max-width: 60rem) {
  .game-hero-card {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }
  
  .hero-media-component :deep(.game-media-section__image-wrapper) {
      min-height: 250px;
  }
  
  .hero-header {
      margin-inline-end: 0;
  }
  
  .close-button {
      top: -10px;
      inset-inline-end: -10px;
  }
  
  .hero-stats-row {
      flex-wrap: wrap;
      gap: var(--space-4);
  }
  
  .hero-creator {
      margin-inline-start: 0;
      width: 100%;
      padding-top: var(--space-2);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
  }
}
</style>
