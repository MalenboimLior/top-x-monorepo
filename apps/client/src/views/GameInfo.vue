<template>
  <div class="page-container game-info-page section-stack">
    <!-- Hero Card Section -->
    <section class="game-hero-card surface fade-in-up">
      <!-- Background Glows -->
      <div class="hero-bg-glow hero-bg-glow--1"></div>
      <div class="hero-bg-glow hero-bg-glow--2"></div>

      <!-- Media/Image Side -->
      <div class="game-hero-media">
        <button class="game-image-button" @click="playGame" :aria-label="t('home.playNow')">
          <GameMediaSection
            :game="game"
            :show-featured-label="true"
            :featured-label="t('home.labels.featured')"
            :daily-challenge-active="Boolean(game.dailyChallengeActive)"
            :daily-challenge-label="t('home.labels.dailyChallenge')"
            class="hero-media-component"
          />
        </button>

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
          <h1 :class="['hero-title', 'text-gradient-primary', gameNameSizeClass]">{{ game.name }}</h1>
          <p class="hero-description">{{ game.description }}</p>
        </div>
        
        <!-- Badges Row -->
        <div v-if="badgeLabels.length" class="hero-badges">
          <span
            v-for="badge in badgeLabels"
            :key="badge.text + badge.variant"
            class="hero-badge"
            :class="`hero-badge--${badge.variant}`"
          >
            <font-awesome-icon v-if="badge.icon" :icon="badge.icon" />
            <span>{{ badge.text }}</span>
          </span>
        </div>

        <!-- Meta/Stats Row -->
        <div class="hero-stats-row" dir="ltr">
          <!-- Creator Info -->
          <div v-if="resolvedCreator" class="hero-stat hero-stat--creator" :title="t('gameCard.creator.label')">
            <div class="hero-creator-avatar">
               <img :src="creatorImage" :alt="creatorAltText" loading="lazy" />
            </div>
            <div class="hero-creator-details">
               <span class="hero-creator-by">{{ t('gameCard.creator.label') }}</span>
               <RouterLink :to="{ path: '/profile', query: { userid: resolvedCreator?.userid } }" class="hero-creator-name" @click.stop>@{{ resolvedCreator.username }}</RouterLink>
            </div>
          </div>

          <!-- Created Date -->
           <div class="hero-stat" :title="t('common.created')">
            <span class="hero-stat-icon"><font-awesome-icon :icon="['fas', 'calendar-days']" /></span>
             <span class="hero-stat-value">{{ formattedDate }}</span>
          </div>

          <div class="hero-stat" v-if="stats.sessionsPlayed" :title="t('home.stats.sessions')">
            <span class="hero-stat-icon"><font-awesome-icon :icon="['fas', 'eye']" /></span>
            <span class="hero-stat-value">{{ formatNumber(stats.sessionsPlayed) }}</span>
          </div>

          <div class="hero-stat" :title="t('home.stats.favorites')">
            <span class="hero-stat-icon"><font-awesome-icon :icon="['fas', 'heart']" /></span>
            <span class="hero-stat-value">{{ formatNumber(totalFavorites) }}</span>
          </div>
        </div>

         <!-- Instructions -->
             <div v-if="game.gameInstruction" class="hero-instructions">
               <div class="hero-instructions-content">
                 <span class="hero-instructions-label">
                    <font-awesome-icon :icon="['fas', 'circle-info']" />
                    {{ t('gameInfo.howToPlay') }}:
                 </span>
                 <div class="hero-instructions-text" v-html="parsedInstructions"></div>
                 <button
                   v-if="isInstructionsLong"
                   @click="openInstructionsModal"
                   class="hero-instructions-show-more"
                 >
                   {{ t('common.showMore') }}
                 </button>
               </div>
             </div>

        <!-- Actions - Centered at bottom -->
        <div class="hero-play-action">
           <CustomButton
            type="is-primary is-large play-button-premium"
            class="play-button"
            :label="t('home.playNow')"
            @click="playGame"
          />
           <a
            v-if="twitterShareUrl"
            :href="twitterShareUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="twitter-share-button"
            @click="handleTwitterShare"
          >
            <font-awesome-icon :icon="['fab', 'x-twitter']" />
            {{ t('common.share') }}
          </a>
        </div>

      </div>
    </section>

    <section v-if="game.gameTypeId" class="layout-container game-type-section">
      <div class="surface">
        <GameTypeInfo :game-type-id="game.gameTypeId" />
      </div>
    </section>

    <section v-if="!isPyramidGame" class="layout-container section-stack leaderboard-section">
      <header class="section-header">
        <div class="section-header__content">
           <h2 class="section-title">
             <font-awesome-icon :icon="['fas', 'trophy']" class="header-icon" />
             {{ t('gameInfo.topCharts') }}
           </h2>
           <p class="section-subtitle">{{ t('gameInfo.topChartsSubtitle') }}</p>
        </div>
      </header>
      <div class="surface">
        <Leaderboard :game-id="gameId" />
      </div>
    </section>

    <section v-else class="layout-container section-stack pyramid-results-section">
      <header class="section-header">
        <div class="section-header__content">
           <h2 class="section-title">
             <font-awesome-icon :icon="['fas', 'users']" class="header-icon" />
             {{ t('games.pyramid.communityVotes') }}
           </h2>
           <p class="section-subtitle">{{ t('games.pyramid.communityVotesSubtitle') }}</p>
        </div>
      </header>
      <div class="surface">
        <PyramidResults
          :game-id="gameId"
          :items="[]"
          :community-items="[]"
          :rows="[]"
          :game-header="game.name"
          :worst-header="t('games.pyramid.worstItem')"
          :game-title="game.name"
          :hide-row-label="false"
          :worst-show="true"
          :share-link="window.location.href"
        />
      </div>
    </section>

    <section v-if="game.dailyChallengeActive" class="layout-container section-stack daily-challenges-section">
      <header class="section-header">
        <div class="section-header__content">
          <h2 class="section-title">
            <font-awesome-icon :icon="['fas', 'bolt']" class="header-icon" />
            {{ t('gameInfo.dailyChallenges') }}
          </h2>
          <p class="section-subtitle">{{ t('gameInfo.dailyChallengesSubtitle') }}</p>
        </div>
      </header>
      <div class="surface">
        <DailyChallenges :gameId="gameId" />
      </div>
    </section>

    <section v-if="game.gameTypeId" class="layout-container similar-games-section">
      <SimilarGamesSection :game-type-id="game.gameTypeId" :current-game-id="gameId" :limit="6" />
    </section>

    <GameBuildSection @build="buildGame" />
  </div>

  <!-- Instructions Modal -->
  <Teleport to="body">
    <div v-if="showInstructionsModal" class="instructions-modal-overlay" @click="closeInstructionsModal">
      <div class="instructions-modal" @click.stop>
        <button class="instructions-modal-close" @click="closeInstructionsModal" :aria-label="t('common.close')">
          <font-awesome-icon :icon="['fas', 'xmark']" />
        </button>
        <div class="instructions-modal-header">
          <h3 class="instructions-modal-title">
            <font-awesome-icon :icon="['fas', 'circle-info']" />
            {{ t('gameInfo.howToPlay') }}
          </h3>
        </div>
        <div class="instructions-modal-content">
          <div class="instructions-modal-text" v-html="parsedInstructions"></div>
          <div class="instructions-modal-actions">
            <CustomButton
              type="is-primary is-large"
              :label="t('home.playNow')"
              @click="playGameFromModal"
            />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useHead } from '@vueuse/head';
