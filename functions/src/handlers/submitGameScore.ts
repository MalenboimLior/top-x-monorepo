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
import type { TriviaConfig } from '@top-x/shared/types/trivia';
import { evaluateZoneRevealAnswer } from '@top-x/shared/utils/zoneRevealAnswer';
import '../utils/firebaseAdmin';
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

const TRIVIA_HASH_VALUE_PATTERN = /^[a-f0-9]{64}$/i;

interface TriviaAttemptSubmission {
  questionId: string;
  answerHash: string;
  answeredAt?: string;
}

interface TriviaSubmissionPayload {
  mode?: string;
  attempts: TriviaAttemptSubmission[];
  questionIds: string[];
  attemptCount: number;
  reportedAttemptCount?: number;
  bestStreak?: number;
  currentStreak?: number;
}

interface TriviaQuestionStatsDelta {
  counts: Record<string, number>;
  total: number;
  correct: number;
}

interface TriviaProcessingResult {
  score: number;
  attemptCount: number;
  correctCount: number;
  accuracy: number;
  bestStreak?: number;
  currentStreak?: number;
  mode?: string;
  questionIds: string[];
  questionDeltas: Map<string, TriviaQuestionStatsDelta>;
}

interface TriviaQuestionUpdate {
  ref: FirebaseFirestore.DocumentReference;
  data: FirebaseFirestore.DocumentData;
}

function normalizeTriviaHashValue(hash: string): string {
  const trimmed = hash.trim();
  if (!trimmed) {
    throw new Error('empty hash');
  }

  const segments = trimmed.split(':');
  const value = segments[segments.length - 1];

  if (!TRIVIA_HASH_VALUE_PATTERN.test(value)) {
    throw new Error('hash does not match expected format');
  }

  return value.toLowerCase();
}

function normalizeTriviaSubmissionHash(hash: unknown): string {
  if (typeof hash !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Trivia answer hash must be a string');
  }

  try {
    return normalizeTriviaHashValue(hash);
  } catch {
    throw new functions.https.HttpsError('invalid-argument', 'Trivia answer hash has an invalid format');
  }
}

