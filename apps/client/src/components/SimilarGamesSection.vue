<template>
  <GameSection
    v-if="similarGames.length"
    :title="t('gameInfo.similarGames')"
    :subtitle="t('gameInfo.similarGamesSubtitle')"
    :games="similarGames"
    :game-stats="gameStats"
    :items-per-row="3"
    :initial-rows="2"
    :show-more-label="t('home.showMore')"
    @play="handlePlay"
    class="similar-games-section"
  >
    <template #default="{ game, stats }">
      <GameCard
        :game="game"
        :stats="stats"
        :play-label="t('home.playNow')"
        button-type="is-primary"
        @play="handlePlay"
      />
    </template>
  </GameSection>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Game, GameStats } from '@top-x/shared/types';
import GameCard from '@/components/GameCard.vue';
import GameSection from '@/components/home/GameSection.vue';
import { getGames, getGameStats, type GamesResult } from '@/services/game';
import { useLocaleStore } from '@/stores/locale';
import { useRouter } from 'vue-router';

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
    default: 20, 
  },
});

const localeStore = useLocaleStore();
const router = useRouter();
const t = (key: string) => localeStore.translate(key);

const similarGames = ref<Game[]>([]);
const gameStats = ref<Record<string, Partial<GameStats>>>({});

// Load game stats for a specific game
async function loadGameStats(gameId: string) {
  if (gameStats.value[gameId]) {
    return; // Already loaded
  }

  try {
    const result = await getGameStats(gameId);
    if (result.stats) {
      gameStats.value[gameId] = result.stats;
    }
  } catch (error) {
    console.error(`Error fetching stats for game ${gameId}:`, error);
  }
}

// Load game stats for multiple games
async function loadGameStatsForGames(gameIds: string[]) {
  const promises = gameIds.map(gameId => loadGameStats(gameId));
  await Promise.all(promises);
}

const fetchSimilarGames = async () => {
  if (!props.gameTypeId) {
    similarGames.value = [];
    return;
  }

  try {
    const result: GamesResult = await getGames({ activeOnly: true });
    // Fetch MORE than just the initial limit so "Show More" has something to show.
    // We'll fetch all and let GameSection handle the display limit.
    const filtered = result.games
      .filter((game) => game.id !== props.currentGameId && game.gameTypeId === props.gameTypeId);

    // Sort by sessions played (descending) can be enhanced if needed
    similarGames.value = filtered;

    // Load stats for all similar games
    const gameIds = filtered.map(game => game.id);
    await loadGameStatsForGames(gameIds);
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
</script>

<style scoped>
/* No specific styles needed, GameSection handles layout */
</style>