import { DateTime } from 'luxon';
import { getGame, getGameStats } from '@/services/game';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ShareButton from '@/components/ShareButton.vue';
import Leaderboard from '@/components/Leaderboard.vue';
import DailyChallenges from '@/components/DailyChallenges.vue';
import GameTypeInfo from '@/components/GameTypeInfo.vue';
import GameMediaSection from '@/components/GameMediaSection.vue';
import SimilarGamesSection from '@/components/SimilarGamesSection.vue';
import GameBuildSection from '@/components/GameBuildSection.vue';
import PyramidResults from '@/components/games/pyramid/PyramidResults.vue';
import { useUserStore } from '@/stores/user';
import { useLocaleStore } from '@/stores/locale';
import { Game, GameCreator, GameBadgeKey } from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
import { formatNumber } from '@top-x/shared/utils/format';
import { GAME_BADGE_DEFINITIONS, DEFAULT_TOPX_CREATOR } from '@top-x/shared/constants/gameBadges';

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
  createdAt: undefined,
});
const stats = ref<Partial<GameStats>>({});
const showInstructionsModal = ref(false);

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
  const baseText = game.value.shareText || `Check out ${game.value.name} on TOP-X! 🎮`;
  const url = window.location.href; // Add current URL
  return `${baseText}\n${url}`;
});

