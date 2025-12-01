<!-- Home.vue -->
<template>
  <div class="page-container home-page section-stack">
    <HeroSection @create="goToBuild" @play="scrollToGames" />
    <GameSection
      ref="gamesSection"
      :title="t('home.featuredGames.title')"
      :subtitle="t('home.featuredGames.subtitle')"
      :games="featuredGames"
      :game-stats="gameStats"
      :items-per-row="featuredItemsPerRow"
      :initial-rows="featuredRows"
      :rows-increment="featuredRows"
      :empty-message="t('home.featuredGames.empty')"
      grid-variant="featured"
    >
      <template #default="{ game, stats }">
        <GameCard
          :game="game"
          :stats="stats"
          size="featured"
          show-featured-label
          :featured-label="t('home.labels.featured')"
          :daily-challenge-active="Boolean(game.dailyChallengeActive)"
          :daily-challenge-label="t('home.labels.dailyChallenge')"
          :play-label="t('home.playNow')"
          button-type="is-primary"
          @play="navigateToGame"
        />
      </template>
    </GameSection>
    <HowItWorksSection />
    <GameSection
      :title="'Hot Games'"
      :subtitle="hotSortDescription"
      :games="hotGames"
      :game-stats="gameStats"
      :items-per-row="hotItemsPerRow"
      :initial-rows="hotInitialRows"
      :max-rows="hotMaxRows"
      :rows-increment="1"
      :empty-message="t('home.topxGames.empty')"
      grid-variant="quad"
    >
      <template #default="{ game, stats }">
        <GameCard
          :game="game"
          :stats="stats"
          :daily-challenge-active="Boolean(game.dailyChallengeActive)"
          :daily-challenge-label="t('home.labels.dailyChallenge')"
          :play-label="t('home.playNow')"
          button-type="is-primary"
          @play="navigateToGame"
        />
      </template>
    </GameSection>
    <GameSection
      section-id="featuredGames"
      :title="t('home.topxGames.title')"
      :subtitle="topXSortDescription"
      :games="topXGames"
      :game-stats="gameStats"
      :items-per-row="topXItemsPerRow"
      :initial-rows="topXInitialRows"
      :max-rows="topXMaxRows"
      :rows-increment="1"
      :empty-message="t('home.topxGames.empty')"
      grid-variant="quad"
    >
      <template #default="{ game, stats }">
        <GameCard
          :game="game"
          :stats="stats"
          :daily-challenge-active="Boolean(game.dailyChallengeActive)"
          :daily-challenge-label="t('home.labels.dailyChallenge')"
          :play-label="t('home.playNow')"
          button-type="is-primary"
          @play="navigateToGame"
        />
      </template>
    </GameSection>
    <GameSection
      :title="'Hot Games'"
      :subtitle="hotSortDescription"
      :games="hotGames"
      :game-stats="gameStats"
      :items-per-row="hotItemsPerRow"
      :initial-rows="hotInitialRows"
      :max-rows="hotMaxRows"
      :rows-increment="1"
      :empty-message="t('home.topxGames.empty')"
      grid-variant="quad"
    >
      <template #default="{ game, stats }">
        <GameCard
          :game="game"
          :stats="stats"
          :daily-challenge-active="Boolean(game.dailyChallengeActive)"
          :daily-challenge-label="t('home.labels.dailyChallenge')"
          :play-label="t('home.playNow')"
          button-type="is-primary"
          @play="navigateToGame"
        />
      </template>
    </GameSection>
    <GameSection
      :title="t('home.communityGames.title')"
      :subtitle="communitySortDescription"
      :games="communityGames"
      :game-stats="gameStats"
      :items-per-row="communityItemsPerRow"
      :initial-rows="communityInitialRows"
      :max-rows="communityMaxRows"
      :rows-increment="1"
      :empty-message="t('home.communityGames.empty')"
      grid-variant="quad"
    >
      <template #default="{ game, stats }">
        <GameCard
          :game="game"
          :stats="stats"
          :creator="game.creator"
          :daily-challenge-active="Boolean(game.dailyChallengeActive)"
          :daily-challenge-label="t('home.labels.dailyChallenge')"
          :play-label="t('home.playNow')"
          button-type="is-primary"
          @play="navigateToGame"
        />
      </template>
    </GameSection>

    <BuildSection
      :title="t('home.buildSection.title')"
      :subtitle="t('home.buildSection.subtitle')"
      :game-types="orderedGameTypes"
      :primary-cta="t('home.buildSection.ctaAll')"
      :free-cta="t('home.buildSection.ctaFree')"
      :tile-cta="t('home.buildSection.cta')"
      :empty-message="t('home.buildSection.empty')"
      @open-all="goToBuild()"
      @open-free="goToBuild()"
      @select-type="goToBuild"
    />
    <TopCreatorsSection
      v-if="creatorsList.length"
      :title="'👾 Top Creators'"
      :subtitle="'The creators who made the most noise across the web.'"
      :creators="creatorsList"
      @open-profile="navigateToProfile"
    />
    <DevelopersStage @submit="goToBuild()" />
    <BrandsStage @contact="goToContact()" />
    <AdsenseBlock v-if="shouldDisplayAds" ref="adSlotRef" :client="adClient" :slot="adSlot" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick, reactive } from 'vue';
