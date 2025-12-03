<template>
  <div class="page-container games-page section-stack" :class="{ 'is-rtl': isRTL }">
    <section class="games-header layout-container">
      <h1 class="games-title">{{ t('games.title') }}</h1>
      <p v-if="filteredGames.length > 0" class="games-subtitle">
        {{ t('games.pagination.pageInfo', { start: displayStart, end: displayEnd, total: filteredGames.length }) }}
      </p>
    </section>

    <section class="games-body layout-container">
      <!-- Active Filters Chips (Mobile & Desktop) -->
      <div v-if="hasActiveFilters" class="active-filters">
        <div class="active-filters-chips">
          <span
            v-if="filterState.searchQuery"
            class="filter-chip"
          >
            <span>{{ t('games.search.label') }}: {{ filterState.searchQuery }}</span>
            <button
              type="button"
              class="filter-chip-remove"
              @click="clearSearch"
              :aria-label="t('games.filter.remove')"
            >
              ×
            </button>
          </span>
          <span
            v-for="gameTypeId in filterState.gameTypeIds"
            :key="`type-${gameTypeId}`"
            class="filter-chip"
          >
            <span>{{ getGameTypeName(gameTypeId) }}</span>
            <button
              type="button"
              class="filter-chip-remove"
              @click="toggleGameType(gameTypeId)"
              :aria-label="t('games.filter.remove')"
            >
              ×
            </button>
          </span>
          <span
            v-for="badgeKey in filterState.badgeKeys"
            :key="`badge-${badgeKey}`"
            class="filter-chip"
          >
            <font-awesome-icon :icon="getBadgeIcon(badgeKey)" />
            <span>{{ getBadgeLabel(badgeKey) }}</span>
            <button
              type="button"
              class="filter-chip-remove"
              @click="toggleBadge(badgeKey)"
              :aria-label="t('games.filter.remove')"
            >
              ×
            </button>
          </span>
          <span
            v-for="lang in filterState.languages"
            :key="`lang-${lang}`"
            class="filter-chip"
          >
            <span>{{ getLanguageLabel(lang) }}</span>
            <button
              type="button"
              class="filter-chip-remove"
              @click="toggleLanguage(lang)"
              :aria-label="t('games.filter.remove')"
            >
              ×
            </button>
          </span>
          <span
            v-if="filterState.creatorFilter"
            class="filter-chip"
          >
            <span>{{ t('games.filter.creator') }}: {{ filterState.creatorFilter }}</span>
            <button
              type="button"
              class="filter-chip-remove"
              @click="clearCreatorFilter"
              :aria-label="t('games.filter.remove')"
            >
              ×
            </button>
          </span>
        </div>
        <button
          type="button"
          class="clear-all-link"
          @click="clearAllFilters"
        >
          {{ t('games.filter.clearAll') }}
        </button>
      </div>

      <div class="games-layout">
        <!-- Filters Sidebar (Desktop) -->
        <aside class="games-filters">
          <div class="filters-surface">
            <h2 class="filters-title">{{ t('games.filters.title') }}</h2>

            <!-- Search -->
            <div class="filter-group">
              <label class="filter-label" for="games-search">{{ t('games.search.label') }}</label>
              <input
                id="games-search"
                v-model="filterState.searchQuery"
                type="text"
                class="filter-input"
                :placeholder="t('games.search.placeholder')"
                @input="onFilterChange"
              />
            </div>

            <!-- Game Type Filter -->
            <div class="filter-group">
              <label class="filter-label">{{ t('games.filter.gameType') }}</label>
              <div class="filter-checkboxes">
                <label
                  v-for="gameType in availableGameTypes"
                  :key="gameType.id"
                  class="filter-checkbox"
                >
                  <input
                    type="checkbox"
                    :value="gameType.id"
                    :checked="filterState.gameTypeIds.includes(gameType.id)"
                    @change="toggleGameType(gameType.id)"
                  />
                  <span>{{ gameType.name }}</span>
                </label>
              </div>
            </div>

            <!-- Badge Filter -->
            <div class="filter-group">
              <label class="filter-label">{{ t('games.filter.badge') }}</label>
              <div class="filter-checkboxes">
                <label
                  v-for="badge in availableBadges"
                  :key="badge.key"
                  class="filter-checkbox"
                >
                  <input
                    type="checkbox"
                    :value="badge.key"
                    :checked="filterState.badgeKeys.includes(badge.key)"
                    @change="toggleBadge(badge.key)"
                  />
                  <font-awesome-icon :icon="badge.icon" />
                  <span>{{ badge.label }}</span>
                </label>
              </div>
            </div>

            <!-- Language Filter -->
            <div class="filter-group">
              <label class="filter-label">{{ t('games.filter.language') }}</label>
              <div class="filter-checkboxes">
                <label
                  v-for="lang in availableLanguages"
                  :key="lang.key"
                  class="filter-checkbox"
                >
                  <input
                    type="checkbox"
                    :value="lang.key"
                    :checked="filterState.languages.includes(lang.key)"
                    @change="toggleLanguage(lang.key)"
                  />
                  <span>{{ lang.label }}</span>
                </label>
              </div>
            </div>

            <!-- Creator Filter -->
            <div class="filter-group">
              <label class="filter-label" for="games-creator">{{ t('games.filter.creator') }}</label>
              <input
                id="games-creator"
                v-model="filterState.creatorFilter"
                type="text"
                class="filter-input"
                :placeholder="t('games.filter.creatorPlaceholder')"
                @input="onFilterChange"
              />
            </div>

            <!-- Clear All -->
            <div class="filter-group">
              <CustomButton
                type="is-secondary"
                :label="t('games.filter.clearAll')"
                @click="clearAllFilters"
              />
            </div>
          </div>
        </aside>

        <!-- Mobile Filter Button -->
        <button
          type="button"
          class="mobile-filter-button"
          @click="showFiltersModal = true"
        >
          <font-awesome-icon :icon="['fas', 'filter']" />
          <span>{{ t('games.filters.title') }}</span>
          <span v-if="activeFiltersCount > 0" class="filter-badge">{{ activeFiltersCount }}</span>
        </button>

        <!-- Games Grid -->
        <div class="games-content">
          <div v-if="paginatedGames.length > 0" class="games-grid">
            <GameCard
              v-for="game in paginatedGames"
              :key="game.id"
              :game="game"
              :stats="gameStats[game.id]"
              :daily-challenge-active="Boolean(game.dailyChallengeActive)"
              :daily-challenge-label="t('home.labels.dailyChallenge')"
              :play-label="t('home.playNow')"
              button-type="is-primary"
              @select="navigateToGame"
            />
          </div>

          <p v-else-if="allGames.length > 0" class="games-empty">
            {{ t('games.empty') }}
          </p>

          <p v-else-if="!isLoading" class="games-empty">
            {{ t('games.loading') }}
          </p>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="games-pagination">
            <CustomButton
              type="is-secondary"
              :label="t('games.pagination.previous')"
              :disabled="currentPage === 1"
              @click="goToPage(currentPage - 1)"
            />
            <span class="pagination-info">
              {{ t('games.pagination.page', { current: currentPage, total: totalPages }) }}
            </span>
            <CustomButton
              type="is-secondary"
              :label="t('games.pagination.next')"
              :disabled="currentPage === totalPages"
              @click="goToPage(currentPage + 1)"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Filters Modal (Mobile) -->
    <div class="modal" :class="{ 'is-active': showFiltersModal }">
      <div class="modal-background" @click="showFiltersModal = false"></div>
      <div class="modal-content filters-modal">
        <div class="filters-modal-header">
          <h2 class="filters-title">{{ t('games.filters.title') }}</h2>
          <button
            type="button"
            class="modal-close is-large"
            aria-label="close"
            @click="showFiltersModal = false"
          ></button>
        </div>
        <div class="filters-modal-body">
          <!-- Search -->
          <div class="filter-group">
            <label class="filter-label" for="games-search-mobile">{{ t('games.search.label') }}</label>
            <input
              id="games-search-mobile"
              v-model="filterState.searchQuery"
              type="text"
              class="filter-input"
              :placeholder="t('games.search.placeholder')"
              @input="onFilterChange"
            />
          </div>

          <!-- Game Type Filter -->
          <div class="filter-group">
            <label class="filter-label">{{ t('games.filter.gameType') }}</label>
            <div class="filter-checkboxes">
              <label
                v-for="gameType in availableGameTypes"
                :key="gameType.id"
                class="filter-checkbox"
              >
                <input
                  type="checkbox"
                  :value="gameType.id"
                  :checked="filterState.gameTypeIds.includes(gameType.id)"
                  @change="toggleGameType(gameType.id)"
                />
                <span>{{ gameType.name }}</span>
              </label>
            </div>
          </div>

          <!-- Badge Filter -->
          <div class="filter-group">
            <label class="filter-label">{{ t('games.filter.badge') }}</label>
            <div class="filter-checkboxes">
              <label
                v-for="badge in availableBadges"
                :key="badge.key"
                class="filter-checkbox"
              >
                <input
                  type="checkbox"
                  :value="badge.key"
                  :checked="filterState.badgeKeys.includes(badge.key)"
                  @change="toggleBadge(badge.key)"
                />
                <font-awesome-icon :icon="badge.icon" />
                <span>{{ badge.label }}</span>
              </label>
            </div>
          </div>

          <!-- Language Filter -->
          <div class="filter-group">
            <label class="filter-label">{{ t('games.filter.language') }}</label>
            <div class="filter-checkboxes">
              <label
                v-for="lang in availableLanguages"
                :key="lang.key"
                class="filter-checkbox"
              >
                <input
                  type="checkbox"
                  :value="lang.key"
                  :checked="filterState.languages.includes(lang.key)"
                  @change="toggleLanguage(lang.key)"
                />
                <span>{{ lang.label }}</span>
              </label>
            </div>
          </div>

          <!-- Creator Filter -->
          <div class="filter-group">
            <label class="filter-label" for="games-creator-mobile">{{ t('games.filter.creator') }}</label>
            <input
              id="games-creator-mobile"
              v-model="filterState.creatorFilter"
              type="text"
              class="filter-input"
              :placeholder="t('games.filter.creatorPlaceholder')"
              @input="onFilterChange"
            />
          </div>

          <!-- Clear All -->
          <div class="filter-group">
            <CustomButton
              type="is-secondary"
              :label="t('games.filter.clearAll')"
              @click="clearAllFilters"
            />
          </div>
        </div>
        <div class="filters-modal-footer">
          <CustomButton
            type="is-primary"
            :label="t('games.filter.apply')"
            @click="showFiltersModal = false"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, reactive, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { useRouter } from 'vue-router';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { subscribeToGames, subscribeToGameStats } from '@/services/game';