const twitterShareUrl = computed(() => {
  if (!game.value.name || !game.value.description) return null;

  const text = `${game.value.name} - ${game.value.description}`;
  const hashtags = 'TOPX';
  const via = 'TOPX';
  const url = window.location.href;

  const params = new URLSearchParams({
    text,
    hashtags,
    via,
    url
  });

  return `https://twitter.com/intent/tweet?${params.toString()}`;
});

function handleTwitterShare() {
  if (analytics) {
    logEvent(analytics, 'share', {
      method: 'twitter',
      content_type: 'game',
      item_id: gameId.value
    });
  }
}

const formattedDate = computed(() => {
  const dateValue = game.value.createdAt || Date.now();
  // Using cast to avoid TS issues with local setup, confirmed works at runtime
  return (DateTime as any).fromMillis(dateValue).toFormat('MMM yyyy');
});

const gameNameSizeClass = computed(() => {
  const name = game.value.name || '';
  if (name.length > 40) return 'hero-title--extra-small';
  if (name.length > 30) return 'hero-title--small';
  if (name.length > 20) return 'hero-title--medium';
  return 'hero-title--large';
});

// Badges Logic
function isGameBadgeKey(value: string): value is GameBadgeKey {
  return Object.prototype.hasOwnProperty.call(GAME_BADGE_DEFINITIONS, value);
}

const badgeLanguage = computed<'en' | 'il'>(() => (localeStore.language === 'il' ? 'il' : 'en'));

const badgeLabels = computed(() => {
  const language = badgeLanguage.value;
  return (game.value.badges ?? [])
    .filter((badge): badge is GameBadgeKey => isGameBadgeKey(badge))
    .map((badge) => {
      const definition = GAME_BADGE_DEFINITIONS[badge];
      return {
        text: definition.labels[language],
        variant: `badge-${badge}`,
        icon: definition.icon,
      };
    });
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
const creatorAltText = computed(() =>
  resolvedCreator.value ? `${resolvedCreator.value.username} avatar` : 'Creator avatar',
);

// Instructions helpers
function processLineWithTabs(line: string): string {
  // Count leading tabs
  const tabMatch = line.match(/^(\t+)/);
  if (!tabMatch) return line;
  
  const tabCount = tabMatch[1].length;
  const content = line.substring(tabMatch[0].length);
  
  // Convert tabs to spaces (4 spaces per tab) which will be preserved
  // We'll process this before the space-to-nbsp conversion
  const indentSpaces = ' '.repeat(tabCount * 4);
  return indentSpaces + content;
}

function parseMarkdown(text: string): string {
  if (!text) return '';

  // Split by lines to preserve empty lines
  const lines = text.split('\n');
  const result: string[] = [];
  let currentParagraph: string[] = [];
  let lastWasEmpty = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isEmpty = line.trim() === '';
    const isLastLine = i === lines.length - 1;
    const hasContentAfter = !isLastLine && lines.slice(i + 1).some(l => l.trim() !== '');

    if (isEmpty) {
      // Empty line - if we have accumulated content, close the paragraph
      if (currentParagraph.length > 0) {
        const processed = currentParagraph
          .map(processLineWithTabs)
          .join('\n')
          // Bold text **text** or __text__
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/__(.*?)__/g, '<strong>$1</strong>')
          // Italic text *text* or _text_
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/_(.*?)_/g, '<em>$1</em>')
          // Convert single newlines to <br> tags
          .replace(/\n/g, '<br>')
          // Preserve multiple spaces
          .replace(/  +/g, (match) => '&nbsp;'.repeat(match.length));
        
        result.push(`<p>${processed}</p>`);
        currentParagraph = [];
      }
      
      // Add empty line as spacing if there's content after
      if (hasContentAfter && !lastWasEmpty) {
        result.push('<p class="empty-line"><br></p>');
        lastWasEmpty = true;
      }
    } else {
      // Non-empty line - add to current paragraph
      currentParagraph.push(line);
      lastWasEmpty = false;
    }
  }

  // Process remaining paragraph
  if (currentParagraph.length > 0) {
    const processed = currentParagraph
      .map(processLineWithTabs)
      .join('\n')
      // Bold text **text** or __text__
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic text *text* or _text_
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Convert single newlines to <br> tags
      .replace(/\n/g, '<br>')
      // Preserve multiple spaces
      .replace(/  +/g, (match) => '&nbsp;'.repeat(match.length));
    
    result.push(`<p>${processed}</p>`);
  }

  return result.join('');
}


