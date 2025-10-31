<!-- Updated GameInfo.vue -->
<template>
  <div class="game-info-container">
    <!-- Section 1: Game Info -->
    <section class="game-info-section">
      <div class="game-hero">
        <div class="game-image-wrapper">
          <img :src="game.image" :alt="`${game.name} image`" class="game-image" />
        </div>
        <div class="game-details">
          <p class="game-pill">Top Pick</p>
          <h1 class="game-title">{{ game.name }}</h1>
          <p class="game-description">{{ game.description }}</p>
          <div class="game-meta-grid">
            <div class="meta-card">
              <h3>Game Type</h3>
              <p>{{ game.gameTypeId || 'Coming Soon' }}</p>
            </div>
            <div class="meta-card" v-if="game.gameHeader">
              <h3>Header</h3>
              <p>{{ game.gameHeader }}</p>
            </div>
            <div class="meta-card" v-if="game.gameInstruction">
              <h3>How to play</h3>
              <p>{{ game.gameInstruction }}</p>
            </div>
          </div>
          <div v-if="hasCounters" class="game-stats">
            <div
              v-for="counter in counterList"
              :key="counter.key"
              class="stat-pill"
            >
              <span class="stat-value">{{ formatCounter(counter.value) }}</span>
              <span class="stat-label">{{ counter.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2: Action Buttons -->
    <section class="action-buttons-section">
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
        {{ isFavorite ? 'Remove Favorite' : 'Add to Favorites' }}
      </button>
      <button class="ghost-button" type="button" @click="backToGames">
        Back to Games
      </button>
    </section>

    <!-- Section 3: Leaderboard -->
    <section class="leaderboard-section">
      <div class="section-heading">
        <h2 class="section-title">Leaderboard</h2>
        <p class="section-subtitle">See who is dominating this challenge.</p>
      </div>
      <div class="section-surface">
        <Leaderboard :game-id="gameId" />
      </div>
    </section>

    <!-- Section 4: Daily Challenges -->
    <section v-if="game.dailyChallengeActive" class="daily-challenges-section">
      <div class="section-heading">
        <h2 class="section-title">Daily Challenges</h2>
        <p class="section-subtitle">A fresh leaderboard every 24 hours.</p>
      </div>
      <div class="section-surface">
        <!-- Assuming DailyChallenges component can accept gameId prop; adjust if needed -->
        <DailyChallenges :gameId="gameId" />
      </div>
    </section>

    <!-- Section 5: Build Your Own Game -->
    <section class="build-section">
      <div class="section-surface build-card">
        <div class="build-copy">
          <h3>Build your own game</h3>
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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import Leaderboard from '@/components/Leaderboard.vue';
import DailyChallenges from '@/views/DailyChallenges.vue';
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
const counterList = computed(() => {
  const counters = stats.value;
  return [
    { key: 'players', label: 'Players', value: counters.totalPlayers },
    { key: 'favorites', label: 'Favorites', value: counters.favorites },
    { key: 'sessions', label: 'Sessions', value: counters.sessionsPlayed },
    { key: 'submissions', label: 'Submissions', value: counters.uniqueSubmitters },
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
    const gameDocRef = doc(db, 'games', gameId.value);
    const statsDocRef = doc(db, 'games', gameId.value, 'stats', 'general');
    const [gameDoc, statsDoc] = await Promise.all([
      getDoc(gameDocRef),
      getDoc(statsDocRef),
    ]);

    if (statsDoc.exists()) {
      stats.value = statsDoc.data() as Partial<GameStats>;
    } else {
      stats.value = {};
    }

    if (gameDoc.exists()) {
      const data = gameDoc.data();
      game.value = {
        id: gameDoc.id,
        name: data.name || 'Unnamed Game',
        description: data.description || 'No description available',
        gameTypeId: data.gameTypeId || '',
        gameHeader: data.gameHeader,
        gameInstruction: data.gameInstruction,
        image: data.image || fallbackImg,
        active: data.active ?? true,
        language: data.language || 'en',
        shareLink: data.shareLink,
        dailyChallengeActive: data.dailyChallengeActive,
        // Add other fields as needed
      } as Game;
      console.log('GameInfo: Game data fetched:', game.value);

      if (analytics) {
        logEvent(analytics, 'page_view', { page_name: 'game_info', game_id: gameId.value });
      }
    } else {
      console.error('GameInfo: Game document not found for ID:', gameId.value);
      router.push('/');
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
.game-info-container {
  min-height: 100vh;
  padding: 4rem clamp(1rem, 4vw, 1.5rem) 5rem;
  background: #000;
  color: var(--bulma-text);
  display: flex;
  flex-direction: column;
  gap: 3.5rem;
  width: 100%;
  max-width: var(--container-xl);
  margin-inline: auto;
  box-sizing: border-box;
}

.game-info-section {
  width: 100%;
  display: flex;
  justify-content: center;
}

.game-hero {
  display: grid;
  width: min(1200px, 100%);
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 2.5rem;
  align-items: center;
}

.game-image-wrapper {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(0, 232, 224, 0.22);
  background: radial-gradient(circle at 30% 20%, rgba(0, 232, 224, 0.35), rgba(0, 0, 0, 0.85));
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.6);
}

.game-image {
  width: 100%;
  display: block;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.game-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.game-pill {
  align-self: flex-start;
  padding: 0.35rem 1.1rem;
  border-radius: 999px;
  background: rgba(0, 232, 224, 0.16);
  color: var(--bulma-primary);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.game-title {
  font-size: clamp(2.2rem, 2vw + 1.5rem, 3.2rem);
  font-weight: 700;
  margin: 0;
}

.game-description {
  margin: 0;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
}

.game-meta-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.game-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.5rem;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(0, 232, 224, 0.25);
  background: rgba(255, 255, 255, 0.05);
  min-width: 120px;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
}

.stat-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
}

.meta-card {
  background: rgba(0, 232, 224, 0.05);
  border: 1px solid rgba(0, 232, 224, 0.18);
  border-radius: 18px;
  padding: 1.2rem 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 140px;
}

.meta-card h3 {
  margin: 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.6);
}

.meta-card p {
  margin: 0;
  font-size: 1rem;
  color: #ffffff;
  line-height: 1.5;
}

.action-buttons-section {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

.ghost-button {
  background: transparent;
  border: 1px solid rgba(0, 232, 224, 0.25);
  color: var(--bulma-text);
  padding: 0.9rem 1.8rem;
  border-radius: 999px;
  font-weight: 600;
  letter-spacing: 0.04em;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.ghost-button:hover {
  background: rgba(0, 232, 224, 0.12);
  border-color: rgba(0, 232, 224, 0.45);
}

.ghost-button.is-active {
  background: rgba(0, 232, 224, 0.18);
  border-color: rgba(0, 232, 224, 0.6);
  color: #ffffff;
}

.section-heading {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  text-align: center;
  margin-bottom: 1.5rem;
}

.section-title {
  margin: 0;
  font-size: clamp(1.8rem, 1vw + 1.2rem, 2.4rem);
}

.section-subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
}

.section-surface {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 24px;
  border: 1px solid rgba(0, 232, 224, 0.12);
  padding: 2rem clamp(1rem, 4vw, 1.5rem);
  backdrop-filter: blur(12px);
}

.build-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.build-card {
  width: min(960px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: flex-start;
}

.build-copy h3 {
  margin: 0;
  font-size: 1.4rem;
}

.build-copy p {
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
}

.build-hint {
  margin: 0;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (max-width: 768px) {
  .game-info-container {
    padding: 3rem clamp(0.75rem, 4vw, 1.25rem) 4rem;
    gap: 3rem;
  }

  .game-hero {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .game-details {
    align-items: center;
    text-align: center;
  }

  .game-pill {
    align-self: center;
  }

  .section-surface {
    padding: 1.5rem clamp(0.75rem, 4vw, 1.15rem);
  }

  .build-card {
    align-items: stretch;
  }
}

@media (max-width: 480px) {
  .game-info-container {
    padding: 2.5rem 0.75rem 3.5rem;
  }

  .action-buttons-section {
    width: 100%;
    flex-direction: column;
  }

  .action-buttons-section > * {
    width: 100%;
  }

  .section-surface {
    padding: 1.25rem clamp(0.65rem, 4vw, 0.9rem);
  }

  .meta-card {
    min-height: auto;
  }
}
</style>
