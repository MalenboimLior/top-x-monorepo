<!-- Table display for leaderboard entries -->
<template>
  <div class="leaderboard-container">
    <h2 class="title is-3 has-text-white animate-item" style="--animation-delay: 0s;">{{ title }}</h2>
    <div class="card animate-item" style="--animation-delay: 0.2s;">
      <div class="card-content">
        <div v-if="!entries.length" class="empty-state has-text-white">
          <p>No leaderboard entries yet. Play to climb the ranks!</p>
        </div>
        <table v-else class="table is-striped is-fullwidth">
          <thead>
            <tr>
              <th class="has-text-white">Rank</th>
              <th class="has-text-white">Player</th>
              <th class="has-text-white">Score</th>
              <th class="has-text-white">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(entry, index) in entries"
              :key="entry.uid"
              :class="{ 'is-current-user': entry.uid === currentUserId }"
              class="animate-item"
              :style="{ '--animation-delay': `${0.4 + index * 0.1}s` }"
            >
              <td>{{ index + 1 }}</td>
              <td>
                <div class="media">
                  <div class="media-left">
                    <figure class="image is-32x32">
                      <img :src="entry.photoURL" alt="Profile" class="is-rounded avatar" />
                    </figure>
                  </div>
                  <div class="media-content">
                    <p class="is-size-6 has-text-weight-bold">{{ entry.username }}</p>
                  </div>
                </div>
              </td>
              <td>{{ entry.score }}</td>
              <td>
                <CustomButton
                  v-if="entry.uid !== currentUserId && !rivals.includes(entry.uid)"
                  type="is-link is-small"
                  label="Add Rival"
                  :icon="['fas', 'user-plus']"
                  @click="$emit('add-rival', entry.uid)"
                  class="animate-item"
                  :style="{ '--animation-delay': `${0.4 + index * 0.1}s` }"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CustomButton from '@top-x/shared/components/CustomButton.vue';

interface LeaderboardEntry {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  score: number;
}

defineProps<{
  title: string;
  entries: LeaderboardEntry[];
  rivals: string[];
  currentUserId?: string;
}>();
</script>

<style scoped>
@import '../styles/Leaderboard.css';
</style>