const parsedInstructions = computed(() => {
  return parseMarkdown(game.value.gameInstruction || '');
});

const parsedInstructionsForModal = computed(() => {
  // Show raw text like in textarea for modal
  const text = game.value.gameInstruction || '';
  return `<pre class="modal-text-content">${text}</pre>`;
});

const isInstructionsLong = computed(() => {
  const instruction = game.value.gameInstruction || '';
  // Simple heuristic: if it contains multiple paragraphs or is very long
  return instruction.length > 200 || instruction.includes('\n\n') || instruction.split('\n').length > 6;
});

const isPyramidGame = computed(() => {
  return game.value.gameTypeId === 'pyramid';
});

const openInstructionsModal = () => {
  showInstructionsModal.value = true;
};

const closeInstructionsModal = () => {
  showInstructionsModal.value = false;
};

const playGameFromModal = () => {
  closeInstructionsModal();
  playGame();
};


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
    logEvent(analytics, 'game_start', { game_id: trackGameId });
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
/* Import Home.css to consistently reuse header styles */
@import '@/styles/components/Home.css';

.game-info-page {
  --section-stack-gap: var(--space-8);
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: var(--space-4);
  padding-bottom: var(--space-12);
  animation: page-fade-in 0.6s ease-out;
}

@keyframes page-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.section-stack {
  display: flex;
  flex-direction: column;
  gap: var(--section-stack-gap);
}

/* Hero Card Styling */
.game-hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: var(--space-6);
  padding: var(--space-5);
  border-radius: 32px;
  background: rgba(20, 20, 20, 0.4);
  backdrop-filter: blur(20px);
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  align-items: stretch;
  min-height: 520px;
}

/* Background Glows */
.hero-bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
  z-index: 0;
  pointer-events: none;
}

.hero-bg-glow--1 {
  top: -10%;
  left: -10%;
  width: 50%;
  height: 50%;
  background: radial-gradient(circle, var(--bulma-primary) 0%, transparent 70%);
}

.hero-bg-glow--2 {
  bottom: -10%;
  right: -10%;
  width: 40%;
  height: 40%;
  background: radial-gradient(circle, #7b61ff 0%, transparent 70%);
}

.game-hero-media {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  height: 100%;
}

.game-image-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
  border-radius: 20px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.game-image-button:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 232, 224, 0.3);
}

.game-image-button:active {
  transform: scale(0.98);
}

