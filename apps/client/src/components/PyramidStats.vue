<template>
  <div class="pyramid-stats">
    <h2 class="subtitle has-text-white">Game Statistics</h2>
    <div class="table-container">
      <table class="table is-fullwidth is-hoverable has-background-dark">
        <thead>
          <tr>
            <th class="has-text-centered">
              <a href="#" class="has-text-white" @click.prevent="sortBy('rank')">Rank
                <font-awesome-icon
                  v-if="sortColumn === 'rank'"
                  :icon="['fas', sortDirection === 'asc' ? 'sort-up' : 'sort-down']"
                />
              </a>
            </th>
            <th class="has-text-centered">
              <a href="#" class="has-text-white" @click.prevent="sortBy('name')">Item
                <font-awesome-icon
                  v-if="sortColumn === 'name'"
                  :icon="['fas', sortDirection === 'asc' ? 'sort-up' : 'sort-down']"
                />
              </a>
            </th>
            <th v-for="row in props.rows" :key="row.id" class="has-text-centered">
              <a href="#" class="has-text-white" @click.prevent="sortBy(`tier-${row.id}`)">
                {{ row.label }}
                <font-awesome-icon
                  v-if="sortColumn === `tier-${row.id}`"
                  :icon="['fas', sortDirection === 'asc' ? 'sort-up' : 'sort-down']"
                />
              </a>
            </th>
            <th class="has-text-centered">
              <a href="#" class="has-text-white" @click.prevent="sortBy('score')">Score
                <font-awesome-icon
                  v-if="sortColumn === 'score'"
                  :icon="['fas', sortDirection === 'asc' ? 'sort-up' : 'sort-down']"
                />
              </a>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in sortedItemStats" :key="item.id">
            <td class="has-text-centered">
              <div class="rank-column">
                <span>{{ index + 1 }}</span>
                <font-awesome-icon
                  v-if="index === 0"
                  :icon="['fas', 'medal']"
                  class="medal gold"
                  title="1st Place"
                />
                <font-awesome-icon
                  v-else-if="index === 1"
                  :icon="['fas', 'medal']"
                  class="medal silver"
                  title="2nd Place"
                />
                <font-awesome-icon
                  v-else-if="index === 2"
                  :icon="['fas', 'medal']"
                  class="medal bronze"
                  title="3rd Place"
                />
              </div>
            </td>
            <td class="has-text-centered">
              <div class="item-column">
                <img
                  v-if="item.imageSrc"
                  :src="item.imageSrc"
                  :alt="item.name"
                  class="item-image"
                  crossorigin="anonymous"
                />
                <span>{{ item.name }}</span>
              </div>
            </td>
            <td v-for="row in props.rows" :key="row.id" class="has-text-centered">{{ item.ranks[row.id] || 0 }}</td>
            <td class="has-text-centered">{{ item.score }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { PyramidItem, PyramidRow } from '@top-x/shared/types/pyramid';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faSortUp, faSortDown, faMedal } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';

library.add(faSortUp, faSortDown, faMedal);

const props = defineProps<{
  gameId: string;
  items: PyramidItem[];
  rows: PyramidRow[];
}>();

const sortColumn = ref<string>('score');
const sortDirection = ref<'asc' | 'desc'>('desc');
const itemRanks = ref<Record<string, Record<number, number>>>({});

const sortedItemStats = computed(() => {
  const stats = Object.entries(itemRanks.value).map(([itemId, ranks]) => {
    const item = props.items.find((i: PyramidItem) => i.id === itemId);
    const score = props.rows.reduce((total: number, row: PyramidRow) => {
      return total + (ranks[row.id] || 0) * row.points;
    }, 0);
    return {
      id: itemId,
      name: item?.label || itemId,
      imageSrc: item?.src ?? '',
      ranks,
      score,
    };
  });
  return stats.sort((a, b) => {
    if (sortColumn.value === 'rank' || sortColumn.value === 'score') {
      return sortDirection.value === 'asc' ? a.score - b.score : b.score - a.score;
    } else if (sortColumn.value === 'name') {
      return sortDirection.value === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else if (sortColumn.value.startsWith('tier-')) {
      const tierId = Number(sortColumn.value.split('-')[1]);
      const aRank = a.ranks[tierId] || 0;
      const bRank = b.ranks[tierId] || 0;
      return sortDirection.value === 'asc' ? aRank - bRank : bRank - aRank;
    }
    return 0;
  });
});

onMounted(async () => {
  console.log('PyramidStats: onMounted called with gameId:', props.gameId);
  try {
    const statsDoc = await getDoc(doc(db, 'games', props.gameId, 'stats', 'general'));
    if (statsDoc.exists()) {
      itemRanks.value = statsDoc.data().itemRanks || {};
      console.log('PyramidStats: Stats fetched:', itemRanks.value);
    } else {
      console.warn('PyramidStats: No stats found for gameId:', props.gameId);
    }
  } catch (err: any) {
    console.error('PyramidStats: Error fetching stats:', err.message, err);
  }
});

function sortBy(column: string) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = column;
    sortDirection.value = 'desc';
  }
}
</script>

<style scoped>
.pyramid-stats {
  padding: 0.2rem 0.1rem;
  background-color: #121212;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.table-container {
  overflow-x: auto;
  max-width: 100%;
  margin: 0.3rem 0;
}
.table {
  background-color: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}
th,
td {
  padding: 0.5rem;
  text-align: center;
  border-bottom: 1px solid #333;
}
th {
  background-color: #2a2a2a;
  font-weight: 600;
  font-size: 0.85rem;
  color: #eee;
}
td {
  font-size: 0.8rem;
  color: #ddd;
}
tr:hover {
  background-color: #222;
}
.item-column {
  display: flex;
  align-items: left;
  justify-content: left;
  gap: 0.3rem;
}
.item-image {
  width: 1.5rem;
  height: 1.5rem;
  object-fit: cover;
  border-radius: 4px;
}
.rank-column {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}
.medal {
  font-size: 0.7rem;
}
.medal.gold {
  color: #ffd700;
}
.medal.silver {
  color: #c0c0c0;
}
.medal.bronze {
  color: #cd7f32;
}
.subtitle {
  color: #eee;
  font-size: 1rem;
  margin: 0.3rem 0;
}
@media screen and (max-width: 767px) {
  .pyramid-stats {
    padding: 0.1rem 0.05rem;
  }
  .table {
    font-size: 0.75rem;
    min-width: 320px;
  }
  th,
  td {
    padding: 0.3rem;
  }
  .item-image {
    width: 1.2rem;
    height: 1.2rem;
  }
  .medal {
    font-size: 0.6rem;
  }
}
</style>