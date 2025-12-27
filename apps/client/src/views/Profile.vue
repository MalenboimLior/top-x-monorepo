<!-- Shows stats and info about the logged in user -->
<template>
  <div class="page-container profile-page" :class="{ 'is-rtl': isRTL }">
    <!-- Decorative background elements -->
    <div class="profile-glow" aria-hidden="true"></div>
    <div class="profile-ambient-blob profile-ambient-blob-1" aria-hidden="true"></div>
    <div class="profile-ambient-blob profile-ambient-blob-2" aria-hidden="true"></div>

    <section class="profile-hero">
      <div class="profile-hero__content">
        <div class="profile-card" :class="{ 'is-blurred': isOwnProfile && !isLoggedIn }">
          <div class="profile-card__main">
            <div class="profile-card__avatar">
              <img :src="photoURL" alt="Profile picture" />
            </div>
            <div class="profile-card__info">
              <h1>{{ displayName }}</h1>
              <a
                :href="`https://x.com/${profile?.username || ''}`"
                target="_blank"
                rel="noopener"
                class="profile-card__username"
              >
                {{ username }}
              </a>
              <p class="profile-card__meta">
                {{ profile?.followersCount || 0 }} followers · {{ profile?.followingCount || 0 }} following
              </p>
            </div>
          </div>
          <div class="profile-card__actions">
            <CustomButton
              v-if="isOwnProfile"
              type="is-light is-small"
              label="Logout"
              @click="logout"
            />
            <div v-else-if="isLoggedIn" class="follow-controls">
              <CustomButton
                v-if="!isFrenemy"
                type="is-primary"
                label="Follow"
                :icon="['fas', 'user-plus']"
                @click="addFrenemy(profile?.uid || '')"
              />
              <div v-else class="following-badge">
                <font-awesome-icon :icon="['fas', 'check']" class="badge-icon" />
                <span class="badge-text">Following</span>
                <CustomButton
                  type="is-light is-small"
                  label="Unfollow"
                  @click="removeFrenemy(profile?.uid || '')"
                  class="unfollow-button"
                />
              </div>
            </div>
            <p v-else class="profile-card__hint">Log in to follow users</p>
          </div>
        </div>
      </div>
    </section>

    <section class="profile-body">
      <div class="profile-surface" :class="{ 'is-blurred': isOwnProfile && !isLoggedIn }">
        <div
          v-if="hasRewardQueue"
          class="challenge-reward-panel"
        >
          <h3 class="challenge-reward-panel__title">Daily challenge updates</h3>
          <p class="challenge-reward-panel__subtitle">Reveal results and claim your streak rewards.</p>
          <div v-if="readyRewards.length" class="challenge-reward-panel__list">
            <article
              v-for="reward in readyRewards"
              :key="reward.id"
              class="challenge-reward-card"
            >
              <div class="challenge-reward-card__details">
                <p class="challenge-reward-card__headline">
                  {{ reward.dailyChallengeDate }} · {{ reward.gameId }}
                </p>
                <p class="challenge-reward-card__status">
                  {{ describeSolveState(reward) }}
                </p>
                <p class="challenge-reward-card__meta">
                  Reveal unlocked · tap below to see the answer.
                </p>
              </div>
              <CustomButton
                type="is-primary is-small"
                label="Show answer"
                @click="handleClaimReward(reward)"
              />
            </article>
          </div>
          <p v-else class="challenge-reward-panel__empty">No reveal-ready rewards yet. We'll ping you when they're live.</p>
          <div v-if="upcomingRewards.length" class="challenge-reward-panel__hint">
            <p v-for="reward in upcomingRewards" :key="reward.id">
              {{ reward.dailyChallengeDate }} reveal at {{ formatRevealAtTimestamp(reward.revealAt) }}
            </p>
          </div>
        </div>
        <nav class="profile-tabs" role="tablist">
          <button
            type="button"
            class="profile-tab"
            :class="{ active: activeTab === 'games' }"
            @click="setActiveTab('games')"
          >
            Games
          </button>
          <!-- Badges tab hidden for now -->
          <!-- <button
            type="button"
            class="profile-tab"
            :class="{ active: activeTab === 'badges' }"
            @click="setActiveTab('badges')"
          >
            Badges
          </button> -->
          <button
            v-if="isOwnProfile"
            type="button"
            class="profile-tab"
            :class="{ active: activeTab === 'frenemies' }"
            @click="setActiveTab('frenemies')"
          >
            Following ({{ userStore.profile?.frenemies?.length || 0 }})
          </button>
          <button
            v-if="isOwnProfile"
            type="button"
            class="profile-tab"
            :class="{ active: activeTab === 'whoadded' }"
            @click="setActiveTab('whoadded')"
          >
            Followers ({{ userStore.profile?.addedBy?.length || 0 }})
          </button>
          <button
            type="button"
            class="profile-tab"
            :class="{ active: activeTab === 'mygames' }"
            @click="setActiveTab('mygames')"
          >
            My Games
          </button>
        </nav>

        <div v-if="activeTab === 'games'" class="profile-panel">

          <!-- Grouped games by type -->
          <div v-if="loadingGroupedGames" class="profile-empty">Loading games...</div>
          <div v-else-if="groupedGamesSync.length === 0" class="profile-empty">
            No games played yet.
          </div>
          <GameTypeSection
            v-for="section in groupedGamesSync"
            :key="section.gameTypeId"
            :game-type-id="section.gameTypeId"
            :game-type-name="section.gameTypeName"
            :icon="section.icon"
            :games="section.games"
          />
        </div>

        <!-- Badges tab hidden for now -->
        <!-- <div v-if="activeTab === 'badges'" class="profile-panel">
          <p class="profile-empty">Coming soon.</p>
        </div> -->

        <div v-if="activeTab === 'frenemies' && isOwnProfile" class="profile-panel">
          <div v-if="loadingFrenemies" class="profile-empty">Loading following...</div>
          <div v-else-if="!frenemyEntries.length" class="profile-empty">You're not following anyone yet.</div>
          <div v-else class="profile-list">
            <article v-for="entry in frenemyEntries" :key="entry.uid" class="profile-list-item">
              <div class="profile-list-item__avatar">
                <img :src="entry.photoURL" alt="Profile picture" />
              </div>
              <div class="profile-list-item__content">
                <RouterLink :to="{ path: '/profile', query: { user: entry.uid } }">{{ entry.displayName }}</RouterLink>
                <p>{{ entry.username }}</p>
              </div>
              <div class="profile-list-item__actions">
                <CustomButton
                  type="is-danger is-small"
                  label="Remove"
                  @click="removeFrenemy(entry.uid)"
                  :disabled="!isOwnProfile"
                />
              </div>
            </article>
          </div>
          <div class="profile-panel__cta">
            <CustomButton type="is-primary" label="Find users to follow" @click="searchMoreFrenemies" />
          </div>
        </div>

        <div v-if="activeTab === 'whoadded' && isOwnProfile" class="profile-panel">
          <div v-if="loadingAddedBy" class="profile-empty">Loading...</div>
          <div v-else-if="!addedByEntries.length" class="profile-empty">No followers yet.</div>
          <div v-else class="profile-list">
            <article v-for="entry in addedByEntries" :key="entry.uid" class="profile-list-item">
              <div class="profile-list-item__avatar">
                <img :src="entry.photoURL" alt="Profile picture" />
              </div>
              <div class="profile-list-item__content">
                <RouterLink :to="{ path: '/profile', query: { user: entry.uid } }">{{ entry.displayName }}</RouterLink>
                <p>{{ entry.username }}</p>
              </div>
              <div class="profile-list-item__actions">
                <CustomButton
                  v-if="isOwnProfile && !userStore.profile?.frenemies?.includes(entry.uid)"
                  type="is-primary is-small"
                  label="Follow back"
                  @click="addFrenemy(entry.uid)"
                  :disabled="!isOwnProfile"
                />
                <p v-else-if="isOwnProfile" class="profile-card__hint">Already following</p>
              </div>
            </article>
          </div>
        </div>

        <!-- My Games Tab -->
        <div v-if="activeTab === 'mygames'" class="profile-panel">
          <div v-if="isOwnProfile" class="profile-panel__cta">
            <CustomButton type="is-primary" label="Create New Game" :icon="['fas', 'plus']" @click="createNewGame" />
          </div>
          <div v-if="loadingMyGames" class="profile-empty">Loading games...</div>
          <div v-else-if="!myCreatedGames.length" class="profile-empty">
            {{ isOwnProfile ? "You haven't created any games yet." : "This user hasn't created any games yet." }}
          </div>
          <div v-else class="my-games-list">
            <article v-for="game in myCreatedGames" :key="game.id" class="my-game-card">
              <header class="my-game-card__header">
                <h3 class="my-game-card__title">{{ game.name }}</h3>
                <span class="my-game-card__status" :class="{ 'is-live': !game.unlisted }">
                  {{ !game.unlisted ? 'Live' : 'Draft' }}
                </span>
              </header>
              <p v-if="game.description" class="my-game-card__description">{{ game.description }}</p>
              <footer class="my-game-card__actions">
                <CustomButton
                  v-if="isOwnProfile"
                  type="is-primary is-small"
                  label="Edit"
                  :icon="['fas', 'edit']"
                  @click="editGame(game)"
                />
                <CustomButton
                  type="is-link is-small"
                  label="View"
                  :icon="['fas', 'eye']"
                  @click="openGame(game)"
                />
                <CustomButton
                  v-if="isOwnProfile"
                  :type="!game.unlisted ? 'is-warning is-small' : 'is-success is-small'"
                  :label="!game.unlisted ? 'Unpublish' : 'Publish'"
                  :icon="!game.unlisted ? ['fas', 'eye-slash'] : ['fas', 'globe']"
                  @click="togglePublish(game)"
                />
                <CustomButton
                  v-if="isOwnProfile"
                  type="is-danger is-small"
                  label="Delete"
                  :icon="['fas', 'trash']"
                  @click="confirmDeleteGame(game)"
                />
              </footer>
            </article>
          </div>
        </div>
      </div>
    </section>

    <div v-show="showLoginTab" class="profile-login-banner" @click="closeLoginTab">
      <div class="profile-login-banner__content" @click.stop>
        <p class="profile-login-banner__title">Unlock Your Profile? 🧐</p>
        <p class="profile-login-banner__text">
          {{ t('games.profile.loginToReveal') }}<br />
          Just your X username + pic - we promise, no meddling with your account! 🔒
        </p>
        <CustomButton
          type="is-primary"
          :label="t('games.loginButton')"
          :icon="['fab', 'x-twitter']"
          @click="handleLogin"
        />
      </div>
    </div>

    <!-- Delete Game Confirmation Modal -->
    <div class="modal" :class="{ 'is-active': showDeleteModal }">
      <div class="modal-background" @click="showDeleteModal = false"></div>
      <div class="modal-content box">
        <h3 class="title is-4">Delete Game</h3>
        <p>Are you sure you want to delete "{{ gameToDelete?.name }}"? This action cannot be undone.</p>
        <div class="buttons mt-4">
          <CustomButton
            type="is-danger"
            label="Delete"
            @click="performDeleteGame"
          />
          <CustomButton
            type="is-light"
            label="Cancel"
            @click="showDeleteModal = false"
          />
        </div>
      </div>
      <button class="modal-close is-large" aria-label="close" @click="showDeleteModal = false"></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { useLocaleStore } from '@/stores/locale';
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { useRouter, useRoute } from 'vue-router';