/* Force GameMediaSection to fill available height but respect aspect ratio */
.hero-media-component {
  width: 100%;
  height: 100%;
  display: flex;
}
.hero-media-component :deep(.game-media-section) {
  height: 100%;
  flex: 1;
}
.hero-media-component :deep(.game-media-section__image-wrapper) {
  flex: 1;
  border-radius: 20px;
  aspect-ratio: unset;
  height: 100%;
  min-height: 380px;
}

.game-hero-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  position: relative;
  padding-block: var(--space-2);
  z-index: 1;
  justify-content: space-between;
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
  font-weight: 900;
  line-height: 1.1;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  overflow: hidden;
}

.hero-title--large {
  font-size: clamp(1.8rem, 3.5vw, 3rem);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.hero-title--medium {
  font-size: clamp(1.5rem, 2.8vw, 2.5rem);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.hero-title--small {
  font-size: clamp(1.2rem, 2.2vw, 2rem);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.hero-title--extra-small {
  font-size: clamp(1rem, 1.8vw, 1.5rem);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.hero-description {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
  max-width: 65ch;
  
  /* Line clamp to 2 rows */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Badges */
.hero-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  font-size: var(--font-size-100);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Badge colors matching GameCard */
.hero-badge--badge-onFire {
  background-color: rgba(255, 135, 66, 0.2);
  color: #ffbb7c;
  border: 1px solid rgba(255, 135, 66, 0.4);
}
.hero-badge--badge-hardcore {
  background-color: rgba(123, 97, 255, 0.2);
  color: #bfa8ff;
  border: 1px solid rgba(123, 97, 255, 0.4);
}
.hero-badge--badge-womenOnly {
  background-color: rgba(255, 105, 180, 0.2);
  color: #ffb6d9;
  border: 1px solid rgba(255, 105, 180, 0.4);
}

/* Stats Row */
.hero-stats-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-5);
  padding-block: var(--space-2);
  border-block: 1px solid rgba(255, 255, 255, 0.08);
}

.hero-stat {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: 1rem;
}

.hero-stat--creator {
  gap: var(--space-2);
}

.hero-stat--creator .hero-creator-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--bulma-primary);
  flex-shrink: 0;
}

.hero-stat--creator .hero-creator-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-stat--creator .hero-creator-details {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
  white-space: nowrap;
}

.hero-stat--creator .hero-creator-by {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  font-weight: 600;
}

.hero-stat--creator .hero-creator-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-primary);
  text-decoration: none;
}

.hero-stat--creator .hero-creator-name:hover {
  color: var(--bulma-primary);
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

/* Creator & Instructions Group */
.hero-info-group {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
}


.hero-instructions-header {
    margin-left: auto;
}

.hero-creator {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.hero-creator-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    overflow: hidden;
    border: 1.5px solid var(--bulma-primary);
    flex-shrink: 0;
}
.hero-creator-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.hero-creator-details {
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
    white-space: nowrap;
}
.hero-creator-by {
    font-size: 0.8rem;
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

.hero-instructions {
  flex: 1 1 auto;
}
.hero-instructions-content {
  background: var(--color-bg-secondary);
  border-radius: 12px;
  padding: var(--space-3) var(--space-4);
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
  position: relative;
}

.hero-instructions-text {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
}

.hero-instructions-text p {
  margin-bottom: var(--space-2);
}

.hero-instructions-text p.empty-line {
  margin-bottom: var(--space-1);
  min-height: 0.5em;
}

.markdown-content {
  white-space: pre-wrap;
  font-family: inherit;
  margin: 0;
  line-height: 1.6;
}

.hero-instructions-show-more {
  background: none;
  border: none;
  color: var(--bulma-primary);
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  padding: var(--space-1) 0;
  margin-top: var(--space-2);
  transition: all 0.2s ease;
  text-decoration: underline;
}

.hero-instructions-show-more:hover {
  color: #00e8e0;
  text-decoration: none;
}

.hero-instructions-label {
    color: var(--bulma-primary);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.8rem;
    white-space: nowrap;
}

/* Play Action - Centered Bottom */
.hero-play-action {
  margin-top: auto; /* Push to bottom */
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: var(--space-4);
  padding-top: var(--space-6);
  width: 100%; /* Make full width */
  z-index: 2;
}

:deep(.share-button-premium) {
  height: 64px;
  min-width: 64px;
  padding-inline: var(--space-4);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition: all 0.3s ease;
}

:deep(.share-button-premium:hover) {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--bulma-primary);
  color: var(--bulma-primary);
  transform: translateY(-4px);
}

:deep(.share-button-premium .icon) {
  margin: 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.2em;
  height: 1.2em;
}

.twitter-share-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.75rem 1.5rem;
  background: rgba(29, 161, 242, 0.1);
  border: 1px solid rgba(29, 161, 242, 0.3);
  color: #1da1f2;
  text-decoration: none;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(29, 161, 242, 0.2);
}

