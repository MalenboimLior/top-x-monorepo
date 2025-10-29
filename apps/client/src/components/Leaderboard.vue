<!-- Animated leaderboard with the updated TOP-X visual design -->
<template>
  <div class="leaderboard-container">
    <h2 class="title is-3 has-text-white animate-item" style="--animation-delay: 0s;">{{ title }}</h2>
    <div class="card animate-item" style="--animation-delay: 0.2s;">
      <div class="card-content">
        <p class="board-label">{{ boardLabel }}</p>
        <div v-if="isLoading" class="loading-state has-text-white">
          <span class="loader" aria-hidden="true"></span>
          <p>Loading leaderboard...</p>
        </div>
        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
        </div>
        <div v-else-if="!leaderboard.length" class="empty-state has-text-white">
          <p>No leaderboard entries yet. Play to climb the ranks!</p>
        </div>
        <table v-else class="table is-striped is-fullwidth">
          <thead>
            <tr>
              <th class="has-text-white">Rank</th>
              <th class="has-text-white">Player</th>
              <th class="has-text-white">Score</th>
              <th class="has-text-white" v-if="showActions">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(entry, index) in leaderboard"
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
                    <p class="is-size-6 has-text-weight-bold">@{{ entry.username }}</p>
                  </div>
                </div>
              </td>
              <td>{{ entry.score }}</td>
              <td v-if="showActions">
                <CustomButton
                  v-if="entry.uid !== currentUserId && !frenemiesSet.has(entry.uid)"
                  type="is-link is-small"
                  label="Add Frenemy"
                  :icon="['fas', 'user-plus']"
                  @click="handleAddFrenemy(entry.uid)"
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
import { computed, onMounted, ref, watch } from 'vue';
import axios from 'axios';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { LeaderboardEntry } from '@top-x/shared/types/game';

interface Props {
  gameId: string;
  limit?: number;
  title?: string;
  frenemies?: string[];
  currentUserId?: string;
  dailyChallengeId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  limit: 10,
  title: 'Top Players',
  frenemies: () => [],
  currentUserId: undefined,
});

const emit = defineEmits<{
  (e: 'add-frenemy', uid: string): void;
}>();

const leaderboard = ref<LeaderboardEntry[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

const frenemiesSet = computed(() => new Set(props.frenemies));
const showActions = computed(() => props.currentUserId !== undefined);

const boardLabel = computed(() =>
  props.dailyChallengeId ? 'Daily challenge leaderboard' : 'Lifetime leaderboard'
);

const fetchLeaderboard = async () => {
  if (!props.gameId) {
    leaderboard.value = [];
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const url = `https://us-central1-top-x-co.cloudfunctions.net/getTopLeaderboard`;
    const params: Record<string, unknown> = {
      gameId: props.gameId,
      limit: props.limit,
    };
    if (props.dailyChallengeId) {
      params.dailyChallengeId = props.dailyChallengeId;
    }
    const response = await axios.get(url, {
      params,
    });
    leaderboard.value = response.data;
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
    error.value = 'Unable to load the leaderboard right now. Please try again later.';
    leaderboard.value = [];
  } finally {
    isLoading.value = false;
  }
};

const handleAddFrenemy = (uid: string) => {
  emit('add-frenemy', uid);
};

onMounted(fetchLeaderboard);

watch(
  () => [props.gameId, props.limit, props.dailyChallengeId],
  () => {
    fetchLeaderboard();
  }
);
</script>

<style scoped>
@import '../styles/Leaderboard.css';

.loading-state,
.error-state {
  text-align: center;
  padding: 2rem 0;
}

.error-state {
  color: #ff6b6b;
}

.board-label {
  margin: 0 0 1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.loader {
  display: inline-block;
  width: 1.5rem;
  height: 1.5rem;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #66fff6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 0.75rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
