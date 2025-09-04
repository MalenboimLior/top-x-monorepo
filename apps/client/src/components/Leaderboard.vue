<!-- New Leaderboard.vue in src/components/Leaderboard.vue -->
<template>
  <div class="leaderboard-section">
    <h3>Top Players</h3>
    <table v-if="leaderboard.length" class="table is-fullwidth is-striped">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(entry, index) in leaderboard" :key="entry.uid">
          <td>{{ index + 1 }}</td>
          <td>
            <figure class="image is-32x32 is-inline-block">
              <img :src="entry.photoURL" alt="Profile" class="is-rounded" />
            </figure>
            @{{ entry.username }}
          </td>
          <td>{{ entry.score }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>No leaderboard data available yet.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { LeaderboardEntry } from '@top-x/shared/types/game';

const props = defineProps<{
  gameId: string;
  limit?: number;
}>();

const leaderboard = ref<LeaderboardEntry[]>([]);

onMounted(async () => {
  try {
    const response = await axios.get(`https://us-central1-top-x-co.cloudfunctions.net/getTopLeaderboard?gameId=${props.gameId}&limit=${props.limit || 10}`);
    leaderboard.value = response.data;
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
  }
});
</script>

<style scoped>
.leaderboard-section {
  margin-top: 20px;
  text-align: left;
}

.image.is-32x32 {
  vertical-align: middle;
  margin-right: 8px;
}

.table {
  background-color: #333;
  color: white;
}

.table th {
  color: #ddd;
}
</style>