const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);
import { RouterLink } from 'vue-router';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { getGame, getGames, getGamesBatch } from '@/services/game';

import CustomButton from '@top-x/shared/components/CustomButton.vue';
import GameTypeSection from '@/components/GameTypeSection.vue';
import type { User, DailyChallengeRewardRecord } from '@top-x/shared/types/user';
import type { Game } from '@top-x/shared/types/game';
import { analytics, trackEvent } from '@top-x/shared';
import { GAME_TYPE_ICON_MAP, DEFAULT_GAME_TYPE_ICON } from '@top-x/shared/constants/gameTypes';
import type { UserGameCustomDataUnion } from '@top-x/shared/types/userGameCustom';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

useHead({
  title: 'Your Profile - TOP-X',
  meta: [
    { name: 'description', content: 'View your TOP-X profile, stats and followers.' },
  ],
});

const profile = ref<User | null>(null);

const displayName = computed(() => profile.value?.displayName || 'Anonymous');
const username = computed(() => (profile.value?.username ? `${profile.value.username}` : '@Anonymous'));
const photoURL = computed(() => profile.value?.photoURL || '/assets/profile.png');
const isLoggedIn = computed(() => !!userStore.user);
const isOwnProfile = computed(() => {
  const uidParam = route.query.user as string | undefined;
  return !uidParam || uidParam === userStore.user?.uid;
});
const isFrenemy = computed(() => {
  if (!profile.value || !userStore.profile) return false;
  return userStore.profile.frenemies?.includes(profile.value.uid);
});
const isRTL = computed(() => localeStore.language === 'il');

