// Firebase Cloud Functions for backend APIs
import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import cors from 'cors';
import axios from 'axios';
import OAuth from 'oauth-1.0a';
import * as crypto from 'crypto';
import {
  UserGameData,
  SubmitGameScoreRequest,
  SubmitGameScoreResponse,
  User,
  DailyChallengeUserProgress,
} from '@top-x/shared/types/user';
import type {
  Game,
  LeaderboardDateIndexes,
  LeaderboardEntry,
  LeaderboardEntryDate,
} from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';
import type {
  DailyChallenge,
  DailyChallengeAttemptMetadata,
  DailyChallengeGameStats,
} from '@top-x/shared/types/dailyChallenge';
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal';
import { evaluateZoneRevealAnswer } from '@top-x/shared/utils/zoneRevealAnswer';
import { postOnX } from './external/xApi';
import './utils/firebaseAdmin'; // Triggers centralized init (no re-init needed)
import {
  applyChallengeCounterUpdates,
  applyGameCounterUpdates,
  GAME_COUNTER_KEYS,
  GAME_COUNTER_EVENT_MAP,
  type GameCounterEvent,
} from './utils/counterManager';

// -------------------------------------------------------------
// Cloud Functions used by the TOP-X backend
// -------------------------------------------------------------
// This file exposes a set of HTTPS callable functions and REST
// endpoints that keep user data in sync with X (Twitter) and
// manage various leaderboard queries. It also updates aggregated
// statistics for each game as users play.
// -------------------------------------------------------------

const db = admin.firestore();

const corsHandler = cors({ origin: true });

const DEFAULT_LEADERBOARD_PHOTO = 'https://www.top-x.co/assets/profile.png';

const formatLeaderboardDailyIndex = (date: Date): string => date.toISOString().slice(0, 10);

const formatLeaderboardWeeklyIndex = (date: Date): string => {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
};

const formatLeaderboardMonthlyIndex = (date: Date): string => {
  return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
};

const createLeaderboardDatePayload = (timestamp: number | null | undefined): LeaderboardEntryDate | undefined => {
  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
    return undefined;
  }
  const normalizedTimestamp = Math.floor(timestamp);
  const date = new Date(normalizedTimestamp);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  const indexes: LeaderboardDateIndexes = {
    daily: formatLeaderboardDailyIndex(date),
    weekly: formatLeaderboardWeeklyIndex(date),
    monthly: formatLeaderboardMonthlyIndex(date),
    allTime: 'all-time',
  };
  return {
    recordedAt: date.getTime(),
    indexes,
  };
};

const parseDateLikeValue = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  if (value instanceof Date) {
    const millis = value.getTime();
    return Number.isNaN(millis) ? undefined : millis;
  }
  return undefined;
};

const mapLeaderboardDoc = (
  docSnapshot: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
    | FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
): LeaderboardEntry => {
  const data = docSnapshot.data() as LeaderboardEntry | undefined;
  const fallbackUpdatedAt = data?.date?.recordedAt;
  return {
    uid: docSnapshot.id,
    displayName: data?.displayName || 'Anonymous',
    username: data?.username || data?.displayName || 'Anonymous',
    photoURL: data?.photoURL || DEFAULT_LEADERBOARD_PHOTO,
    score: data?.score ?? 0,
    streak: data?.streak ?? 0,
    updatedAt: data?.updatedAt ?? fallbackUpdatedAt,
    date: data?.date,
    custom: data?.custom,
  } satisfies LeaderboardEntry;
};

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const getLeaderboardCollectionRef = (
  gameId: string,
  dailyChallengeId?: string,
): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData> => {
  const gameRef = db.collection('games').doc(gameId);
  if (dailyChallengeId) {
    return gameRef
      .collection('daily_challenges')
      .doc(dailyChallengeId)
      .collection('leaderboard');
  }
  return gameRef.collection('leaderboard');
};

const getStatsDocumentRef = (
  gameId: string,
  dailyChallengeId?: string,
): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData> => {
  if (dailyChallengeId) {
    return db
      .collection('games')
      .doc(gameId)
      .collection('daily_challenges')
      .doc(dailyChallengeId)
      .collection('stats')
      .doc('general');
  }
  return db.collection('games').doc(gameId).collection('stats').doc('general');
};