.twitter-share-button:hover {
  background: rgba(29, 161, 242, 0.2);
  border-color: #1da1f2;
  color: #1da1f2;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(29, 161, 242, 0.4);
}

:deep(.share-button-premium span) {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.9rem;
}

.play-button {
  flex-grow: 1; /* Take up remaining space */
}

.play-button :deep(.button) {
  width: 100%; /* Fill container */
  height: 64px;
  font-size: clamp(1.2rem, 2vw, 1.5rem);
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 900;
  background: linear-gradient(135deg, #00e8e0 0%, #00d1c9 100%);
  border: none;
  color: #000;
  box-shadow: 0 8px 25px rgba(0, 232, 224, 0.3);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  animation: pulse-glow 3s infinite;
}

@keyframes pulse-glow {
  0% { box-shadow: 0 0 0 0 rgba(0, 232, 224, 0.4); }
  70% { box-shadow: 0 0 0 15px rgba(0, 232, 224, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 232, 224, 0); }
}

.play-button :deep(.button:hover) {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 15px 35px rgba(0, 232, 224, 0.5);
    filter: brightness(1.1);
}

.header-icon {
    color: var(--bulma-primary);
    font-size: 0.8em;
}

@media (max-width: 60rem) {
  .game-hero-card {
    grid-template-columns: 1fr;
    gap: var(--space-5);
    padding: var(--space-1); /* Reduced padding for mobile */
    border-radius: 24px; /* Smaller border radius */
  }

  .hero-play-action {
    padding-top: var(--space-4);
    gap: var(--space-3);
  }

  :deep(.share-button-premium) {
    height: 60px;
    width: auto;
    min-width: 60px;
    border-radius: 16px;
    padding-inline: var(--space-3);
    gap: 6px;
  }

  :deep(.share-button-premium span) {
    font-size: 0.7rem;
    letter-spacing: 0.01em;
  }

  :deep(.share-button-premium .icon) {
    font-size: 0.9rem;
  }

  .play-button :deep(.button) {
    height: 60px;
    border-radius: 16px;
    font-size: 1.1rem;
    letter-spacing: 0.05em;
  }

  .hero-media-component :deep(.game-media-section__image-wrapper) {
      min-height: 250px;
  }

  .hero-header {
      margin-inline-end: 0;
      text-align: center;
  }

  .hero-badges {
      justify-content: center;
  }

  .hero-description {
    -webkit-line-clamp: 2;
    line-clamp: 3;

  }

  .close-button {
      top: -10px; /* Reduced from -15px */
      inset-inline-end: -10px; /* Position inside card bounds */
      background: var(--color-bg-secondary);
      width: 28px; /* Smaller size */
      height: 28px;
  }

  .hero-stats-row {
      flex-wrap: wrap;
      gap: var(--space-2);
      justify-content: center;
      padding-inline: 0; /* Remove horizontal padding that might cause overflow */
  }

  .hero-stat {
    font-size: 0.9rem; /* Smaller font size */
  }

  .hero-stat--creator .hero-creator-avatar {
      width: 20px;
      height: 20px;
  }

  .hero-stat--creator .hero-creator-by {
      font-size: 0.7rem;
  }

  .hero-stat--creator .hero-creator-name {
      font-size: 0.8rem;
  }

  .hero-info-group {
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-3);
  }


  .hero-creator {
    justify-content: center;
  }

  .hero-instructions-content {
      flex-direction: column;

  }

  .instructions-modal-overlay {
      padding: var(--space-2);
  }

  .instructions-modal {
      max-height: 90vh;
      border-radius: 16px;
  }

  .instructions-modal-close {
      top: var(--space-3);
      inset-inline-end: var(--space-3);
      width: 36px;
      height: 36px;
  }

  .instructions-modal-header {
      padding: var(--space-4) var(--space-4) var(--space-3);
  }

  .instructions-modal-title {
      font-size: 1.25rem;
  }

  .instructions-modal-content {
      padding: var(--space-4);
  }

  .instructions-modal-text {
      font-size: 0.95rem;
  }

  .game-hero-media {
    order: -1;
  }
}