import GameCard from '@/components/GameCard.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useLocaleStore } from '@/stores/locale';
import type { Game, GameType, GameBadgeKey } from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';
import { GAME_BADGE_DEFINITIONS } from '@top-x/shared/constants/gameBadges';

const router = useRouter();
const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);

const isRTL = computed(() => localeStore.direction === 'rtl');
const isLoading = ref(false);

// Data
const allGames = ref<Game[]>([]);
const gameStats = reactive<Record<string, Partial<GameStats>>>({});
const gameTypes = ref<GameType[]>([]);

// Filter state
interface FilterState {
  searchQuery: string;
  gameTypeIds: string[];
  badgeKeys: GameBadgeKey[];
  languages: ('en' | 'il')[];
  creatorFilter: string;
}

const defaultFilterState: FilterState = {
  searchQuery: '',
  gameTypeIds: [],
  badgeKeys: [],
  languages: [],
  creatorFilter: '',
};

const filterState = reactive<FilterState>({ ...defaultFilterState });

// Modal state
const showFiltersModal = ref(false);

// Pagination
const gamesPerPage = 12;
const currentPage = ref(1);

// Subscriptions
let gamesUnsubscribe: (() => void) | null = null;
let gameTypesUnsubscribe: (() => void) | null = null;
const statsUnsubscribers = new Map<string, () => void>();

