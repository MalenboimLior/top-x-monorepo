<template>
  <section class="section">
    <div class="container">
      <h1 class="title">Games</h1>
      <p class="subtitle">Track live games, monitor engagement, and launch new experiences.</p>

      <div v-if="!sortedGames.length" class="box has-text-centered has-text-grey">
        No games found yet. Once games are published you'll see live counters here.
      </div>

      <div v-else class="table-container">
        <table class="table is-fullwidth is-striped is-hoverable">
          <thead>
            <tr>
              <th scope="col">Game</th>
              <th scope="col" class="has-text-right">Players</th>
              <th scope="col" class="has-text-right">Favorites</th>
              <th scope="col" class="has-text-right">Sessions</th>
              <th scope="col" class="has-text-right">Submissions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="game in sortedGames" :key="game.id">
              <td>
                <div class="game-info">
                  <strong>{{ game.name }}</strong>
                  <span class="game-meta">{{ game.gameTypeId || 'Unassigned' }}</span>
                </div>
              </td>
              <td class="has-text-right">{{ formatCounter(game.counters?.totalPlayers) }}</td>
              <td class="has-text-right">{{ formatCounter(game.counters?.favorites) }}</td>
              <td class="has-text-right">{{ formatCounter(game.counters?.sessionsPlayed) }}</td>
              <td class="has-text-right">{{ formatCounter(game.counters?.uniqueSubmitters) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@top-x/shared';
import type { Game } from '@top-x/shared/types/game';
import { formatNumber } from '@top-x/shared/utils/format';

const games = ref<Game[]>([]);
const unsubscribe = ref<(() => void) | null>(null);

const formatCounter = (value?: number) => formatNumber(value ?? 0);

onMounted(() => {
  const gamesQuery = query(collection(db, 'games'));
  unsubscribe.value = onSnapshot(gamesQuery, (snapshot) => {
    games.value = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Unnamed Game',
        description: data.description || '',
        gameTypeId: data.gameTypeId || '',
        active: data.active ?? false,
        image: data.image || '',
        vip: data.vip || [],
        custom: data.custom || {},
        language: data.language || 'en',
        counters: data.counters || {},
        community: data.community ?? false,
        shareLink: data.shareLink,
        dailyChallengeActive: data.dailyChallengeActive,
      } as Game;
    });
  });
});

onBeforeUnmount(() => {
  if (unsubscribe.value) {
    unsubscribe.value();
    unsubscribe.value = null;
  }
});

const sortedGames = computed(() =>
  [...games.value].sort(
    (a, b) => (b.counters?.totalPlayers || 0) - (a.counters?.totalPlayers || 0),
  ),
);
</script>

<style scoped>
.table-container {
  margin-top: 2rem;
}

.game-info {
  display: flex;
  flex-direction: column;
}

.game-meta {
  font-size: 0.75rem;
  color: #7a7a7a;
}
</style>
