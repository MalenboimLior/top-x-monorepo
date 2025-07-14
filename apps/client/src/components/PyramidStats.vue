<template>
  <div class="pyramid-stats">
    <h2 class="subtitle has-text-white">{{ gameTitle || 'Your Pyramid' }}</h2>
    <div class="table-container" :class="{ 'blurred': !user }">
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
            <th v-if="worstShow" class="has-text-centered">
              <a href="#" class="has-text-white" @click.prevent="sortBy('worst')">💩
                <font-awesome-icon
                  v-if="sortColumn === 'worst'"
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
          <tr v-for="(item, index) in sortedItemStats" :key="item.id" @click="showPresidentModal(item)">
            <td class="has-text-centered number-cell">
              <div class="rank-column">
                <span>{{ formatNumber(index + 1) }}</span>
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
    <div v-show="showLoginTab" :class="['description-tab', { show: showLoginTab }]">
      <div class="tab-content" @click.stop>
        <p class="question-text">Hi, if you want to see the vote statistics you need to login, also your vote will be count</p>
        <p class="answer-text">We only use your username and image, and we’ll never post on your behalf.</p>
        
        
        <!-- <button style="color:#c4ff00;" @click="closeLoginTab">Close</button> -->
      </div>
      <div  class="has-text-centered">
          <CustomButton
            type="is-primary"
            label="Login with X"
            :icon="['fab', 'x-twitter']"
            @click="handleLogin"
          />
        </div>
    </div>

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
            <p class="has-text-white">Tier Distribution:</p>
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
              label="Download Stats"
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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import { PyramidItem, PyramidRow, PyramidStats } from '@top-x/shared/types/pyramid';
import { formatNumber } from '@top-x/shared/utils/format';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faSortUp, faSortDown, faMedal, faDownload } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import html2canvas from 'html2canvas';

library.add(faSortUp, faSortDown, faMedal,faDownload);

const props = defineProps<{
  gameId: string;
  gameTitle?: string;
  gameHeader?: string;
  items: PyramidItem[];
  rows: PyramidRow[];
  worstPoints: number;
  worstShow?: boolean;
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
  console.log('PyramidStats: onMounted called with gameId:', props.gameId);
  if (!user.value) {
    showLoginTab.value = true;
  }
  try {
    const statsDoc = await getDoc(doc(db, 'games', props.gameId, 'stats', 'general'));
    if (statsDoc.exists()) {
      const data = statsDoc.data();
      stats.value = {
        itemRanks: data.itemRanks || {},
        totalPlayers: data.totalPlayers || 0,
        worstItemCounts: data.worstItemCounts || {},
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
  const statsArray = Object.entries(stats.value.itemRanks).map(([itemId, ranks]) => {
    const item = props.items.find((i: PyramidItem) => i.id === itemId);
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
  console.log('PyramidStats: Opening modal for president:', item.name);
}

function closeModal() {
  selectedPresident.value = null;
  console.log('PyramidStats: Modal closed');
}

async function downloadPresidentStats() {
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

async function handleLogin() {
  await userStore.loginWithX();
  closeLoginTab();
}

function closeLoginTab() {
  showLoginTab.value = false;
}
</script>

<style scoped>
.pyramid-stats {
  padding: 0.2rem 0.1rem;
  background-color: #000000;

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
  min-height: 2.5rem; /* Ensure enough space for larger numbers */
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
.number-cell {

  align-items: center;
  justify-content: center;
  font-size: 1.1rem !important; /* Bigger font for numbers */
  line-height: 4; /* Prevent vertical offset */
  padding: 0rem !important;
}
tr:hover {
  background-color: #222;
}
.item-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
}
.item-image {
  width: 60px;
  height: 60px;
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
.modal-content {
  max-width: 90%;
  width: 400px;
  border-radius: 8px;
  overflow: hidden;
}
.president-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}
.modal-president-image {
  width: 150px;
  height: 150px;
  object-fit: cover;
  object-position: center;
  border-radius: 8px;
  border: 2px solid #fff;
}
.stats-container {
  width: 100%;
  text-align: center;
}
.stats-container p {
  margin: 0.5rem 0;
}
.stats-container ul {
  list-style: none;
  padding: 0;
}
.stats-container li {
  margin: 0.3rem 0;
}
.modal-close {
  background-color: #ff5555;
}
.description-tab {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #1f1f1f;
  color: white;
  padding: 1rem;
  transform: translateY(100%);
  transition: transform 0.3s ease-in-out;
  z-index: 1000;
}
.description-tab.show {
  transform: translateY(0);
}
.tab-content {
  max-height: 200px;
  overflow-y: auto;
}
@media screen and (min-width: 768px) {
  .description-tab {
    width: 400px; /* Matches image-pool: 4 * 90px + 3 * 0.2rem + 2 * 0.3rem + 2px */
    left: 50%;
    transform: translateX(-50%) translateY(100%);
  }
  .description-tab.show {
    transform: translateX(-50%) translateY(0);
  }
}
.question-text {
  color: #00e8e0;
  font-weight: bold;
  margin-bottom: 0.5rem;
  text-align: center;
}
.answer-text {
  color: #eee;
}
.blurred {
  filter: blur(8px);
  pointer-events: none;
  user-select: none;
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
    min-height: 2rem; /* Adjusted for mobile */
  }
  .number-cell {
    font-size: 0.9rem; /* Bigger font for numbers on mobile */
    line-height: 4.5;
  }
  .item-image {
    width: 15vw;
    height: 15vw;
    max-width: 50px;
    max-height: 50px;
  }
  .medal {
    font-size: 0.6rem;
  }
  .modal-content {
    width: 90%;
  }
  .modal-president-image {
    width: 120px;
    height: 120px;
  }
}
</style>