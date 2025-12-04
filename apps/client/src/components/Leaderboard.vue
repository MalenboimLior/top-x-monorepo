<!-- Leaderboard with tabs: Top | Around | VIP | Friends -->
<!-- Performance optimized: lazy loading, caching, pagination -->
<template>
  <div class="leaderboard-container">
    <h2 v-if="title" class="leaderboard-title">{{ title }}</h2>
    
    <!-- Tab Navigation -->
    <div class="leaderboard-tabs">
      <button
        v-for="tab in availableTabs"
        :key="tab.id"
        class="tab-button"
        :class="{ 'is-active': activeTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        <font-awesome-icon :icon="tab.icon" class="tab-icon" />
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Date Range Selector (only for Top/Around) -->
    <div v-if="showDateRangeSelector && showDateRange" class="date-range-selector">
      <button
        v-for="range in dateRangeOptions"
        :key="range.value"
        class="range-button"
        :class="{ 'is-active': selectedDateRange === range.value }"
        @click="switchDateRange(range.value)"
      >
        {{ range.label }}
      </button>
    </div>

    <!-- Content Area -->
    <div class="leaderboard-content">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <span class="loader" aria-hidden="true"></span>
        <p>Loading leaderboard...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <font-awesome-icon :icon="['fas', 'exclamation-circle']" class="error-icon" />
        <p>{{ error }}</p>
        <button class="retry-button" @click="fetchCurrentTab">Retry</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="!currentEntries.length" class="empty-state">
        <font-awesome-icon :icon="['fas', 'trophy']" class="empty-icon" />
        <p>{{ emptyMessage }}</p>
      </div>

      <!-- Around View (special layout) -->
      <div v-else-if="activeTab === 'around'" class="around-view">
        <div v-if="aroundData.above.length" class="around-section above-section">
          <div
            v-for="(entry, index) in aroundData.above"
            :key="entry.uid"
            class="leaderboard-entry"
            :class="{ 'is-current-user': entry.uid === currentUserId }"
          >
            <LeaderboardEntry
              :entry="entry"
              :rank="computeAboveRank(index)"
              :is-current-user="entry.uid === currentUserId"
              :show-actions="showActions"
              :is-frenemy="frenemiesSet.has(entry.uid)"
              @add-frenemy="handleAddFrenemy"
            />
          </div>
        </div>
        <div v-if="aroundData.current" class="around-section current-section">
          <div class="current-indicator">You</div>
          <div class="leaderboard-entry is-current-user">
            <LeaderboardEntry
              :entry="aroundData.current"
              :rank="aroundData.above.length + 1"
              :is-current-user="true"
              :show-actions="false"
              :is-frenemy="false"
            />
          </div>
        </div>
        <div v-if="aroundData.below.length" class="around-section below-section">
          <div
            v-for="(entry, index) in aroundData.below"
            :key="entry.uid"
            class="leaderboard-entry"
            :class="{ 'is-current-user': entry.uid === currentUserId }"
          >
            <LeaderboardEntry
              :entry="entry"
              :rank="computeBelowRank(index)"
              :is-current-user="entry.uid === currentUserId"
              :show-actions="showActions"
              :is-frenemy="frenemiesSet.has(entry.uid)"
              @add-frenemy="handleAddFrenemy"
            />
          </div>
        </div>
      </div>

      <!-- Standard List View (Top, VIP, Friends) -->
      <div v-else class="list-view">
        <div
          v-for="(entry, index) in currentEntries"
          :key="entry.uid"
          class="leaderboard-entry animate-item"
          :class="{ 'is-current-user': entry.uid === currentUserId }"
          :style="{ '--animation-delay': `${index * 0.05}s` }"
        >
          <LeaderboardEntry
            :entry="entry"
            :rank="computeRank(index)"
            :is-current-user="entry.uid === currentUserId"
            :show-actions="showActions"
            :is-frenemy="frenemiesSet.has(entry.uid)"
            @add-frenemy="handleAddFrenemy"
          />
        </div>

        <!-- Load More Button (Top tab only) -->
        <div v-if="activeTab === 'top' && hasMore" class="load-more">
          <button
            class="load-more-button"
            :disabled="isLoadingMore"
            @click="loadMore"
          >
            <span v-if="isLoadingMore">
              <span class="loader-small" aria-hidden="true"></span>
              Loading...
            </span>
            <span v-else>Load More</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, reactive } from 'vue';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { LeaderboardEntry as LeaderboardEntryType } from '@top-x/shared/types/game';