import { useHead } from '@vueuse/head';
import { useRouter } from 'vue-router';
import {
  collection,
  getDocs,
  query,
  onSnapshot,
  doc,
  where,
  documentId,
} from 'firebase/firestore';
import { db } from '@top-x/shared';
import {
  subscribeToGames,
  subscribeToGameStats,
} from '@/services/game';
import HeroSection from '@/components/home/HeroSection.vue';
import HowItWorksSection from '@/components/home/HowItWorksSection.vue';
import GameCard from '@/components/GameCard.vue';
import GameSection from '@/components/home/GameSection.vue';
import BuildSection from '@/components/home/BuildSection.vue';
import TopCreatorsSection from '@/components/home/TopCreatorsSection.vue';
import DevelopersStage from '@/components/home/DevelopersStage.vue';
import BrandsStage from '@/components/home/BrandsStage.vue';
import AdsenseBlock from '@/components/home/AdsenseBlock.vue';
import { analytics, trackEvent } from '@top-x/shared';
import type { Game, GameType } from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';
import type { HomeCollectionConfig, HomePageConfig, HomeOrderField, HomeSectionOrder } from '@top-x/shared/types/home';
import { defaultHomePageConfig } from '@top-x/shared/types/home';
import { useLocaleStore } from '@/stores/locale';
import { pushAdSenseSlot } from '@/utils/googleAdsense';
import type { User } from '@top-x/shared/types/user';

const router = useRouter();

const games = ref<Game[]>([]);
const gameStats = reactive<Record<string, Partial<GameStats>>>({});
const gameTypes = ref<GameType[]>([]);
const homeConfig = ref<HomePageConfig>({ ...defaultHomePageConfig });
const configLoaded = ref(false);
const gamesSection = ref<{ el: HTMLElement | null } | null>(null);
const adSlotRef = ref<{ el: HTMLElement | null } | null>(null);
const hasInitializedAd = ref(false);
const creators = ref<User[]>([]);

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const adClient = import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID;
const adSlot = import.meta.env.VITE_GOOGLE_ADS_SLOT_ID;
const shouldDisplayAds = computed(() => Boolean(adClient && adSlot));

useHead({
  title: 'TOP-X',
  meta: [
    {
      name: 'description',
      content: 'Play fun social games and compete with friends on TOP-X.',
    },
  ],
});

let resizeObserver: ResizeObserver | null = null;
let gamesUnsubscribe: (() => void) | null = null;
let configUnsubscribe: (() => void) | null = null;
let gameTypesUnsubscribe: (() => void) | null = null;
const statsUnsubscribers = new Map<string, () => void>();