const frenemyEntries = ref<User[]>([]);
const addedByEntries = ref<User[]>([]);
const loadingFrenemies = ref(false);
const loadingAddedBy = ref(false);
const showLoginTab = ref(false);
const activeTab = ref('mygames');
const loadedFrenemies = ref(false);
const loadedAddedBy = ref(false);
const selectedGameId = ref('');
const availableGames = ref<Game[]>([]);
const gameCache = ref<Map<string, Game>>(new Map());
const myCreatedGames = ref<Game[]>([]);
const loadingMyGames = ref(false);
const loadingGroupedGames = ref(false);
const groupedGamesLoaded = ref(false);
let myGamesUnsubscribe: (() => void) | null = null;

type ChallengeReward = DailyChallengeRewardRecord & { id: string };

const readyRewards = computed<ChallengeReward[]>(() => {
  const raw = userStore.readyDailyChallengeRewards as ChallengeReward[] | undefined;
  return Array.isArray(raw) ? raw : [];
});

const upcomingRewards = computed<ChallengeReward[]>(() => {
  const source = userStore.dailyChallengeRewards as ChallengeReward[] | undefined;
  if (!Array.isArray(source)) {
    return [];
  }
  const now = Date.now();
  return source.filter((reward) => {
    if (reward.status !== 'pending') {
      return false;
    }
    const revealAtMillis = Date.parse(reward.revealAt);
    return !Number.isNaN(revealAtMillis) && revealAtMillis > now;
  });
});

const hasRewardQueue = computed(() => isOwnProfile.value && (readyRewards.value.length > 0 || upcomingRewards.value.length > 0));

// Stats summary
const totalGamesPlayed = computed(() => {
  if (!profile.value?.games) return 0;
  let count = 0;
  for (const gamesByGameId of Object.values(profile.value.games)) {
    count += Object.keys(gamesByGameId as Record<string, any>).length;
  }
  return count;
});

const bestScore = computed(() => {
  if (!profile.value?.games) return null;
  let maxScore = 0;
  for (const gamesByGameId of Object.values(profile.value.games)) {
    for (const gameData of Object.values(gamesByGameId as Record<string, any>)) {
      const score = gameData.score;
      if (typeof score === 'number' && score > maxScore) {
        maxScore = score;
      }
    }
  }
  return maxScore > 0 ? maxScore : null;
});

const bestStreak = computed(() => {
  if (!profile.value?.games) return null;
  let maxStreak = 0;
  for (const gamesByGameId of Object.values(profile.value.games)) {
    for (const gameData of Object.values(gamesByGameId as Record<string, any>)) {
      const streak = gameData.streak;
      if (typeof streak === 'number' && streak > maxStreak) {
        maxStreak = streak;
      }
    }
  }
  return maxStreak > 0 ? maxStreak : null;
});