const hasPyramidCustomChanges = (
  previousCustom?: Record<string, any>,
  newCustom?: Record<string, any>
): boolean => {
  const previousPyramid = previousCustom?.pyramid ?? [];
  const newPyramid = newCustom?.pyramid ?? [];
  const previousWorstItem = previousCustom?.worstItem ?? null;
  const newWorstItem = newCustom?.worstItem ?? null;

  return (
    JSON.stringify(previousPyramid) !== JSON.stringify(newPyramid) ||
    JSON.stringify(previousWorstItem) !== JSON.stringify(newWorstItem)
  );
};

type PyramidTier = { tier: number; slots: (string | null)[] };
type PyramidWorstItem = { id?: string | null };

type PyramidCustomData = {
  pyramid?: PyramidTier[];
  worstItem?: PyramidWorstItem;
};

const isPyramidTier = (value: unknown): value is PyramidTier => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const tierRecord = value as Record<string, unknown>;
  const slots = tierRecord.slots;

  return (
    typeof tierRecord.tier === 'number'
    && Array.isArray(slots)
    && slots.every((slot) => slot === null || typeof slot === 'string')
  );
};

const isPyramidCustomData = (value: unknown): value is PyramidCustomData => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  const { pyramid, worstItem } = record as PyramidCustomData;

  if (
    pyramid !== undefined
    && (!Array.isArray(pyramid) || !pyramid.every(isPyramidTier))
  ) {
    return false;
  }

  if (
    worstItem !== undefined
    && (typeof worstItem !== 'object' || worstItem === null)
  ) {
    return false;
  }

  return true;
};