// LocalStorage key
const STORAGE_KEY = 'games-page-filters';

// Available filter options
const availableGameTypes = computed(() => gameTypes.value);
const availableBadges = computed(() => {
  const language = localeStore.language;
  return Object.entries(GAME_BADGE_DEFINITIONS).map(([key, definition]) => ({
    key: key as GameBadgeKey,
    icon: definition.icon,
    label: definition.labels[language],
  }));
});
const availableLanguages = computed(() => [
  { key: 'en' as const, label: 'English' },
  { key: 'il' as const, label: 'Hebrew' },
]);

// Active filters count
const activeFiltersCount = computed(() => {
  let count = 0;
  if (filterState.searchQuery.trim()) count++;
  count += filterState.gameTypeIds.length;
  count += filterState.badgeKeys.length;
  count += filterState.languages.length;
  if (filterState.creatorFilter.trim()) count++;
  return count;
});

// Check if any filters are active
const hasActiveFilters = computed(() => activeFiltersCount.value > 0);

// Helper functions
function getGameTypeName(gameTypeId: string): string {
  const gameType = gameTypes.value.find((gt) => gt.id === gameTypeId);
  return gameType?.name || gameTypeId;
}

function getBadgeIcon(badgeKey: GameBadgeKey) {
  return GAME_BADGE_DEFINITIONS[badgeKey].icon;
}