const filteredGames = computed(() => {
  if (!profile.value?.games) return {};
  const games = { ...profile.value.games } as Record<string, any>;
  delete games.PyramidTier;
  return games;
});

// Game type name mapping
const gameTypeNames: Record<string, string> = {
  Trivia: 'Trivia',
  Quiz: 'Quiz',
  PyramidTier: 'Pyramid',
  ZoneReveal: 'Zone Reveal',
  Pacman: 'Pacman',
  FisherGame: 'Fisher Game',
};

// Helper to get game type icon
function getGameTypeIcon(gameTypeId: string) {
  const normalized = gameTypeId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return GAME_TYPE_ICON_MAP[normalized] ?? DEFAULT_GAME_TYPE_ICON;
}

// Helper to extract stats from custom data based on game type
function extractGameStats(gameTypeId: string, gameData: any): {
  score?: number;
  streak?: number;
  rank?: number;
  percentile?: number;
  level?: number;
  fishCaught?: number;
  quizResult?: { title: string; image?: string };
} {
  console.log('[Profile] extractGameStats called:', {
    gameTypeId,
    hasCustom: !!gameData.custom,
    customKeys: gameData.custom ? Object.keys(gameData.custom) : [],
    custom: gameData.custom,
  });

  const custom = gameData.custom as UserGameCustomDataUnion | undefined;
  if (!custom) {
    console.log('[Profile] No custom data, returning basic stats');
    return {
      score: gameData.score,
      streak: gameData.streak,
    };
  }

  const stats: any = {
    score: gameData.score,
    streak: gameData.streak,
  };

  console.log('[Profile] Processing game type:', gameTypeId);

  switch (gameTypeId) {
    case 'Trivia':
    case 'trivia': {
      const triviaCustom = (custom as any).trivia;
      if (triviaCustom) {
        stats.rank = triviaCustom.leaderboardRank;
        // Note: percentile is calculated dynamically, not stored in user data
      }
      break;
    }
    case 'Quiz':
    case 'quiz': {
      const quizCustom = (custom as any).quiz;
      
      console.log('[Profile] Extracting quiz stats:', {
        hasQuizCustom: !!quizCustom,
        quizCustomKeys: quizCustom ? Object.keys(quizCustom) : [],
        hasResult: !!quizCustom?.result,
        result: quizCustom?.result,
        hasPersonalityResult: !!quizCustom?.personalityResult,
        hasArchetypeResult: !!quizCustom?.archetypeResult,
      });

      // Check for separated result first, then fall back to original structure
      if (quizCustom?.result) {
        stats.quizResult = {
          title: quizCustom.result.title,
          image: quizCustom.result.image,
        };
        console.log('[Profile] Quiz result extracted:', stats.quizResult);
      } else if (quizCustom?.personalityResult) {
        stats.quizResult = {
          title: quizCustom.personalityResult.title,
          image: quizCustom.resultImage,
        };
        console.log('[Profile] Quiz personality result extracted:', stats.quizResult);
      } else if (quizCustom?.archetypeResult) {
        stats.quizResult = {
          title: quizCustom.archetypeResult.title,
          image: quizCustom.resultImage,
        };
        console.log('[Profile] Quiz archetype result extracted:', stats.quizResult);
      } else {
        console.warn('[Profile] No quiz result found in custom data');
      }
      break;
    }
    case 'PyramidTier': {
      // PyramidUserCustom has rank/percentile at top level of custom
      const pyramidCustom = custom as any;
      if (pyramidCustom) {
        stats.rank = pyramidCustom.leaderboardRank;
        stats.percentile = pyramidCustom.percentile;
      }
      break;
    }
    case 'ZoneReveal': {
      const zoneCustom = (custom as any).zoneReveal;
      if (zoneCustom) {
        stats.rank = zoneCustom.leaderboardRank;
        stats.percentile = zoneCustom.percentile;
      }
      break;
    }
    case 'Pacman': {
      const pacmanCustom = (custom as any).pacman;
      if (pacmanCustom) {
        stats.level = pacmanCustom.level;
        stats.rank = pacmanCustom.leaderboardRank;
        stats.percentile = pacmanCustom.percentile;
      }
      break;
    }
    case 'FisherGame': {
      const fisherCustom = (custom as any).fisherGame;
      if (fisherCustom) {
        stats.fishCaught = fisherCustom.fishCaught;
        stats.rank = fisherCustom.leaderboardRank;
        stats.percentile = fisherCustom.percentile;
      }
      break;
    }
  }

  return stats;
}

// Grouped games by type
interface GroupedGame {
  gameId: string;
  gameName: string;
  score?: number;
  streak?: number;
  rank?: number;
  percentile?: number;
  level?: number;
  fishCaught?: number;
  lastPlayed?: number;
  quizResult?: { title: string; image?: string };
  gameTypeId?: string;
  pyramidData?: any;
  zoneRevealData?: any;
}

const groupedGamesSync = ref<Array<{
  gameTypeId: string;
  gameTypeName: string;
  icon: any;
  games: GroupedGame[];
}>>([]);