function tryNormalizeStoredTriviaHash(hash: unknown): string | null {
  if (typeof hash !== 'string') {
    return null;
  }

  try {
    return normalizeTriviaHashValue(hash);
  } catch (error) {
    console.warn('submitGameScore: encountered invalid stored trivia hash', {
      hash,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function isTriviaConfig(config: unknown): config is TriviaConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const mode = (config as { mode?: unknown }).mode;
  return mode === 'fixed' || mode === 'endless';
}

function collectTriviaHashesFromValue(value: unknown, target: Set<string>): void {
  if (!value) {
    return;
  }

  if (typeof value === 'string') {
    const normalized = tryNormalizeStoredTriviaHash(value);
    if (normalized) {
      target.add(normalized);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectTriviaHashesFromValue(entry, target));
    return;
  }

  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((entry) => collectTriviaHashesFromValue(entry, target));
  }
}

function collectCorrectTriviaHashes(data: FirebaseFirestore.DocumentData | undefined): Set<string> {
  const hashes = new Set<string>();
  if (!data) {
    return hashes;
  }

  collectTriviaHashesFromValue(data.correctHash, hashes);
  collectTriviaHashesFromValue((data as Record<string, unknown>).correctHashes, hashes);

  if (data.hash && typeof data.hash === 'object') {
    const hashField = data.hash as Record<string, unknown>;
    collectTriviaHashesFromValue(hashField.value ?? hashField.hash ?? hashField.correct, hashes);
    collectTriviaHashesFromValue(hashField.accepted, hashes);
  }

  collectTriviaHashesFromValue((data as Record<string, unknown>).acceptedHashes, hashes);

  return hashes;
}

function extractTriviaSubmission(custom: UserGameCustomData | undefined): TriviaSubmissionPayload | null {
  if (!custom) {
    return null;
  }

  const candidateSources: Array<Record<string, unknown>> = [];
  const customRecord = custom as Record<string, unknown>;

  ['trivia', 'triviaSession', 'triviaMetadata'].forEach((key) => {
    const value = customRecord[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      candidateSources.push(value as Record<string, unknown>);
    }
  });

  if (typeof customRecord.mode === 'string' || Array.isArray(customRecord.attempts) || Array.isArray(customRecord.questionIds)) {
    candidateSources.push(customRecord);
  }

  let candidate: Record<string, unknown> | undefined;
  for (const source of candidateSources) {
    if (source && typeof source === 'object') {
      if ('attempts' in source || 'mode' in source || 'questionIds' in source || 'answeredQuestionIds' in source) {
        candidate = source;
        break;
      }
    }
  }

  if (!candidate) {
    return null;
  }

  const attempts: TriviaAttemptSubmission[] = [];
  const rawAttempts = candidate.attempts;

  if (Array.isArray(rawAttempts)) {
    rawAttempts.forEach((rawAttempt) => {
      if (!rawAttempt || typeof rawAttempt !== 'object') {
        return;
      }

      const attemptRecord = rawAttempt as Record<string, unknown>;
      const questionId = typeof attemptRecord.questionId === 'string'
        ? attemptRecord.questionId
        : typeof attemptRecord.id === 'string'
          ? attemptRecord.id
          : undefined;

      const rawHash = typeof attemptRecord.answerHash === 'string'
        ? attemptRecord.answerHash
        : typeof attemptRecord.hash === 'string'
          ? attemptRecord.hash
          : typeof attemptRecord.answer === 'string'
            ? attemptRecord.answer
            : undefined;

      if (!questionId || !rawHash) {
        return;
      }

      const normalizedHash = normalizeTriviaSubmissionHash(rawHash);
      const attempt: TriviaAttemptSubmission = {
        questionId,
        answerHash: normalizedHash,
      };

      if (typeof attemptRecord.answeredAt === 'string') {
        attempt.answeredAt = attemptRecord.answeredAt;
      }

      attempts.push(attempt);
    });
  }

  const questionIds = new Set<string>();
  const rawQuestionIds = candidate.questionIds;
  if (Array.isArray(rawQuestionIds)) {
    rawQuestionIds.forEach((value) => {
      if (typeof value === 'string' && value) {
        questionIds.add(value);
      }
    });
  }

  const answeredQuestionIds = candidate.answeredQuestionIds;
  if (Array.isArray(answeredQuestionIds)) {
    answeredQuestionIds.forEach((value) => {
      if (typeof value === 'string' && value) {
        questionIds.add(value);
      }
    });
  }

  attempts.forEach((attempt) => questionIds.add(attempt.questionId));

  const mode = typeof candidate.mode === 'string' ? candidate.mode : undefined;

  const reportedAttemptCount = typeof candidate.attemptCount === 'number'
    ? candidate.attemptCount
    : typeof candidate.attemptsCount === 'number'
      ? candidate.attemptsCount
      : undefined;

  const bestStreakCandidates: number[] = [];
  if (typeof candidate.bestStreak === 'number') {
    bestStreakCandidates.push(candidate.bestStreak);
  }
  if (typeof candidate.bestSessionStreak === 'number') {
    bestStreakCandidates.push(candidate.bestSessionStreak);
  }
  if (typeof candidate.sessionBestStreak === 'number') {
    bestStreakCandidates.push(candidate.sessionBestStreak);
  }

  let currentStreak: number | undefined;
  if (typeof candidate.currentStreak === 'number') {
    currentStreak = candidate.currentStreak;
  }

  const streakField = candidate.streak;
  if (typeof streakField === 'number') {
    bestStreakCandidates.push(streakField);
  } else if (streakField && typeof streakField === 'object') {
    const streakRecord = streakField as Record<string, unknown>;
    if (typeof streakRecord.best === 'number') {
      bestStreakCandidates.push(streakRecord.best);
    }
    if (typeof streakRecord.current === 'number') {
      currentStreak = typeof currentStreak === 'number'
        ? Math.max(currentStreak, streakRecord.current)
        : streakRecord.current;
    }
  }

  const bestStreak = bestStreakCandidates.length ? Math.max(...bestStreakCandidates) : undefined;

  if (!mode && attempts.length === 0 && questionIds.size === 0) {
    return null;
  }

  return {
    mode,
    attempts,
    questionIds: Array.from(questionIds),
    attemptCount: attempts.length,
    reportedAttemptCount,
    bestStreak,
    currentStreak,
  };
}

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
      const triviaConfig = gameSnapshot && isTriviaConfig(gameSnapshot.custom)
        ? (gameSnapshot.custom as TriviaConfig)
        : undefined;
      const triviaSubmission = extractTriviaSubmission(gameData.custom);
      let triviaResult: TriviaProcessingResult | null = null;
      const triviaQuestionUpdates: TriviaQuestionUpdate[] = [];

      // Handle ZoneReveal game answer evaluation
      let enrichedGameData = gameData;
      let attemptMetadata: DailyChallengeAttemptMetadata | undefined;
      let streakToPersist = typeof gameData.streak === 'number' ? gameData.streak : previousGameData?.streak ?? 0;

      if (triviaSubmission && (triviaSubmission.mode ?? triviaConfig?.mode) === 'fixed') {
        if (triviaSubmission.attemptCount <= 0) {
          throw new functions.https.HttpsError('invalid-argument', 'Trivia submissions must include at least one answered question');
        }

        if (triviaSubmission.questionIds.length === 0) {
          throw new functions.https.HttpsError('invalid-argument', 'Trivia submissions must include question identifiers');
        }

        const questionRefs = triviaSubmission.questionIds.map((questionId) => gameRef.collection('questions').doc(questionId));
        const questionDocs = await Promise.all(questionRefs.map((ref) => tx.get(ref)));

        const questionInfoMap = new Map<string, { doc: FirebaseFirestore.DocumentSnapshot; correctHashes: Set<string> }>();

        questionDocs.forEach((docSnapshot, index) => {
          const questionId = triviaSubmission.questionIds[index];
          if (!docSnapshot.exists) {
            throw new functions.https.HttpsError('failed-precondition', `Trivia question ${questionId} does not exist`);
          }

          const docData = docSnapshot.data();
          const correctHashes = collectCorrectTriviaHashes(docData);
          if (correctHashes.size === 0) {
            console.warn('submitGameScore: trivia question missing correct hash metadata', {
              gameId,
              questionId,
            });
          }
          questionInfoMap.set(questionId, { doc: docSnapshot, correctHashes });
        });

        const questionDeltas = new Map<string, TriviaQuestionStatsDelta>();
        let correctCount = 0;

        triviaSubmission.attempts.forEach((attempt) => {
          const questionInfo = questionInfoMap.get(attempt.questionId);
          if (!questionInfo) {
            throw new functions.https.HttpsError('invalid-argument', `Unknown trivia question attempted: ${attempt.questionId}`);
          }

          const normalizedHash = attempt.answerHash;
          let delta = questionDeltas.get(attempt.questionId);
          if (!delta) {
            delta = { counts: {}, total: 0, correct: 0 };
            questionDeltas.set(attempt.questionId, delta);
          }

          delta.counts[normalizedHash] = (delta.counts[normalizedHash] || 0) + 1;
          delta.total += 1;

          if (questionInfo.correctHashes.has(normalizedHash)) {
            delta.correct += 1;
            correctCount += 1;
          }
        });

        const attemptCount = triviaSubmission.attempts.length;
        const accuracy = attemptCount > 0 ? correctCount / attemptCount : 0;

        triviaResult = {
          score: correctCount,
          attemptCount,
          correctCount,
          accuracy,
          bestStreak: triviaSubmission.bestStreak,
          currentStreak: triviaSubmission.currentStreak,
          mode: triviaSubmission.mode ?? triviaConfig?.mode ?? 'fixed',
          questionIds: triviaSubmission.questionIds,
          questionDeltas,
        } satisfies TriviaProcessingResult;

        questionDeltas.forEach((delta, questionId) => {
          const info = questionInfoMap.get(questionId);
          if (!info) {
            return;
          }

          const docData = info.doc.data() ?? {};
          const existingCounts = { ...(docData.answerCounts ?? {}) } as Record<string, number>;

          Object.entries(delta.counts).forEach(([hash, count]) => {
            existingCounts[hash] = (existingCounts[hash] || 0) + count;
          });

          const statsRecord = { ...(docData.stats ?? {}) } as Record<string, unknown>;
          const previousTotalAttempts = typeof statsRecord.totalAttempts === 'number' ? statsRecord.totalAttempts : 0;
          const previousCorrectAttempts = typeof statsRecord.correctAttempts === 'number' ? statsRecord.correctAttempts : 0;
          statsRecord.totalAttempts = previousTotalAttempts + delta.total;
          statsRecord.correctAttempts = previousCorrectAttempts + delta.correct;

          triviaQuestionUpdates.push({
            ref: info.doc.ref,
            data: {
              answerCounts: existingCounts,
              stats: statsRecord,
              lastAnsweredAt: new Date(serverLastPlayed).toISOString(),
              updatedAt: serverLastPlayed,
            },
          });
        });

        const customRecord = { ...(enrichedGameData.custom ?? {}) } as UserGameCustomData & Record<string, unknown>;
        const previousTrivia = (customRecord.trivia as Record<string, unknown> | undefined) ?? {};
        const nextTrivia: Record<string, unknown> = {
          ...previousTrivia,
          lastScore: triviaResult.score,
          lastAttemptCount: triviaResult.attemptCount,
          lastCorrectCount: triviaResult.correctCount,
          lastAccuracy: triviaResult.accuracy,
          lastQuestionIds: triviaResult.questionIds,
          lastMode: triviaResult.mode,
          reportedAttemptCount: triviaSubmission.reportedAttemptCount,
          sessionBestStreak: triviaSubmission.bestStreak,
          sessionCurrentStreak: triviaSubmission.currentStreak,
        };

        Object.keys(nextTrivia).forEach((key) => {
          if (nextTrivia[key] === undefined) {
            delete nextTrivia[key];
          }
        });

        customRecord.trivia = nextTrivia;

        const resolvedStreak = Math.max(
          typeof enrichedGameData.streak === 'number' ? enrichedGameData.streak : 0,
          triviaSubmission.bestStreak ?? 0,
          triviaSubmission.currentStreak ?? 0,
          typeof gameData.streak === 'number' ? gameData.streak : 0,
        );

        enrichedGameData = {
          ...enrichedGameData,
          score: triviaResult.score,
          streak: resolvedStreak,
          custom: customRecord,
        };

        scoreToPersist = previousScore !== null ? Math.max(previousScore, triviaResult.score) : triviaResult.score;
        streakToPersist = Math.max(
          streakToPersist,
          triviaSubmission.bestStreak ?? 0,
          triviaSubmission.currentStreak ?? 0,
          resolvedStreak,
        );
      }

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
      if (typeof gameData.streak === 'number') {
        streakToPersist = Math.max(streakToPersist, gameData.streak);
      }
      
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
        const challengeTriviaConfig = challengeData && isTriviaConfig(challengeData.custom)
          ? (challengeData.custom as TriviaConfig)
          : triviaConfig;
        const solveThreshold = typeof challengeTriviaConfig?.solveThreshold === 'number'
          ? challengeTriviaConfig.solveThreshold
          : 0.8;

        let isCurrentAttemptCorrect = attemptMetadata?.isMatch ?? false;
        if (triviaResult) {
          isCurrentAttemptCorrect = triviaResult.accuracy >= solveThreshold;
        }

        const submissionScore = triviaResult?.score ?? gameData.score;
        
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
        } else if (triviaResult) {
          challengeAttemptMetadata = {
            recordedAt: attemptTimestamp,
            trivia: {
              mode: triviaResult.mode,
              score: triviaResult.score,
              attempts: triviaResult.attemptCount,
              correct: triviaResult.correctCount,
              accuracy: triviaResult.accuracy,
              bestStreak: triviaResult.bestStreak ?? triviaResult.currentStreak ?? streakToPersist,
            },
          } satisfies DailyChallengeAttemptMetadata;
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

          const totalAttemptIncrement = triviaResult ? triviaResult.attemptCount : 1;
          const correctAttemptIncrement = triviaResult ? triviaResult.correctCount : (isCurrentAttemptCorrect ? 1 : 0);
          const statsCustom = { ...(previousChallengeStats.custom ?? {}) } as Record<string, unknown>;

          if (triviaResult) {
            const previousTriviaStats = (statsCustom.trivia as Record<string, unknown> | undefined) ?? {};
            statsCustom.trivia = {
              ...previousTriviaStats,
              lastAttempts: triviaResult.attemptCount,
              lastCorrect: triviaResult.correctCount,
              lastAccuracy: triviaResult.accuracy,
              lastScore: triviaResult.score,
            };
          }

          const nextChallengeStats: (Partial<GameStats> & { totalAttempts?: number; correctAttempts?: number }) = {
            scoreDistribution: distribution,
            totalPlayers: previousChallengeStats.totalPlayers + (firstSubmission ? 1 : 0),
            sessionsPlayed: previousChallengeStats.sessionsPlayed + 1,
            uniqueSubmitters: previousChallengeStats.uniqueSubmitters + (firstSubmission ? 1 : 0),
            favorites: previousChallengeStats.favorites,
            totalAttempts: (previousChallengeStats.totalAttempts ?? 0) + totalAttemptIncrement,
            correctAttempts: (previousChallengeStats.correctAttempts ?? 0) + correctAttemptIncrement,
            updatedAt: Date.now(),
            custom: statsCustom,
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

      if (triviaResult) {
        const triviaCustom = { ...(baseCustom.trivia as Record<string, unknown> | undefined) } as Record<string, unknown>;
        const previousTriviaTotals = previousGameData?.custom?.trivia as Record<string, unknown> | undefined;
        const previousTotalAttemptsValue = previousTriviaTotals?.totalAttempts;
        const previousBestStreakValue = previousTriviaTotals?.bestStreak;
        const existingTotalAttempts = typeof triviaCustom.totalAttempts === 'number'
          ? (triviaCustom.totalAttempts as number)
          : typeof previousTotalAttemptsValue === 'number'
            ? previousTotalAttemptsValue
            : 0;
        const existingBestStreak = typeof triviaCustom.bestStreak === 'number'
          ? (triviaCustom.bestStreak as number)
          : typeof previousBestStreakValue === 'number'
            ? previousBestStreakValue
            : 0;

        triviaCustom.totalAttempts = existingTotalAttempts + triviaResult.attemptCount;
        triviaCustom.bestStreak = Math.max(
          existingBestStreak,
          triviaResult.bestStreak ?? 0,
          triviaResult.currentStreak ?? 0,
          streakToPersist,
        );
        triviaCustom.lastAttemptCount = triviaResult.attemptCount;
        triviaCustom.lastScore = triviaResult.score;
        triviaCustom.lastAccuracy = triviaResult.accuracy;
        triviaCustom.lastQuestionIds = triviaResult.questionIds;
        if (triviaResult.mode) {
          triviaCustom.lastMode = triviaResult.mode;
        }

        baseCustom.trivia = triviaCustom;
      }

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

      if (triviaQuestionUpdates.length > 0) {
        triviaQuestionUpdates.forEach((update) => {
          tx.set(update.ref, update.data, { merge: true });
        });
      }

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

        if (triviaResult) {
          const triviaChallengeCustom = (challengeCustom.trivia as Record<string, unknown> | undefined) ?? {};
          challengeCustom.trivia = {
            ...triviaChallengeCustom,
            mode: triviaResult.mode,
            score: triviaResult.score,
            attempts: triviaResult.attemptCount,
            correct: triviaResult.correctCount,
            accuracy: triviaResult.accuracy,
          };
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