function subscribeToGameStatsLocal(gameId: string) {
  if (statsUnsubscribers.has(gameId)) {
    return;
  }

  const unsubscribe = subscribeToGameStats(gameId, (stats, error) => {
    if (error) {
      console.error(`Home: Error fetching stats for game ${gameId}:`, error);
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

type GameStatMetric = 'totalPlayers' | 'favoriteCounter' | 'sessionsPlayed';

function getGameStat(gameId: string, key: GameStatMetric): number {
  const stats = gameStats[gameId];
  const value = stats?.[key];
  return typeof value === 'number' ? value : 0;
}

function tryInitializeAdSlot() {
  if (!shouldDisplayAds.value || hasInitializedAd.value) {
    return;
  }

  const adNode = adSlotRef.value?.el;
  if (!adNode) {
    return;
  }

  if (adNode.offsetWidth > 0) {
    pushAdSenseSlot();
    hasInitializedAd.value = true;
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  }
}

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
  const resolveMaxRowsField = (configSection: Partial<HomeCollectionConfig> | undefined, fallback: number | null | undefined) => {
    const candidate = (configSection?.maxRows ?? (configSection as { rows?: unknown })?.rows) as unknown;
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
    creators: {
      userIds: Array.isArray(raw.creators?.userIds) ? [...raw.creators.userIds] : base.creators!.userIds,
    },
    topX: {
      sort: raw.topX?.sort ?? base.topX.sort,
      limit: resolveLimit(raw.topX?.limit, base.topX.limit),
      maxRows: resolveMaxRowsField(raw.topX, base.topX.maxRows),
      itemsPerRow: resolveItemsPerRowField(raw.topX?.itemsPerRow, base.topX.itemsPerRow),
    },
    hot: {
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

onMounted(() => {
  console.log('Home: Fetching games and configuration from Firestore...');
  trackEvent(analytics, 'page_view', { page_name: 'home' });

  gamesUnsubscribe = subscribeToGames(
    (mappedGames, error) => {
      if (error) {
        console.error('Home: Error fetching games:', error);
        return;
      }

      // Filter games: must be active=true AND unlisted=false to appear on home page
      // active=false: not visible and not playable
      // unlisted=true: not visible on home but still playable via direct link
      const activeGames = mappedGames.filter((g) => g.active && !g.unlisted);
      games.value = activeGames;

      const activeIds = new Set<string>();
      activeGames.forEach((game) => {
        activeIds.add(game.id);
        subscribeToGameStatsLocal(game.id);
      });
      cleanupStatsSubscriptions(activeIds);

      console.log('Home: Games updated:', games.value);
    },
    { activeOnly: false } // We filter active games manually to maintain existing behavior
  );

  const configRef = doc(db, 'config', 'homepage');
  configUnsubscribe = onSnapshot(
    configRef,
    (snapshot) => {
      const rawData = snapshot.exists() ? (snapshot.data() as Partial<HomePageConfig>) : undefined;
      homeConfig.value = normalizeHomeConfig(rawData);
      configLoaded.value = true;
      void loadCreators();
    },
    (err) => {
      console.error('Home: Error fetching home configuration:', err.message, err);
      homeConfig.value = { ...defaultHomePageConfig };
      configLoaded.value = true;
    },
  );

  const gameTypesQuery = query(collection(db, 'gameTypes'), where('availableToBuild', '==', true));
  gameTypesUnsubscribe = onSnapshot(
    gameTypesQuery,
    (snapshot) => {
      gameTypes.value = snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...(docSnapshot.data() as GameType) }));
    },
    (err) => {
      console.error('Home: Error fetching game types:', err.message, err);
    },
  );

  if (shouldDisplayAds.value) {
    nextTick(() => {
      tryInitializeAdSlot();
      if (!hasInitializedAd.value && adSlotRef.value) {
        resizeObserver = new ResizeObserver(() => {
          tryInitializeAdSlot();
        });
        resizeObserver.observe(adSlotRef.value);
      }
    });
  }
});

const hiddenGameIds = computed(() => new Set(homeConfig.value.hiddenGameIds));

const visibleGames = computed(() => games.value.filter((game) => !hiddenGameIds.value.has(game.id)));

const topXLibrary = computed(() => visibleGames.value.filter((game) => !game.community));
const communityLibrary = computed(() => visibleGames.value.filter((game) => game.community));

const communityLibraryCount = computed(() => communityLibrary.value.length);
const heroTopXCount = computed(() => topXLibrary.value.length);

const featuredGames = computed(() => {
  if (!configLoaded.value) {
    return [] as Game[];
  }
  const order = homeConfig.value.featured.gameIds;
  if (!order.length) {
    return [] as Game[];
  }
  const lookup = new Map(visibleGames.value.map((game) => [game.id, game]));
  return order.map((id) => lookup.get(id)).filter((game): game is Game => Boolean(game));
});

function resolveOrderLabel(order: HomeSectionOrder): string {
  const direction = order.direction === 'asc' ? t('home.order.asc') : t('home.order.desc');
  const fieldLabels: Record<HomeOrderField, string> = {
    date: t('home.order.fields.date'),
    players: t('home.order.fields.players'),
    favorites: "",//t('home.order.fields.favorites')"",
    sessions: "",//t('home.order.fields.sessions'),
  };
  const fieldLabel = fieldLabels[order.field] ?? '';
  return `${t('home.order.prefix')} ${fieldLabel}`;// (${direction})`;
}

const topXSortDescription = computed(() => resolveOrderLabel(homeConfig.value.topX.sort));
const hotSortDescription = computed(() => resolveOrderLabel(homeConfig.value.hot.sort));
const communitySortDescription = computed(() => resolveOrderLabel(homeConfig.value.community.sort));

function getSortValue(game: Game, field: HomeOrderField): number {
  switch (field) {
    case 'date':
      return game.createdAt ?? 0;
    case 'players':
      return getGameStat(game.id, 'totalPlayers');
    case 'favorites':
      return getGameStat(game.id, 'favoriteCounter');
    case 'sessions':
      return getGameStat(game.id, 'sessionsPlayed');
    default:
      return 0;
  }
}

function sortGames(gamesToSort: Game[], order: HomeSectionOrder): Game[] {
  const sorted = [...gamesToSort].sort((a, b) => {
    const aValue = getSortValue(a, order.field);
    const bValue = getSortValue(b, order.field);
    if (aValue === bValue) {
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    }
    return order.direction === 'asc' ? aValue - bValue : bValue - aValue;
  });
  return sorted;
}

function resolveSectionLimit(configSection: HomeCollectionConfig): number | null {
  const layoutLimit =
    configSection.maxRows && configSection.itemsPerRow
      ? Math.max(0, configSection.maxRows) * Math.max(0, configSection.itemsPerRow)
      : null;
  if (typeof configSection.limit === 'number' && configSection.limit >= 0) {
    return layoutLimit !== null ? Math.min(configSection.limit, layoutLimit) : configSection.limit;
  }
  return layoutLimit;
}

const topXGames = computed(() => {
  const sorted = sortGames(topXLibrary.value, homeConfig.value.topX.sort);
  const limit = resolveSectionLimit(homeConfig.value.topX);
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
});

const hotGames = computed(() => {
  const allVisible = visibleGames.value;
  const sorted = sortGames(allVisible, homeConfig.value.hot.sort);
  const limit = resolveSectionLimit(homeConfig.value.hot);
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
});

const communityGames = computed(() => {
  const sorted = sortGames(communityLibrary.value, homeConfig.value.community.sort);
  const limit = resolveSectionLimit(homeConfig.value.community);
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
});

const orderedGameTypes = computed(() => {
  if (!gameTypes.value.length) {
    return [] as GameType[];
  }
  const order = homeConfig.value.build.gameTypeIds;
  if (!order.length) {
    return [...gameTypes.value].sort((a, b) => a.name.localeCompare(b.name));
  }
  const lookup = new Map(gameTypes.value.map((type) => [type.id, type]));
  const prioritized = order.map((id) => lookup.get(id)).filter((type): type is GameType => Boolean(type));
  const remaining = gameTypes.value
    .filter((type) => !order.includes(type.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...prioritized, ...remaining];
});

const featuredRows = 1;
const featuredItemsPerRow = 3;

function normalizePositiveInt(value: number | null | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return fallback;
}

function resolveMaxRows(value: number | null | undefined, fallback: number): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (value === null) {
    return undefined;
  }
  return fallback;
}

const topXMaxRows = computed(() => resolveMaxRows(homeConfig.value.topX.maxRows, 2));
const topXItemsPerRow = computed(() => normalizePositiveInt(homeConfig.value.topX.itemsPerRow, 4));
const topXInitialRows = computed(() => Math.min(1, topXMaxRows.value ?? 1));

const hotMaxRows = computed(() => resolveMaxRows(homeConfig.value.hot.maxRows, 2));
const hotItemsPerRow = computed(() => normalizePositiveInt(homeConfig.value.hot.itemsPerRow, 4));
const hotInitialRows = computed(() => Math.min(1, hotMaxRows.value ?? 1));

const communityMaxRows = computed(() => resolveMaxRows(homeConfig.value.community.maxRows, 2));
const communityItemsPerRow = computed(() => normalizePositiveInt(homeConfig.value.community.itemsPerRow, 4));
const communityInitialRows = computed(() => Math.min(1, communityMaxRows.value ?? 1));

function navigateToGame(gameId: string, gameTypeId: string) {
  trackEvent(analytics, 'select_game', { game_id: gameId });
  router.push(`/games/info?game=${gameId}`);
}

function navigateToProfile(uid: string) {
  router.push({ path: '/profile', query: { user: uid } });
}

function scrollToGames() {
  const sectionEl = gamesSection.value?.el;
  sectionEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function goToBuild(gameTypeId?: string) {
  const query = gameTypeId ? { template: gameTypeId } : undefined;
  router.push({ name: 'Build', query });
}

function goToContact() {
  router.push({ name: 'ContactUs' });
}

const creatorsIds = computed(() => (homeConfig.value.creators?.userIds ?? []).slice(0, 10));

async function loadCreators() {
  const ids = creatorsIds.value;
  if (!ids.length) {
    creators.value = [];
    return;
  }
  try {
    // Firestore "in" supports up to 10 ids – we already slice to 10
    const usersSnap = await getDocs(
      query(collection(db, 'users'), where(documentId(), 'in', ids)),
    );
    const map = new Map<string, User>();
    usersSnap.forEach((docSnap) => {
      map.set(docSnap.id, { uid: docSnap.id, ...(docSnap.data() as User) });
    });
    // Preserve order from config
    creators.value = ids
      .map((id) => map.get(id))
      .filter((u): u is User => Boolean(u));
  } catch (e) {
    console.error('Home: failed to load creators', e);
    creators.value = [];
  }
}

const creatorsList = computed(() =>
  creators.value.map((u) => ({
    uid: u.uid,
    displayName: u.displayName || u.username || 'Anonymous',
    username: u.username ? (u.username.startsWith('@') ? u.username : `@${u.username}`) : '',
    photoURL: u.photoURL || '/assets/profile.png',
  })),
);

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (gamesUnsubscribe) {
    gamesUnsubscribe();
    gamesUnsubscribe = null;
  }
  if (configUnsubscribe) {
    configUnsubscribe();
    configUnsubscribe = null;
  }
  if (gameTypesUnsubscribe) {
    gameTypesUnsubscribe();
    gameTypesUnsubscribe = null;
  }
  for (const unsubscribe of statsUnsubscribers.values()) {
    unsubscribe();
  }
  statsUnsubscribers.clear();
  for (const key of Object.keys(gameStats)) {
    delete gameStats[key];
  }
});
</script>

<style scoped>
@import '../styles/components/Home.css';
</style>

