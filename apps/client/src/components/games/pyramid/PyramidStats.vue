<template>
  <div class="pyramid-stats">
    <h2 class="subtitle has-text-white">{{ gameTitle || 'Your Pyramid' }}</h2>
    <div class="table-container" :class="{ 'blurred': !user }">
      <table class="table is-fullwidth is-hoverable has-background-dark">
        <thead>
          <tr>
            <th class="has-text-centered">
              <a href="#" class="has-text-white" @click.prevent="sortBy('rank')">{{ t('games.pyramid.table.rank') }}
                <font-awesome-icon
                  v-if="sortColumn === 'rank'"
                  :icon="['fas', sortDirection === 'asc' ? 'sort-up' : 'sort-down']"
                />
              </a>
            </th>
            <th class="has-text-centered">
              <a href="#" class="has-text-white" @click.prevent="sortBy('name')">{{ t('games.pyramid.table.item') }}
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
            <th v-if="worstShow" class="has-text-centered">
              <a href="#" class="has-text-white" @click.prevent="sortBy('worst')">{{ t('games.pyramid.table.worst') }}
                <font-awesome-icon
                  v-if="sortColumn === 'worst'"
                  :icon="['fas', sortDirection === 'asc' ? 'sort-up' : 'sort-down']"
                />
              </a>
            </th>
            <th class="has-text-centered">
              <a href="#" class="has-text-white" @click.prevent="sortBy('score')">{{ t('games.pyramid.table.score') }}
                <font-awesome-icon
                  v-if="sortColumn === 'score'"
                  :icon="['fas', sortDirection === 'asc' ? 'sort-up' : 'sort-down']"
                />
              </a>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in sortedItemStats" :key="item.id" @click="showPresidentModal(item)">
            <td class="has-text-centered number-cell">
              <div class="rank-column">
                <span>{{ formatNumber(index + 1) }}</span>
                <font-awesome-icon
                  v-if="index === 0"
                  :icon="['fas', 'medal']"
                  class="medal gold"
                  :title="t('games.pyramid.place.1st')"
                />
                <font-awesome-icon
                  v-else-if="index === 1"
                  :icon="['fas', 'medal']"
                  class="medal silver"
                  :title="t('games.pyramid.place.2nd')"
                />
                <font-awesome-icon
                  v-else-if="index === 2"
                  :icon="['fas', 'medal']"
                  class="medal bronze"
                  :title="t('games.pyramid.place.3rd')"
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
                <span class="has-text-white">{{ item.name }}</span>
              </div>
            </td>
            <td v-for="row in props.rows" :key="row.id" class="has-text-centered number-cell">
              {{ formatNumber(item.ranks[row.id] || 0) }}
            </td>
            <td v-if="worstShow" class="has-text-centered number-cell">{{ formatNumber(item.worstCounts || 0) }}</td>
            <td class="has-text-centered number-cell">{{ formatNumber(item.score) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Login Tab -->
    <GameLoginPromo
      mode="fixed"
      :is-visible="showLoginTab"
      :game-id="gameId"
      context="stats_tab"
      @login-success="handleLoginSuccess"
    />

    <!-- President Details Modal -->
    <div class="modal" :class="{ 'is-active': selectedPresident }" ref="modalContainer">
      <div class="modal-background" @click="closeModal"></div>
      <div class="modal-content has-background-dark p-4">
        <div class="president-modal-content">
          <img
            v-if="selectedPresident"
            :src="selectedPresident.imageSrc"
            :alt="selectedPresident.name"
            class="modal-president-image"
            crossorigin="anonymous"
          />
          <h3 class="title has-text-white has-text-centered" style="margin:0px">{{ selectedPresident?.name }}</h3>
          <div class="stats-container">
            <p class="has-text-white">Score: {{ formatNumber(selectedPresident?.score || 0) }}</p>
            <p class="has-text-white">Votes:</p>
            <ul>
              <li v-for="row in props.rows" :key="row.id" class="has-text-white">
                {{ row.label || toRoman(row.id) }}: {{ formatNumber(selectedPresident?.ranks[row.id] || 0) }}
              </li>
            </ul>
                        <p v-if="worstShow" class="has-text-white">💩 {{ formatNumber(selectedPresident?.worstCounts || 0) }}</p>

            <p class="has-text-white">Total Players: {{ formatNumber(totalPlayers) }}</p>
          </div>
          <div class="buttons is-centered mt-4">
            <CustomButton
              type="is-primary"
              :label="t('games.pyramid.downloadImage')"
              :icon="['fas', 'download']"
              :disabled="isImageLoading"
              @click="downloadPresidentStats"
            />
          </div>
        </div>
      </div>
      <button class="modal-close is-large" aria-label="close" @click="closeModal"></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getGameStats } from '@/services/game';
import { useUserStore } from '@/stores/user';
import { PyramidItem, PyramidRow, PyramidStats } from '@top-x/shared/types/pyramid';
import { formatNumber } from '@top-x/shared/utils/format';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import GameLoginPromo from '@/components/games/shared/GameLoginPromo.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faSortUp, faSortDown, faMedal, faDownload } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import html2canvas from 'html2canvas';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
import { useLocaleStore } from '@/stores/locale';

library.add(faSortUp, faSortDown, faMedal,faDownload);

const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);

