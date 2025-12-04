<!-- Minimal leaderboard preview for start screens (fetches only top 5) -->
<template>
  <div class="leaderboard-preview">
    <div v-if="isLoading" class="preview-loading">
      <span class="loader-small"></span>
    </div>
    <div v-else-if="error" class="preview-error">
      <span>{{ error }}</span>
    </div>
    <div v-else-if="!entries.length" class="preview-empty">
      <span>No players yet</span>
    </div>
    <div v-else class="preview-list">
      <div
        v-for="(entry, index) in entries"
        :key="entry.uid"
        class="preview-entry"
        :class="{ 'is-current-user': entry.uid === currentUserId }"
      >
        <span class="preview-rank" :class="getRankClass(index + 1)">
          {{ getRankDisplay(index + 1) }}
        </span>
        <img
          :src="entry.photoURL || '/assets/profile.png'"
          :alt="entry.displayName"
          class="preview-avatar"
          loading="lazy"
        />
        <span class="preview-name">{{ getDisplayName(entry) }}</span>
        <span class="preview-score">{{ entry.score }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { LeaderboardEntry } from '@top-x/shared/types/game';
import { getTopLeaderboard } from '@/services/leaderboard';

interface Props {
  gameId: string;
  limit?: number;
  currentUserId?: string;
  dailyChallengeId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  limit: 5,
  currentUserId: undefined,
  dailyChallengeId: undefined,
});

const entries = ref<LeaderboardEntry[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

const fetchPreview = async () => {
  if (!props.gameId) {
    entries.value = [];
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
      entries.value = [];
    } else {
      entries.value = result.items;
    }
  } catch (e: any) {
    error.value = 'Failed to load';
    entries.value = [];
  } finally {
    isLoading.value = false;
  }
};

const getRankClass = (rank: number) => {
  if (rank === 1) return 'rank-gold';
  if (rank === 2) return 'rank-silver';
  if (rank === 3) return 'rank-bronze';
  return '';
};

const getRankDisplay = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank.toString();
};

const getDisplayName = (entry: LeaderboardEntry) => {
  const name = entry.displayName || entry.username || 'Anonymous';
  return name.length > 12 ? name.slice(0, 12) + '...' : name;
};

onMounted(fetchPreview);

watch(() => props.gameId, fetchPreview);
</script>

<style scoped>
.leaderboard-preview {
  width: 100%;
}

.preview-loading,
.preview-error,
.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: var(--color-text-tertiary);
  font-size: 0.85rem;
}

.loader-small {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-entry {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  transition: background 0.2s ease;
}

.preview-entry:hover {
  background: rgba(255, 255, 255, 0.06);
}

.preview-entry.is-current-user {
  background: rgba(var(--color-primary-rgb, 140, 82, 255), 0.15);
}

.preview-rank {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.preview-rank.rank-gold {
  background: linear-gradient(135deg, #ffd700, #ffb800);
  color: #1a1a2e;
}

.preview-rank.rank-silver {
  background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
  color: #1a1a2e;
}

.preview-rank.rank-bronze {
  background: linear-gradient(135deg, #cd7f32, #b06a28);
  color: #1a1a2e;
}

.preview-avatar {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-name {
  flex: 1;
  min-width: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-score {
  flex-shrink: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-primary, #8c52ff);
}
</style>

