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
              <p class="card-header-title">Featured games</p>
            </header>
            <div class="card-content">
              <p class="mb-4">Select specific games and order them exactly as they should appear.</p>
              <ul v-if="featuredEntries.length" class="home-manager__list">
                <li v-for="(entry, index) in featuredEntries" :key="entry.id" class="home-manager__list-item">
                  <div class="home-manager__list-details">
                    <p class="has-text-weight-semibold">{{ entry.game?.name || 'Missing game' }}</p>
                    <p class="is-size-7 has-text-grey">
                      <span>{{ entry.game ? (entry.game.community ? 'Community' : 'Official') : 'Unavailable' }}</span>
                      <span>·</span>
                      <span>{{ entry.game ? entry.game.language?.toUpperCase() : entry.id }}</span>
                    </p>
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

              <div class="field mt-4">
                <label class="label">Add a game</label>
                <div class="field has-addons">
                  <div class="control is-expanded">
                    <div class="select is-fullwidth">
                      <select v-model="selectedFeaturedCandidate">
                        <option value="" disabled>Select a game</option>
                        <option
                          v-for="option in availableFeaturedOptions"
                          :key="option.id"
                          :value="option.id"
                        >
                          {{ option.name }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="control">
                    <button class="button is-link" type="button" :disabled="!selectedFeaturedCandidate" @click="addFeatured">
                      Add
                    </button>
                  </div>
                </div>
                <p class="help">Only active non-community games can be featured.</p>
              </div>
            </div>
          </article>

          <article class="card home-manager__card">
            <header class="card-header">
              <p class="card-header-title">TOP-X games ordering</p>
            </header>
            <div class="card-content">
              <p class="mb-4">Control how official games are sorted on the homepage.</p>
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
              <div class="field">
                <label class="label">Maximum games</label>
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
                <p class="help">Leave blank to display every eligible game.</p>
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
              <div class="field">
                <label class="label">Maximum games</label>
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
              </div>
            </div>
          </article>

          <article class="card home-manager__card home-manager__card--wide">
            <header class="card-header">
              <p class="card-header-title">Visibility</p>
            </header>
            <div class="card-content">
              <p class="mb-4">Toggle any title off the homepage without deactivating the game itself.</p>
              <div class="table-container">
                <table class="table is-fullwidth is-hoverable">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th class="has-text-centered">Players</th>
                      <th class="has-text-centered">Favorites</th>
                      <th class="has-text-right">Hide on homepage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="game in sortedGames" :key="game.id">
                      <td>
                        <p class="has-text-weight-semibold">{{ game.name }}</p>
                        <p class="is-size-7 has-text-grey">
                          {{ game.community ? 'Community' : 'Official' }} · {{ game.language?.toUpperCase() }}
                        </p>
                      </td>
                      <td class="has-text-centered">{{ formatNumber(game.counters?.totalPlayers || 0) }}</td>
                      <td class="has-text-centered">{{ formatNumber(game.counters?.favorites || 0) }}</td>
                      <td class="has-text-right">
                        <label class="checkbox">
                          <input
                            type="checkbox"
                            :checked="game.hideFromHome === true"
                            :disabled="isUpdatingVisibility(game.id)"
                            @change="toggleVisibility(game, ($event.target as HTMLInputElement).checked)"
                          />
                          <span class="ml-2">Hide</span>
                        </label>
                        <span v-if="isUpdatingVisibility(game.id)" class="tag is-info is-light is-rounded ml-2 is-size-7">
                          Saving…
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { doc, onSnapshot, setDoc, updateDoc, where, deleteField } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useCollection } from '@top-x/shared/api/useCollection';
import type { Game, GameType } from '@top-x/shared/types/game';
import type { HomePageConfig, HomeOrderField } from '@top-x/shared/types/home';
import { defaultHomePageConfig } from '@top-x/shared/types/home';
import { useUserStore } from '@/stores/user';
import { formatNumber } from '@top-x/shared/utils/format';

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
const selectedFeaturedCandidate = ref('');
const selectedBuildCandidate = ref('');
const visibilityState = ref<Record<string, boolean>>({});
let configUnsubscribe: (() => void) | null = null;