const props = defineProps<{
  gameId: string;
  gameTitle?: string;
  gameHeader?: string;
  items: PyramidItem[];
  communityItems: PyramidItem[];
  rows: PyramidRow[];

  worstPoints: number;
  worstShow?: boolean;
  hideLoginTab?: boolean;
}>();

const worstShow = computed(() => props.worstShow !== false);
const userStore = useUserStore();
const user = computed(() => userStore.user);

const sortColumn = ref<string>('score');
const sortDirection = ref<'asc' | 'desc'>('desc');
const stats = ref<PyramidStats>({ itemRanks: {}, totalPlayers: 0, worstItemCounts: {} });
const selectedPresident = ref<any>(null);
const modalContainer = ref<HTMLElement | null>(null);
const isImageLoading = ref(true);
const totalPlayers = ref(0);
const showLoginTab = ref(false);

onMounted(async () => {
  if (analytics) {
    logEvent(analytics, 'game_view', { game_name: props.gameId, view_type: 'stats' });
  }
  console.log('PyramidStats: onMounted called with gameId:', props.gameId);
  if (!user.value && !props.hideLoginTab) {
    showLoginTab.value = true;
  }
  try {
    const statsResult = await getGameStats(props.gameId);
    if (statsResult.stats) {
      const data = statsResult.stats;
      stats.value = {
        itemRanks: data.custom?.itemRanks || {},
        totalPlayers: data.custom?.totalPlayers || 0,
        worstItemCounts: data.custom?.worstItemCounts || {},
      };
      
      totalPlayers.value = stats.value.totalPlayers;
      console.log('PyramidStats: Stats fetched:', stats.value);
      isImageLoading.value = false; // Assume images are preloaded
    } else {
      console.warn('PyramidStats: No stats found for gameId:', props.gameId);
      isImageLoading.value = false;
    }
  } catch (err: any) {
    console.error('PyramidStats: Error fetching stats:', err.message, err);
    isImageLoading.value = false;
  }
});

const sortedItemStats = computed(() => {
  const allItems = [...props.items, ...props.communityItems];
  const statsArray = Object.entries(stats.value.itemRanks).map(([itemId, ranks]) => {
    const item = allItems.find((i: PyramidItem) => i.id === itemId);
    const score = props.rows.reduce((total: number, row: PyramidRow) => {
      return total + (ranks[row.id] || 0) * row.points;
    }, 0) + ((stats.value.worstItemCounts[itemId] || 0) * (props.worstPoints || 0));
    return {
      id: itemId,
      name: item?.label || itemId,
      imageSrc: item?.src ?? '',
      ranks,
      score,
      worstCounts: stats.value.worstItemCounts[itemId] || 0,
    };
  });
  return statsArray.sort((a, b) => {
    if (sortColumn.value === 'rank' || sortColumn.value === 'score') {
      return sortDirection.value === 'asc' ? a.score - b.score : b.score - a.score;
    } else if (sortColumn.value === 'name') {
      return sortDirection.value === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else if (sortColumn.value === 'worst') {
      return sortDirection.value === 'asc' ? a.worstCounts - b.worstCounts : b.worstCounts - a.worstCounts;
    } else if (sortColumn.value.startsWith('tier-')) {
      const tierId = Number(sortColumn.value.split('-')[1]);
      const aRank = a.ranks[tierId] || 0;
      const bRank = b.ranks[tierId] || 0;
      return sortDirection.value === 'asc' ? aRank - bRank : bRank - aRank;
    }
    return 0;
  });
});

/**
 * Handles sorting when a column header is clicked.
 */
function sortBy(column: string) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = column;
    sortDirection.value = 'desc';
  }
}

function toRoman(num: number): string {
  const numerals = ['I', 'II', 'III', 'IV'];
  return numerals[num - 1] || `${num}`;
}

function showPresidentModal(item: any) {
  selectedPresident.value = item;
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'view_details', game_id: props.gameId, item_id: item.id });
  }
  console.log('PyramidStats: Opening modal for president:', item.name);
}
function closeModal() {
  selectedPresident.value = null;
  console.log('PyramidStats: Modal closed');
}

