<!-- Game type section grouping games by type -->
<template>
  <div class="game-type-section">
    <div class="game-type-section__header">
      <div class="game-type-section__icon-wrapper">
        <font-awesome-icon :icon="icon" class="game-type-section__icon" />
      </div>
      <h3 class="game-type-section__title">{{ gameTypeName }}</h3>
      <span v-if="games.length > 0" class="game-type-section__count">({{ games.length }})</span>
    </div>

    <div v-if="games.length === 0" class="game-type-section__empty">
      <p>No {{ gameTypeName.toLowerCase() }} games played yet.</p>
    </div>

    <div v-else class="game-type-section__games">
      <GameStatsCard
        v-for="game in games"
        :key="game.gameId"
        :game-id="game.gameId"
        :game-name="game.gameName"
        :game-description="game.gameDescription"
        :score="game.score"
        :streak="game.streak"
        :rank="game.rank"
        :percentile="game.percentile"
        :level="game.level"
        :fish-caught="game.fishCaught"
        :last-played="game.lastPlayed"
        :quiz-result="game.quizResult"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import GameStatsCard from './GameStatsCard.vue';
import type { GameTypeIcon } from '@top-x/shared/types';

interface GameStats {
  gameId: string;
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

interface Props {
  gameTypeId: string;
  gameTypeName: string;
  icon: GameTypeIcon;
  games: GameStats[];
}

defineProps<Props>();
</script>

<style scoped>
.game-type-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.game-type-section:last-child {
  margin-bottom: 0;
}

.game-type-section__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border-base);
}

.game-type-section__icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  border-radius: 10px;
  color: var(--color-primary, #8c52ff);
  font-size: 1.1rem;
}

.game-type-section__title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-text-primary);
  flex: 1;
}

.game-type-section__count {
  font-size: 0.9rem;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.game-type-section__empty {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-tertiary);
}

.game-type-section__games {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

@media (max-width: 768px) {
  .game-type-section__games {
    grid-template-columns: 1fr;
  }
}
</style>

