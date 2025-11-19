<template>
  <section v-if="similarGames.length" class="similar-games-section">
    <div class="section-heading">
      <h2 class="section-title">
        <font-awesome-icon :icon="['fas', 'gamepad']" />
        Similar Games
      </h2>
      <p class="section-subtitle">More games like this one</p>
    </div>
    <div class="similar-games-section__grid game-grid game-grid--quad">
      <GameCard
        v-for="game in similarGames"
        :key="game.id"
        :game="game"
        :stats="gameStats[game.id]"
        :play-label="t('home.playNow')"
        button-type="is-primary"
        @play="handlePlay"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import type { PropType } from 'vue';
import type { Game, GameStats } from '@top-x/shared/types';
import GameCard from '@/components/GameCard.vue';
import { getGames, subscribeToGameStats, type GamesResult } from '@/services/game';
import { useLocaleStore } from '@/stores/locale';
import { useRouter } from 'vue-router';
import type { Unsubscribe } from 'firebase/firestore';

const props = defineProps({
  gameTypeId: {
    type: String,
    required: true,
  },
  currentGameId: {
    type: String,
    required: true,
  },
  limit: {
    type: Number,
    default: 6,
  },
});

const localeStore = useLocaleStore();
const router = useRouter();
const t = (key: string) => localeStore.translate(key);

const similarGames = ref<Game[]>([]);
const gameStats = ref<Record<string, Partial<GameStats>>>({});
const statsUnsubscribers = ref<Map<string, Unsubscribe>>(new Map());

const fetchSimilarGames = async () => {
  if (!props.gameTypeId) {
    similarGames.value = [];
    return;
  }

  try {
    const result: GamesResult = await getGames({ activeOnly: true });
    const filtered = result.games
      .filter((game) => game.id !== props.currentGameId && game.gameTypeId === props.gameTypeId)
      .slice(0, props.limit);

    // Sort by sessions played (descending)
    const sorted = filtered.sort((a, b) => {
      const aSessions = gameStats.value[a.id]?.sessionsPlayed ?? 0;
      const bSessions = gameStats.value[b.id]?.sessionsPlayed ?? 0;
      return bSessions - aSessions;
    });

    similarGames.value = sorted;

    // Subscribe to stats for each game
    for (const game of sorted) {
      if (!statsUnsubscribers.value.has(game.id)) {
        const unsubscribe = subscribeToGameStats(game.id, (stats) => {
          gameStats.value[game.id] = stats || {};
          // Re-sort when stats update
          const reSorted = [...similarGames.value].sort((a, b) => {
            const aSessions = gameStats.value[a.id]?.sessionsPlayed ?? 0;
            const bSessions = gameStats.value[b.id]?.sessionsPlayed ?? 0;
            return bSessions - aSessions;
          });
          similarGames.value = reSorted;
        });
        statsUnsubscribers.value.set(game.id, unsubscribe);
      }
    }
  } catch (error) {
    console.error('Error fetching similar games:', error);
    similarGames.value = [];
  }
};

const handlePlay = (gameId: string, gameTypeId: string) => {
  router.push(`/games/${gameTypeId}?game=${gameId}`);
};

onMounted(() => {
  void fetchSimilarGames();
});

onBeforeUnmount(() => {
  for (const unsubscribe of statsUnsubscribers.value.values()) {
    unsubscribe();
  }
  statsUnsubscribers.value.clear();
});
</script>

<style scoped>
@import '../styles/components/Home.css';

.similar-games-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
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
  color: rgba(255, 255, 255, 0.6);
}

/* Grid styles are inherited from .game-grid and .game-grid--quad in Home.css */

@media (max-width: 37.5rem) {
  .similar-games-section__grid {
    grid-template-columns: 1fr;
  }
}
</style>