function getBadgeLabel(badgeKey: GameBadgeKey): string {
  const language = localeStore.language;
  return GAME_BADGE_DEFINITIONS[badgeKey].labels[language];
}

function getLanguageLabel(lang: 'en' | 'il'): string {
  const langOption = availableLanguages.value.find((l) => l.key === lang);
  return langOption?.label || lang;
}

function clearSearch() {
  filterState.searchQuery = '';
  onFilterChange();
}

function clearCreatorFilter() {
  filterState.creatorFilter = '';
  onFilterChange();
}

// Filtered games
const filteredGames = computed(() => {
  let games = allGames.value.filter((game) => game.active);

  // Search filter (name or gameHeader)
  if (filterState.searchQuery.trim()) {
    const query = filterState.searchQuery.toLowerCase().trim();
    games = games.filter(
      (game) =>
        game.name.toLowerCase().includes(query) ||
        (game.gameHeader && game.gameHeader.toLowerCase().includes(query))
    );
  }

  // Game type filter
  if (filterState.gameTypeIds.length > 0) {
    games = games.filter((game) => filterState.gameTypeIds.includes(game.gameTypeId));
  }

  // Badge filter
  if (filterState.badgeKeys.length > 0) {
    games = games.filter((game) => {
      const gameBadges = game.badges || [];
      return filterState.badgeKeys.some((badgeKey) => gameBadges.includes(badgeKey));
    });
  }

  // Language filter
  if (filterState.languages.length > 0) {
    games = games.filter((game) => filterState.languages.includes(game.language || 'en'));
  }

  // Creator filter
  if (filterState.creatorFilter.trim()) {
    const creatorQuery = filterState.creatorFilter.toLowerCase().trim();
    games = games.filter((game) => {
      if (!game.creator) return false;
      return (
        game.creator.username?.toLowerCase().includes(creatorQuery) ||
        game.creator.userid?.toLowerCase().includes(creatorQuery)
      );
    });
  }

  // Sort by updatedAt (newest first)
  return games.sort((a, b) => {
    const aTime = a.updatedAt || a.createdAt || 0;
    const bTime = b.updatedAt || b.createdAt || 0;
    return bTime - aTime;
  });
});

// Pagination
const totalPages = computed(() => Math.ceil(filteredGames.value.length / gamesPerPage));
const paginatedGames = computed(() => {
  const start = (currentPage.value - 1) * gamesPerPage;
  const end = start + gamesPerPage;
  return filteredGames.value.slice(start, end);
});

const displayStart = computed(() => {
  if (filteredGames.value.length === 0) return 0;
  return (currentPage.value - 1) * gamesPerPage + 1;
});

const displayEnd = computed(() => {
  const end = currentPage.value * gamesPerPage;
  return Math.min(end, filteredGames.value.length);
});

// Filter handlers
function toggleGameType(gameTypeId: string) {
  const index = filterState.gameTypeIds.indexOf(gameTypeId);
  if (index > -1) {
    filterState.gameTypeIds.splice(index, 1);
  } else {
    filterState.gameTypeIds.push(gameTypeId);
  }
  onFilterChange();
}

