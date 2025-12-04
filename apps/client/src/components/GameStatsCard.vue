<!-- Individual game stats card -->
<template>
  <div class="game-stats-card">
    <div class="game-stats-card__header">
      <div class="game-stats-card__info">
        <h4 class="game-stats-card__name">{{ gameName }}</h4>
        <p v-if="gameDescription" class="game-stats-card__description">{{ gameDescription }}</p>
      </div>
      <CustomButton
        v-if="gameId"
        type="is-primary is-small"
        label="Play Again"
        :icon="['fas', 'play']"
        @click="playGame"
      />
    </div>

    <div class="game-stats-card__stats">
      <!-- Score -->
      <div v-if="score !== undefined && score !== null" class="stat-item">
        <span class="stat-label">Score</span>
        <span class="stat-value score-value">{{ score }}</span>
      </div>

      <!-- Streak -->
      <div v-if="streak !== undefined && streak !== null && streak > 0" class="stat-item">
        <span class="stat-label">Streak</span>
        <span class="stat-value streak-value">{{ streak }}</span>
      </div>

      <!-- Rank -->
      <div v-if="rank !== undefined && rank !== null" class="stat-item">
        <span class="stat-label">Rank</span>
        <span class="stat-value rank-value">#{{ rank }}</span>
      </div>

      <!-- Percentile -->
      <div v-if="percentile !== undefined && percentile !== null" class="stat-item">
        <span class="stat-label">Percentile</span>
        <span class="stat-value percentile-value">Top {{ percentile }}%</span>
      </div>

      <!-- Quiz Result -->
      <div v-if="quizResult" class="stat-item stat-item--full">
        <span class="stat-label">Result</span>
        <div class="quiz-result">
          <img v-if="quizResult.image" :src="quizResult.image" :alt="quizResult.title" class="quiz-result-image" />
          <span class="stat-value">{{ quizResult.title }}</span>
        </div>
      </div>

      <!-- Level (Pacman) -->
      <div v-if="level !== undefined && level !== null" class="stat-item">
        <span class="stat-label">Level</span>
        <span class="stat-value">{{ level }}</span>
      </div>

      <!-- Fish Caught (FisherGame) -->
      <div v-if="fishCaught !== undefined && fishCaught !== null" class="stat-item">
        <span class="stat-label">Fish Caught</span>
        <span class="stat-value">{{ fishCaught }}</span>
      </div>

      <!-- Last Played -->
      <div v-if="lastPlayed" class="stat-item stat-item--full">
        <span class="stat-label">Last Played</span>
        <span class="stat-value stat-value--secondary">{{ formatDate(lastPlayed) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

interface Props {
  gameId?: string;
  gameName: string;
  gameDescription?: string;
  score?: number;
  streak?: number;
  rank?: number;
  percentile?: number;
  level?: number;
  fishCaught?: number;
  lastPlayed?: number;
  quizResult?: {
    title: string;
    image?: string;
  };
}

const props = defineProps<Props>();
const router = useRouter();

const playGame = () => {
  if (props.gameId) {
    router.push(`/games/info?game=${props.gameId}`);
  }
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
</script>

<style scoped>
.game-stats-card {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.game-stats-card:hover {
  border-color: var(--color-border-primary);
  background-color: rgba(255, 255, 255, 0.04);
}

.game-stats-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.game-stats-card__info {
  flex: 1;
  min-width: 0;
}

.game-stats-card__name {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.game-stats-card__description {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.game-stats-card__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-item--full {
  grid-column: 1 / -1;
}

.stat-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
  font-weight: 600;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.stat-value--secondary {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.score-value {
  color: var(--color-primary, #8c52ff);
}

.streak-value {
  color: #ff9f1c;
}

.rank-value {
  color: var(--color-text-primary);
}

.percentile-value {
  color: #4ade80;
}

.quiz-result {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.quiz-result-image {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--color-border-base);
}

@media (max-width: 480px) {
  .game-stats-card__header {
    flex-direction: column;
    align-items: stretch;
  }

  .game-stats-card__stats {
    grid-template-columns: 1fr;
  }
}
</style>