async function downloadPresidentStats() {
  console.log('PyramidStats: downloadPresidentStats called');
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'download_stats', game_id: props.gameId, item_id: selectedPresident.value?.id });
  }
  console.log('PyramidStats: downloadPresidentStats called');
  if (!modalContainer.value) {
    console.error('PyramidStats: Modal container not found');
    alert('Failed to download image. Please try again.');
    return;
  }
  try {
    const content = modalContainer.value.querySelector('.president-modal-content');
    if (!content) {
      console.error('PyramidStats: Modal content not found');
      return;
    }
    const canvas = await html2canvas(content as HTMLElement, {
      backgroundColor: '#121212',
      scale: window.devicePixelRatio || 2,
      useCORS: true,
      logging: true,
      allowTaint: false,
      width: content.scrollWidth,
      height: content.scrollHeight,
    });
    console.log('PyramidStats: Canvas generated, size:', canvas.width, 'x', canvas.height);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${selectedPresident.value?.name.toLowerCase().replace(/\s+/g, '-')}-stats.png`;
    link.click();
    console.log('PyramidStats: Image download triggered');
  } catch (err: any) {
    console.error('PyramidStats: Error generating download image:', err.message, err);
    alert('Failed to download image. Some images may not be accessible due to CORS restrictions.');
  }
}

function handleLoginSuccess() {
  closeLoginTab();
}

function closeLoginTab() {
  showLoginTab.value = false;
}
</script>

<style scoped>
.pyramid-stats {
  padding: 0.5rem;
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-sizing: border-box;
}


.subtitle {
  color: #fff;
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0.5rem 0 1.5rem;
  text-align: center;
  letter-spacing: 1px;
}

.table-container {
  overflow-x: auto;
  max-width: 100%;
  width: 100%;
  margin: 0 auto;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  transition: filter 0.3s ease;
  box-sizing: border-box;
}

/* Custom Table Styles */
.table {
  background-color: transparent;
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-bottom: 0;
}

/* Header Styles */
thead tr {
  background: linear-gradient(180deg, #252525 0%, #1e1e1e 100%);
}

th {
  padding: 1rem;
  text-align: center;
  border-bottom: 2px solid #333;
  color: #888;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 10;
  transition: color 0.2s;
}

th a {
  color: #aaa;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: color 0.2s;
}
th a:hover {
  color: #fff;
}
th .active-sort {
  color: #00e8e0;
}

/* Body Styles */
tbody tr {
  background-color: #161616;
  transition: transform 0.2s ease, background-color 0.2s ease;
  cursor: pointer;
}

tbody tr:nth-child(even) {
  background-color: #121212;
}

tbody tr:hover {
  background-color: #252525;
  transform: scale(1.005);
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  z-index: 5;
  position: relative;
}

td {
  padding: 1rem 0.5rem;
  border-bottom: 1px solid #222;
  vertical-align: middle;
  color: #eee;
  transition: color 0.2s;
}

tbody tr:last-child td {
  border-bottom: none;
}

.number-cell {
  font-family: 'Inter', 'Roboto', sans-serif; /* Monospace-ish for numbers or just clean sans */
  font-size: 1rem;
  font-weight: 500;
  color: #ccc;
}
tbody tr:hover .number-cell {
  color: #fff;
}

/* Rank Column & Medals */
.rank-column {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.1rem;
}
.medal {
  font-size: 0.9rem;
  filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.4));
}
.medal.gold { color: #ffd700; }
.medal.silver { color: #c0c0c0; }
.medal.bronze { color: #cd7f32; }

/* Item Column */
.item-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.item-image {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #333;
  transition: transform 0.2s;
  background-color: #000;
}
tbody tr:hover .item-image {
  transform: scale(1.1);
  border-color: #555;
}
.item-column span {
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
}

/* Modal Styles */
/* Reuse existing logic but improve aesthetics */
.modal-content {
  width: 100%;
  max-width: 450px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.8);
  border: 1px solid rgba(255,255,255,0.1);
}

.president-modal-content {
  background: linear-gradient(135deg, #222 0%, #111 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
}

.modal-president-image {
  width: 140px;
  height: 140px;
  border-radius: 50%; /* Circle for profile-like feel in modal */
  border: 3px solid #00e8e0;
  box-shadow: 0 0 20px rgba(0, 232, 224, 0.3);
}

.title {
  font-size: 1.5rem;
  color: #fff;
  font-weight: 800;
}

.stats-container {
  width: 100%;
  background-color: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 1rem;
}

/* Tweak text in stats */
.stats-container p, .stats-container li {
  color: #ccc;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
}

.buttons.is-centered {
  margin-top: 1rem;
}

/* Login Tab */


.blurred {
  filter: blur(8px);
  pointer-events: none;
  user-select: none;
}


.modal-close {
  background-color: #ff5555;
  transition: transform 0.2s;
}
.modal-close:hover {
  transform: scale(1.1);
}

.tab-content {
  max-height: 200px;
  overflow-y: auto;
}

/* Mobile Responsive */
@media screen and (max-width: 767px) {
  .pyramid-stats {
    padding: 0;
    width: 100%;
    margin-left: 0;
    margin-right: 0;
    max-width: 100%;
  }
  .table-container {
     border-radius: 0; /* Full width often looks better without side radius on small screens, or keep it */
     width: 100%;
     max-width: 100%;
     margin-left: 0;
     margin-right: 0;
  }
  .table {
    font-size: 0.8rem;
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    /* Allow horizontal scroll on table container without breaking layout */
  }
  th, td {
    padding: 0.75rem 0.2rem; /* Reduced horizontal padding inside cells */
  }
  .item-image {
    width: 40px;
    height: 40px;
  }
  .medal {
    font-size: 0.8rem;
  }
  .subtitle {
    font-size: 1.2rem;
    margin-bottom: 1rem;
  }
  .number-cell {
     font-size: 0.9rem !important;
  }
}
</style>