function toggleBadge(badgeKey: GameBadgeKey) {
  const index = filterState.badgeKeys.indexOf(badgeKey);
  if (index > -1) {
    filterState.badgeKeys.splice(index, 1);
  } else {
    filterState.badgeKeys.push(badgeKey);
  }
  onFilterChange();
}

function toggleLanguage(language: 'en' | 'il') {
  const index = filterState.languages.indexOf(language);
  if (index > -1) {
    filterState.languages.splice(index, 1);
  } else {
    filterState.languages.push(language);
  }
  onFilterChange();
}

function clearAllFilters() {
  Object.assign(filterState, { ...defaultFilterState });
  onFilterChange();
}

function onFilterChange() {
  currentPage.value = 1; // Reset to first page when filters change
  saveFiltersToLocalStorage();
}

// Pagination handlers
function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// LocalStorage
function loadFiltersFromLocalStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as FilterState;
      Object.assign(filterState, parsed);
    }
  } catch (error) {
    console.error('Error loading filters from localStorage:', error);
  }
}

function saveFiltersToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filterState));
  } catch (error) {
    console.error('Error saving filters to localStorage:', error);
  }
}

// Navigation
function navigateToGame(gameId: string, gameTypeId: string) {
  router.push(`/games/info?game=${gameId}`);
}

// Stats subscription
function subscribeToGameStatsLocal(gameId: string) {
  if (statsUnsubscribers.has(gameId)) {
    return;
  }

  const unsubscribe = subscribeToGameStats(gameId, (stats, error) => {
    if (error) {
      console.error(`Games: Error fetching stats for game ${gameId}:`, error);
      delete gameStats[gameId];
    } else {
      if (stats) {
        gameStats[gameId] = stats;
      } else {
        delete gameStats[gameId];
      }
    }
  });

  statsUnsubscribers.set(gameId, unsubscribe);
}

function cleanupStatsSubscriptions(activeGameIds: Set<string>) {
  for (const [gameId, unsubscribe] of statsUnsubscribers) {
    if (!activeGameIds.has(gameId)) {
      unsubscribe();
      statsUnsubscribers.delete(gameId);
      delete gameStats[gameId];
    }
  }
}

// Watch games changes to update stats subscriptions
watch(
  () => allGames.value.map((g) => g.id),
  (gameIds) => {
    const activeIds = new Set(gameIds);
    gameIds.forEach((gameId) => {
      subscribeToGameStatsLocal(gameId);
    });
    cleanupStatsSubscriptions(activeIds);
  }
);

// Watch filter changes to reset page
watch(
  [
    () => filterState.searchQuery,
    () => filterState.gameTypeIds.length,
    () => filterState.badgeKeys.length,
    () => filterState.languages.length,
    () => filterState.creatorFilter,
  ],
  () => {
    if (currentPage.value > totalPages.value && totalPages.value > 0) {
      currentPage.value = totalPages.value;
    }
  }
);

// Lifecycle
onMounted(() => {
  // Load filters from localStorage
  loadFiltersFromLocalStorage();

  // Subscribe to games
  isLoading.value = true;
  gamesUnsubscribe = subscribeToGames(
    (games, error) => {
      isLoading.value = false;
      if (error) {
        console.error('Games: Error fetching games:', error);
        return;
      }
      // Filter active games only
      allGames.value = games.filter((game) => game.active);
    },
    { activeOnly: false } // We filter manually to maintain control
  );

  // Subscribe to game types
  const gameTypesQuery = query(collection(db, 'gameTypes'));
  gameTypesUnsubscribe = onSnapshot(
    gameTypesQuery,
    (snapshot) => {
      gameTypes.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as GameType),
      }));
    },
    (err) => {
      console.error('Games: Error fetching game types:', err);
    }
  );
});

onBeforeUnmount(() => {
  if (gamesUnsubscribe) {
    gamesUnsubscribe();
    gamesUnsubscribe = null;
  }
  if (gameTypesUnsubscribe) {
    gameTypesUnsubscribe();
    gameTypesUnsubscribe = null;
  }
  for (const unsubscribe of statsUnsubscribers.values()) {
    unsubscribe();
  }
  statsUnsubscribers.clear();
});

