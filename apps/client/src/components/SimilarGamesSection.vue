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
import { onMounted, onBeforeUnmount, ref } from 'vue';
import type { Game, GameStats } from '@top-x/shared/types';
import GameCard from '@/components/GameCard.vue';
import GameSection from '@/components/home/GameSection.vue';
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
    default: 20, 
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
    // Fetch MORE than just the initial limit so "Show More" has something to show.
    // We'll fetch all and let GameSection handle the display limit.
    const filtered = result.games
      .filter((game) => game.id !== props.currentGameId && game.gameTypeId === props.gameTypeId);

    // Sort by sessions played (descending) can be enhanced if needed
    similarGames.value = filtered;

    // Subscribe to stats for each game 
    for (const game of filtered) {
      if (!statsUnsubscribers.value.has(game.id)) {
        const unsubscribe = subscribeToGameStats(game.id, (stats) => {
          gameStats.value[game.id] = stats || {};
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
/* No specific styles needed, GameSection handles layout */
</style>