import {
  getTopLeaderboard,
  getAroundLeaderboard,
  getVipLeaderboard,
  getFriendsLeaderboard,
  type DateRange,
  type AroundResult,
} from '@/services/leaderboard';
import LeaderboardEntry from './LeaderboardEntry.vue';

// Types
type TabId = 'top' | 'around' | 'vip' | 'friends';

interface TabDefinition {
  id: TabId;
  label: string;
  icon: string[];
  requiresUserId: boolean;
}

interface CacheEntry {
  entries: LeaderboardEntryType[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  aroundData?: AroundResult;
  timestamp: number;
}

// Props
interface Props {
  gameId: string;
  currentUserId?: string;
  frenemies?: string[];
  defaultView?: TabId;
  defaultDateRange?: DateRange;
  showDateRange?: boolean;
  limit?: number;
  title?: string;
  dailyChallengeId?: string;
  refreshKey?: number | string; // When changed, clears cache and refetches
}

const props = withDefaults(defineProps<Props>(), {
  currentUserId: undefined,
  frenemies: () => [],
  defaultView: 'top',
  defaultDateRange: 'allTime',
  showDateRange: true,
  limit: 10,
  title: '',
  dailyChallengeId: undefined,
});

const emit = defineEmits<{
  (e: 'add-frenemy', uid: string): void;
}>();

// Tab definitions
const allTabs: TabDefinition[] = [
  { id: 'top', label: 'Top', icon: ['fas', 'trophy'], requiresUserId: false },
  { id: 'around', label: 'Around Me', icon: ['fas', 'crosshairs'], requiresUserId: true },
  { id: 'vip', label: 'VIP', icon: ['fas', 'star'], requiresUserId: false },
  { id: 'friends', label: 'Friends', icon: ['fas', 'user-friends'], requiresUserId: true },
];

const dateRangeOptions: { value: DateRange; label: string }[] = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'allTime', label: 'All Time' },
];

// State
const activeTab = ref<TabId>(props.defaultView);
const selectedDateRange = ref<DateRange>(props.defaultDateRange);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const error = ref<string | null>(null);

// Cache: keyed by `${tab}_${dateRange}`
const cache = reactive<Map<string, CacheEntry>>(new Map());

// Current data (derived from cache or fresh fetch)
const topEntries = ref<LeaderboardEntryType[]>([]);
const topCursor = ref<QueryDocumentSnapshot<DocumentData> | null>(null);
const aroundData = ref<AroundResult>({ above: [], current: null, below: [] });
const vipEntries = ref<LeaderboardEntryType[]>([]);
const friendsEntries = ref<LeaderboardEntryType[]>([]);

// Computed
const availableTabs = computed(() => {
  return allTabs.filter(tab => {
    if (tab.requiresUserId && !props.currentUserId) {
      return false;
    }
    return true;
  });
});

const showDateRangeSelector = computed(() => {
  return activeTab.value === 'top' || activeTab.value === 'around';
});

const currentEntries = computed(() => {
  switch (activeTab.value) {
    case 'top':
      return topEntries.value;
    case 'vip':
      return vipEntries.value;
    case 'friends':
      return friendsEntries.value;
    default:
      return [];
  }
});

const hasMore = computed(() => {
  return activeTab.value === 'top' && topCursor.value !== null;
});

const frenemiesSet = computed(() => new Set(props.frenemies));
const showActions = computed(() => props.currentUserId !== undefined);

const emptyMessage = computed(() => {
  switch (activeTab.value) {
    case 'top':
      return 'No leaderboard entries yet. Be the first to play!';
    case 'around':
      return 'Play to see your position on the leaderboard!';
    case 'vip':
      return 'No VIP players have played yet.';
    case 'friends':
      return 'None of your friends have played yet.';
    default:
      return 'No entries found.';
  }
});

// Cache key generator
const getCacheKey = (tab: TabId, dateRange: DateRange) => `${tab}_${dateRange}`;