const sortFieldOptions: Array<{ label: string; value: HomeOrderField }> = [
  { label: 'Date', value: 'date' },
  { label: 'Players', value: 'players' },
  { label: 'Favorites', value: 'favorites' },
  { label: 'Sessions', value: 'sessions' },
  { label: 'Submissions', value: 'submissions' },
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

const availableFeaturedOptions = computed(() => {
  const selected = new Set(homeConfigForm.value.featured.gameIds);
  return gamesCollection.data.value
    .filter((game) => !game.community && game.active && !selected.has(game.id))
    .sort((a, b) => a.name.localeCompare(b.name));
});

const availableBuildOptions = computed(() => {
  const selected = new Set(homeConfigForm.value.build.gameTypeIds);
  return gameTypesCollection.data.value
    .filter((type) => !selected.has(type.id))
    .sort((a, b) => a.name.localeCompare(b.name));
});

const sortedGames = computed(() =>
  [...gamesCollection.data.value].sort((a, b) => a.name.localeCompare(b.name)),
);

watch(
  () => homeConfigForm.value.topX.limit,
  (value) => {
    if (value !== null && value !== undefined && Number.isNaN(value)) {
      homeConfigForm.value.topX.limit = null;
    }
  },
);

watch(
  () => homeConfigForm.value.community.limit,
  (value) => {
    if (value !== null && value !== undefined && Number.isNaN(value)) {
      homeConfigForm.value.community.limit = null;
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
    },
    community: {
      sort: raw.community?.sort ?? base.community.sort,
      limit: resolveLimit(raw.community?.limit, base.community.limit),
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
    topX: { sort: config.topX.sort, limit: config.topX.limit ?? null },
    community: { sort: config.community.sort, limit: config.community.limit ?? null },
    hiddenGameIds: [...config.hiddenGameIds],
    build: { gameTypeIds: [...config.build.gameTypeIds] },
  });
}

function sanitizeForSave(config: HomePageConfig): HomePageConfig {
  const uniqueFeatured = Array.from(new Set(config.featured.gameIds.filter((id) => !!id)));
  const uniqueBuild = Array.from(new Set(config.build.gameTypeIds.filter((id) => !!id)));
  const sanitizeLimit = (limit?: number | null): number | undefined => {
    if (limit === null || limit === undefined || Number.isNaN(limit)) {
      return undefined;
    }
    const parsed = Number(limit);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }
    return Math.round(parsed);
  };

  return {
    featured: { gameIds: uniqueFeatured },
    topX: { sort: { ...config.topX.sort }, limit: sanitizeLimit(config.topX.limit) },
    community: { sort: { ...config.community.sort }, limit: sanitizeLimit(config.community.limit) },
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
      topX: { sort: sanitized.topX.sort },
      community: { sort: sanitized.community.sort },
      hiddenGameIds: sanitized.hiddenGameIds,
      build: { gameTypeIds: sanitized.build.gameTypeIds },
      updatedAt: Date.now(),
      updatedBy: user.value?.uid ?? 'unknown',
    };

    if (sanitized.topX.limit !== undefined) {
      (payload.topX as Record<string, unknown>).limit = sanitized.topX.limit;
    } else {
      (payload.topX as Record<string, unknown>).limit = deleteField();
    }

    if (sanitized.community.limit !== undefined) {
      (payload.community as Record<string, unknown>).limit = sanitized.community.limit;
    } else {
      (payload.community as Record<string, unknown>).limit = deleteField();
    }

    await setDoc(doc(db, 'config', 'homepage'), payload, { merge: true });

    const nextConfig = cloneConfig({
      featured: sanitized.featured,
      topX: { sort: sanitized.topX.sort, limit: sanitized.topX.limit ?? null },
      community: { sort: sanitized.community.sort, limit: sanitized.community.limit ?? null },
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

function addFeatured() {
  const id = selectedFeaturedCandidate.value;
  if (id && !homeConfigForm.value.featured.gameIds.includes(id)) {
    homeConfigForm.value.featured.gameIds.push(id);
  }
  selectedFeaturedCandidate.value = '';
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

function isUpdatingVisibility(gameId: string): boolean {
  return visibilityState.value[gameId] === true;
}

async function toggleVisibility(game: Game, hidden: boolean) {
  visibilityState.value = { ...visibilityState.value, [game.id]: true };
  try {
    await updateDoc(doc(db, 'games', game.id), { hideFromHome: hidden });
  } catch (error) {
    console.error('Admin: failed to toggle homepage visibility', error);
    saveFeedback.value = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unable to update game visibility.',
    };
  } finally {
    visibilityState.value = { ...visibilityState.value, [game.id]: false };
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