// Load grouped games (optimized with batch fetching)
async function loadGroupedGames() {
  if (!profile.value?.games || loadingGroupedGames.value) {
    return;
  }

  loadingGroupedGames.value = true;

  try {
    const grouped: Record<string, GroupedGame[]> = {};
    
    // Collect all game IDs that need to be fetched
    const gameIdsToFetch: string[] = [];
    const gameDataMap = new Map<string, { gameTypeId: string; gameData: any }>();

    // Process each game type
    for (const [gameTypeId, gamesByGameId] of Object.entries(profile.value.games)) {

      if (!grouped[gameTypeId]) {
        grouped[gameTypeId] = [];
      }

      // Collect game IDs that aren't cached
      for (const [gameId, gameData] of Object.entries(gamesByGameId as Record<string, any>)) {
        gameDataMap.set(gameId, { gameTypeId, gameData });
        
        if (!gameCache.value.has(gameId)) {
          gameIdsToFetch.push(gameId);
        }
      }
    }

    // Batch fetch all uncached games at once
    if (gameIdsToFetch.length > 0) {
      const fetchedGames = await getGamesBatch(gameIdsToFetch);
      fetchedGames.forEach((game, gameId) => {
        gameCache.value.set(gameId, game);
      });
    }

    // Now process all games using cached data
    for (const [gameId, { gameTypeId, gameData }] of gameDataMap.entries()) {
      const cachedGame = gameCache.value.get(gameId);
      const gameName = cachedGame?.name || gameId;
      const gameDescription = cachedGame?.description;

      const stats = extractGameStats(gameTypeId, gameData);

      // Extract additional data for specific game types
      let pyramidData = undefined;
      let zoneRevealData = undefined;
      let quizResult = undefined;

      if (gameTypeId === 'PyramidTier') {
        // For pyramid games, we need to resolve item IDs to actual images
        const pyramidStructure = (gameData as any).custom?.pyramid;
        if (pyramidStructure && cachedGame) {
          const custom = cachedGame.custom as any;
          const allItems = [...(custom?.items || []), ...(custom?.communityItems || [])];
          pyramidData = pyramidStructure.map((tier: any) =>
            tier.slots.map((id: string | null) => ({
              image: id ? allItems.find((item: any) => item.id === id) || null : null
            }))
          );
        }
      } else if (gameTypeId === 'Quiz') {
        // For quiz games, we need to resolve bucket scores to result
        const quizCustom = (gameData as any).custom?.quiz;
        if (quizCustom && cachedGame) {
          const custom = cachedGame.custom as any;
          const bucketScores = quizCustom.bucketScores;
          if (bucketScores && custom?.personalityBuckets) {
            // Find the winning bucket (highest score)
            let winningBucketId: string | null = null;
            let highestScore = -Infinity;

            Object.entries(bucketScores).forEach(([bucketId, score]) => {
              const numScore = score as number;
              if (numScore > highestScore) {
                highestScore = numScore;
                winningBucketId = bucketId;
              }
            });

            // Find the bucket in game config
            const winningBucket = custom.personalityBuckets.find(
              (bucket: any) => bucket.id === winningBucketId
            );

            if (winningBucket && winningBucket.results && winningBucket.results.length > 0) {
              // Find the appropriate result variant based on score
              const resultVariant = winningBucket.results.find((result: any) => {
                const minOk = result.minScore === undefined || highestScore >= result.minScore;
                const maxOk = result.maxScore === undefined || highestScore <= result.maxScore;
                return minOk && maxOk;
              }) || winningBucket.results[0]; // fallback to first result

              quizResult = {
                title: resultVariant.title,
                image: resultVariant.imageUrl,
              };
            }
          }
        }
      } else if (gameTypeId === 'ZoneReveal') {
        zoneRevealData = {
          answer: (gameData as any).custom?.normalized,
          isMatch: (gameData as any).custom?.isMatch,
        };
      }

      grouped[gameTypeId].push({
        gameId,
        gameName,
        ...stats,
        lastPlayed: gameData.lastPlayed,
        gameTypeId,
        pyramidData,
        zoneRevealData,
        // quizResult is already in stats, don't override it
      });
    }

    // Sort games by last played
    for (const gameTypeId in grouped) {
      grouped[gameTypeId].sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
    }

    // Convert to array format
    groupedGamesSync.value = Object.entries(grouped).map(([gameTypeId, games]) => ({
      gameTypeId,
      gameTypeName: gameTypeNames[gameTypeId] || gameTypeId,
      icon: getGameTypeIcon(gameTypeId),
      games,
    }));

    groupedGamesLoaded.value = true;
  } catch (err) {
    console.error('Error loading grouped games:', err);
  } finally {
    loadingGroupedGames.value = false;
  }
}

function formatLastPlayed(value: unknown): string {
  if (!value) return '—';

  let millis: number | null = null;

  if (typeof value === 'number') {
    millis = value;
  } else if (typeof value === 'string') {
    const parsed = Date.parse(value);
    millis = Number.isNaN(parsed) ? null : parsed;
  } else if (typeof value === 'object' && value !== null) {
    const timestampLike = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof timestampLike.toMillis === 'function') {
      millis = timestampLike.toMillis();
    } else if (typeof timestampLike.seconds === 'number') {
      const nanos = typeof timestampLike.nanoseconds === 'number' ? timestampLike.nanoseconds : 0;
      millis = timestampLike.seconds * 1000 + Math.floor(nanos / 1_000_000);
    }
  }

  if (!millis) return '—';

  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString();
}