// Clear cache when gameId changes
watch(() => props.gameId, () => {
  cache.clear();
  fetchCurrentTab();
});

// Refetch when refreshKey changes (e.g., after score submission)
watch(() => props.refreshKey, () => {
  if (props.refreshKey !== undefined) {
    cache.clear();
    fetchCurrentTab();
  }
});

// Expose refetch method for programmatic refresh
const refetch = () => {
  cache.clear();
  fetchCurrentTab();
};

defineExpose({ refetch });

// Methods
const switchTab = async (tabId: TabId) => {
  if (activeTab.value === tabId) return;
  activeTab.value = tabId;
  await fetchCurrentTab();
};

const switchDateRange = async (range: DateRange) => {
  if (selectedDateRange.value === range) return;
  selectedDateRange.value = range;
  await fetchCurrentTab();
};

const fetchCurrentTab = async () => {
  const cacheKey = getCacheKey(activeTab.value, selectedDateRange.value);
  const cached = cache.get(cacheKey);
  
  // Check cache (valid for 5 minutes)
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    applyCache(cached);
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    switch (activeTab.value) {
      case 'top':
        await fetchTop();
        break;
      case 'around':
        await fetchAround();
        break;
      case 'vip':
        await fetchVip();
        break;
      case 'friends':
        await fetchFriends();
        break;
    }
  } catch (e: any) {
    error.value = e?.message || 'Failed to load leaderboard';
  } finally {
    isLoading.value = false;
  }
};

const fetchTop = async () => {
  const result = await getTopLeaderboard(props.gameId, {
    limit: props.limit,
    dailyChallengeId: props.dailyChallengeId,
    dateRange: selectedDateRange.value,
  });

  if (result.error) {
    error.value = result.error;
    return;
  }

  topEntries.value = result.items;
  topCursor.value = result.nextCursor;

  // Cache result
  const cacheKey = getCacheKey('top', selectedDateRange.value);
  cache.set(cacheKey, {
    entries: result.items,
    cursor: result.nextCursor,
    timestamp: Date.now(),
  });
};

const fetchAround = async () => {
  if (!props.currentUserId) {
    error.value = 'You must be logged in to see your position';
    return;
  }

  const result = await getAroundLeaderboard(props.gameId, {
    uid: props.currentUserId,
    window: 5,
    dailyChallengeId: props.dailyChallengeId,
    dateRange: selectedDateRange.value,
  });

  if (result.error) {
    error.value = result.error;
    return;
  }

  aroundData.value = result;

  // Cache result
  const cacheKey = getCacheKey('around', selectedDateRange.value);
  cache.set(cacheKey, {
    entries: [],
    cursor: null,
    aroundData: result,
    timestamp: Date.now(),
  });
};

const fetchVip = async () => {
  const items = await getVipLeaderboard(props.gameId, {
    dailyChallengeId: props.dailyChallengeId,
  });

  vipEntries.value = items;

  // Cache result (VIP doesn't use date range)
  const cacheKey = getCacheKey('vip', 'allTime');
  cache.set(cacheKey, {
    entries: items,
    cursor: null,
    timestamp: Date.now(),
  });
};

const fetchFriends = async () => {
  if (!props.currentUserId) {
    error.value = 'You must be logged in to see friends';
    return;
  }

  const items = await getFriendsLeaderboard(props.gameId, props.currentUserId, {
    dailyChallengeId: props.dailyChallengeId,
  });

  friendsEntries.value = items;

  // Cache result (Friends doesn't use date range)
  const cacheKey = getCacheKey('friends', 'allTime');
  cache.set(cacheKey, {
    entries: items,
    cursor: null,
    timestamp: Date.now(),
  });
};

const loadMore = async () => {
  if (!topCursor.value || isLoadingMore.value) return;

  isLoadingMore.value = true;

  try {
    const result = await getTopLeaderboard(props.gameId, {
      limit: props.limit,
      cursor: topCursor.value,
      dailyChallengeId: props.dailyChallengeId,
      dateRange: selectedDateRange.value,
    });

    if (result.error) {
      error.value = result.error;
      return;
    }

    topEntries.value = [...topEntries.value, ...result.items];
    topCursor.value = result.nextCursor;

    // Update cache
    const cacheKey = getCacheKey('top', selectedDateRange.value);
    cache.set(cacheKey, {
      entries: topEntries.value,
      cursor: topCursor.value,
      timestamp: Date.now(),
    });
  } catch (e: any) {
    error.value = e?.message || 'Failed to load more';
  } finally {
    isLoadingMore.value = false;
  }
};