const oauth = new OAuth({
  consumer: {
    key: process.env.XAPI_KEY || '',
    secret: process.env.XAPI_SECRET || '',
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string: string, key: string) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

// Sync basic user information from X (Twitter) when the client
// explicitly calls this function. The client must be authenticated
// and have previously stored access credentials in Firestore.
export const syncXUserData = functions.https.onCall(async (context: functions.https.CallableRequest) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  const uid = context.auth.uid;
  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data();
  if (!userData || !userData.xAccessToken || !userData.xAccessSecret) {
    console.log(`No X credentials for user ${uid}`);
    return;
  }

  const token = {
    key: userData.xAccessToken,
    secret: userData.xAccessSecret,
  };

  const requestData = {
    url: 'https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url,public_metrics',
    method: 'GET',
  };

  try {
    const header = oauth.toHeader(oauth.authorize(requestData, token));
    const response = await axios.get(requestData.url, { headers: { Authorization: header.Authorization } });
    const xData = {
      displayName: response.data.data.name,
      username: response.data.data.username,
      photoURL: response.data.data.profile_image_url ? response.data.data.profile_image_url.replace('_normal', '_400x400') : 'https://www.top-x.co/assets/profile.png',
      followersCount: response.data.data.public_metrics.followers_count,
      followingCount: response.data.data.public_metrics.following_count,
    };

    await db.collection('users').doc(uid).update({
      displayName: xData.displayName,
      username: xData.username,
      photoURL: xData.photoURL,
      followersCount: xData.followersCount,
      followingCount: xData.followingCount,
      updatedAt: Date.now(),
    });
    console.log(`Updated user ${uid} with X data:`, xData);
  } catch (error: any) {
    console.error(`Error fetching X data for user ${uid}:`, error.message);
    throw new functions.https.HttpsError('internal', 'Failed to fetch X data');
  }
});

// Callable function that receives game progress submissions from
// the client, persists them to the user document and keeps the
// leaderboard/statistics in sync. This replaces the previous
// onDocumentWritten trigger so that validation and leaderboard
// updates happen atomically on the backend.
export const submitGameScore = functions.https.onCall(async (
  request: functions.https.CallableRequest<SubmitGameScoreRequest>
): Promise<SubmitGameScoreResponse> => {
  const { auth, data } = request;

  if (!auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const payload = (data ?? {}) as SubmitGameScoreRequest;
  const { gameTypeId, gameId, gameData } = payload;
  const rawDailyChallengeId = payload.dailyChallengeId?.trim();
  const requestDailyChallengeDate = payload.dailyChallengeDate?.trim();
  const isDailyChallengeSubmission = Boolean(rawDailyChallengeId);

  if (!rawDailyChallengeId && (requestDailyChallengeDate || payload.challengeMetadata)) {
    console.warn('submitGameScore: challenge metadata provided without dailyChallengeId', {
      uid: auth.uid,
      gameId,
      gameTypeId,
      hasChallengeMetadata: Boolean(payload.challengeMetadata),
      requestDailyChallengeDate,
    });
  }

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
    const result = await db.runTransaction(async (tx) => {
      const userRef = db.collection('users').doc(uid);
      const gameRef = db.collection('games').doc(gameId);
      const leaderboardRef = gameRef.collection('leaderboard').doc(uid);
      const statsRef = gameRef.collection('stats').doc('general');
      const challengeRef = isDailyChallengeSubmission && rawDailyChallengeId
        ? gameRef.collection('daily_challenges').doc(rawDailyChallengeId)
        : null;
      const challengeLeaderboardRef = challengeRef ? challengeRef.collection('leaderboard').doc(uid) : null;
      const challengeStatsRef = challengeRef ? challengeRef.collection('stats').doc('general') : null;

      const userDoc = await tx.get(userRef);
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('failed-precondition', 'User profile not found');
      }

      const userData = userDoc.data() as User;
      const previousGameData = userData.games?.[gameTypeId]?.[gameId] as UserGameData | undefined;
      const previousScore = previousGameData?.score ?? null;
      const isPyramidGame = gameTypeId === 'PyramidTier';
      const pyramidCustomChanged = isPyramidGame
        ? hasPyramidCustomChanges(previousGameData?.custom, gameData.custom)
        : false;

      if (!isDailyChallengeSubmission && previousScore !== null && gameData.score <= previousScore && !pyramidCustomChanged) {
        console.log(`submitGameScore: score ${gameData.score} is not higher than previous score ${previousScore} for user ${uid}`);
        applyGameCounterUpdates({
          tx,
          userRef,
          gameRef,
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

      const [statsDoc, gameDoc] = await Promise.all([
        tx.get(statsRef),
        tx.get(gameRef),
      ]);
      let challengeDoc: FirebaseFirestore.DocumentSnapshot | null = null;
      let challengeStatsDoc: FirebaseFirestore.DocumentSnapshot | null = null;

      if (challengeRef && challengeStatsRef) {
        [challengeDoc, challengeStatsDoc] = await Promise.all([
          tx.get(challengeRef),
          tx.get(challengeStatsRef),
        ]);
      }

      if (!gameDoc.exists) {
        throw new functions.https.HttpsError('failed-precondition', `Game ${gameId} does not exist`);
      }

      let challengeData: DailyChallenge | null = null;
      let resolvedDailyChallengeDate = requestDailyChallengeDate || null;

      if (isDailyChallengeSubmission) {
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
        resolvedDailyChallengeDate = resolvedDailyChallengeDate || challengeData?.date || null;

        if (!resolvedDailyChallengeDate) {
          throw new functions.https.HttpsError('invalid-argument', 'Unable to resolve the daily challenge date');
        }
      }

      let scoreToPersist = previousScore !== null ? Math.max(previousScore, gameData.score) : gameData.score;
      const serverLastPlayed = Date.now();
      const gameSnapshot = gameDoc.data() as Game | undefined;

      let enrichedGameData = gameData;
      let attemptMetadata: DailyChallengeAttemptMetadata | undefined;

      if (gameTypeId === 'ZoneReveal') {
        const zoneRevealConfig = (challengeData?.custom as ZoneRevealConfig | undefined)
          ?? (gameSnapshot?.custom as ZoneRevealConfig | undefined);
        const rawAnswer = gameData.custom?.answer;
        let attempt: string | undefined;

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

      let streakToPersist = typeof gameData.streak === 'number'
        ? gameData.streak
        : previousGameData?.streak ?? 0;
      let challengeBestScore: number | undefined;
      let challengeProgressUpdate: DailyChallengeUserProgress | undefined;
      let challengeAttemptCount: number | undefined;
      let challengePlayedAtIso: string | undefined;
      let challengeSolvedAtIso: string | undefined;
      let challengeAttemptMetadata: DailyChallengeAttemptMetadata | undefined;
      let challengeStatsUpdate: Partial<DailyChallengeGameStats> | undefined;

      if (isDailyChallengeSubmission && rawDailyChallengeId && challengeRef) {
        const previousDailyChallenges = previousGameData?.custom?.dailyChallenges ?? {};
        const previousChallengeProgress = previousDailyChallenges[rawDailyChallengeId] as DailyChallengeUserProgress | undefined;
        const attemptTimestamp = new Date().toISOString();
        const firstSubmission = !previousChallengeProgress?.played;
        const wasPreviouslySolved = previousChallengeProgress?.solved ?? false;
        const isCurrentAttemptCorrect = attemptMetadata?.isMatch ?? false;
        const submissionScore = gameData.score;
        const previousChallengeBestScore = typeof previousChallengeProgress?.bestScore === 'number'
          ? previousChallengeProgress.bestScore
          : undefined;
        challengeBestScore = previousChallengeBestScore !== undefined
          ? Math.max(previousChallengeBestScore, submissionScore)
          : submissionScore;
        const hasNewBestScore = previousChallengeBestScore === undefined || challengeBestScore > previousChallengeBestScore;
        const attemptCount = (previousChallengeProgress?.attemptCount ?? 0) + 1;
        const firstPlayedAt = previousChallengeProgress?.firstPlayedAt ?? attemptTimestamp;
        let solvedAt = previousChallengeProgress?.solvedAt;
        if (!solvedAt && isCurrentAttemptCorrect) {
          solvedAt = attemptTimestamp;
        }
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

        challengeAttemptMetadata = attemptMetadata
          ? { ...attemptMetadata, recordedAt: attemptTimestamp }
          : undefined;

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

        if (challengeStatsRef) {
          const previousChallengeStats = challengeStatsDoc?.exists
            ? (challengeStatsDoc.data() as DailyChallengeGameStats)
            : undefined;
          const nextChallengeStats: Partial<DailyChallengeGameStats> = {
            challengeId: rawDailyChallengeId,
            challengeDate: resolvedDailyChallengeDate!,
            updatedAt: attemptTimestamp,
            totalPlayers: (previousChallengeStats?.totalPlayers ?? 0) + (firstSubmission ? 1 : 0),
            sessionsPlayed: (previousChallengeStats?.sessionsPlayed ?? 0) + 1,
            uniqueSubmitters: (previousChallengeStats?.uniqueSubmitters ?? 0) + (firstSubmission ? 1 : 0),
            totalAttempts: (previousChallengeStats?.totalAttempts ?? 0) + 1,
            correctAttempts: (previousChallengeStats?.correctAttempts ?? 0) + (isCurrentAttemptCorrect ? 1 : 0),
          };

          challengeStatsUpdate = nextChallengeStats;
        }

        challengeAttemptCount = attemptCount;
        challengePlayedAtIso = firstPlayedAt;
        challengeSolvedAtIso = solved ? solvedAt ?? attemptTimestamp : previousChallengeProgress?.solvedAt;
      }

      const customFromSubmission = { ...(enrichedGameData.custom ?? {}) } as Record<string, unknown>;
      const baseCustom = {
        ...(previousGameData?.custom ?? {}),
        ...customFromSubmission,
      } as UserGameData['custom'];

      if (isDailyChallengeSubmission && rawDailyChallengeId && challengeProgressUpdate) {
        baseCustom.dailyChallenges = {
          ...(previousGameData?.custom?.dailyChallenges ?? {}),
          [rawDailyChallengeId]: challengeProgressUpdate,
        };
      }

      const mergedGameData: UserGameData = {
        ...(previousGameData ?? {}),
        ...enrichedGameData,
        score: scoreToPersist,
        streak: streakToPersist,
        lastPlayed: serverLastPlayed,
        custom: baseCustom,
      };

      tx.set(userRef, {
        games: {
          [gameTypeId]: {
            [gameId]: mergedGameData,
          },
        },
      }, { merge: true });

      applyGameCounterUpdates({
        tx,
        userRef,
        gameRef,
        userData,
        gameId,
        updates: [
          { key: GAME_COUNTER_KEYS.SESSIONS_PLAYED, type: 'increment' },
          ...(!previousGameData
            ? [{ key: GAME_COUNTER_KEYS.TOTAL_PLAYERS, type: 'unique' } as const]
            : []),
        ],
      });

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

        const challengeLeaderboardUpdate: Record<string, unknown> = {
          uid,
          displayName: userData.displayName,
          username: userData.username,
          photoURL: userData.photoURL || DEFAULT_LEADERBOARD_PHOTO,
          score: challengeBestScore ?? gameData.score,
          streak: streakToPersist,
          challengeId: rawDailyChallengeId!,
          challengeDate: resolvedDailyChallengeDate!,
          playedAt: challengePlayedAtIso ?? new Date(serverLastPlayed).toISOString(),
          solvedAt: challengeSolvedAtIso,
          attemptCount: challengeAttemptCount,
          updatedAt: Date.now(),
          ...(challengeDatePayload ? { date: challengeDatePayload } : {}),
        };

        if (challengeAttemptMetadata) {
          challengeLeaderboardUpdate.attempt = challengeAttemptMetadata;
        }

        leaderboardUpdate = challengeLeaderboardUpdate;
        leaderboardSetOptions = { merge: true };

        if (challengeStatsUpdate) {
          statsUpdate = challengeStatsUpdate;
          statsSetOptions = { merge: true };
        }
      } else {
        const currentStats = statsDoc.exists
          ? statsDoc.data() as GameStats
          : { totalPlayers: 0, scoreDistribution: {}, custom: {}, updatedAt: Date.now() } as GameStats;

        const distribution = { ...currentStats.scoreDistribution } as { [score: number]: number };
        let totalPlayers = currentStats.totalPlayers;
        let custom = { ...currentStats.custom } as Record<string, any>;

        if (!previousGameData) {
          distribution[mergedGameData.score] = (distribution[mergedGameData.score] || 0) + 1;
          totalPlayers++;
        } else if (previousScore !== mergedGameData.score) {
          if (previousScore !== null) {
            distribution[previousScore] = Math.max((distribution[previousScore] || 1) - 1, 0);
          }
          distribution[mergedGameData.score] = (distribution[mergedGameData.score] || 0) + 1;
        }

        if (gameTypeId === 'PyramidTier') {
          const itemRanks = custom.itemRanks || {};
          const worstItemCounts = custom.worstItemCounts || {};

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

// Returns the top N players for a given game ordered by score
// and streak. The number of results is controlled by the optional
// 'limit' query parameter.
export const getTopLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const dailyChallengeId = toOptionalString(req.query.dailyChallengeId);
    const limitParam = parseInt(req.query.limit as string) || 10;
    const validLimits = [10, 20, 30, 40, 50];
    const maxResults = validLimits.includes(limitParam) ? limitParam : 10;

    try {
      const leaderboardRef = getLeaderboardCollectionRef(gameId, dailyChallengeId);
      const snapshot = await leaderboardRef
        .orderBy('score', 'desc')
        .orderBy('streak', 'desc')
        .limit(maxResults)
        .get();
      const leaderboard: LeaderboardEntry[] = snapshot.docs.map((doc) => mapLeaderboardDoc(doc));
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error('Error fetching top leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });
});

export const setGameFavorite = functions.https.onCall(async (request: functions.https.CallableRequest) => {
  const { auth, data } = request;

  if (!auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const payload = data as { gameId?: string; favorite?: boolean } | undefined;
  const gameId = payload?.gameId;
  const favorite = payload?.favorite;

  if (!gameId || typeof favorite !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'gameId and favorite flag are required');
  }

  const uid = auth.uid;

  try {
    const result = await db.runTransaction(async (tx) => {
      const userRef = db.collection('users').doc(uid);
      const gameRef = db.collection('games').doc(gameId);

      const userDoc = await tx.get(userRef);
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('failed-precondition', 'User profile not found');
      }

      const gameDoc = await tx.get(gameRef);
      if (!gameDoc.exists) {
        throw new functions.https.HttpsError('failed-precondition', `Game ${gameId} does not exist`);
      }

      const userData = userDoc.data() as User;
      const favoriteGames = userData.favoriteGames || [];
      const currentlyFavorite = favoriteGames.includes(gameId);

      if (currentlyFavorite === favorite) {
        return { success: true, favorite };
      }

      tx.update(userRef, {
        favoriteGames: favorite
          ? admin.firestore.FieldValue.arrayUnion(gameId)
          : admin.firestore.FieldValue.arrayRemove(gameId),
      });

      applyGameCounterUpdates({
        tx,
        userRef,
        gameRef,
        userData,
        gameId,
        updates: [{ key: GAME_COUNTER_KEYS.FAVORITES, type: 'toggle', value: favorite }],
      });

      return { success: true, favorite };
    });

    return result;
  } catch (error: any) {
    console.error('setGameFavorite error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to update favorite state');
  }
});

export const recordGameEvent = functions.https.onCall(async (request: functions.https.CallableRequest) => {
  const { auth, data } = request;

  if (!auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const payload = data as { gameId?: string; events?: GameCounterEvent[] } | undefined;
  const gameId = payload?.gameId;
  const events = Array.isArray(payload?.events) ? payload!.events : [];

  if (!gameId || !events.length) {
    throw new functions.https.HttpsError('invalid-argument', 'gameId and events are required');
  }

  const recognizedEvents = Array.from(new Set(events)).filter((event): event is GameCounterEvent => {
    return Object.prototype.hasOwnProperty.call(GAME_COUNTER_EVENT_MAP, event);
  });

  if (!recognizedEvents.length) {
    return { success: false, appliedEvents: [] };
  }

  const uid = auth.uid;

  try {
    await db.runTransaction(async (tx) => {
      const userRef = db.collection('users').doc(uid);
      const gameRef = db.collection('games').doc(gameId);

      const userDoc = await tx.get(userRef);
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('failed-precondition', 'User profile not found');
      }

      const gameDoc = await tx.get(gameRef);
      if (!gameDoc.exists) {
        throw new functions.https.HttpsError('failed-precondition', `Game ${gameId} does not exist`);
      }

      const userData = userDoc.data() as User;
      const counterUpdates = recognizedEvents.flatMap((event) => GAME_COUNTER_EVENT_MAP[event]);

      applyGameCounterUpdates({
        tx,
        userRef,
        gameRef,
        userData,
        gameId,
        updates: counterUpdates,
      });
    });

    return { success: true, appliedEvents: recognizedEvents };
  } catch (error: any) {
    console.error('recordGameEvent error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to record game event');
  }
});

// Returns a slice of the leaderboard centered around the
// requesting user. It fetches a few users above and below the
// given uid so the client can show relative ranking.
export const getAroundLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const dailyChallengeId = toOptionalString(req.query.dailyChallengeId);
    const uid = req.query.uid as string;

    if (!uid) {
      res.status(400).json({ error: 'Missing uid parameter' });
      return;
    }

    try {
      const leaderboardRef = getLeaderboardCollectionRef(gameId, dailyChallengeId);
      const leaderboardEntryDoc = await leaderboardRef.doc(uid).get();
      if (!leaderboardEntryDoc.exists) {
        res.status(404).json({ error: 'User not found in leaderboard' });
        return;
      }
      const leaderboardEntryData = mapLeaderboardDoc(leaderboardEntryDoc);
      if (!leaderboardEntryData) {
        res.status(500).json({ error: 'User data is undefined' });
        return;
      }
      const userScore = leaderboardEntryData.score;

      const aboveSnapshot = await leaderboardRef
        .orderBy('score', 'desc')
        .orderBy('updatedAt', 'desc')
        .where('score', '>', userScore)
        .limit(5)
        .get();
      const above = aboveSnapshot.docs.map((doc) => mapLeaderboardDoc(doc));

      const belowSnapshot = await leaderboardRef
        .orderBy('score', 'asc')
        .orderBy('updatedAt', 'asc')
        .where('score', '<', userScore)
        .limit(5)
        .get();
      const below = belowSnapshot.docs.map((doc) => mapLeaderboardDoc(doc));

      // const current: LeaderboardEntry = {
      //   uid: uid,
      //   displayName: userData.displayName,
      //   username: userData.username,
      //   photoURL: userData.photoURL || 'https://www.top-x.co/assets/profile.png',
      //   score: userData.score,
      //   streak: userData.streak,
      // };

      const leaderboard = [...above, leaderboardEntryData, ...below.reverse()];
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error('Error fetching around leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });
});

// Returns leaderboard entries for the friends of a given user
// based on the list of friend UIDs stored in that user's document.
export const getFriendsLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const dailyChallengeId = toOptionalString(req.query.dailyChallengeId);
    const uid = req.query.uid as string;

    if (!uid) {
      res.status(400).json({ error: 'Missing uid parameter' });
      return;
    }

    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        res.status(404).json({ error: 'User not found' });
      }
      const userData = userDoc.data();
      if (!userData || !userData.frenemies) {
        res.status(200).json([]);
        return;
      }
      const frenemies: string[] = userData.frenemies;

      const leaderboard: LeaderboardEntry[] = [];
      const leaderboardRef = getLeaderboardCollectionRef(gameId, dailyChallengeId);
      for (let i = 0; i < frenemies.length; i += 30) {
        const batch = frenemies.slice(i, i + 30);
        const docRefs = batch.map(uidValue => leaderboardRef.doc(uidValue));
        const snapshot = await leaderboardRef
          .where(admin.firestore.FieldPath.documentId(), 'in', docRefs)
          .orderBy('score', 'desc')
          .get();
        snapshot.forEach((doc) => {
          leaderboard.push(mapLeaderboardDoc(doc));
        });
      }

      leaderboard.sort((a, b) => b.score - a.score);
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error('Error fetching friends leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });
});

// Calculates the percentile rank for a user in a given game. It
// looks up the user's score in the leaderboard and compares it
// against the stored score distribution statistics.
export const getPercentileRank = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const dailyChallengeId = toOptionalString(req.query.dailyChallengeId);
    const uid = req.query.uid as string;

    if (!uid) {
      res.status(400).json({ error: 'Missing uid parameter' });
      return;
    }

    try {
      const leaderboardRef = getLeaderboardCollectionRef(gameId, dailyChallengeId);
      const userDoc = await leaderboardRef.doc(uid).get();
      if (!userDoc.exists) {
        res.status(404).json({ error: 'User not found in leaderboard' });
        return;
      }
      const userData = userDoc.data() as UserGameData;
      if (!userData) {
        res.status(500).json({ error: 'User data is undefined' });
        return;
      }
      const userScore = userData.score;

      const statsDoc = await getStatsDocumentRef(gameId, dailyChallengeId).get();
      if (!statsDoc.exists) {
        res.status(404).json({ error: 'Stats not available' });
        return;
      }
      const stats = statsDoc.data() as GameStats;
      if (!stats.scoreDistribution) {
        res.status(500).json({ error: 'Stats distribution is undefined' });
        return;
      }

      let playersBelowOrEqual = 0;
      for (const score in stats.scoreDistribution) {
        if (parseInt(score) <= userScore) {
          playersBelowOrEqual += stats.scoreDistribution[score];
        }
      }

      const percentile = Math.round((playersBelowOrEqual / stats.totalPlayers) * 100);
      const usersTopped = playersBelowOrEqual;
      res.status(200).json({ percentile, usersTopped });
    } catch (error) {
      console.error('Error fetching percentile rank:', error);
      res.status(500).json({ error: 'Failed to fetch percentile rank' });
    }
  });
});

// Fetches leaderboard information for a curated list of VIP users.
// The list of UIDs is stored in the 'config/vip_users' document in Firestore.
export const getVipLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const dailyChallengeId = toOptionalString(req.query.dailyChallengeId);

    try {
      const gameDoc = await db.collection('games').doc(gameId).get();
      if (!gameDoc.exists) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }
      const gameData = gameDoc.data();
      if (!gameData || !gameData.vip) {
        res.status(200).json([]);
        return;
      }
      const vipUids: string[] = gameData.vip;

      const leaderboard: LeaderboardEntry[] = [];
      const leaderboardRef = getLeaderboardCollectionRef(gameId, dailyChallengeId);
      for (let i = 0; i < vipUids.length; i += 30) {
        const batch = vipUids.slice(i, i + 30);
        const docRefs = batch.map(uidValue => leaderboardRef.doc(uidValue));
        const snapshot = await leaderboardRef
          .where(admin.firestore.FieldPath.documentId(), 'in', docRefs)
          .orderBy('score', 'desc')
          .get();
        snapshot.forEach((doc) => {
          leaderboard.push(mapLeaderboardDoc(doc));
        });
      }

      leaderboard.sort((a, b) => b.score - a.score);
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error('Error fetching VIP leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });
});
export { postOnX }; // Add other exports as needed