function formatRevealAtTimestamp(value: string): string {
  const millis = Date.parse(value);
  if (Number.isNaN(millis)) {
    return 'TBD';
  }
  return new Date(millis).toLocaleString();
}

function describeSolveState(reward: ChallengeReward): string {
  if (reward.solveState === 'solved') {
    return 'Solved · claim +1 score';
  }
  if (reward.solveState === 'failed') {
    return 'Attempt logged · claim +1 streak';
  }
  if (reward.solveState === 'skipped') {
    return 'Skipped · answer available';
  }
  return 'Reveal ready';
}

async function handleClaimReward(reward: ChallengeReward) {
  console.log('Claiming reward for', reward);
  await userStore.claimDailyChallengeReward({
    dailyChallengeId: reward.dailyChallengeId,
    gameId: reward.gameId,
  });
}

async function loadProfile() {
  const uidParam = route.query.user as string | undefined;
  if (uidParam && uidParam !== userStore.user?.uid) {
    const snap = await getDoc(doc(db, 'users', uidParam));
    profile.value = snap.exists() ? (snap.data() as User) : null;
  } else {
    profile.value = userStore.profile;
  }
}

async function fetchFrenemies() {
  loadingFrenemies.value = true;
  frenemyEntries.value = [];
  if (!userStore.profile?.frenemies || userStore.profile.frenemies.length === 0) {
    loadingFrenemies.value = false;
    return;
  }
  try {
    const frenemyPromises = userStore.profile.frenemies.map((uid) => getDoc(doc(db, 'users', uid)));
    const frenemyDocs = await Promise.all(frenemyPromises);
    frenemyEntries.value = frenemyDocs.filter((docItem) => docItem.exists()).map((docItem) => docItem.data() as User);
  } catch (err) {
    console.error('Error fetching following list:', err);
  } finally {
    loadingFrenemies.value = false;
  }
}

async function fetchAddedBy() {
  loadingAddedBy.value = true;
  addedByEntries.value = [];
  if (!userStore.profile?.addedBy || userStore.profile.addedBy.length === 0) {
    loadingAddedBy.value = false;
    return;
  }
  try {
    const addedByPromises = userStore.profile.addedBy.map((uid) => getDoc(doc(db, 'users', uid)));
    const addedByDocs = await Promise.all(addedByPromises);
    addedByEntries.value = addedByDocs.filter((docItem) => docItem.exists()).map((docItem) => docItem.data() as User);
  } catch (err) {
    console.error('Error fetching addedBy:', err);
  } finally {
    loadingAddedBy.value = false;
  }
}

async function addFrenemy(uid: string) {
  try {
    await userStore.addFrenemy(uid);
    // Refresh profile if viewing other user's profile
    if (!isOwnProfile.value && profile.value?.uid === uid) {
      await loadProfile();
    }
    if (activeTab.value === 'frenemies') await fetchFrenemies();
    if (activeTab.value === 'whoadded') await fetchAddedBy();
  } catch (err) {
    console.error('Error adding frenemy:', err);
  }
}

async function removeFrenemy(uid: string) {
  try {
    await userStore.removeFrenemy(uid);
    // Refresh profile if viewing other user's profile
    if (!isOwnProfile.value && profile.value?.uid === uid) {
      await loadProfile();
    }
    if (activeTab.value === 'frenemies') await fetchFrenemies();
    if (activeTab.value === 'whoadded') await fetchAddedBy();
  } catch (err) {
    console.error('Error removing frenemy:', err);
  }
}

async function handleLogin() {
  await userStore.loginWithX();
  closeLoginTab();
}

async function logout() {
  await userStore.logout();
  router.push('/');
}

function closeLoginTab() {
  showLoginTab.value = false;
}

function setActiveTab(tab: string) {
  activeTab.value = tab;
}

function searchMoreFrenemies() {
  router.push('/users');
}

function createNewGame() {
  router.push('/build');
}

// My Games functions
function fetchMyCreatedGames() {
  if (!profile.value?.uid) {
    myCreatedGames.value = [];
    return;
  }

  // Unsubscribe from previous listener if exists
  if (myGamesUnsubscribe) {
    myGamesUnsubscribe();
    myGamesUnsubscribe = null;
  }

  loadingMyGames.value = true;
  const q = query(collection(db, 'games'), where('creator.userid', '==', profile.value.uid));
  
  myGamesUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      myCreatedGames.value = snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() } as Game));
      loadingMyGames.value = false;
    },
    (err) => {
      console.error('Error fetching created games:', err);
      loadingMyGames.value = false;
    }
  );
}

function stopMyGamesListener() {
  if (myGamesUnsubscribe) {
    myGamesUnsubscribe();
    myGamesUnsubscribe = null;
  }
}

function editGame(game: Game) {
  if (!game.id || !isOwnProfile.value) return;
  router.push(`/build/edit/${game.id}`);
}

function openGame(game: Game) {
  if (!game.id || typeof window === 'undefined') return;
  window.open(`/games/info?game=${game.id}`, '_blank', 'noopener');
}

async function togglePublish(game: Game) {
  if (!isOwnProfile.value || !game.id) return;
  try {
    const gameRef = doc(db, 'games', game.id);
    await updateDoc(gameRef, { unlisted: game.unlisted ?? false ? false : true });
  } catch (err) {
    console.error('Error toggling publish:', err);
  }
}

const gameToDelete = ref<Game | null>(null);
const showDeleteModal = ref(false);

