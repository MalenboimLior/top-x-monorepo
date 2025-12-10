import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import {
  UserGameData,
  SubmitGameScoreRequest,
  SubmitGameScoreResponse,
  User,
  UserGameCustomData,
  DailyChallengeAttemptMetadata,
  DailyChallengeRewardRecord,
} from '@top-x/shared/types/user';
import type {
  PyramidUserCustom,
  ZoneRevealUserCustom,
  PacmanUserCustom,
  FisherGameUserCustom,
} from '@top-x/shared/types/userGameCustom';
import type {
  Game,
} from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';
import type { DailyChallenge } from '@top-x/shared/types/dailyChallenge';
import '../utils/firebaseAdmin';
import { sendSessionMilestoneEmail } from './adminNotifications';
import {
  increaseSessionCounter,
  incrementTotalPlayersCounter,
} from '../utils/statsManager';
import {
  createLeaderboardDatePayload,
  DEFAULT_LEADERBOARD_PHOTO,
  parseDateLikeValue,
} from '../utils/leaderboardHelpers';
import {
  createEmptyGameStats,
  normalizeGameStats,
  hasPyramidCustomChanges,
  isPyramidCustomData,
} from '../utils/gameStatsHelpers';
import {
  processTriviaSubmission,
  TriviaProcessingOutcome,
  TriviaQuestionUpdate,
} from './submitGameScore/trivia';
import { processZoneRevealSubmission } from './submitGameScore/zoneReveal';
import { processDailyChallengeSubmission } from './submitGameScore/dailyChallenge';
import { processQuizSubmission, QuizProcessingOutcome } from './submitGameScore/quiz';
import {
  separateTriviaData,
  separatePyramidData,
  separateZoneRevealData,
  separatePacmanData,
  separateFisherGameData,
} from './submitGameScore/dataSeparation';
import { computeLeaderboardRank } from '../utils/leaderboardRanking';

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

      // Quiz games don't use scores - skip early return check for them
      const isQuizGame = gameTypeId === 'quiz';

      // Early return for regular games if score doesn't improve (unless PyramidTier with custom changes or Quiz game)
      if (!isDailyChallengeSubmission && !isQuizGame && previousScore !== null && gameData.score <= previousScore && !pyramidCustomChanged) {
        // Score didn't improve - still increment session counter but don't update score
        console.log(`[submitGameScore] Score ${gameData.score} is not higher than previous score ${previousScore} for user ${uid} (skipping early return for quiz games)`);
        increaseSessionCounter({
          tx,
          statsRef,
        });
        return {
          success: false,
          message: 'Score is not higher than the existing best score',
          previousScore,
          newScore: gameData.score,
        } satisfies SubmitGameScoreResponse;
      }

      // For quiz games, log that we're skipping the early return
      if (isQuizGame) {
        console.log('[submitGameScore] Quiz game detected - skipping early return check (quiz games always save custom data)');
      }

      // Fetch game documents
      const statsDoc = await tx.get(statsRef);
      const gameDoc = await tx.get(gameRef);
      
      // Get current sessionsPlayed value before incrementing (for milestone detection)
      const currentStats = statsDoc.exists ? (statsDoc.data() as Partial<GameStats>) : {};
      const currentSessionsPlayed = typeof currentStats.sessionsPlayed === 'number' ? currentStats.sessionsPlayed : 0;
      let challengeDoc: FirebaseFirestore.DocumentSnapshot | null = null;
      let challengeStatsDoc: FirebaseFirestore.DocumentSnapshot | null = null;
      let existingRewardDoc: FirebaseFirestore.DocumentSnapshot | null = null;

      // Fetch challenge-related documents if this is a challenge submission
      if (challengeRef && challengeStatsRef) {
        [challengeDoc, challengeStatsDoc] = await Promise.all([
          tx.get(challengeRef),
          tx.get(challengeStatsRef),
        ]);
        if (!challengeDoc.exists) {
          const docMap = (challengeRef as any).firestore?.documents;
          console.warn('submitGameScore: challenge doc missing in transaction', {
            challengePath: challengeRef.path,
            hasInitialData: challengeDoc.exists,
            storedValue: typeof (challengeRef as any).firestore?.getDocument === 'function'
              ? (challengeRef as any).firestore.getDocument(challengeRef.path)
              : null,
            knownDocs: docMap instanceof Map ? Array.from(docMap.keys()) : null,
          });
        }
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

      let enrichedGameData: SubmitGameScoreRequest['gameData'] = {
        ...gameData,
        ...(gameData.custom ? { custom: { ...gameData.custom } } : {}),
      };
      let streakToPersist = typeof gameData.streak === 'number' ? gameData.streak : previousGameData?.streak ?? 0;
      let attemptMetadata: DailyChallengeAttemptMetadata | undefined;

      let triviaOutcome: TriviaProcessingOutcome | null = null;
      let triviaQuestionUpdates: TriviaQuestionUpdate[] = [];
      let quizOutcome: QuizProcessingOutcome | null = null;

      // Check if this is a quiz game (personality/archetype) - no leaderboard updates needed
      quizOutcome = processQuizSubmission({
        gameSnapshot,
        submittedGameData: enrichedGameData,
      });

      if (quizOutcome) {
        // Quiz games don't have scores or leaderboards
        // But we still need to save the custom data (personalityResult/archetypeResult)
        console.log('[submitGameScore] Quiz game completed', {
          uid,
          gameId,
          mode: quizOutcome.mode,
          resultId: quizOutcome.resultId,
          resultTitle: quizOutcome.resultTitle,
        });

        // Log previous game data
        console.log('[submitGameScore] Previous game data:', {
          hasPreviousData: !!previousGameData,
          hasPreviousCustom: !!previousGameData?.custom,
          previousCustomKeys: previousGameData?.custom ? Object.keys(previousGameData.custom) : [],
          previousPersonalityResult: previousGameData?.custom ? (previousGameData.custom as Record<string, unknown>).personalityResult : undefined,
          previousArchetypeResult: previousGameData?.custom ? (previousGameData.custom as Record<string, unknown>).archetypeResult : undefined,
        });

        // Log incoming custom data
        console.log('[submitGameScore] Incoming custom data:', {
          hasCustom: !!enrichedGameData.custom,
          customKeys: enrichedGameData.custom ? Object.keys(enrichedGameData.custom) : [],
          personalityResult: enrichedGameData.custom ? (enrichedGameData.custom as Record<string, unknown>).personalityResult : undefined,
          archetypeResult: enrichedGameData.custom ? (enrichedGameData.custom as Record<string, unknown>).archetypeResult : undefined,
        });

        // For quiz games, we need to completely replace the custom data with the new result
        // Start fresh with previous custom data (excluding old quiz results)
        const previousCustom = previousGameData?.custom ?? {} as Record<string, unknown>;
        const baseCustom: UserGameCustomData = {};
        
        // Copy all previous custom fields EXCEPT quiz results
        Object.keys(previousCustom).forEach((key) => {
          if (key !== 'personalityResult' && key !== 'archetypeResult' && key !== 'dailyChallenges') {
            (baseCustom as Record<string, unknown>)[key] = previousCustom[key];
          }
        });
        
        // Now add the new custom data from submission (which includes the new quiz result)
        const customFromSubmission = enrichedGameData.custom ?? {} as Record<string, unknown>;
        Object.keys(customFromSubmission).forEach((key) => {
          if (key !== 'dailyChallenges') {
            (baseCustom as Record<string, unknown>)[key] = customFromSubmission[key];
          }
        });

        console.log('[submitGameScore] Merged custom data:', {
          baseCustomKeys: Object.keys(baseCustom),
          hasPersonalityResult: !!(baseCustom as Record<string, unknown>).personalityResult,
          hasArchetypeResult: !!(baseCustom as Record<string, unknown>).archetypeResult,
          personalityResult: (baseCustom as Record<string, unknown>).personalityResult,
          archetypeResult: (baseCustom as Record<string, unknown>).archetypeResult,
          fullBaseCustom: JSON.stringify(baseCustom, null, 2),
        });
        
        // Verify the new result is actually in baseCustom
        const baseCustomRecord = baseCustom as Record<string, unknown>;
        if (quizOutcome.mode === 'personality' && baseCustomRecord.personalityResult) {
          console.log('[submitGameScore] VERIFIED: New personality result is in baseCustom:', {
            bucketId: (baseCustomRecord.personalityResult as any)?.bucketId,
            title: (baseCustomRecord.personalityResult as any)?.title,
          });
        } else if (quizOutcome.mode === 'archetype' && baseCustomRecord.archetypeResult) {
          console.log('[submitGameScore] VERIFIED: New archetype result is in baseCustom:', {
            id: (baseCustomRecord.archetypeResult as any)?.id,
            title: (baseCustomRecord.archetypeResult as any)?.title,
          });
        } else {
          console.error('[submitGameScore] ERROR: New quiz result NOT found in baseCustom!', {
            mode: quizOutcome.mode,
            hasPersonalityResult: !!baseCustomRecord.personalityResult,
            hasArchetypeResult: !!baseCustomRecord.archetypeResult,
          });
        }

        // Remove nested dailyChallenges from custom (it's stored separately)
        delete (baseCustom as Record<string, unknown>).dailyChallenges;

        // Build merged game data for quiz
        const mergedGameData: UserGameData = {
          ...(previousGameData ?? {}),
          ...enrichedGameData,
          score: 0, // Quiz doesn't use score
          streak: 0,
          lastPlayed: serverLastPlayed,
          custom: baseCustom,
        };

        console.log('[submitGameScore] Merged game data to save:', {
          lastPlayed: mergedGameData.lastPlayed,
          hasCustom: !!mergedGameData.custom,
          customKeys: mergedGameData.custom ? Object.keys(mergedGameData.custom) : [],
          personalityResult: mergedGameData.custom ? (mergedGameData.custom as Record<string, unknown>).personalityResult : undefined,
          archetypeResult: mergedGameData.custom ? (mergedGameData.custom as Record<string, unknown>).archetypeResult : undefined,
        });

        // Preserve existing daily challenge data
        if (previousGameData?.dailyChallenges) {
          mergedGameData.dailyChallenges = previousGameData.dailyChallenges;
        }

        // Save quiz custom data to user document
        console.log('[submitGameScore] Saving quiz data to Firestore...');
        tx.set(userRef, {
          games: {
            [gameTypeId]: {
              [gameId]: mergedGameData,
            },
          },
        }, { merge: true });

        console.log('[submitGameScore] Quiz data saved successfully');

        // Update game counters (sessions played, total players for first-time players)
        increaseSessionCounter({ tx, statsRef });
        
        if (!previousGameData) {
          incrementTotalPlayersCounter({ tx, statsRef });
        }

        return {
          success: true,
          scores: {
            previous: null,
            current: 0,
          },
          custom: {
            quiz: {
              mode: quizOutcome.mode,
              resultId: quizOutcome.resultId,
              resultTitle: quizOutcome.resultTitle,
            },
          },
        } as SubmitGameScoreResponse;
      }

      triviaOutcome = await processTriviaSubmission({
        tx,
        gameRef,
        gameSnapshot,
        submittedGameData: enrichedGameData,
        serverTimestamp: serverLastPlayed,
      });

      if (triviaOutcome) {
        triviaQuestionUpdates = triviaOutcome.questionUpdates;
        enrichedGameData = triviaOutcome.updatedSubmission;
        const metrics = triviaOutcome.metrics;
        scoreToPersist = previousScore !== null ? Math.max(previousScore, metrics.score) : metrics.score;
        streakToPersist = Math.max(
          streakToPersist,
          triviaOutcome.resolvedStreak,
          metrics.bestStreak ?? 0,
          metrics.currentStreak ?? 0,
        );
      }

      const zoneRevealOutcome = processZoneRevealSubmission({
        gameTypeId,
        submittedGameData: enrichedGameData,
        gameSnapshot,
        challengeData,
      });

      enrichedGameData = zoneRevealOutcome.updatedSubmission;
      if (zoneRevealOutcome.attemptMetadata) {
        attemptMetadata = zoneRevealOutcome.attemptMetadata;
      }

      // Determine streak value (use provided streak or fall back to previous)
      if (typeof gameData.streak === 'number') {
        streakToPersist = Math.max(streakToPersist, gameData.streak);
      }
      
      // Daily challenge-specific variables
      let challengeBestScore: number | undefined;
      let challengeGameDataUpdate: UserGameData | undefined;
      let challengeAttemptCount: number | undefined;
      let challengePlayedAtIso: string | undefined;
      let challengeSolvedAtIso: string | undefined;
      let challengeAttemptMetadata: DailyChallengeAttemptMetadata | undefined;
      let challengeStatsUpdate: (Partial<GameStats> & { totalAttempts?: number; correctAttempts?: number }) | undefined;
      let pendingRewardRecord: DailyChallengeRewardRecord | undefined;

      if (
        isDailyChallengeSubmission
        && rawDailyChallengeId
        && challengeRef
        && challengeData
        && resolvedDailyChallengeDate
      ) {
        const challengeOutcome = processDailyChallengeSubmission({
          tx,
          gameId,
          gameTypeId,
          userId: uid,
          challengeId: rawDailyChallengeId,
          challengeData,
          challengeRef,
          challengeStatsRef,
          challengeStatsDoc,
          rewardRef,
          existingRewardDoc,
          resolvedDailyChallengeDate,
          payloadChallengeMetadata: payload.challengeMetadata,
          previousGameData,
          enrichedSubmission: enrichedGameData,
          originalSubmission: gameData,
          streakToPersist,
          serverTimestamp: serverLastPlayed,
          triviaOutcome,
          attemptMetadata,
          gameSnapshot,
        });

        challengeBestScore = challengeOutcome.challengeBestScore;
        challengeGameDataUpdate = challengeOutcome.challengeGameDataUpdate;
        challengeAttemptCount = challengeOutcome.challengeAttemptCount;
        challengePlayedAtIso = challengeOutcome.challengePlayedAtIso;
        challengeSolvedAtIso = challengeOutcome.challengeSolvedAtIso;
        challengeAttemptMetadata = challengeOutcome.challengeAttemptMetadata ?? attemptMetadata;
        challengeStatsUpdate = challengeOutcome.challengeStatsUpdate;
        pendingRewardRecord = challengeOutcome.pendingRewardRecord;
      } else {
        challengeAttemptMetadata = attemptMetadata;
      }

      // Separate custom data into leaderboard and user-specific data based on game type
      let leaderboardCustomData: Record<string, unknown> = {};
      let userCustomData: UserGameCustomData = {};

      const customFromSubmission = { ...(enrichedGameData.custom ?? {}) } as UserGameCustomData;

      // Remove nested dailyChallenges from custom (it's stored separately)
      delete (customFromSubmission as Record<string, unknown>).dailyChallenges;

      const triviaMetrics = triviaOutcome?.metrics ?? null;

      // Use data separation functions based on game type
      if (triviaMetrics && triviaOutcome && gameTypeId === 'Trivia') {
        const separated = separateTriviaData(customFromSubmission, {
          questionIds: triviaMetrics.questionIds,
          answerHashes: triviaMetrics.answerHashes,
          mode: (triviaMetrics.mode ?? 'classic') as 'classic' | 'speed',
          attemptCount: triviaMetrics.attemptCount,
          correctCount: triviaMetrics.correctCount,
          accuracy: triviaMetrics.accuracy,
          score: triviaMetrics.score,
          streak: triviaOutcome.resolvedStreak,
        });
        leaderboardCustomData = separated.leaderboard as unknown as Record<string, unknown>;
        userCustomData = separated.user as unknown as UserGameCustomData; // Use separated user data directly (don't spread empty object)
      } else if (gameTypeId === 'PyramidTier') {
        // Note: Quiz games are handled earlier with an early return (see quiz handling block above)
        // so we don't need quiz data separation here
        const separated = separatePyramidData(customFromSubmission, scoreToPersist);
        leaderboardCustomData = separated.leaderboard as unknown as Record<string, unknown>;
        userCustomData = { ...userCustomData, ...separated.user };
      } else if (gameTypeId === 'ZoneReveal') {
        const attemptCount = (customFromSubmission.attemptCount as number) ?? 1;
        const separated = separateZoneRevealData(customFromSubmission, scoreToPersist, streakToPersist, attemptCount);
        leaderboardCustomData = separated.leaderboard as unknown as Record<string, unknown>;
        userCustomData = { ...userCustomData, ...separated.user };
      } else if (gameTypeId === 'Pacman') {
        const separated = separatePacmanData(customFromSubmission, scoreToPersist);
        leaderboardCustomData = separated.leaderboard as unknown as Record<string, unknown>;
        userCustomData = { ...userCustomData, ...separated.user };
      } else if (gameTypeId === 'FisherGame') {
        const separated = separateFisherGameData(customFromSubmission, scoreToPersist);
        leaderboardCustomData = separated.leaderboard as unknown as Record<string, unknown>;
        userCustomData = { ...userCustomData, ...separated.user };
      } else {
        // For unknown game types, keep custom data as-is (backward compatibility)
        leaderboardCustomData = customFromSubmission as Record<string, unknown>;
        userCustomData = customFromSubmission;
      }

      // Build merged game data with separated user custom data
      // Extract custom from enrichedGameData to avoid including full analytics data
      const { custom: _, ...enrichedGameDataWithoutCustom } = enrichedGameData;
      const mergedGameData: UserGameData = {
        ...(previousGameData ?? {}),
        ...enrichedGameDataWithoutCustom,
        score: scoreToPersist,
        streak: streakToPersist,
        lastPlayed: serverLastPlayed,
        custom: userCustomData, // Use separated minimal custom data
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

      if (triviaQuestionUpdates.length > 0) {
        triviaQuestionUpdates.forEach((update) => {
          tx.set(update.ref, update.data, { merge: true });
        });
      }

      // Update game counters (sessions played, total players for first-time players)
      increaseSessionCounter({ tx, statsRef });
      
      // Calculate new sessions count after increment
      const newSessionsPlayed = currentSessionsPlayed + 1;
      
      // Check for milestone thresholds (100 and 1000 sessions)
      // Only check if this is not a daily challenge submission (to avoid duplicate notifications)
      const milestoneToNotify = !isDailyChallengeSubmission &&
        ((currentSessionsPlayed < 100 && newSessionsPlayed >= 100) ? 100 :
        (currentSessionsPlayed < 1000 && newSessionsPlayed >= 1000) ? 1000 :
        null);

      if (!previousGameData) {
        incrementTotalPlayersCounter({ tx, statsRef });
      }

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

        // For challenge leaderboard, merge challenge metadata with separated leaderboard custom data
        const challengeLeaderboardCustom = {
          challenge: challengeCustom,
          ...leaderboardCustomData,
        };

        const challengeLeaderboardUpdate: Record<string, unknown> = {
          uid,
          displayName: userData.displayName,
          username: userData.username,
          photoURL: userData.photoURL || DEFAULT_LEADERBOARD_PHOTO,
          score: challengeBestScore ?? gameData.score,
          streak: streakToPersist,
          updatedAt: Date.now(),
          custom: challengeLeaderboardCustom,
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
        const favoriteCounter = (currentStats as any).favoriteCounter ?? 0;
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
          uid,
          displayName: userData.displayName,
          username: userData.username,
          photoURL: userData.photoURL || DEFAULT_LEADERBOARD_PHOTO,
          score: scoreToPersist,
          streak: streakToPersist,
          updatedAt: Date.now(),
          custom: leaderboardCustomData,
          ...(regularDatePayload ? { date: regularDatePayload } : {}),
        };

        statsUpdate = {
          scoreDistribution: distribution,
          totalPlayers,
          sessionsPlayed,
          favoriteCounter,
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
        // Store milestone info for email notification after transaction
        _milestoneInfo: milestoneToNotify ? {
          gameId,
          gameName: gameSnapshot?.name || 'Unknown Game',
          milestone: milestoneToNotify,
          currentSessions: newSessionsPlayed,
        } : undefined,
      } satisfies SubmitGameScoreResponse & { _milestoneInfo?: { gameId: string; gameName: string; milestone: number; currentSessions: number } };
    });

    // Send milestone email notification if needed (after transaction completes)
    const resultWithMilestone = result as SubmitGameScoreResponse & { _milestoneInfo?: { gameId: string; gameName: string; milestone: number; currentSessions: number } };
    if (resultWithMilestone._milestoneInfo) {
      const { gameId: milestoneGameId, gameName, milestone, currentSessions } = resultWithMilestone._milestoneInfo;
      // Fire and forget - don't wait for email to avoid blocking the response
      sendSessionMilestoneEmail(milestoneGameId, gameName, milestone, currentSessions).catch((error) => {
        console.error('Failed to send milestone email:', error);
      });
    }

    // Return result without internal milestone field
    const { _milestoneInfo, ...cleanResult } = resultWithMilestone;

    // Compute and update leaderboard rank/percentile after transaction (non-blocking)
    // This is done outside the transaction to avoid expensive reads
    if (cleanResult.success && !isDailyChallengeSubmission && gameTypeId !== 'quiz') {
      const finalScore = cleanResult.newScore ?? gameData.score;
      
      // Get streak from user doc (it was updated in the transaction)
      db.collection('users').doc(uid).get()
        .then((userDoc) => {
          if (!userDoc.exists) return;
          
          const userData = userDoc.data() as User;
          const currentGameData = userData.games?.[gameTypeId]?.[gameId];
          const finalStreak = currentGameData?.streak ?? 0;
          
          return computeLeaderboardRank(gameId, uid, finalScore, finalStreak);
        })
        .then((rankResult) => {
          if (!rankResult) return;
          
          const { rank, percentile, totalUsers } = rankResult;
          const userGameRef = db.collection('users').doc(uid);
          const gameDataPath = `games.${gameTypeId}.${gameId}`;
          
          return userGameRef.get().then((userDoc) => {
            if (userDoc.exists) {
              const userData = userDoc.data() as User;
              const currentGameData = userData.games?.[gameTypeId]?.[gameId];
              
              if (currentGameData) {
                // Reconstruct minimal custom data structure instead of spreading existing data
                let updatedCustom: UserGameCustomData = {};
                
                if (gameTypeId === 'Trivia') {
                  updatedCustom = {
                    trivia: {
                      score: currentGameData.score ?? 0,
                      streak: currentGameData.streak ?? 0,
                      leaderboardRank: rank,
                      leaderboardTotalUsers: totalUsers,
                      percentile: percentile,
                      lastPlayed: currentGameData.lastPlayed ?? Date.now(),
                    },
                  };
                } else if (gameTypeId === 'PyramidTier') {
                  // Pyramid needs pyramid structure for restoration
                  const pyramidCustom = currentGameData.custom as unknown as PyramidUserCustom | undefined;
                  updatedCustom = {
                    pyramid: pyramidCustom?.pyramid ?? [],
                    worstItem: pyramidCustom?.worstItem ?? { id: '' },
                    score: currentGameData.score ?? 0,
                    leaderboardRank: rank,
                    leaderboardTotalUsers: totalUsers,
                    percentile: percentile,
                  };
                } else if (gameTypeId === 'ZoneReveal') {
                  const zoneCustom = currentGameData.custom as unknown as ZoneRevealUserCustom | undefined;
                  updatedCustom = {
                    zoneReveal: {
                      answer: zoneCustom?.zoneReveal?.answer ?? '',
                      score: currentGameData.score ?? 0,
                      streak: currentGameData.streak ?? 0,
                      leaderboardRank: rank,
                      leaderboardTotalUsers: totalUsers,
                      percentile: percentile,
                    },
                  };
                } else if (gameTypeId === 'Pacman') {
                  const pacmanCustom = currentGameData.custom as unknown as PacmanUserCustom | undefined;
                  updatedCustom = {
                    pacman: {
                      score: currentGameData.score ?? 0,
                      level: pacmanCustom?.pacman?.level ?? 1,
                      leaderboardRank: rank,
                      leaderboardTotalUsers: totalUsers,
                      percentile: percentile,
                    },
                  };
                } else if (gameTypeId === 'FisherGame') {
                  const fisherCustom = currentGameData.custom as unknown as FisherGameUserCustom | undefined;
                  updatedCustom = {
                    fisherGame: {
                      score: currentGameData.score ?? 0,
                      fishCaught: fisherCustom?.fisherGame?.fishCaught ?? 0,
                      leaderboardRank: rank,
                      leaderboardTotalUsers: totalUsers,
                      percentile: percentile,
                    },
                  };
                }
                
                return userGameRef.update({
                  [`${gameDataPath}.custom`]: updatedCustom,
                });
              }
            }
          });
        })
        .catch((error) => {
          console.error('Error updating leaderboard rank/percentile:', error);
          // Non-critical error, don't fail the request
        });
    }

    return cleanResult;
  } catch (error: any) {
    console.error('submitGameScore error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to submit game score');
  }
});

