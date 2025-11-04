<!-- Home.vue -->
<template>
  <div class="home-page section-stack">
    <section class="hero layout-container">
      <div class="hero-content">
             <h1 class="hero-title">{{ t('home.heroTitle') }}</h1>
        <p class="hero-subtitle">{{ t('home.heroSubtitle') }}</p>
</div>
      <!--  <div class="hero-content">
        <div class="hero-eyebrow">
          <span class="hero-pill">TOP-X</span>
          <span class="hero-eyebrow-text">{{ t('home.heroEyebrow') }}</span>
        </div>
       <h1 class="hero-title">{{ t('home.heroTitle') }}</h1>
        <p class="hero-subtitle">{{ t('home.heroSubtitle') }}</p>
        <div class="hero-actions">
          <CustomButton
            type="is-primary is-medium hero-button"
            :label="t('home.playNow')"
            @click="scrollToGames"
          />
          <button class="hero-link" type="button" @click="scrollToGames">
            {{ t('home.exploreCollection') }}
          </button>
        </div>
        <dl class="hero-stats">
          <div class="hero-stat">
            <dt>{{ formatNumber(heroTopXCount) }}</dt>
            <dd>{{ t('home.heroStats.topx') }}</dd>
          </div>
          <div class="hero-stat">
            <dt>{{ formatNumber(featuredGames.length) }}</dt>
            <dd>{{ t('home.heroStats.featured') }}</dd>
          </div>
          <div class="hero-stat">
            <dt>{{ formatNumber(communityLibraryCount) }}</dt>
            <dd>{{ t('home.heroStats.community') }}</dd>
          </div>
        </dl>
      </div>
      <div class="hero-visual">
        <div class="hero-glow"></div>
        <img src="../assets/topx-logo.png" alt="TOP-X" class="hero-logo" />
      </div> -->
    </section>

    <section ref="gamesSection" class="game-section layout-container section-stack">
      <header class="section-header">
        <div>
          <h2 class="section-title">{{ t('home.featuredGames.title') }}</h2>
          <p class="section-subtitle">{{ t('home.featuredGames.subtitle') }}</p>
        </div>
      </header>
      <div class="game-grid game-grid--featured">
        <article
          v-for="game in featuredGames"
          :key="game.id"
          class="game-card"
          @click="navigateToGame(game.id, game.gameTypeId)"
        >
          <div class="game-card__media">
            <img :src="game.image" :alt="`${game.name} image`" loading="lazy" />
          </div>
          <div class="game-card__content">
            <div class="game-card__meta responsive-flex-row">
              <span class="game-card__badge">{{ t('home.featuredGames.badge') }}</span>
            </div>
            <h3 class="game-card__title">{{ game.name }}</h3>
            <p class="game-card__description">{{ game.description }}</p>
            <div class="game-card__stats" v-if="gameStats[game.id]">
              <div class="game-card__stat">
                <span class="game-card__stat-value">{{ formatNumber(gameStats[game.id]?.totalPlayers || 0) }}</span>
                <span class="game-card__stat-label">{{ t('home.stats.players') }}</span>
              </div>
              <div class="game-card__stat">
                <span class="game-card__stat-value">{{ formatNumber(gameStats[game.id]?.favorites || 0) }}</span>
                <span class="game-card__stat-label">{{ t('home.stats.favorites') }}</span>
              </div>
              <div class="game-card__stat">
                <span class="game-card__stat-value">{{ formatNumber(gameStats[game.id]?.sessionsPlayed || 0) }}</span>
                <span class="game-card__stat-label">{{ t('home.stats.sessions') }}</span>
              </div>
            </div>
            <div class="game-card__footer">
              <CustomButton
                type="is-primary is-small"
                :label="t('home.playNow')"
                @click.stop="navigateToGame(game.id, game.gameTypeId)"
              />
            </div>
          </div>
        </article>
      </div>
      <p v-if="!featuredGames.length" class="empty-state">{{ t('home.featuredGames.empty') }}</p>
    </section>

    <ins
      v-if="shouldDisplayAds"
      ref="adSlotRef"
      class="adsbygoogle"
      style="display:block; width: 100%; min-height: 250px; margin: 2rem auto;"
      :data-ad-client="adClient"
      :data-ad-slot="adSlot"
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>

    <section class="game-section layout-container section-stack">
      <header class="section-header">
        <div>
          <h2 class="section-title">{{ t('home.topxGames.title') }}</h2>
          <p class="section-subtitle">{{ topXSortDescription }}</p>
        </div>
      </header>
      <div class="game-grid game-grid--quad">
        <article
          v-for="game in topXGames"
          :key="game.id"
          class="game-card"
          @click="navigateToGame(game.id, game.gameTypeId)"
        >
          <div class="game-card__media">
            <img :src="game.image" :alt="`${game.name} image`" loading="lazy" />
          </div>
          <div class="game-card__content">
            <div class="game-card__meta responsive-flex-row">
              <span class="game-card__badge">{{ t('home.topxGames.badge') }}</span>
            </div>
            <h3 class="game-card__title">{{ game.name }}</h3>
            <p class="game-card__description">{{ game.description }}</p>
            <div class="game-card__stats" v-if="gameStats[game.id]">
              <div class="game-card__stat">
                <span class="game-card__stat-value">{{ formatNumber(gameStats[game.id]?.totalPlayers || 0) }}</span>
                <span class="game-card__stat-label">{{ t('home.stats.players') }}</span>
              </div>
              <div class="game-card__stat">
                <span class="game-card__stat-value">{{ formatNumber(gameStats[game.id]?.favorites || 0) }}</span>
                <span class="game-card__stat-label">{{ t('home.stats.favorites') }}</span>
              </div>
              <div class="game-card__stat">
                <span class="game-card__stat-value">{{ formatNumber(gameStats[game.id]?.sessionsPlayed || 0) }}</span>
                <span class="game-card__stat-label">{{ t('home.stats.sessions') }}</span>
              </div>
            </div>
            <div class="game-card__footer">
              <CustomButton
                type="is-primary is-small"
                :label="t('home.playNow')"
                @click.stop="navigateToGame(game.id, game.gameTypeId)"
              />
            </div>
          </div>
        </article>
      </div>
      <p v-if="!topXGames.length" class="empty-state">{{ t('home.topxGames.empty') }}</p>
    </section>

    <section class="game-section layout-container section-stack">
      <header class="section-header">
        <div>
          <h2 class="section-title">{{ t('home.communityGames.title') }}</h2>
          <p class="section-subtitle">{{ communitySortDescription }}</p>
        </div>
      </header>
      <div class="game-grid game-grid--quad">
        <article
          v-for="game in communityGames"
          :key="game.id"
          class="game-card"
          @click="navigateToGame(game.id, game.gameTypeId)"
        >
          <div class="game-card__media">
            <img :src="game.image" :alt="`${game.name} image`" loading="lazy" />
          </div>
          <div class="game-card__content">
            <div class="game-card__meta responsive-flex-row">
              <span class="game-card__badge game-card__badge--alt">{{ t('home.communityGames.badge') }}</span>
              <span class="game-card__creator">
                {{ t('home.createdBy') }}: {{ game.creator?.username || t('home.unknownCreator') }}
              </span>
            </div>
            <h3 class="game-card__title">{{ game.name }}</h3>
            <p class="game-card__description">{{ game.description }}</p>
            <div class="game-card__stats" v-if="gameStats[game.id]">
              <div class="game-card__stat">
                <span class="game-card__stat-value">{{ formatNumber(gameStats[game.id]?.totalPlayers || 0) }}</span>
                <span class="game-card__stat-label">{{ t('home.stats.players') }}</span>
              </div>
              <div class="game-card__stat">
                <span class="game-card__stat-value">{{ formatNumber(gameStats[game.id]?.favorites || 0) }}</span>
                <span class="game-card__stat-label">{{ t('home.stats.favorites') }}</span>
              </div>
              <div class="game-card__stat">
                <span class="game-card__stat-value">{{ formatNumber(gameStats[game.id]?.sessionsPlayed || 0) }}</span>
                <span class="game-card__stat-label">{{ t('home.stats.sessions') }}</span>
              </div>
            </div>
            <div class="game-card__footer">
              <CustomButton
                type="is-primary is-small"
                :label="t('home.playNow')"
                @click.stop="navigateToGame(game.id, game.gameTypeId)"
              />
            </div>
          </div>
        </article>
      </div>
      <p v-if="!communityGames.length" class="empty-state">{{ t('home.communityGames.empty') }}</p>
    </section>

    <section class="home-build layout-container section-stack">
      <header class="section-header">
        <div>
          <h2 class="section-title">{{ t('home.buildSection.title') }}</h2>
          <p class="section-subtitle">{{ t('home.buildSection.subtitle') }}</p>
        </div>
        <CustomButton type="is-primary" :label="t('home.buildSection.ctaAll')" @click="goToBuild()" />
      </header>
      <div class="build-grid">
        <button
          v-for="gameType in orderedGameTypes"
          :key="gameType.id"
          type="button"
          class="build-tile"
          @click="goToBuild(gameType.id)"
        >
          <span class="build-tile__name">{{ gameType.name }}</span>
          <span class="build-tile__description">{{ gameType.description }}</span>
          <span class="build-tile__cta">{{ t('home.buildSection.cta') }}</span>
        </button>
        <p v-if="!orderedGameTypes.length" class="empty-state">{{ t('home.buildSection.empty') }}</p>
      </div>
    </section>
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
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@top-x/shared';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import fallbackImg from '@/assets/images/fallback.png';
import { analytics, trackEvent } from '@top-x/shared';
import type { Game, GameType } from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';
import type { HomePageConfig, HomeOrderField, HomeSectionOrder } from '@top-x/shared/types/home';
import { defaultHomePageConfig } from '@top-x/shared/types/home';
import { useLocaleStore } from '@/stores/locale';
import { pushAdSenseSlot } from '@/utils/googleAdsense';
import { formatNumber } from '@top-x/shared/utils/format';