/* Extra small mobile devices (Pixel 7 and similar) */
@media (max-width: 430px) {
  .game-info-page {
    padding-inline: var(--space-3); /* Reduce horizontal padding */
  }

  .game-hero-card {
    padding: var(--space-3); /* Further reduce padding */
    gap: var(--space-4);
    min-height: 480px; /* Slightly reduce min height */
  }

  .hero-stats-row {
    gap: var(--space-1); /* Tighter gap */
  }

  .hero-stat {
    gap: var(--space-1); /* Tighter gap between icon and text */
  }

  .hero-badges {
    gap: var(--space-1); /* Tighter gap between badges */
  }

  .hero-play-action {
    gap: var(--space-2); /* Tighter gap between buttons */
  }
}

/* Glass Surface for sections */
.surface {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  padding: var(--space-6);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.section-header {
  margin-bottom: var(--space-2);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 1.75rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

.section-subtitle {
  color: var(--color-text-muted);
  font-size: 1rem;
}

/* Instructions Modal */
.instructions-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.instructions-modal {
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.instructions-modal-close {
  position: absolute;
  top: var(--space-4);
  inset-inline-end: var(--space-4);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 1;
}

.instructions-modal-close:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: var(--bulma-primary);
  color: var(--bulma-primary);
}

.instructions-modal-header {
  padding: var(--space-6) var(--space-6) var(--space-4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.instructions-modal-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0;
}

.instructions-modal-title .icon {
  color: var(--bulma-primary);
}

.instructions-modal-content {
  padding: var(--space-6);
  overflow-y: auto;
  flex: 1;
}

.instructions-modal-text {
  color: var(--color-text-secondary);
  font-size: 1rem;
  line-height: 1.6;
}

.instructions-modal-actions {
  display: flex;
  justify-content: center;
  padding-top: var(--space-4);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: var(--space-4);
}

.instructions-modal-text .markdown-content {
  white-space: pre-wrap;
  font-family: inherit;
  margin: 0;
  line-height: 1.6;
}

.modal-text-content {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: rgba(0, 0, 0, 0.1);
  padding: var(--space-4);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin: 0;
  color: var(--color-text-primary);
}

.instructions-modal-text h1,
.instructions-modal-text h2,
.instructions-modal-text h3,
.instructions-modal-text h4,
.instructions-modal-text h5,
.instructions-modal-text h6 {
  color: var(--color-text-primary);
  margin-top: var(--space-4);
  margin-bottom: var(--space-2);
}

.instructions-modal-text p {
  margin-bottom: var(--space-3);
}

.instructions-modal-text p.empty-line {
  margin-bottom: var(--space-2);
  min-height: 1em;
}

.instructions-modal-text strong,
.instructions-modal-text b {
  font-weight: 700;
  color: var(--color-text-primary);
}

.instructions-modal-text ul,
.instructions-modal-text ol {
  margin-bottom: var(--space-3);
  padding-left: var(--space-4);
}

.instructions-modal-text li {
  margin-bottom: var(--space-1);
}
</style>
