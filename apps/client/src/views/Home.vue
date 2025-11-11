<!-- Home.vue -->
<template>
  <div class="home-page section-stack">
    <HeroSection @create="goToBuild" @play="scrollToGames" />
    <GameSection
      ref="gamesSection"
      :title="t('home.featuredGames.title')"
      :subtitle="t('home.featuredGames.subtitle')"
      :games="featuredGames"
      :game-stats="gameStats"
      :items-per-row="3"
      :initial-rows="1"
      :rows-increment="1"
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
      section-id="featuredGames"
      :title="t('home.topxGames.title')"
      :subtitle="topXSortDescription"
      :games="topXGames"
      :game-stats="gameStats"
      :items-per-row="4"
      :initial-rows="1"
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
      :items-per-row="4"
      :initial-rows="1"
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
    <AdsenseBlock v-if="shouldDisplayAds" ref="adSlotRef" :client="adClient" :slot="adSlot" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick, reactive } from 'vue';
import { useHead } from '@vueuse/head';
import { useRouter } from 'vue-router';
import {
  collection,
  query,
  onSnapshot,
  doc,
  where,
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
import AdsenseBlock from '@/components/home/AdsenseBlock.vue';
import { analytics, trackEvent } from '@top-x/shared';
import type { Game, GameType } from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';
import type { HomePageConfig, HomeOrderField, HomeSectionOrder } from '@top-x/shared/types/home';
import { defaultHomePageConfig } from '@top-x/shared/types/home';
import { useLocaleStore } from '@/stores/locale';
import { pushAdSenseSlot } from '@/utils/googleAdsense';

const router = useRouter();

const games = ref<Game[]>([]);
const gameStats = reactive<Record<string, Partial<GameStats>>>({});
const gameTypes = ref<GameType[]>([]);
const homeConfig = ref<HomePageConfig>({ ...defaultHomePageConfig });
const configLoaded = ref(false);
const gamesSection = ref<{ el: HTMLElement | null } | null>(null);
const adSlotRef = ref<{ el: HTMLElement | null } | null>(null);
const hasInitializedAd = ref(false);

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

onMounted(() => {
  console.log('Home: Fetching games and configuration from Firestore...');
  trackEvent(analytics, 'page_view', { page_name: 'home' });

  gamesUnsubscribe = subscribeToGames(
    (mappedGames, error) => {
      if (error) {
        console.error('Home: Error fetching games:', error);
        return;
      }

      const activeGames = mappedGames.filter((g) => g.active);
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

const hiddenGameIds = computed(() => {
  const hidden = new Set<string>();
  for (const id of homeConfig.value.hiddenGameIds) {
    hidden.add(id);
  }
  for (const game of games.value) {
    if (game.hideFromHome) {
      hidden.add(game.id);
    }
  }
  return hidden;
});

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
    favorites: t('home.order.fields.favorites'),
    sessions: t('home.order.fields.sessions'),
  };
  const fieldLabel = fieldLabels[order.field] ?? '';
  return `${t('home.order.prefix')} ${fieldLabel} (${direction})`;
}

const topXSortDescription = computed(() => resolveOrderLabel(homeConfig.value.topX.sort));
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

const topXGames = computed(() => {
  const sorted = sortGames(topXLibrary.value, homeConfig.value.topX.sort);
  const limit = homeConfig.value.topX.limit ?? sorted.length;
  return sorted.slice(0, limit);
});

const communityGames = computed(() => {
  const sorted = sortGames(communityLibrary.value, homeConfig.value.community.sort);
  const limit = homeConfig.value.community.limit ?? sorted.length;
  return sorted.slice(0, limit);
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

function navigateToGame(gameId: string, gameTypeId: string) {
  trackEvent(analytics, 'select_game', { game_id: gameId });
  router.push(`/games/info?game=${gameId}`);
}

function scrollToGames() {
  const sectionEl = gamesSection.value?.el;
  sectionEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function goToBuild(gameTypeId?: string) {
  const query = gameTypeId ? { template: gameTypeId } : undefined;
  router.push({ name: 'Build', query });
}

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
@import '../styles/Home.css';
</style>