function confirmDeleteGame(game: Game) {
  if (!isOwnProfile.value) return;
  gameToDelete.value = game;
  showDeleteModal.value = true;
}

async function performDeleteGame() {
  if (!gameToDelete.value?.id || !isOwnProfile.value) return;
  
  try {
    const gameRef = doc(db, 'games', gameToDelete.value.id);
    await deleteDoc(gameRef);
    showDeleteModal.value = false;
    gameToDelete.value = null;
  } catch (err) {
    console.error('Error deleting game:', err);
    alert('Failed to delete game');
  }
}

async function loadAvailableGames() {
  try {
    const result = await getGames({
      activeOnly: true,
      dailyChallengeActive: true,
    });
    
    if (result.error) {
      console.error('Error loading available games:', result.error);
      return;
    }
    
    // Sort by name
    const games = result.games.sort((a, b) => a.name.localeCompare(b.name));
    availableGames.value = games;

    // Auto-select first game if available and no selection
    if (!selectedGameId.value && games.length > 0) {
      // Try to find a game the user has played
      const userGames = profile.value?.games ? Object.keys(profile.value.games) : [];
      const playedGame = games.find((g) => userGames.includes(g.id));
      selectedGameId.value = playedGame?.id || games[0].id;
    }
  } catch (err) {
    console.error('Error loading available games:', err);
  }
}

watch(
  [() => route.query.user, () => userStore.user?.uid],
  async () => {
    await loadProfile();
    // Don't load grouped games immediately - wait for tab activation
    if (isOwnProfile.value && !isLoggedIn.value) {
      showLoginTab.value = true;
    } else {
      showLoginTab.value = false;
    }
    if (!isOwnProfile.value) {
      activeTab.value = 'games';
    }
    if (isOwnProfile.value && isLoggedIn.value) {
      await loadAvailableGames();
    }
    // Don't load my games immediately - wait for tab activation
  },
  { immediate: true },
);

watch(
  () => userStore.profile,
  async (newProfile) => {
    if (isOwnProfile.value) {
      profile.value = newProfile;
      // Only reload grouped games if tab is already loaded
      if (groupedGamesLoaded.value && activeTab.value === 'games') {
        groupedGamesLoaded.value = false;
        await loadGroupedGames();
      }
    }
  },
);

watch(
  () => profile.value?.games,
  async () => {
    // Only reload grouped games if tab is already loaded
    if (groupedGamesLoaded.value && activeTab.value === 'games') {
      groupedGamesLoaded.value = false;
      await loadGroupedGames();
    }
  },
  { deep: true },
);

watch(activeTab, (newTab) => {
  // Lazy load data only when tab becomes active
  if (newTab === 'games' && !groupedGamesLoaded.value) {
    loadGroupedGames();
  } else if (newTab === 'frenemies' && isOwnProfile.value && !loadedFrenemies.value) {
    loadedFrenemies.value = true;
    fetchFrenemies();
  } else if (newTab === 'whoadded' && isOwnProfile.value && !loadedAddedBy.value) {
    loadedAddedBy.value = true;
    fetchAddedBy();
  } else if (newTab === 'mygames') {
    // Start listener when tab becomes active
    if (profile.value?.uid && !myGamesUnsubscribe) {
      fetchMyCreatedGames();
    }
  } else {
    // Stop listener when switching away from my games tab
    if (newTab !== 'mygames') {
      stopMyGamesListener();
    }
  }
});

onMounted(() => {
  trackEvent(analytics, 'page_view', { page_name: 'profile' });
});

onBeforeUnmount(() => {
  // Cleanup: stop my games listener when component unmounts
  stopMyGamesListener();
});
</script>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: clamp(4rem, 10vw, 6rem);
  padding-top: clamp(2rem, 5vw, 4rem);
  position: relative;
  overflow-x: hidden;
  min-height: 100vh;
  gap: 3rem;
}

/* Decorative background elements */
.profile-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 140%;
  height: 600px;
  background: radial-gradient(circle at 50% 0%, var(--color-primary-16) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
  filter: blur(80px);
}

.profile-ambient-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  z-index: 0;
  opacity: 0.15;
}

.profile-ambient-blob-1 {
  width: 400px;
  height: 400px;
  background: var(--bulma-primary);
  top: 10%;
  left: -100px;
  animation: float 20s infinite alternate ease-in-out;
}

