import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import {
  UserGameData,
  SubmitGameScoreRequest,
  SubmitGameScoreResponse,
  User,
  DailyChallengeUserProgress,
  UserGameCustomData,
  DailyChallengeAttemptMetadata,
  DailyChallengeRewardRecord,
  DailyChallengeSolveState,
} from '@top-x/shared/types/user';
import type {
  Game,
} from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';
import type { DailyChallenge } from '@top-x/shared/types/dailyChallenge';
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal';
import { evaluateZoneRevealAnswer } from '@top-x/shared/utils/zoneRevealAnswer';
import './utils/firebaseAdmin';
import {
  applyChallengeCounterUpdates,
  applyGameCounterUpdates,
  GAME_COUNTER_KEYS,
} from '../utils/statsManager';
import {
  createLeaderboardDatePayload,
  DEFAULT_LEADERBOARD_PHOTO,
  parseDateLikeValue,
} from '../utils/leaderboardHelpers';
import {
  createEmptyGameStats,
  normalizeGameStats,
  hasMeaningfulCustomData,
  hasPyramidCustomChanges,
  isPyramidCustomData,
} from '../utils/gameStatsHelpers';

const db = admin.firestore();

/**
 * Submits a game score for an authenticated user.
 * 
 * This is the main function for recording game results. It handles both regular game submissions
 * and daily challenge submissions with different logic paths.
 * 
 * Key Features:
 * - Validates and processes regular game scores (only updates if score is higher)
 * - Handles daily challenge submissions with separate leaderboards
 * - Evaluates ZoneReveal game answers using fuzzy matching
 * - Updates user game data, leaderboards, and statistics
 * - Creates reward records for daily challenges
 * - Tracks PyramidTier custom data changes (pyramid structure, worst item)
 * - Updates game statistics (distribution, counters, custom analytics)
 * 
 * Business Rules:
 * - Regular games: Only updates if new score > previous score (PyramidTier exception for custom data changes)
 * - Daily challenges: Always updates, tracks best score and attempt metadata
 * - ZoneReveal: Evaluates answer correctness using distance metrics
 * - Daily challenge rewards increment leaderboard score or streak when claimed
 * - VIP status: Users with followersCount >= 0 are added to game VIP list on first play
 * 
 * @returns SubmitGameScoreResponse with success status, scores, and reward info (if applicable)
 */