const router = useRouter();

const games = ref<Game[]>([]);
const gameStats = reactive<Record<string, Partial<GameStats>>>({});
const gameTypes = ref<GameType[]>([]);
const homeConfig = ref<HomePageConfig>({ ...defaultHomePageConfig });
const configLoaded = ref(false);
const gamesSection = ref<HTMLElement | null>(null);
const adSlotRef = ref<HTMLElement | null>(null);
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

function timestampToMillis(value: unknown): number | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  if (typeof value === 'object') {
    const maybeTimestamp = value as { seconds?: number; nanoseconds?: number; toMillis?: () => number };
    if (typeof maybeTimestamp.toMillis === 'function') {
      try {
        return maybeTimestamp.toMillis();
      } catch (error) {
        console.warn('Home: Unable to convert timestamp via toMillis', error);
      }
    }
    if (typeof maybeTimestamp.seconds === 'number') {
      const nanos = typeof maybeTimestamp.nanoseconds === 'number' ? maybeTimestamp.nanoseconds : 0;
      return maybeTimestamp.seconds * 1000 + Math.floor(nanos / 1_000_000);
    }
  }
  return undefined;
}

function mapGameDocument(docSnapshot: QueryDocumentSnapshot<DocumentData>): Game {
  const data = docSnapshot.data();
  const createdAt = timestampToMillis(data.createdAt);
  const updatedAt = timestampToMillis(data.updatedAt);
  return {
    id: docSnapshot.id,
    name: data.name || 'Unnamed Game',
    description: data.description || 'No description available',
    gameTypeId: data.gameTypeId || '',
    image: data.image || fallbackImg,
    active: data.active ?? false,
    language: data.language || 'en',
    shareLink: data.shareLink || '',
    shareText: data.shareText,
    gameHeader: data.gameHeader,
    gameInstruction: data.gameInstruction,
    vip: data.vip || [],
    custom: data.custom || {},
    creator: data.creator,
    community: data.community ?? false,
    hideFromHome: data.hideFromHome ?? false,
    dailyChallengeActive: data.dailyChallengeActive,
    dailyChallengeCurrent: data.dailyChallengeCurrent,
    leaderboard: data.leaderboard,
    createdAt,
    updatedAt,
  } as Game;
}

