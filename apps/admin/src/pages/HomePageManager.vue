<template>
  <section class="section home-manager">
    <div class="container">
      <header class="home-manager__header">
        <div>
          <h1 class="title">Homepage</h1>
          <p class="subtitle">Curate what players see on the client home screen.</p>
        </div>
        <div class="buttons">
          <button class="button is-light" type="button" @click="resetForm" :disabled="isSaving || !isDirty">
            Reset
          </button>
          <button class="button is-primary" type="button" @click="saveHomeConfig" :disabled="isSaving || !isDirty">
            <span v-if="isSaving" class="loader is-inline"></span>
            <span>{{ isSaving ? 'Saving…' : 'Save changes' }}</span>
          </button>
        </div>
      </header>

      <div v-if="configError" class="notification is-danger">
        <p class="has-text-weight-semibold">We couldn’t load the homepage configuration.</p>
        <p>{{ configError }}</p>
      </div>

      <div v-else>
        <div v-if="isLoadingConfig" class="has-text-centered py-6">
          <progress class="progress is-small is-link" max="100">Loading</progress>
          <p class="is-size-6 has-text-grey">Fetching homepage settings…</p>
        </div>

        <div v-else class="home-manager__grid">
          <article class="card home-manager__card">
            <header class="card-header">
              <p class="card-header-title">TOP-X games ordering</p>
            </header>
            <div class="card-content">
              <p class="mb-4">Control how official games are sorted and displayed on the homepage.</p>
              <div class="field">
                <label class="label">Sort field</label>
                <div class="control">
                  <div class="select is-fullwidth">
                    <select v-model="homeConfigForm.topX.sort.field">
                      <option v-for="field in sortFieldOptions" :key="field.value" :value="field.value">
                        {{ field.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="field">
                <label class="label">Direction</label>
                <div class="control">
                  <div class="select is-fullwidth">
                    <select v-model="homeConfigForm.topX.sort.direction">
                      <option v-for="direction in sortDirectionOptions" :key="direction.value" :value="direction.value">
                        {{ direction.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="home-manager__field-row">
                <div class="field">
                  <label class="label">Max rows</label>
                  <div class="control">
                    <input
                      class="input"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Auto"
                      v-model.number="homeConfigForm.topX.maxRows"
                    />
                  </div>
                </div>
                <div class="field">
                  <label class="label">Games per row</label>
                  <div class="control">
                    <input
                      class="input"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Auto"
                      v-model.number="homeConfigForm.topX.itemsPerRow"
                    />
                  </div>
                </div>
              </div>
              <div class="field">
                <label class="label">Max games</label>
                <div class="control">
                  <input
                    class="input"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Show all"
                    v-model.number="homeConfigForm.topX.limit"
                  />
                </div>
                <p class="help">Leave fields blank to use the default grid.</p>
              </div>
            </div>
          </article>

          <article class="card home-manager__card">
            <header class="card-header">
              <p class="card-header-title">Hot games layout</p>
            </header>
            <div class="card-content">
              <p class="mb-4">Most sessions across all games (official and community).</p>
              <div class="home-manager__field-row">
                <div class="field">
                  <label class="label">Max rows</label>
                  <div class="control">
                    <input
                      class="input"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Auto"
                      v-model.number="homeConfigForm.hot.maxRows"
                    />
                  </div>
                </div>
                <div class="field">
                  <label class="label">Games per row</label>
                  <div class="control">
                    <input
                      class="input"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Auto"
                      v-model.number="homeConfigForm.hot.itemsPerRow"
                    />
                  </div>
                </div>
              </div>
              <div class="field">
                <label class="label">Max games</label>
                <div class="control">
                  <input
                    class="input"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Show all"
                    v-model.number="homeConfigForm.hot.limit"
                  />
                </div>
                <p class="help">Sorting is fixed to most sessions (descending).</p>
              </div>
            </div>
          </article>

          <article class="card home-manager__card">
            <header class="card-header">
              <p class="card-header-title">Community games ordering</p>
            </header>
            <div class="card-content">
              <p class="mb-4">Use the same controls to highlight community creations.</p>
              <div class="field">
                <label class="label">Sort field</label>
                <div class="control">
                  <div class="select is-fullwidth">
                    <select v-model="homeConfigForm.community.sort.field">
                      <option v-for="field in sortFieldOptions" :key="field.value" :value="field.value">
                        {{ field.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="field">
                <label class="label">Direction</label>
                <div class="control">
                  <div class="select is-fullwidth">
                    <select v-model="homeConfigForm.community.sort.direction">
                      <option v-for="direction in sortDirectionOptions" :key="direction.value" :value="direction.value">
                        {{ direction.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="home-manager__field-row">
                <div class="field">
                  <label class="label">Max rows</label>
                  <div class="control">
                    <input
                      class="input"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Auto"
                      v-model.number="homeConfigForm.community.maxRows"
                    />
                  </div>
                </div>
                <div class="field">
                  <label class="label">Games per row</label>
                  <div class="control">
                    <input
                      class="input"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Auto"
                      v-model.number="homeConfigForm.community.itemsPerRow"
                    />
                  </div>
                </div>
              </div>
              <div class="field">
                <label class="label">Max games</label>
                <div class="control">
                  <input
                    class="input"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Show all"
                    v-model.number="homeConfigForm.community.limit"
                  />
                </div>
                <p class="help">Leave fields blank to use the default community grid.</p>
              </div>
            </div>
          </article>

          <article class="card home-manager__card home-manager__card--wide">
            <header class="card-header">
              <p class="card-header-title">Game manager</p>
            </header>
            <div class="card-content home-manager__game-manager">
              <div class="home-manager__search">
                <div class="field has-addons">
                  <div class="control is-expanded">
                    <input
                      class="input"
                      type="search"
                      placeholder="Search games by name..."
                      v-model="searchQuery"
                    />
                  </div>
                  <div class="control">
                    <button class="button is-light" type="button" @click="searchQuery = ''" :disabled="!searchQuery">
                      Clear
                    </button>
                  </div>
                </div>
                <p class="help">Type at least two characters to search. Up to 25 matches are shown.</p>
              </div>

              <div v-if="searchQuery.length >= 2 && filteredGames.length" class="home-manager__search-results">
                <article
                  v-for="game in filteredGames"
                  :key="game.id"
                  class="home-manager__search-result"
                  :class="{ 'is-hidden-game': isGameHidden(game.id) }"
                >
                  <div class="home-manager__search-meta">
                    <h3 class="has-text-weight-semibold">{{ game.name }}</h3>
                    <p class="is-size-7 has-text-grey">
                      {{ game.community ? 'Community' : 'Official' }} · {{ game.language?.toUpperCase() }} · {{ game.gameTypeId }}
                    </p>
                    <div class="home-manager__search-badges">
                      <span
                        v-for="badge in getBadgeChips(game)"
                        :key="badge.key"
                        class="tag is-info is-light is-rounded"
                      >
                        <span class="icon is-small mr-1"><font-awesome-icon :icon="badge.icon" /></span>
                        {{ badge.label }}
                      </span>
                      <span v-if="!getBadgeChips(game).length" class="is-size-7 has-text-grey-light">No badges</span>
                    </div>
                  </div>
                  <div class="home-manager__search-actions">
                    <div class="buttons are-small">
                      <button
                        class="button is-link"
                        type="button"
                        :disabled="isGameFeatured(game.id)"
                        @click="addGameToFeatured(game.id)"
                      >
                        Feature
                      </button>
                      <button
                        class="button"
                        type="button"
                        :class="isGameHidden(game.id) ? 'is-warning' : 'is-light'"
                        @click="isGameHidden(game.id) ? unhideGame(game.id) : hideGame(game.id)"
                      >
                        {{ isGameHidden(game.id) ? 'Unhide' : 'Hide from homepage' }}
                      </button>
                    </div>
                    <div class="home-manager__badge-toggles">
                      <span class="is-size-7 has-text-grey">Badges</span>
                      <div class="buttons are-small">
                        <button
                          v-for="option in badgeOptions"
                          :key="option.key"
                          class="button"
                          :class="isBadgeActive(game, option.key) ? 'is-info' : 'is-light'"
                          type="button"
                          :disabled="isBadgeUpdating(game.id)"
                          @click="toggleGameBadge(game, option.key)"
                        >
                          <span class="icon is-small mr-1"><font-awesome-icon :icon="option.icon" /></span>
                          {{ option.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
              <p v-else-if="searchQuery.length >= 2" class="notification is-light">
                No games matched “{{ searchQuery }}”.
              </p>
              <p v-else class="is-size-7 has-text-grey">
                Start typing to search for games to feature, hide, or edit badges.
              </p>

              <section class="home-manager__section">
                <header class="home-manager__section-header">
                  <h3 class="title is-5">Featured games</h3>
                  <p class="is-size-7 has-text-grey">Ordered exactly as they will appear on the homepage.</p>
                </header>
                <ul v-if="featuredEntries.length" class="home-manager__list">
                  <li v-for="(entry, index) in featuredEntries" :key="entry.id" class="home-manager__list-item">
                    <div class="home-manager__list-details">
                      <div class="home-manager__list-heading">
                        <p class="has-text-weight-semibold">{{ entry.game?.name || 'Missing game' }}</p>
                        <p class="is-size-7 has-text-grey">
                          <span>{{ entry.game ? (entry.game.community ? 'Community' : 'Official') : 'Unavailable' }}</span>
                          <span>·</span>
                          <span>{{ entry.game ? entry.game.language?.toUpperCase() : entry.id }}</span>
                        </p>
                      </div>
                      <ul v-if="getBadgeChips(entry.game).length" class="home-manager__badge-list">
                        <li v-for="badge in getBadgeChips(entry.game)" :key="badge.key" class="home-manager__badge">
                          <span class="icon is-small">
                            <font-awesome-icon :icon="badge.icon" aria-hidden="true" />
                          </span>
                          <span>{{ badge.label }}</span>
                        </li>
                      </ul>
                    </div>
                    <div class="buttons are-small">
                      <button
                        class="button"
                        type="button"
                        :disabled="index === 0"
                        @click="moveFeatured(index, -1)"
                        aria-label="Move up"
                      >
                        <span class="icon"><font-awesome-icon icon="arrow-up" aria-hidden="true" /></span>
                      </button>
                      <button
                        class="button"
                        type="button"
                        :disabled="index === featuredEntries.length - 1"
                        @click="moveFeatured(index, 1)"
                        aria-label="Move down"
                      >
                        <span class="icon"><font-awesome-icon icon="arrow-down" aria-hidden="true" /></span>
                      </button>
                      <button class="button is-danger" type="button" @click="removeFeatured(index)" aria-label="Remove">
                        <span class="icon"><font-awesome-icon icon="trash" aria-hidden="true" /></span>
                      </button>
                    </div>
                  </li>
                </ul>
                <p v-else class="notification is-light">No featured games selected yet.</p>
              </section>

              <section class="home-manager__section">
                <header class="home-manager__section-header">
                  <h3 class="title is-5">Hidden games</h3>
                  <p class="is-size-7 has-text-grey">
                    Hidden games stay live but won’t appear on the homepage.
                  </p>
                </header>
                <ul v-if="hiddenGameEntries.length" class="home-manager__list">
                  <li v-for="entry in hiddenGameEntries" :key="entry.id" class="home-manager__list-item">
                    <div class="home-manager__list-details">
                      <p class="has-text-weight-semibold">{{ entry.game?.name || entry.id }}</p>
                      <p v-if="entry.game" class="is-size-7 has-text-grey">
                        {{ entry.game.community ? 'Community' : 'Official' }} · {{ entry.game.language?.toUpperCase() }}
                      </p>
                    </div>
                    <div class="buttons are-small">
                      <button class="button is-light" type="button" @click="unhideGame(entry.id)">
                        <span class="icon"><font-awesome-icon icon="eye" /></span>
                        <span>Unhide</span>
                      </button>
                    </div>
                  </li>
                </ul>
                <p v-else class="notification is-light">No games are hidden right now.</p>
              </section>
            </div>
            </article>
          <article class="card home-manager__card home-manager__card--wide">
            <header class="card-header">
              <p class="card-header-title">Build section</p>
            </header>
            <div class="card-content">
              <p class="mb-4">Choose which templates are highlighted beneath the build call-to-action.</p>
              <ul v-if="buildEntries.length" class="home-manager__list">
                <li v-for="(entry, index) in buildEntries" :key="entry.id" class="home-manager__list-item">
                  <div class="home-manager__list-details">
                    <p class="has-text-weight-semibold">{{ entry.type?.name || 'Missing game type' }}</p>
                    <p class="is-size-7 has-text-grey">{{ entry.type?.description || entry.id }}</p>
                  </div>
                  <div class="buttons are-small">
                    <button
                      class="button"
                      type="button"
                      :disabled="index === 0"
                      @click="moveBuild(index, -1)"
                      aria-label="Move up"
                    >
                      <span class="icon"><font-awesome-icon icon="arrow-up" aria-hidden="true" /></span>
                    </button>
                    <button
                      class="button"
                      type="button"
                      :disabled="index === buildEntries.length - 1"
                      @click="moveBuild(index, 1)"
                      aria-label="Move down"
                    >
                      <span class="icon"><font-awesome-icon icon="arrow-down" aria-hidden="true" /></span>
                    </button>
                    <button class="button is-danger" type="button" @click="removeBuild(index)" aria-label="Remove">
                      <span class="icon"><font-awesome-icon icon="trash" aria-hidden="true" /></span>
                    </button>
                  </div>
                </li>
              </ul>
              <p v-else class="notification is-light">No templates highlighted yet.</p>

              <div class="field mt-4">
                <label class="label">Add a template</label>
                <div class="field has-addons">
                  <div class="control is-expanded">
                    <div class="select is-fullwidth">
                      <select v-model="selectedBuildCandidate">
                        <option value="" disabled>Select a template</option>
                        <option v-for="type in availableBuildOptions" :key="type.id" :value="type.id">
                          {{ type.name }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="control">
                    <button class="button is-link" type="button" :disabled="!selectedBuildCandidate" @click="addBuild">
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <transition name="fade">
        <div v-if="saveFeedback" class="notification" :class="saveFeedback.type === 'success' ? 'is-success' : 'is-danger'">
          {{ saveFeedback.message }}
        </div>
      </transition>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { doc, onSnapshot, setDoc, updateDoc, where, deleteField } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useCollection } from '@top-x/shared/api/useCollection';
import type { Game, GameBadgeKey, GameType } from '@top-x/shared/types/game';
import type { HomeCollectionConfig, HomePageConfig, HomeOrderField } from '@top-x/shared/types/home';
import { defaultHomePageConfig } from '@top-x/shared/types/home';
import { useUserStore } from '@/stores/user';
import { GAME_BADGE_DEFINITIONS } from '@top-x/shared/constants/gameBadges';

interface FeaturedEntry {
  id: string;
  game?: Game;
}

interface BuildEntry {
  id: string;
  type?: GameType;
}

const userStore = useUserStore();
const user = computed(() => userStore.user);

const gamesCollection = useCollection<Game>('games', {
  transform: (snapshot) => ({ id: snapshot.id, ...(snapshot.data() as Game) }),
});

const gameTypesCollection = useCollection<GameType>('gameTypes', {
  constraints: [where('availableToBuild', '==', true)],
  transform: (snapshot) => ({ id: snapshot.id, ...(snapshot.data() as GameType) }),
});

const homeConfigForm = ref<HomePageConfig>({ ...defaultHomePageConfig });
const initialConfig = ref<HomePageConfig>({ ...defaultHomePageConfig });
const comparableSnapshot = ref(toComparable(defaultHomePageConfig));
const isSaving = ref(false);
const isLoadingConfig = ref(true);
const configError = ref<string | null>(null);
const saveFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null);
const selectedBuildCandidate = ref('');
const searchQuery = ref('');
const badgeMutationState = ref<Record<string, boolean>>({});
let configUnsubscribe: (() => void) | null = null;

const sortFieldOptions: Array<{ label: string; value: HomeOrderField }> = [
  { label: 'Date', value: 'date' },
  { label: 'Players', value: 'players' },
  { label: 'Favorites', value: 'favorites' },
  { label: 'Sessions', value: 'sessions' },
];

const sortDirectionOptions = [
  { label: 'Descending', value: 'desc' },
  { label: 'Ascending', value: 'asc' },
];

const isDirty = computed(() => toComparable(homeConfigForm.value) !== comparableSnapshot.value);

const gamesMap = computed(() => new Map(gamesCollection.data.value.map((game) => [game.id, game])));
const gameTypesMap = computed(() => new Map(gameTypesCollection.data.value.map((type) => [type.id, type])));

const featuredEntries = computed<FeaturedEntry[]>(() =>
  homeConfigForm.value.featured.gameIds.map((id) => ({ id, game: gamesMap.value.get(id) })),
);

const buildEntries = computed<BuildEntry[]>(() =>
  homeConfigForm.value.build.gameTypeIds.map((id) => ({ id, type: gameTypesMap.value.get(id) })),
);

const availableBuildOptions = computed(() => {
  const selected = new Set(homeConfigForm.value.build.gameTypeIds);
  return gameTypesCollection.data.value
    .filter((type) => !selected.has(type.id))
    .sort((a, b) => a.name.localeCompare(b.name));
});

const hiddenGameEntries = computed(() =>
  homeConfigForm.value.hiddenGameIds
    .map((id) => ({ id, game: gamesMap.value.get(id) }))
    .filter((entry, index, arr) => arr.findIndex((e) => e.id === entry.id) === index),
);

const badgeOptions = computed(() =>
  Object.entries(GAME_BADGE_DEFINITIONS).map(([key, definition]) => ({
    key: key as GameBadgeKey,
    icon: definition.icon,
    label: definition.labels.en,
  })),
);

const normalizedSearch = computed(() => searchQuery.value.trim().toLowerCase());
const filteredGames = computed(() => {
  if (normalizedSearch.value.length < 2) {
    return [];
  }
  return gamesCollection.data.value
    .filter((game) => game.name.toLowerCase().includes(normalizedSearch.value))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 25);
});

type BadgeChip = {
  key: GameBadgeKey;
  icon: [string, string];
  label: string;
};

function isBadgeKey(value: unknown): value is GameBadgeKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(GAME_BADGE_DEFINITIONS, value);
}

function getBadgeChips(game?: Partial<Pick<Game, 'badges'>> | null): BadgeChip[] {
  const badges = Array.isArray(game?.badges) ? game?.badges : [];
  return badges
    .filter(isBadgeKey)
    .map((badge) => ({
      key: badge,
      icon: GAME_BADGE_DEFINITIONS[badge].icon,
      label: GAME_BADGE_DEFINITIONS[badge].labels.en,
    }));
}

function normalizeOptionalPositive(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return null;
}

watch(
  () => homeConfigForm.value.topX.maxRows,
  (value) => {
    const normalized = normalizeOptionalPositive(value);
    if (normalized !== (value ?? null)) {
      homeConfigForm.value.topX.maxRows = normalized;
    }
  },
);

watch(
  () => homeConfigForm.value.topX.itemsPerRow,
  (value) => {
    const normalized = normalizeOptionalPositive(value);
    if (normalized !== (value ?? null)) {
      homeConfigForm.value.topX.itemsPerRow = normalized;
    }
  },
);

watch(
  () => homeConfigForm.value.community.maxRows,
  (value) => {
    const normalized = normalizeOptionalPositive(value);
    if (normalized !== (value ?? null)) {
      homeConfigForm.value.community.maxRows = normalized;
    }
  },
);

watch(
  () => homeConfigForm.value.community.itemsPerRow,
  (value) => {
    const normalized = normalizeOptionalPositive(value);
    if (normalized !== (value ?? null)) {
      homeConfigForm.value.community.itemsPerRow = normalized;
    }
  },
);

watch(
  () => homeConfigForm.value.topX.limit,
  (value) => {
    const normalized = normalizeOptionalPositive(value);
    if (normalized !== (value ?? null)) {
      homeConfigForm.value.topX.limit = normalized;
    }
  },
);

watch(
  () => homeConfigForm.value.community.limit,
  (value) => {
    const normalized = normalizeOptionalPositive(value);
    if (normalized !== (value ?? null)) {
      homeConfigForm.value.community.limit = normalized;
    }
  },
);

watch(
  () => homeConfigForm.value.hot.maxRows,
  (value) => {
    const normalized = normalizeOptionalPositive(value);
    if (normalized !== (value ?? null)) {
      homeConfigForm.value.hot.maxRows = normalized;
    }
  },
);

watch(
  () => homeConfigForm.value.hot.itemsPerRow,
  (value) => {
    const normalized = normalizeOptionalPositive(value);
    if (normalized !== (value ?? null)) {
      homeConfigForm.value.hot.itemsPerRow = normalized;
    }
  },
);

watch(
  () => homeConfigForm.value.hot.limit,
  (value) => {
    const normalized = normalizeOptionalPositive(value);
    if (normalized !== (value ?? null)) {
      homeConfigForm.value.hot.limit = normalized;
    }
  },
);

onMounted(() => {
  const configRef = doc(db, 'config', 'homepage');
  configUnsubscribe = onSnapshot(
    configRef,
    (snapshot) => {
      const raw = snapshot.exists() ? (snapshot.data() as Partial<HomePageConfig>) : undefined;
      const normalized = normalizeHomeConfig(raw);
      applyConfig(normalized);
    },
    (error) => {
      console.error('Admin: failed to load homepage config', error);
      configError.value = error.message;
      isLoadingConfig.value = false;
    },
  );
});

onBeforeUnmount(() => {
  if (configUnsubscribe) {
    configUnsubscribe();
    configUnsubscribe = null;
  }
});

function normalizeHomeConfig(raw: Partial<HomePageConfig> | undefined): HomePageConfig {
  const base = { ...defaultHomePageConfig };
  const resolveLimit = (value: unknown, fallback: number | null | undefined) => {
    if (typeof value === 'number') {
      return value;
    }
    if (value === null) {
      return null;
    }
    return fallback ?? null;
  };
  const resolveMaxRowsField = (
    section: Partial<HomeCollectionConfig> | undefined,
    fallback: number | null | undefined,
  ): number | null | undefined => {
    const candidate = (section?.maxRows ?? (section as { rows?: unknown })?.rows) as unknown;
    if (candidate === null) {
      return null;
    }
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      return Math.floor(candidate);
    }
    return fallback ?? null;
  };
  const resolveItemsPerRowField = (value: unknown, fallback: number | null | undefined) => {
    if (value === null) {
      return null;
    }
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
    return fallback ?? null;
  };
  if (!raw) {
    return base;
  }
  return {
    featured: {
      gameIds: Array.isArray(raw.featured?.gameIds) ? [...raw.featured.gameIds] : base.featured.gameIds,
    },
    topX: {
      sort: raw.topX?.sort ?? base.topX.sort,
      limit: resolveLimit(raw.topX?.limit, base.topX.limit),
      maxRows: resolveMaxRowsField(raw.topX, base.topX.maxRows),
      itemsPerRow: resolveItemsPerRowField(raw.topX?.itemsPerRow, base.topX.itemsPerRow),
    },
    hot: {
      // hot section is always sessions-based; allow overriding from DB if present, else default
      sort: raw.hot?.sort ?? base.hot.sort,
      limit: resolveLimit(raw.hot?.limit, base.hot.limit),
      maxRows: resolveMaxRowsField(raw.hot, base.hot.maxRows),
      itemsPerRow: resolveItemsPerRowField(raw.hot?.itemsPerRow, base.hot.itemsPerRow),
    },
    community: {
      sort: raw.community?.sort ?? base.community.sort,
      limit: resolveLimit(raw.community?.limit, base.community.limit),
      maxRows: resolveMaxRowsField(raw.community, base.community.maxRows),
      itemsPerRow: resolveItemsPerRowField(raw.community?.itemsPerRow, base.community.itemsPerRow),
    },
    hiddenGameIds: Array.isArray(raw.hiddenGameIds) ? [...raw.hiddenGameIds] : base.hiddenGameIds,
    build: {
      gameTypeIds: Array.isArray(raw.build?.gameTypeIds) ? [...raw.build.gameTypeIds] : base.build.gameTypeIds,
    },
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy,
  };
}

function applyConfig(config: HomePageConfig) {
  initialConfig.value = cloneConfig(config);
  comparableSnapshot.value = toComparable(config);
  if (!isDirty.value || isLoadingConfig.value) {
    homeConfigForm.value = cloneConfig(config);
  }
  isLoadingConfig.value = false;
  configError.value = null;
}

function cloneConfig(config: HomePageConfig): HomePageConfig {
  return JSON.parse(JSON.stringify(config)) as HomePageConfig;
}

function toComparable(config: HomePageConfig): string {
  return JSON.stringify({
    featured: { gameIds: [...config.featured.gameIds] },
    topX: {
      sort: config.topX.sort,
      limit: config.topX.limit ?? null,
      maxRows: config.topX.maxRows ?? null,
      itemsPerRow: config.topX.itemsPerRow ?? null,
    },
    hot: {
      sort: config.hot.sort,
      limit: config.hot.limit ?? null,
      maxRows: config.hot.maxRows ?? null,
      itemsPerRow: config.hot.itemsPerRow ?? null,
    },
    community: {
      sort: config.community.sort,
      limit: config.community.limit ?? null,
      maxRows: config.community.maxRows ?? null,
      itemsPerRow: config.community.itemsPerRow ?? null,
    },
    hiddenGameIds: [...config.hiddenGameIds],
    build: { gameTypeIds: [...config.build.gameTypeIds] },
  });
}

function sanitizeForSave(config: HomePageConfig): HomePageConfig {
  const uniqueFeatured = Array.from(new Set(config.featured.gameIds.filter((id) => !!id)));
  const uniqueBuild = Array.from(new Set(config.build.gameTypeIds.filter((id) => !!id)));
  const sanitizePositiveInt = (value?: number | null): number | null => {
    if (value === null || value === undefined) {
      return null;
    }
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return Math.floor(value);
  };

  return {
    featured: { gameIds: uniqueFeatured },
    topX: {
      sort: { ...config.topX.sort },
      limit: sanitizePositiveInt(config.topX.limit),
      maxRows: sanitizePositiveInt(config.topX.maxRows),
      itemsPerRow: sanitizePositiveInt(config.topX.itemsPerRow),
    },
    hot: {
      // force sessions/desc to ensure Hot Games semantics
      sort: { field: 'sessions', direction: 'desc' },
      limit: sanitizePositiveInt(config.hot.limit),
      maxRows: sanitizePositiveInt(config.hot.maxRows),
      itemsPerRow: sanitizePositiveInt(config.hot.itemsPerRow),
    },
    community: {
      sort: { ...config.community.sort },
      limit: sanitizePositiveInt(config.community.limit),
      maxRows: sanitizePositiveInt(config.community.maxRows),
      itemsPerRow: sanitizePositiveInt(config.community.itemsPerRow),
    },
    hiddenGameIds: Array.from(new Set(config.hiddenGameIds.filter((id) => !!id))),
    build: { gameTypeIds: uniqueBuild },
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy,
  };
}

async function saveHomeConfig() {
  try {
    isSaving.value = true;
    saveFeedback.value = null;
    const sanitized = sanitizeForSave(homeConfigForm.value);
    const payload: Record<string, unknown> = {
      featured: { gameIds: sanitized.featured.gameIds },
      topX: {
        sort: sanitized.topX.sort,
        limit: sanitized.topX.limit ?? deleteField(),
        maxRows: sanitized.topX.maxRows ?? deleteField(),
        itemsPerRow: sanitized.topX.itemsPerRow ?? deleteField(),
      },
      hot: {
        sort: sanitized.hot.sort,
        limit: sanitized.hot.limit ?? deleteField(),
        maxRows: sanitized.hot.maxRows ?? deleteField(),
        itemsPerRow: sanitized.hot.itemsPerRow ?? deleteField(),
      },
      community: {
        sort: sanitized.community.sort,
        limit: sanitized.community.limit ?? deleteField(),
        maxRows: sanitized.community.maxRows ?? deleteField(),
        itemsPerRow: sanitized.community.itemsPerRow ?? deleteField(),
      },
      hiddenGameIds: sanitized.hiddenGameIds,
      build: { gameTypeIds: sanitized.build.gameTypeIds },
      updatedAt: Date.now(),
      updatedBy: user.value?.uid ?? 'unknown',
    };

    await setDoc(doc(db, 'config', 'homepage'), payload, { merge: true });

    const nextConfig = cloneConfig({
      featured: sanitized.featured,
      topX: {
        sort: sanitized.topX.sort,
        limit: sanitized.topX.limit ?? null,
        maxRows: sanitized.topX.maxRows ?? null,
        itemsPerRow: sanitized.topX.itemsPerRow ?? null,
      },
      hot: {
        sort: sanitized.hot.sort,
        limit: sanitized.hot.limit ?? null,
        maxRows: sanitized.hot.maxRows ?? null,
        itemsPerRow: sanitized.hot.itemsPerRow ?? null,
      },
      community: {
        sort: sanitized.community.sort,
        limit: sanitized.community.limit ?? null,
        maxRows: sanitized.community.maxRows ?? null,
        itemsPerRow: sanitized.community.itemsPerRow ?? null,
      },
      hiddenGameIds: sanitized.hiddenGameIds,
      build: sanitized.build,
      updatedAt: payload.updatedAt as number,
      updatedBy: payload.updatedBy as string,
    });

    homeConfigForm.value = nextConfig;
    initialConfig.value = cloneConfig(nextConfig);
    comparableSnapshot.value = toComparable(nextConfig);
    saveFeedback.value = { type: 'success', message: 'Homepage configuration updated successfully.' };
  } catch (error) {
    console.error('Admin: failed to save homepage config', error);
    saveFeedback.value = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unable to save homepage configuration.',
    };
  } finally {
    isSaving.value = false;
    window.setTimeout(() => {
      saveFeedback.value = null;
    }, 4000);
  }
}

function resetForm() {
  homeConfigForm.value = cloneConfig(initialConfig.value);
}

function moveItem(list: string[], index: number, delta: number) {
  const targetIndex = index + delta;
  if (targetIndex < 0 || targetIndex >= list.length) {
    return;
  }
  const updated = [...list];
  const [item] = updated.splice(index, 1);
  updated.splice(targetIndex, 0, item);
  return updated;
}

function moveFeatured(index: number, delta: number) {
  const updated = moveItem(homeConfigForm.value.featured.gameIds, index, delta);
  if (updated) {
    homeConfigForm.value.featured.gameIds = updated;
  }
}

function removeFeatured(index: number) {
  homeConfigForm.value.featured.gameIds.splice(index, 1);
}

function isGameFeatured(gameId: string): boolean {
  return homeConfigForm.value.featured.gameIds.includes(gameId);
}

function addGameToFeatured(gameId: string) {
  if (!isGameFeatured(gameId)) {
    homeConfigForm.value.featured.gameIds.push(gameId);
  }
}

function isGameHidden(gameId: string): boolean {
  return homeConfigForm.value.hiddenGameIds.includes(gameId);
}

function hideGame(gameId: string) {
  if (!isGameHidden(gameId)) {
    homeConfigForm.value.hiddenGameIds.push(gameId);
  }
}

function unhideGame(gameId: string) {
  homeConfigForm.value.hiddenGameIds = homeConfigForm.value.hiddenGameIds.filter((id) => id !== gameId);
}

function moveBuild(index: number, delta: number) {
  const updated = moveItem(homeConfigForm.value.build.gameTypeIds, index, delta);
  if (updated) {
    homeConfigForm.value.build.gameTypeIds = updated;
  }
}

function removeBuild(index: number) {
  homeConfigForm.value.build.gameTypeIds.splice(index, 1);
}

function addBuild() {
  const id = selectedBuildCandidate.value;
  if (id && !homeConfigForm.value.build.gameTypeIds.includes(id)) {
    homeConfigForm.value.build.gameTypeIds.push(id);
  }
  selectedBuildCandidate.value = '';
}

function isBadgeActive(game: Game, badge: GameBadgeKey): boolean {
  return Array.isArray(game.badges) && game.badges.includes(badge);
}

function isBadgeUpdating(gameId: string): boolean {
  return badgeMutationState.value[gameId] === true;
}

async function toggleGameBadge(game: Game, badge: GameBadgeKey) {
  const current = Array.isArray(game.badges) ? [...game.badges] : [];
  const exists = current.includes(badge);
  const updatedBadges = exists ? current.filter((b) => b !== badge) : [...current, badge];

  badgeMutationState.value = { ...badgeMutationState.value, [game.id]: true };
  try {
    await updateDoc(doc(db, 'games', game.id), { badges: updatedBadges });
  } catch (error) {
    console.error('Admin: failed to update badges', error);
    saveFeedback.value = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unable to update game badges.',
    };
  } finally {
    badgeMutationState.value = { ...badgeMutationState.value, [game.id]: false };
  }
}
</script>

<style scoped>
.home-manager__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.home-manager__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
  gap: 1.5rem;
}

.home-manager__card {
  height: 100%;
}

.home-manager__card--wide {
  grid-column: span 2;
}

.home-manager__game-manager {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.home-manager__field-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.home-manager__field-row .field {
  flex: 1 1 12rem;
}

.home-manager__search-results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.home-manager__search-result {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #f8fafc;
}

.home-manager__search-result.is-hidden-game {
  border-color: #f59e0b;
  background: #fffbeb;
}

.home-manager__search-meta {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.home-manager__search-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.home-manager__search-actions .buttons {
  flex-wrap: wrap;
}

.home-manager__badge-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.home-manager__badge-toggles .buttons {
  flex-wrap: wrap;
}

.home-manager__search-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.home-manager__section {
  margin-top: 2rem;
}

.home-manager__section-header {
  margin-bottom: 1rem;
}

.home-manager__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.home-manager__list-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #f8fafc;
}

.home-manager__list-details {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.home-manager__list-heading {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.home-manager__badge-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.home-manager__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: #eff6ff;
  border: 1px solid #cbd5f5;
  color: #1d4ed8;
  font-size: 0.75rem;
  font-weight: 600;
}

.home-manager__badge .icon {
  color: #1e40af;
}

.home-manager__badges-cell {
  min-width: 11rem;
}

.home-manager__badge-chip {
  margin: 0 0.35rem 0.35rem 0;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

@media (max-width: 768px) {
  .home-manager__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .home-manager__card--wide {
    grid-column: span 1;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
