<!-- Single leaderboard entry row -->
<template>
  <div class="entry-row">
    <div class="entry-rank" :class="rankClass">
      <span v-if="rank <= 3" class="rank-medal">{{ rankMedal }}</span>
      <span v-else class="rank-number">{{ rank }}</span>
    </div>
    
    <div class="entry-player">
      <div class="player-avatar">
        <img
          :src="entry.photoURL || '/assets/profile.png'"
          :alt="entry.displayName"
          class="avatar-img"
          loading="lazy"
        />
      </div>
      <div class="player-info">
        <span class="player-name">{{ displayName }}</span>
        <span v-if="entry.username" class="player-username">@{{ username }}</span>
      </div>
    </div>

    <div class="entry-stats">
      <div class="stat score-stat">
        <span class="stat-value">{{ entry.score }}</span>
        <span class="stat-label">Score</span>
      </div>
      <div v-if="entry.streak" class="stat streak-stat">
        <span class="stat-value">{{ entry.streak }}</span>
        <span class="stat-label">Streak</span>
      </div>
    </div>

    <div v-if="showActions" class="entry-actions">
      <button
        v-if="!isCurrentUser && !isFrenemy"
        class="follow-button"
        @click="handleAddFrenemy"
        title="Follow this player"
      >
        <font-awesome-icon :icon="['fas', 'user-plus']" />
      </button>
      <span v-else-if="isFrenemy" class="following-badge">
        <font-awesome-icon :icon="['fas', 'check']" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LeaderboardEntry as LeaderboardEntryType } from '@top-x/shared/types/game';

interface Props {
  entry: LeaderboardEntryType;
  rank: number;
  isCurrentUser: boolean;
  showActions: boolean;
  isFrenemy: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'add-frenemy', uid: string): void;
}>();

const displayName = computed(() => {
  return props.entry.displayName || 'Anonymous';
});

const username = computed(() => {
  return props.entry.username?.replace(/^@+/, '') || '';
});

const rankClass = computed(() => {
  if (props.rank === 1) return 'rank-gold';
  if (props.rank === 2) return 'rank-silver';
  if (props.rank === 3) return 'rank-bronze';
  return '';
});

const rankMedal = computed(() => {
  if (props.rank === 1) return '🥇';
  if (props.rank === 2) return '🥈';
  if (props.rank === 3) return '🥉';
  return props.rank.toString();
});

const handleAddFrenemy = () => {
  emit('add-frenemy', props.entry.uid);
};
</script>

<style scoped>
.entry-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  transition: background 0.2s ease;
}

.entry-row:hover {
  background: rgba(255, 255, 255, 0.06);
}

/* Rank */
.entry-rank {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.rank-medal {
  font-size: 1.25rem;
}

.rank-number {
  font-size: 0.9rem;
}

.rank-gold {
  background: linear-gradient(135deg, #ffd700 0%, #ffb800 100%);
  color: #1a1a2e;
}

.rank-silver {
  background: linear-gradient(135deg, #c0c0c0 0%, #a8a8a8 100%);
  color: #1a1a2e;
}

.rank-bronze {
  background: linear-gradient(135deg, #cd7f32 0%, #b06a28 100%);
  color: #1a1a2e;
}

/* Player */
.entry-player {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.player-avatar {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.player-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.player-name {
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9rem;
}

.player-username {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Stats */
.entry-stats {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  min-width: 3rem;
}

.stat-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
}

.score-stat .stat-value {
  color: var(--color-primary, #8c52ff);
}

.streak-stat .stat-value {
  color: #ff9f1c;
}

/* Actions */
.entry-actions {
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.follow-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: rgba(var(--color-primary-rgb, 140, 82, 255), 0.2);
  color: var(--color-primary, #8c52ff);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
}

.follow-button:hover {
  background: var(--color-primary, #8c52ff);
  color: #fff;
}

.following-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: #4ade80;
  font-size: 0.8rem;
}

/* Responsive */
@media (max-width: 480px) {
  .entry-row {
    padding: 0.6rem 0.75rem;
    gap: 0.5rem;
  }

  .entry-rank {
    width: 2rem;
    height: 2rem;
  }

  .rank-medal {
    font-size: 1rem;
  }

  .rank-number {
    font-size: 0.8rem;
  }

  .player-avatar {
    width: 2rem;
    height: 2rem;
  }

  .player-name {
    font-size: 0.8rem;
  }

  .player-username {
    font-size: 0.7rem;
  }

  .entry-stats {
    gap: 0.75rem;
  }

  .stat {
    min-width: 2.5rem;
  }

  .stat-value {
    font-size: 0.85rem;
  }

  .stat-label {
    font-size: 0.6rem;
  }
}
</style>