// SEO
useHead(() => ({
  title: t('games.meta.title'),
  meta: [
    {
      name: 'description',
      content: t('games.meta.description'),
    },
  ],
}));
</script>

<style scoped>
.games-page {
  --section-stack-gap: var(--space-6);
  padding-block: var(--space-6);
}

.games-page.is-rtl {
  direction: rtl;
}

.games-header {
  text-align: center;
  padding-block: var(--space-6);
}

.games-title {
  margin: 0;
  font-size: clamp(2rem, 3vw + 1.5rem, 3.5rem);
  font-weight: 800;
  color: var(--color-text-primary);
}

.games-subtitle {
  margin: var(--space-3) 0 0;
  color: var(--color-text-secondary);
  font-size: 1.1rem;
}

.games-body {
  padding-block: var(--space-4);
}

/* Active Filters Chips */
.active-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-md);
}

.active-filters-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  flex: 1;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  color: var(--bulma-primary);
}

.filter-chip svg {
  font-size: 0.875rem;
}

.filter-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  margin-left: var(--space-1);
  border: none;
  background: transparent;
  color: var(--bulma-primary);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color var(--transition-fast);
}

.filter-chip-remove:hover {
  background-color: var(--color-primary-bg-hover);
}

.clear-all-link {
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.clear-all-link:hover {
  color: var(--bulma-primary);
}

/* Mobile Filter Button */
.mobile-filter-button {
  display: none;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-md);
  background-color: var(--color-primary-bg);
  color: var(--bulma-primary);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
  position: relative;
}

.mobile-filter-button:hover {
  background-color: var(--color-primary-bg-hover);
  border-color: var(--color-border-primary);
}

.mobile-filter-button svg {
  font-size: 1.1rem;
}

.filter-badge {
  position: absolute;
  top: var(--space-2);
  inset-inline-end: var(--space-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 var(--space-1);
  background-color: var(--bulma-primary);
  color: var(--color-text-on-primary);
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
}

.games-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-6);
  align-items: start;
}

.filters-surface {
  position: sticky;
  top: calc(var(--navbar-height, 80px) + var(--space-4));
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-height: calc(100vh - var(--navbar-height, 80px) - var(--space-8));
  overflow-y: auto;
}

.filters-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border-base);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.filter-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.filter-input {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-surface);
  color: var(--color-text-primary);
  font-size: 0.95rem;
  transition: border-color var(--transition-fast);
}

.filter-input:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.filter-checkboxes {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  transition: background-color var(--transition-fast);
  font-size: 0.9rem;
}

.filter-checkbox:hover {
  background-color: var(--color-primary-bg);
}

.filter-checkbox input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--bulma-primary);
}

.filter-checkbox svg {
  color: var(--bulma-primary);
  font-size: 0.9rem;
}

.games-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-5);
}

.games-empty {
  text-align: center;
  padding: var(--space-8);
  color: var(--color-text-secondary);
  font-size: 1.1rem;
}

.games-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-4);
}

.pagination-info {
  color: var(--color-text-secondary);
  font-weight: 600;
}

/* Filters Modal */
.filters-modal {
  max-width: 90vw;
  max-height: 90vh;
  width: 100%;
  background-color: var(--color-bg-card);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.filters-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5);
  border-bottom: 1px solid var(--color-border-base);
}

.filters-modal-header .filters-title {
  margin: 0;
  padding: 0;
  border: none;
}

.filters-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.filters-modal-footer {
  padding: var(--space-5);
  border-top: 1px solid var(--color-border-base);
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1024px) {
  .games-layout {
    grid-template-columns: 1fr;
  }

  .games-filters {
    display: none;
  }

  .mobile-filter-button {
    display: flex;
  }

  .filters-surface {
    position: static;
    max-height: none;
  }
}

@media (max-width: 768px) {
  .games-grid {
    grid-template-columns: 1fr;
  }

  .games-pagination {
    flex-direction: column;
    gap: var(--space-3);
  }

  .active-filters {
    flex-direction: column;
    align-items: flex-start;
  }

  .filters-modal {
    max-width: 100vw;
    max-height: 100vh;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }
}
</style>