export const submitGameScore = functions.https.onCall(async (
  request: functions.https.CallableRequest<SubmitGameScoreRequest>
): Promise<SubmitGameScoreResponse> => {
  const { auth, data } = request;

  if (!auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Parse and validate request payload
  const payload = (data ?? {}) as SubmitGameScoreRequest;
  const { gameTypeId, gameId, gameData } = payload;
  const rawDailyChallengeId = payload.dailyChallengeId?.trim();
  const requestDailyChallengeDate = payload.dailyChallengeDate?.trim();
  const isDailyChallengeSubmission = Boolean(rawDailyChallengeId);

  // Warn if challenge metadata is provided without dailyChallengeId (potential client error)
  if (!rawDailyChallengeId && (requestDailyChallengeDate || payload.challengeMetadata)) {
    console.warn('submitGameScore: challenge metadata provided without dailyChallengeId', {
      uid: auth.uid,
      gameId,
      gameTypeId,
      hasChallengeMetadata: Boolean(payload.challengeMetadata),
      requestDailyChallengeDate,
    });
  }

  // Validate required fields
  if (!gameTypeId || !gameId || !gameData) {
    throw new functions.https.HttpsError('invalid-argument', 'gameTypeId, gameId and gameData are required');
  }

  const uid = auth.uid;

  console.log('submitGameScore: received request payload', {
    uid,
    gameId,
    gameTypeId,
    score: gameData.score,
    dailyChallenge: {
      id: rawDailyChallengeId ?? null,
      date: requestDailyChallengeDate ?? null,
    },
    hasChallengeMetadata: Boolean(payload.challengeMetadata),
    challengeMetadata: payload.challengeMetadata ?? null,
    custom: gameData.custom ?? null,
  });

  try {
    // Use transaction to ensure atomicity across all updates
    const result = await db.runTransaction(async (tx) => {
      // Prepare Firestore references
      const userRef = db.collection('users').doc(uid);
      const gameRef = db.collection('games').doc(gameId);
      const statsRef = gameRef.collection('stats').doc('general');
      const leaderboardRef = gameRef.collection('leaderboard').doc(uid);
      
      // Daily challenge references (only created if this is a challenge submission)
      const challengeRef = isDailyChallengeSubmission && rawDailyChallengeId
        ? gameRef.collection('daily_challenges').doc(rawDailyChallengeId)
        : null;
      const challengeLeaderboardRef = challengeRef ? challengeRef.collection('leaderboard').doc(uid) : null;
      const challengeStatsRef = challengeRef ? challengeRef.collection('stats').doc('general') : null;
      const rewardRef = isDailyChallengeSubmission && rawDailyChallengeId
        ? userRef.collection('dailyChallengeRewards').doc(rawDailyChallengeId)
        : null;

      // Fetch user data
      const userDoc = await tx.get(userRef);
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('failed-precondition', 'User profile not found');
      }

      const userData = userDoc.data() as User;
      const previousGameData = userData.games?.[gameTypeId]?.[gameId] as UserGameData | undefined;
      const previousScore = previousGameData?.score ?? null;
      
      // Special handling for PyramidTier game: allow updates if custom data changed even if score didn't improve
      const isPyramidGame = gameTypeId === 'PyramidTier';
      const pyramidCustomChanged = isPyramidGame
        ? hasPyramidCustomChanges(previousGameData?.custom, gameData.custom)
        : false;

      // Early return for regular games if score doesn't improve (unless PyramidTier with custom changes)
      if (!isDailyChallengeSubmission && previousScore !== null && gameData.score <= previousScore && !pyramidCustomChanged) {
        // Score didn't improve - still increment session counter but don't update score
        console.log(`submitGameScore: score ${gameData.score} is not higher than previous score ${previousScore} for user ${uid}`);
        applyGameCounterUpdates({
          tx,
          userRef,
          statsRef,
          userData,
          gameId,
          updates: [{ key: GAME_COUNTER_KEYS.SESSIONS_PLAYED, type: 'increment' }],
        });
        return {
          success: false,
          message: 'Score is not higher than the existing best score',
          previousScore,
          newScore: gameData.score,
        } satisfies SubmitGameScoreResponse;
      }

      // Fetch game documents
      const statsDoc = await tx.get(statsRef);
      const gameDoc = await tx.get(gameRef);
      let challengeDoc: FirebaseFirestore.DocumentSnapshot | null = null;
      let challengeStatsDoc: FirebaseFirestore.DocumentSnapshot | null = null;
      let existingRewardDoc: FirebaseFirestore.DocumentSnapshot | null = null;

      // Fetch challenge-related documents if this is a challenge submission
      if (challengeRef && challengeStatsRef) {
        [challengeDoc, challengeStatsDoc] = await Promise.all([
          tx.get(challengeRef),
          tx.get(challengeStatsRef),
        ]);
      }

      // Fetch existing reward if this is a challenge submission
      if (rewardRef) {
        existingRewardDoc = await tx.get(rewardRef);
      }

      if (!gameDoc.exists) {
        throw new functions.https.HttpsError('failed-precondition', `Game ${gameId} does not exist`);
      }

      // Validate and resolve daily challenge date
      let challengeData: DailyChallenge | null = null;
      let resolvedDailyChallengeDate = requestDailyChallengeDate || null;

      if (isDailyChallengeSubmission) {
        // Validate daily challenge submission requirements
        if (!rawDailyChallengeId) {
          throw new functions.https.HttpsError('invalid-argument', 'dailyChallengeId is required for challenge submissions');
        }

        if (!challengeDoc || !challengeDoc.exists) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            `Daily challenge ${rawDailyChallengeId} does not exist for game ${gameId}`,
          );
        }

        challengeData = challengeDoc.data() as DailyChallenge;
        // Resolve challenge date from request or challenge document
        resolvedDailyChallengeDate = resolvedDailyChallengeDate || challengeData?.date || null;

        if (!resolvedDailyChallengeDate) {
          throw new functions.https.HttpsError('invalid-argument', 'Unable to resolve the daily challenge date');
        }
      }

      // Determine score to persist: for regular games, keep the best score
      let scoreToPersist = previousScore !== null ? Math.max(previousScore, gameData.score) : gameData.score;
      const serverLastPlayed = Date.now();
      const gameSnapshot = gameDoc.data() as Game | undefined;

      // Handle ZoneReveal game answer evaluation
      let enrichedGameData = gameData;
      let attemptMetadata: DailyChallengeAttemptMetadata | undefined;

      if (gameTypeId === 'ZoneReveal') {
        // Get ZoneReveal config from challenge or game (challenge config takes precedence)
        const zoneRevealConfig = (challengeData?.custom as ZoneRevealConfig | undefined)
          ?? (gameSnapshot?.custom as ZoneRevealConfig | undefined);
        const rawAnswer = gameData.custom?.answer;
        let attempt: string | undefined;

        // Extract answer string from various possible formats
        if (typeof rawAnswer === 'string') {
          attempt = rawAnswer;
        } else if (rawAnswer && typeof rawAnswer === 'object') {
          const candidate = (rawAnswer as Record<string, unknown>).original
            ?? (rawAnswer as Record<string, unknown>).value
            ?? (rawAnswer as Record<string, unknown>).attempt;

          if (typeof candidate === 'string') {
            attempt = candidate;
          }
        }

        // Evaluate answer correctness using fuzzy matching
        if (zoneRevealConfig?.answer && typeof attempt === 'string') {
          const { normalizedAnswer, distance, isMatch } = evaluateZoneRevealAnswer(
            zoneRevealConfig.answer,
            attempt,
          );

          attemptMetadata = {
            normalizedAnswer,
            distance,
            isMatch,
          };

          // Enrich game data with evaluation results
          enrichedGameData = {
            ...gameData,
            custom: {
              ...(gameData.custom ?? {}),
              normalized: normalizedAnswer,
              distance,
              isMatch,
            },
          };
        }
      }

      // Determine streak value (use provided streak or fall back to previous)
      let streakToPersist = typeof gameData.streak === 'number'
        ? gameData.streak
        : previousGameData?.streak ?? 0;
      
      // Daily challenge-specific variables
      let challengeBestScore: number | undefined;
      let challengeProgressUpdate: DailyChallengeUserProgress | undefined;
      let challengeGameDataUpdate: UserGameData | undefined;
      let challengeAttemptCount: number | undefined;
      let challengePlayedAtIso: string | undefined;
      let challengeSolvedAtIso: string | undefined;
      let challengeAttemptMetadata: DailyChallengeAttemptMetadata | undefined = undefined;
      let challengeStatsUpdate: (Partial<GameStats> & { totalAttempts?: number; correctAttempts?: number }) | undefined;
      let pendingRewardRecord: DailyChallengeRewardRecord | undefined;

      // Process daily challenge submission
      if (isDailyChallengeSubmission && rawDailyChallengeId && challengeRef) {
        // Get previous challenge progress for this specific daily challenge
        const previousChallengeGameData = previousGameData?.dailyChallenges?.[rawDailyChallengeId];
        const previousChallengeProgress = previousChallengeGameData?.custom?.dailyChallengeProgress;
        const attemptTimestamp = new Date().toISOString();
        
        // Determine challenge state
        const firstSubmission = !previousChallengeProgress?.played;
        const wasPreviouslySolved = previousChallengeProgress?.solved ?? false;
        const isCurrentAttemptCorrect = attemptMetadata?.isMatch ?? false;
        const submissionScore = gameData.score;
        
        // Calculate best score (track highest score across all attempts)
        const previousChallengeBestScore = typeof previousChallengeProgress?.bestScore === 'number'
          ? previousChallengeProgress.bestScore
          : undefined;
        challengeBestScore = previousChallengeBestScore !== undefined
          ? Math.max(previousChallengeBestScore, submissionScore)
          : submissionScore;
        const hasNewBestScore = previousChallengeBestScore === undefined || challengeBestScore > previousChallengeBestScore;
        
        // Track attempt count and timestamps
        const attemptCount = (previousChallengeProgress?.attemptCount ?? 0) + 1;
        const firstPlayedAt = previousChallengeProgress?.firstPlayedAt ?? attemptTimestamp;
        let solvedAt = previousChallengeProgress?.solvedAt;
        // Mark solved timestamp if this is the first correct attempt
        if (!solvedAt && isCurrentAttemptCorrect) {
          solvedAt = attemptTimestamp;
        }
        // Challenge is solved if it was previously solved OR current attempt is correct
        const solved = wasPreviouslySolved || isCurrentAttemptCorrect;
        const bestScoreAt = hasNewBestScore ? attemptTimestamp : previousChallengeProgress?.bestScoreAt;

        const nextCounters = applyChallengeCounterUpdates({
          tx,
          challengeRef,
          counterState: previousChallengeProgress?.counters,
          updates: [
            { key: GAME_COUNTER_KEYS.SESSIONS_PLAYED, type: 'increment' },
            ...(firstSubmission
              ? [
                { key: GAME_COUNTER_KEYS.TOTAL_PLAYERS, type: 'unique' } as const,
                { key: GAME_COUNTER_KEYS.UNIQUE_SUBMITTERS, type: 'unique' } as const,
              ]
              : []),
          ],
        });

        if (attemptMetadata) {
          challengeAttemptMetadata = { ...attemptMetadata, recordedAt: attemptTimestamp };
        }

        const solvedAtValue = solved ? solvedAt : undefined;

        challengeProgressUpdate = {
          played: true,
          solved,
          bestScore: challengeBestScore,
          firstPlayedAt,
          lastPlayedAt: attemptTimestamp,
          ...(solvedAtValue ? { solvedAt: solvedAtValue } : {}),
          ...(bestScoreAt ? { bestScoreAt } : {}),
          attemptCount,
          ...(challengeAttemptMetadata ? { attemptMetadata: challengeAttemptMetadata } : {}),
          ...(nextCounters ? { counters: nextCounters } : {}),
        } satisfies DailyChallengeUserProgress;

        const challengeCustomFromSubmission = { ...(enrichedGameData.custom ?? {}) } as UserGameCustomData;
        const challengeBaseCustom: UserGameCustomData = {
          ...(previousChallengeGameData?.custom ?? {}),
          ...challengeCustomFromSubmission,
        };

        delete (challengeBaseCustom as Record<string, unknown>).dailyChallenges;

        challengeBaseCustom.dailyChallengeProgress = challengeProgressUpdate;

        const challengeScoreToPersist = challengeBestScore ?? submissionScore;

        challengeGameDataUpdate = {
          score: challengeScoreToPersist,
          streak: streakToPersist,
          lastPlayed: serverLastPlayed,
          ...(enrichedGameData.achievements
            ? { achievements: enrichedGameData.achievements }
            : previousChallengeGameData?.achievements
              ? { achievements: previousChallengeGameData.achievements }
              : {}),
          custom: challengeBaseCustom,
        } satisfies UserGameData;

        // Create or update reward record for claiming later
        const resolvedRevealAt = typeof payload.challengeMetadata?.revealAt === 'string'
          ? payload.challengeMetadata.revealAt
          : challengeData?.schedule?.revealAt;

        if (resolvedDailyChallengeDate && resolvedRevealAt) {
          const existingReward = existingRewardDoc?.exists
            ? (existingRewardDoc.data() as DailyChallengeRewardRecord)
            : undefined;
          const nowIso = new Date(serverLastPlayed).toISOString();
          const solveState: DailyChallengeSolveState = challengeProgressUpdate?.solved ? 'solved' : 'failed';

          // Create reward record that will be claimed later
          // Status is preserved if already claimed (don't overwrite claimed rewards)
          const nextReward: DailyChallengeRewardRecord = {
            gameId,
            gameTypeId,
            dailyChallengeId: rawDailyChallengeId,
            dailyChallengeDate: resolvedDailyChallengeDate,
            revealAt: resolvedRevealAt,
            createdAt: existingReward?.createdAt ?? nowIso,
            updatedAt: nowIso,
            solveState,
            status: existingReward?.status === 'claimed' ? 'claimed' : 'pending',
            ...(challengeAttemptMetadata ? { attemptMetadata: challengeAttemptMetadata } : {}),
            claimedAt: existingReward?.claimedAt,
          } satisfies DailyChallengeRewardRecord;

          tx.set(rewardRef!, nextReward, { merge: true });
          pendingRewardRecord = nextReward;
        }

        if (challengeStatsRef) {
          const previousChallengeStats = challengeStatsDoc?.exists
            ? normalizeGameStats(challengeStatsDoc.data())
            : createEmptyGameStats();

          const challengeScore = typeof challengeBestScore === 'number'
            ? challengeBestScore
            : submissionScore;
          const previousBestForDistribution = typeof previousChallengeBestScore === 'number'
            ? previousChallengeBestScore
            : undefined;
          const distribution = { ...previousChallengeStats.scoreDistribution };

          if (firstSubmission || previousBestForDistribution === undefined) {
            distribution[challengeScore] = (distribution[challengeScore] || 0) + 1;
          } else if (previousBestForDistribution !== challengeScore) {
            distribution[previousBestForDistribution] = Math.max((distribution[previousBestForDistribution] || 1) - 1, 0);
            distribution[challengeScore] = (distribution[challengeScore] || 0) + 1;
          }

          const nextChallengeStats: (Partial<GameStats> & { totalAttempts?: number; correctAttempts?: number }) = {
            scoreDistribution: distribution,
            totalPlayers: previousChallengeStats.totalPlayers + (firstSubmission ? 1 : 0),
            sessionsPlayed: previousChallengeStats.sessionsPlayed + 1,
            uniqueSubmitters: previousChallengeStats.uniqueSubmitters + (firstSubmission ? 1 : 0),
            favorites: previousChallengeStats.favorites,
            totalAttempts: (previousChallengeStats.totalAttempts ?? 0) + 1,
            correctAttempts: (previousChallengeStats.correctAttempts ?? 0) + (isCurrentAttemptCorrect ? 1 : 0),
            updatedAt: Date.now(),
            custom: { ...(previousChallengeStats.custom ?? {}) },
          };

          if (typeof previousChallengeStats.averageSolveTimeSec === 'number') {
            nextChallengeStats.averageSolveTimeSec = previousChallengeStats.averageSolveTimeSec;
          }

          challengeStatsUpdate = nextChallengeStats;
        }

        challengeAttemptCount = attemptCount;
        challengePlayedAtIso = firstPlayedAt;
        challengeSolvedAtIso = solved ? solvedAt ?? attemptTimestamp : previousChallengeProgress?.solvedAt;
      }

      // Merge custom data from submission with previous custom data
      const customFromSubmission = { ...(enrichedGameData.custom ?? {}) } as UserGameCustomData;
      const baseCustom: UserGameCustomData = {
        ...(previousGameData?.custom ?? {}),
        ...customFromSubmission,
      };

      // Remove nested dailyChallenges from custom (it's stored separately)
      delete (baseCustom as Record<string, unknown>).dailyChallenges;

      // Build merged game data
      const mergedGameData: UserGameData = {
        ...(previousGameData ?? {}),
        ...enrichedGameData,
        score: scoreToPersist,
        streak: streakToPersist,
        lastPlayed: serverLastPlayed,
        custom: baseCustom,
      };

      // Preserve existing daily challenge data
      if (previousGameData?.dailyChallenges) {
        mergedGameData.dailyChallenges = previousGameData.dailyChallenges;
      }

      // Update or add daily challenge data if this is a challenge submission
      if (isDailyChallengeSubmission && rawDailyChallengeId && challengeGameDataUpdate) {
        mergedGameData.dailyChallenges = {
          ...(mergedGameData.dailyChallenges ?? {}),
          [rawDailyChallengeId]: challengeGameDataUpdate,
        };
      }

      // Update user document with merged game data
      tx.set(userRef, {
        games: {
          [gameTypeId]: {
            [gameId]: mergedGameData,
          },
        },
      }, { merge: true });

      // Update game counters (sessions played, total players for first-time players)
      applyGameCounterUpdates({
        tx,
        userRef,
        statsRef,
        userData,
        gameId,
        updates: [
          { key: GAME_COUNTER_KEYS.SESSIONS_PLAYED, type: 'increment' },
          ...(!previousGameData
            ? [{ key: GAME_COUNTER_KEYS.TOTAL_PLAYERS, type: 'unique' } as const]
            : []),
        ],
      });

      // Determine which leaderboard to update (challenge-specific or general)
      const usingChallengeLeaderboard = Boolean(
        isDailyChallengeSubmission
        && challengeRef
        && challengeLeaderboardRef
        && rawDailyChallengeId
        && resolvedDailyChallengeDate,
      );

      const activeLeaderboardRef = usingChallengeLeaderboard ? challengeLeaderboardRef : leaderboardRef;
      const activeStatsRef = usingChallengeLeaderboard ? challengeStatsRef : statsRef;

      let leaderboardUpdate: Record<string, unknown> | undefined;
      let leaderboardSetOptions: FirebaseFirestore.SetOptions | undefined;
      let statsUpdate: Record<string, unknown> | undefined;
      let statsSetOptions: FirebaseFirestore.SetOptions | undefined;

      if (usingChallengeLeaderboard) {
        const challengeRecordedAt = parseDateLikeValue(resolvedDailyChallengeDate) ?? serverLastPlayed;
        const challengeDatePayload = createLeaderboardDatePayload(challengeRecordedAt);
        const challengePlayedAt = challengePlayedAtIso ?? new Date(serverLastPlayed).toISOString();
        const challengeCustom: Record<string, unknown> = {
          ...customFromSubmission,
          id: rawDailyChallengeId!,
          date: resolvedDailyChallengeDate!,
          playedAt: challengePlayedAt,
        };

        if (challengeSolvedAtIso) {
          challengeCustom.solvedAt = challengeSolvedAtIso;
        }

        if (typeof challengeAttemptCount === 'number') {
          challengeCustom.attemptCount = challengeAttemptCount;
        }

        if (challengeAttemptMetadata) {
          challengeCustom.attempt = challengeAttemptMetadata;
        }

        if (payload.challengeMetadata) {
          challengeCustom.metadata = payload.challengeMetadata;
        }

        const challengeLeaderboardUpdate: Record<string, unknown> = {
          uid,
          displayName: userData.displayName,
          username: userData.username,
          photoURL: userData.photoURL || DEFAULT_LEADERBOARD_PHOTO,
          score: challengeBestScore ?? gameData.score,
          streak: streakToPersist,
          updatedAt: Date.now(),
          custom: {
            challenge: challengeCustom,
          },
          ...(challengeDatePayload ? { date: challengeDatePayload } : {}),
        };

        leaderboardUpdate = challengeLeaderboardUpdate;
        leaderboardSetOptions = { merge: true };

        if (challengeStatsUpdate) {
          statsUpdate = challengeStatsUpdate;
          statsSetOptions = { merge: true };
        }
      } else {
        const currentStats = statsDoc.exists
          ? normalizeGameStats(statsDoc.data())
          : createEmptyGameStats();

        const distribution = { ...currentStats.scoreDistribution } as { [score: number]: number };
        let totalPlayers = currentStats.totalPlayers;
        let sessionsPlayed = currentStats.sessionsPlayed + 1;
        let uniqueSubmitters = currentStats.uniqueSubmitters;
        const favorites = currentStats.favorites;
        let custom = { ...(currentStats.custom ?? {}) } as Record<string, any>;

        if (!previousGameData) {
          distribution[mergedGameData.score] = (distribution[mergedGameData.score] || 0) + 1;
          totalPlayers += 1;
        } else if (previousScore !== mergedGameData.score) {
          if (previousScore !== null) {
            distribution[previousScore] = Math.max((distribution[previousScore] || 1) - 1, 0);
          }
          distribution[mergedGameData.score] = (distribution[mergedGameData.score] || 0) + 1;
        }

        const hadCustomData = hasMeaningfulCustomData(previousGameData?.custom as Record<string, unknown> | undefined);
        const hasCustomDataNow = hasMeaningfulCustomData(mergedGameData.custom as Record<string, unknown> | undefined);
        if (!hadCustomData && hasCustomDataNow) {
          uniqueSubmitters += 1;
        }

        // Special handling for PyramidTier game: track item rankings and worst item counts
        if (gameTypeId === 'PyramidTier') {
          const itemRanks = custom.itemRanks || {};
          const worstItemCounts = custom.worstItemCounts || {};

          // Decrement counts for previous pyramid state
          const previousCustom = previousGameData?.custom;
          if (isPyramidCustomData(previousCustom) && previousCustom.pyramid) {
            previousCustom.pyramid.forEach((tier) => {
              tier.slots.forEach((itemId) => {
                if (itemId) {
                  const rowId = tier.tier;
                  itemRanks[itemId] = itemRanks[itemId] || {};
                  itemRanks[itemId][rowId] = Math.max((itemRanks[itemId][rowId] || 1) - 1, 0);
                }
              });
            });
          }
          if (isPyramidCustomData(previousCustom) && previousCustom.worstItem?.id) {
            const itemId = previousCustom.worstItem.id;
            worstItemCounts[itemId] = Math.max((worstItemCounts[itemId] || 1) - 1, 0);
          }

          // Increment counts for new pyramid state
          const mergedCustom = mergedGameData.custom;
          if (isPyramidCustomData(mergedCustom) && mergedCustom.pyramid) {
            mergedCustom.pyramid.forEach((tier) => {
              tier.slots.forEach((itemId) => {
                if (itemId) {
                  const rowId = tier.tier;
                  itemRanks[itemId] = itemRanks[itemId] || {};
                  itemRanks[itemId][rowId] = (itemRanks[itemId][rowId] || 0) + 1;
                }
              });
            });
          }
          if (isPyramidCustomData(mergedCustom) && mergedCustom.worstItem?.id) {
            const itemId = mergedCustom.worstItem.id;
            worstItemCounts[itemId] = (worstItemCounts[itemId] || 0) + 1;
          }

          custom = { itemRanks, worstItemCounts };
        }

        const regularDatePayload = createLeaderboardDatePayload(serverLastPlayed);

        leaderboardUpdate = {
          ...mergedGameData,
          displayName: userData.displayName,
          username: userData.username,
          photoURL: userData.photoURL || DEFAULT_LEADERBOARD_PHOTO,
          updatedAt: Date.now(),
          ...(regularDatePayload ? { date: regularDatePayload } : {}),
        };

        statsUpdate = {
          scoreDistribution: distribution,
          totalPlayers,
          sessionsPlayed,
          uniqueSubmitters,
          favorites,
          custom,
          updatedAt: Date.now(),
        };
      }

      if (!activeLeaderboardRef || !leaderboardUpdate) {
        throw new functions.https.HttpsError('internal', 'Failed to resolve leaderboard destination');
      }

      if (leaderboardSetOptions) {
        tx.set(activeLeaderboardRef, leaderboardUpdate, leaderboardSetOptions);
      } else {
        tx.set(activeLeaderboardRef, leaderboardUpdate);
      }

      if (activeStatsRef && statsUpdate) {
        if (statsSetOptions) {
          tx.set(activeStatsRef, statsUpdate, statsSetOptions);
        } else {
          tx.set(activeStatsRef, statsUpdate);
        }
      }

      // Add user to VIP list if this is their first time playing and they have valid followers count
      // VIP status helps identify notable players
      if (!previousGameData && (userData.followersCount ?? 0) >= 0) {
        const gameDataSnapshot = gameDoc.data();
        let vip: string[] = gameDataSnapshot?.vip || [];
        if (!vip.includes(uid)) {
          vip = [...vip, uid];
          tx.update(gameRef, { vip });
        }
      }

      return {
        success: true,
        previousScore,
        newScore: mergedGameData.score,
        challengeBestScore,
        dailyChallengeId: isDailyChallengeSubmission ? rawDailyChallengeId ?? undefined : undefined,
        dailyChallengeDate: isDailyChallengeSubmission ? resolvedDailyChallengeDate ?? undefined : undefined,
        ...(pendingRewardRecord ? { pendingReward: pendingRewardRecord } : {}),
      } satisfies SubmitGameScoreResponse;
    });

    return result;
  } catch (error: any) {
    console.error('submitGameScore error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to submit game score');
  }
});