function subscribeToGameStats(gameId: string) {
  if (statsUnsubscribers.has(gameId)) {
    return;
  }

  const statsRef = doc(db, 'games', gameId, 'stats', 'general');
  const unsubscribe = onSnapshot(
    statsRef,
    (snapshot) => {
      if (snapshot.exists()) {
        gameStats[gameId] = snapshot.data() as Partial<GameStats>;
      } else {
        delete gameStats[gameId];
      }
    },
    (error) => {
      console.error(`Home: Error fetching stats for game ${gameId}:`, error.message, error);
      delete gameStats[gameId];
    },
  );

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

type GameStatMetric = 'totalPlayers' | 'favorites' | 'sessionsPlayed' | 'uniqueSubmitters';

function getGameStat(gameId: string, key: GameStatMetric): number {
  const stats = gameStats[gameId];
  const value = stats?.[key];
  return typeof value === 'number' ? value : 0;
}

function tryInitializeAdSlot() {
  if (!shouldDisplayAds.value || hasInitializedAd.value) {
    return;
  }

  const adNode = adSlotRef.value;
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

  const gamesQuery = query(collection(db, 'games'));
  gamesUnsubscribe = onSnapshot(
    gamesQuery,
    (snapshot) => {
      const mappedGames = snapshot.docs
        .map((docSnapshot) => mapGameDocument(docSnapshot))
        .filter((g) => g.active);
      games.value = mappedGames;

      const activeIds = new Set<string>();
      mappedGames.forEach((game) => {
        activeIds.add(game.id);
        subscribeToGameStats(game.id);
      });
      cleanupStatsSubscriptions(activeIds);

      console.log('Home: Games updated:', games.value);
    },
    (err) => {
      console.error('Home: Error fetching games:', err.message, err);
    },
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
    submissions: t('home.order.fields.submissions'),
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
      return getGameStat(game.id, 'favorites');
    case 'sessions':
      return getGameStat(game.id, 'sessionsPlayed');
    case 'submissions':
      return getGameStat(game.id, 'uniqueSubmitters');
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
  gamesSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
