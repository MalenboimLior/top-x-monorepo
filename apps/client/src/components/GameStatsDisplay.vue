<template>
  <div v-if="hasStats" class="game-stats-display">
    <div v-for="stat in statItems" :key="stat.key" class="game-stats-display__stat" :title="stat.label">
      <span class="game-stats-display__stat-icon" role="img" :aria-label="stat.label">
        <font-awesome-icon :icon="stat.icon" />
      </span>
      <div class="game-stats-display__stat-content">
        <span class="game-stats-display__stat-value">{{ stat.value }}</span>
        <span class="game-stats-display__stat-label">{{ stat.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import type { GameStats } from '@top-x/shared/types/stats';
import { useLocaleStore } from '@/stores/locale';
import { formatNumber } from '@top-x/shared/utils/format';

const props = defineProps({
  stats: {
    type: Object as PropType<Partial<GameStats> | null>,
    default: () => ({}),
  },
});

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const statItems = computed(() => {
  const stats = props.stats || {};
  const items = [];

  if (typeof stats.totalPlayers === 'number') {
    items.push({
      key: 'players',
      label: t('home.stats.players'),
      value: formatNumber(stats.totalPlayers),
      icon: ['fas', 'user-group'] as [string, string],
    });
  }

  if (typeof stats.favoriteCounter === 'number') {
    items.push({
      key: 'favorites',
      label: t('home.stats.favorites'),
      value: formatNumber(stats.favoriteCounter),
      icon: ['fas', 'heart'] as [string, string],
    });
  }

  if (typeof stats.sessionsPlayed === 'number') {
    items.push({
      key: 'sessions',
      label: t('home.stats.sessions'),
      value: formatNumber(stats.sessionsPlayed),
      icon: ['fas', 'gamepad'] as [string, string],
    });
  }

  return items;
});

const hasStats = computed(() => statItems.value.length > 0);
</script>

<style scoped>
.game-stats-display {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.game-stats-display__stat {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--space-4);
  border: 1px solid rgba(0, 232, 224, 0.28);
  background: rgba(255, 255, 255, 0.05);
  min-width: 160px;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  cursor: default;
}

.game-stats-display__stat:hover {
  transform: translateY(-2px);
  border-color: rgba(0, 232, 224, 0.45);
  background: rgba(0, 232, 224, 0.12);
  box-shadow: 0 2px 8px rgba(0, 232, 224, 0.2);
}

.game-stats-display__stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.85rem;
  background-color: var(--color-primary-bg);
  color: var(--bulma-primary);
  font-size: 1.1rem;
  flex-shrink: 0;
}

.game-stats-display__stat-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.game-stats-display__stat-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
}

.game-stats-display__stat-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  /*color: rgba(255, 255, 255, 0.6);*/
}
</style>

