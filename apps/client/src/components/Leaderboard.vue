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
              <th class="has-text-white">Streak</th>
              <th class="has-text-white">Attempts</th>
              <th class="has-text-white">Recorded</th>
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
              <td>{{ entry.streak }}</td>
              <td>{{ getAttemptCount(entry) }}</td>
              <td class="timestamp-cell">
                <span v-if="getRecordedLabel(entry)" class="timestamp">
                  {{ getRecordedLabel(entry) }}
                </span>
                <div v-if="getSliceBadges(entry).length" class="time-badges">
                  <span v-for="badge in getSliceBadges(entry)" :key="badge.key" class="time-badge">
                    {{ badge.label }}
                  </span>
                </div>
              </td>
              <td v-if="showActions">
                <CustomButton
                  v-if="entry.uid !== currentUserId && !frenemiesSet.has(entry.uid)"
                  type="is-link is-small"
                  label="Follow"
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
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { LeaderboardDateIndexes, LeaderboardEntry } from '@top-x/shared/types/game';
import { getTopLeaderboard } from '@/services/leaderboard';

type SliceBadgeKey = keyof LeaderboardDateIndexes;
type SliceBadge = { key: SliceBadgeKey; label: string };

const sliceBadgeDefinitions: ReadonlyArray<{ key: SliceBadgeKey; label: string }> = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'allTime', label: 'All-time' },
];

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const relativeTimeFormatter = typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat !== 'undefined'
  ? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  : null;

const formatRelativeTimestamp = (timestamp: number): string | null => {
  if (!relativeTimeFormatter) {
    return null;
  }
  const now = Date.now();
  const diff = timestamp - now;
  const absDiff = Math.abs(diff);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (absDiff < minute) {
    const seconds = Math.round(diff / 1000);
    return relativeTimeFormatter.format(seconds, 'second');
  }
  if (absDiff < hour) {
    const minutes = Math.round(diff / minute);
    return relativeTimeFormatter.format(minutes, 'minute');
  }
  if (absDiff < day) {
    const hours = Math.round(diff / hour);
    return relativeTimeFormatter.format(hours, 'hour');
  }
  if (absDiff < week) {
    const days = Math.round(diff / day);
    return relativeTimeFormatter.format(days, 'day');
  }
  if (absDiff < month) {
    const weeks = Math.round(diff / week);
    return relativeTimeFormatter.format(weeks, 'week');
  }
  if (absDiff < year) {
    const months = Math.round(diff / month);
    return relativeTimeFormatter.format(months, 'month');
  }
  const years = Math.round(diff / year);
  return relativeTimeFormatter.format(years, 'year');
};

const getRecordedLabel = (entry: LeaderboardEntry): string | null => {
  const timestamp = typeof entry.date?.recordedAt === 'number'
    ? entry.date.recordedAt
    : entry.updatedAt;
  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
    return null;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const relative = formatRelativeTimestamp(timestamp);
  const absolute = dateTimeFormatter.format(date);
  return relative ? `${relative} • ${absolute}` : absolute;
};

const getSliceBadges = (entry: LeaderboardEntry): SliceBadge[] => {
  const indexes = entry.date?.indexes;
  if (!indexes) {
    return [];
  }
  return sliceBadgeDefinitions.reduce<SliceBadge[]>((badges, definition) => {
    const value = indexes[definition.key];
    if (typeof value === 'string' && value.trim().length > 0) {
      badges.push({ key: definition.key, label: `${definition.label}: ${value}` });
    }
    return badges;
  }, []);
};

const getAttemptCount = (entry: LeaderboardEntry): number => {
  const custom = entry.custom ?? {};
  const triviaData = custom?.trivia as { attemptCount?: number; attempts?: unknown[] } | undefined;

  if (triviaData) {
    if (typeof triviaData.attemptCount === 'number') {
      return triviaData.attemptCount;
    }
    if (Array.isArray(triviaData.attempts)) {
      return triviaData.attempts.length;
    }
  }

  if (typeof custom?.attemptCount === 'number') {
    return custom.attemptCount;
  }

  if (Array.isArray(custom?.attempts)) {
    return custom.attempts.length;
  }

  return 0;
};

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
    const result = await getTopLeaderboard(props.gameId, {
      limit: props.limit,
      dailyChallengeId: props.dailyChallengeId,
    });
    
    if (result.error) {
      error.value = result.error;
      leaderboard.value = [];
    } else {
      leaderboard.value = result.items;
    }
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

.timestamp-cell {
  min-width: 12rem;
}

.timestamp {
  display: block;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.85);
}

.time-badges {
  margin-top: 0.3rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.time-badge {
  background-color: rgba(102, 255, 246, 0.15);
  border: 1px solid rgba(102, 255, 246, 0.4);
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: 0.65rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #66fff6;
}
</style>