const applyCache = (cached: CacheEntry) => {
  switch (activeTab.value) {
    case 'top':
      topEntries.value = cached.entries;
      topCursor.value = cached.cursor;
      break;
    case 'around':
      if (cached.aroundData) {
        aroundData.value = cached.aroundData;
      }
      break;
    case 'vip':
      vipEntries.value = cached.entries;
      break;
    case 'friends':
      friendsEntries.value = cached.entries;
      break;
  }
};

const computeRank = (index: number) => {
  // For paginated lists, we need to account for already loaded entries
  return index + 1;
};

const computeAboveRank = (index: number) => {
  // Above entries are better ranked (lower number)
  return aroundData.value.above.length - index;
};

const computeBelowRank = (index: number) => {
  // Below entries start after current user
  return aroundData.value.above.length + 2 + index;
};

const handleAddFrenemy = (uid: string) => {
  emit('add-frenemy', uid);
};

// Initialize
onMounted(() => {
  fetchCurrentTab();
});
</script>

<style scoped>
.leaderboard-container {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}

.leaderboard-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 1rem;
  text-align: center;
}

/* Tab Navigation */
.leaderboard-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.25rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.tab-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: var(--color-text-primary);
  background: rgba(255, 255, 255, 0.05);
}

.tab-button.is-active {
  background: var(--color-primary);
  color: #fff;
}

.tab-icon {
  font-size: 0.9rem;
}

.tab-label {
  display: none;
}

@media (min-width: 480px) {
  .tab-label {
    display: inline;
  }
}

/* Date Range Selector */
.date-range-selector {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 1rem;
  padding: 0.2rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  overflow-x: auto;
}

.range-button {
  flex: 1;
  min-width: fit-content;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.range-button:hover {
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.05);
}

.range-button.is-active {
  background: rgba(var(--color-primary-rgb, 140, 82, 255), 0.2);
  color: var(--color-primary);
}

/* Content Area */
.leaderboard-content {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 1rem;
  min-height: 200px;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--color-text-secondary);
}

.loader {
  display: inline-block;
  width: 2rem;
  height: 2rem;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

.loader-small {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--color-text-danger, #ff6b6b);
  text-align: center;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
  opacity: 0.7;
}

.retry-button {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background: var(--color-primary);
  color: #fff;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--color-text-tertiary);
  text-align: center;
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  opacity: 0.3;
}

/* List View */
.list-view {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.leaderboard-entry {
  transition: transform 0.2s ease, background 0.2s ease;
}

.leaderboard-entry.is-current-user {
  background: rgba(var(--color-primary-rgb, 140, 82, 255), 0.15);
  border-radius: 12px;
}

/* Around View */
.around-view {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.around-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.above-section {
  opacity: 0.85;
}

.below-section {
  opacity: 0.85;
}

.current-section {
  position: relative;
  padding: 0.5rem 0;
}

.current-indicator {
  position: absolute;
  left: -0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: var(--color-primary);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  z-index: 1;
}

/* Load More */
.load-more {
  display: flex;
  justify-content: center;
  padding: 1rem 0 0.5rem;
}

.load-more-button {
  padding: 0.75rem 2rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.load-more-button:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.load-more-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Animations */
.animate-item {
  opacity: 0;
  transform: translateY(10px);
  animation: fade-slide 0.3s ease forwards;
  animation-delay: var(--animation-delay);
}

@keyframes fade-slide {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 480px) {
  .leaderboard-tabs {
    gap: 0.25rem;
  }

  .tab-button {
    padding: 0.6rem 0.5rem;
    font-size: 0.8rem;
  }

  .date-range-selector {
    gap: 0.25rem;
  }

  .range-button {
    padding: 0.4rem 0.5rem;
    font-size: 0.7rem;
  }

  .leaderboard-content {
    padding: 0.75rem;
  }
}
</style>