.profile-ambient-blob-2 {
  width: 300px;
  height: 300px;
  background: var(--color-secondary, #9b59b6);
  bottom: 20%;
  right: -50px;
  animation: float 25s infinite alternate-reverse ease-in-out;
}

@keyframes float {
  0% { transform: translate(0, 0) rotate(0deg); }
  100% { transform: translate(50px, 100px) rotate(15deg); }
}

.profile-hero {
  position: relative;
  width: 100%;
  z-index: 1;
  display: flex;
  justify-content: center;
}

.profile-hero__content {
  width: min(960px, 92%);
  display: flex;
  justify-content: center;
}

.profile-card {
  width: 100%;
  background: rgba(var(--color-bg-base-rgb), 0.4);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-radius: 40px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: clamp(2rem, 5vw, 3.5rem);
  display: flex;
  flex-direction: column;
  gap: 2rem;
  box-shadow: 
    0 30px 60px -12px rgba(0, 0, 0, 0.45),
    inset 0 1px 1px rgba(255, 255, 255, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.profile-card:hover {
  transform: translateY(-5px);
  box-shadow: 
    0 40px 80px -15px rgba(0, 0, 0, 0.5),
    inset 0 1px 1px rgba(255, 255, 255, 0.15);
}

.profile-card__main {
  display: flex;
  align-items: center;
  gap: 2.5rem;
}

.profile-card__avatar {
  flex-shrink: 0;
  position: relative;
}

.profile-card__avatar img {
  width: clamp(100px, 15vw, 160px);
  height: clamp(100px, 15vw, 160px);
  border-radius: 48px;
  object-fit: cover;
  border: 4px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

.profile-card:hover .profile-card__avatar img {
  transform: rotate(4deg) scale(1.05);
  border-color: var(--bulma-primary);
  box-shadow: 0 20px 40px rgba(var(--bulma-primary-rgb), 0.3);
}

.profile-card__info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.profile-card__info h1 {
  margin: 0;
  font-size: clamp(2.2rem, 4vw, 3.8rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.2));
}

.profile-card__username {
  color: var(--bulma-primary);
  text-decoration: none;
  font-size: clamp(1.1rem, 1.5vw, 1.3rem);
  font-weight: 700;
  opacity: 0.9;
  transition: all 0.2s ease;
}

.profile-card__username:hover {
  opacity: 1;
  text-shadow: 0 0 20px rgba(var(--bulma-primary-rgb), 0.5);
}

.profile-card__meta {
  margin: 0.5rem 0 0;
  color: var(--color-text-tertiary);
  font-size: 1rem;
  font-weight: 500;
}

.profile-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.profile-body {
  width: 100%;
  z-index: 1;
  display: flex;
  justify-content: center;
}

.profile-surface {
  width: min(960px, 92%);
  background: rgba(var(--color-bg-base-rgb), 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 40px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: clamp(2rem, 5vw, 3.5rem);
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
}

.profile-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.5rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.profile-tab {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 14px;
  padding: 0.75rem 1.5rem;
  color: var(--color-text-secondary);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  font-size: 0.95rem;
}

.profile-tab:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.profile-tab.active {
  background: var(--bulma-primary);
  color: #000;
  box-shadow: 0 8px 16px -4px rgba(var(--bulma-primary-rgb), 0.5);
}

.profile-panel {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* List Items */
.profile-list {
  display: grid;
  gap: 1.25rem;
}

.profile-list-item {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}

.profile-list-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(var(--bulma-primary-rgb), 0.3);
  transform: translateX(5px);
}

.profile-list-item__avatar img {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.profile-list-item__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.profile-list-item__content a {
  color: #fff;
  font-weight: 800;
  font-size: 1.15rem;
  text-decoration: none;
  transition: color 0.2s ease;
}

.profile-list-item__content a:hover {
  color: var(--bulma-primary);
}

.profile-list-item__content p {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: 0.95rem;
  font-weight: 500;
}

/* My Games */
.my-games-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.my-game-card {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}

.my-game-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: var(--bulma-primary);
  transform: translateY(-5px);
}

.my-game-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.my-game-card__title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 800;
  color: #fff;
}

.my-game-card__status {
  font-size: 0.65rem;
  text-transform: uppercase;
  font-weight: 800;
  letter-spacing: 0.05em;
  padding: 0.35rem 0.75rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-tertiary);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.my-game-card__status.is-live {
  background: rgba(0, 202, 114, 0.1);
  color: #00ca72;
  border-color: rgba(0, 202, 114, 0.2);
}

.my-game-card__description {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  flex: 1;
}

.my-game-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

/* Modals */
.modal-content {
  background: rgba(var(--color-bg-base-rgb), 0.8) !important;
  backdrop-filter: blur(30px) !important;
  border-radius: 32px !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 40px 80px rgba(0,0,0,0.5) !important;
}

/* Rewards Section */
.challenge-reward-panel {
  background: linear-gradient(135deg, rgba(var(--bulma-primary-rgb), 0.1) 0%, rgba(255,255,255,0.02) 100%);
  border: 1px solid rgba(var(--bulma-primary-rgb), 0.2);
  border-radius: 32px;
  padding: 2rem;
}

.challenge-reward-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.challenge-reward-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--bulma-primary);
}

/* Login Banner */
.profile-login-banner {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
}

.profile-login-banner__content {
  background: rgba(20, 20, 20, 0.95);
  border: 2px solid var(--bulma-primary);
  border-radius: 40px;
  box-shadow: 0 0 50px rgba(var(--bulma-primary-rgb), 0.3);
  padding: 3rem 2rem;
}

.profile-login-banner__title {
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.is-blurred {
  filter: blur(12px) grayscale(0.5);
  opacity: 0.6;
}

@media (max-width: 768px) {
  .profile-card__main {
    flex-direction: column;
    text-align: center;
    gap: 1.5rem;
  }
  
  .profile-tabs {
    justify-content: center;
  }

  .my-games-list {
    grid-template-columns: 1fr;
  }
  
  .profile-list-item {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
    padding: 1.5rem;
  }

  .profile-list-item__actions {
    width: 100%;
    justify-content: center;
  }

  .profile-list-item__actions :deep(.button) {
    width: 100%;
  }

  .challenge-reward-card {
    flex-direction: column;
    text-align: center;
  }
}
</style>
