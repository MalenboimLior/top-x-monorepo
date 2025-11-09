import type { DailyChallenge } from '@top-x/shared/types/dailyChallenge';
import type { Game } from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';
import type { TriviaConfig } from '@top-x/shared/types/trivia';
import type {
  DailyChallengeAttemptMetadata,
  DailyChallengeRewardRecord,
  DailyChallengeSolveState,
  DailyChallengeUserProgress,
  SubmitGameScoreRequest,
  UserGameData,
  UserGameDataSubmission,
} from '@top-x/shared/types/user';
import {
  GAME_COUNTER_KEYS,
  incrementChallengeAnalyticsCounters,
} from '../../utils/statsManager';
import {
  createEmptyGameStats,
  normalizeGameStats,
} from '../../utils/gameStatsHelpers';
import { isTriviaConfig, TriviaProcessingOutcome } from './trivia';

export interface DailyChallengeProcessingParams {
  tx: FirebaseFirestore.Transaction;
  gameId: string;
  gameTypeId: string;
  userId: string;
  challengeId: string;
  challengeData: DailyChallenge;
  challengeRef: FirebaseFirestore.DocumentReference;
  challengeStatsRef: FirebaseFirestore.DocumentReference | null;
  challengeStatsDoc: FirebaseFirestore.DocumentSnapshot | null;
  rewardRef: FirebaseFirestore.DocumentReference | null;
  existingRewardDoc: FirebaseFirestore.DocumentSnapshot | null;
  resolvedDailyChallengeDate: string;
  payloadChallengeMetadata?: SubmitGameScoreRequest['challengeMetadata'];
  previousGameData: UserGameData | undefined;
  enrichedSubmission: UserGameDataSubmission;
  originalSubmission: UserGameDataSubmission;
  streakToPersist: number;
  serverTimestamp: number;
  triviaOutcome: TriviaProcessingOutcome | null;
  attemptMetadata: DailyChallengeAttemptMetadata | undefined;
  gameSnapshot: Game | undefined;
}

export interface DailyChallengeProcessingOutcome {
  challengeBestScore?: number;
  challengeGameDataUpdate?: UserGameData;
  challengeProgressUpdate?: DailyChallengeUserProgress;
  challengeAttemptCount?: number;
  challengePlayedAtIso?: string;
  challengeSolvedAtIso?: string;
  challengeAttemptMetadata?: DailyChallengeAttemptMetadata;
  challengeStatsUpdate?: (Partial<GameStats> & { totalAttempts?: number; correctAttempts?: number });
  pendingRewardRecord?: DailyChallengeRewardRecord;
}

export function processDailyChallengeSubmission({
  tx,
  gameId,
  gameTypeId,
  userId,
  challengeId,
  challengeData,
  challengeRef,
  challengeStatsRef,
  challengeStatsDoc,
  rewardRef,
  existingRewardDoc,
  resolvedDailyChallengeDate,
  payloadChallengeMetadata,
  previousGameData,
  enrichedSubmission,
  originalSubmission,
  streakToPersist,
  serverTimestamp,
  triviaOutcome,
  attemptMetadata,
  gameSnapshot,
}: DailyChallengeProcessingParams): DailyChallengeProcessingOutcome {
  const result: DailyChallengeProcessingOutcome = {};

  const previousChallengeGameData = previousGameData?.dailyChallenges?.[challengeId];
  const previousChallengeProgress = previousChallengeGameData?.custom?.dailyChallengeProgress;
  const attemptTimestamp = new Date().toISOString();

  const firstSubmission = !previousChallengeProgress?.played;
  const wasPreviouslySolved = previousChallengeProgress?.solved ?? false;

  const challengeTriviaConfig = isTriviaConfig(challengeData.custom)
    ? (challengeData.custom as TriviaConfig)
    : isTriviaConfig(gameSnapshot?.custom)
      ? (gameSnapshot!.custom as TriviaConfig)
      : undefined;

  const solveThreshold = typeof challengeTriviaConfig?.solveThreshold === 'number'
    ? challengeTriviaConfig.solveThreshold
    : 0.8;

  let isCurrentAttemptCorrect = attemptMetadata?.isMatch ?? false;
  if (triviaOutcome) {
    isCurrentAttemptCorrect = triviaOutcome.metrics.accuracy >= solveThreshold;
  }

  const submissionScore = triviaOutcome?.metrics.score ?? originalSubmission.score;

  const previousChallengeBestScore = typeof previousChallengeProgress?.bestScore === 'number'
    ? previousChallengeProgress.bestScore
    : undefined;

  const challengeBestScore = previousChallengeBestScore !== undefined
    ? Math.max(previousChallengeBestScore, submissionScore)
    : submissionScore;

  result.challengeBestScore = challengeBestScore;

  const hasNewBestScore = previousChallengeBestScore === undefined || challengeBestScore > previousChallengeBestScore;

  const attemptCount = (previousChallengeProgress?.attemptCount ?? 0) + 1;
  const firstPlayedAt = previousChallengeProgress?.firstPlayedAt ?? attemptTimestamp;
  let solvedAt = previousChallengeProgress?.solvedAt;

  if (!solvedAt && isCurrentAttemptCorrect) {
    solvedAt = attemptTimestamp;
  }

  const solved = wasPreviouslySolved || isCurrentAttemptCorrect;
  const bestScoreAt = hasNewBestScore ? attemptTimestamp : previousChallengeProgress?.bestScoreAt;

  incrementChallengeAnalyticsCounters({
    tx,
    challengeRef,
    increments: {
      [GAME_COUNTER_KEYS.SESSIONS_PLAYED]: 1,
      ...(firstSubmission ? { [GAME_COUNTER_KEYS.TOTAL_PLAYERS]: 1 } : {}),
    },
  });

  let challengeAttemptMetadata: DailyChallengeAttemptMetadata | undefined;

  if (attemptMetadata) {
    challengeAttemptMetadata = { ...attemptMetadata, recordedAt: attemptTimestamp };
  } else if (triviaOutcome) {
    challengeAttemptMetadata = {
      recordedAt: attemptTimestamp,
      trivia: {
        mode: triviaOutcome.metrics.mode,
        score: triviaOutcome.metrics.score,
        attempts: triviaOutcome.metrics.attemptCount,
        correct: triviaOutcome.metrics.correctCount,
        accuracy: triviaOutcome.metrics.accuracy,
        bestStreak: triviaOutcome.metrics.bestStreak ?? triviaOutcome.metrics.currentStreak ?? streakToPersist,
      },
    };
  }

  const solvedAtValue = solved ? solvedAt : undefined;

  const challengeProgressUpdate: DailyChallengeUserProgress = {
    played: true,
    solved,
    bestScore: challengeBestScore,
    firstPlayedAt,
    lastPlayedAt: attemptTimestamp,
    ...(solvedAtValue ? { solvedAt: solvedAtValue } : {}),
    ...(bestScoreAt ? { bestScoreAt } : {}),
    attemptCount,
    ...(challengeAttemptMetadata ? { attemptMetadata: challengeAttemptMetadata } : {}),
  };

  result.challengeProgressUpdate = challengeProgressUpdate;
  result.challengeAttemptMetadata = challengeAttemptMetadata;
  result.challengeAttemptCount = attemptCount;
  result.challengePlayedAtIso = firstPlayedAt;
  result.challengeSolvedAtIso = solved ? (solvedAt ?? attemptTimestamp) : previousChallengeProgress?.solvedAt;

  const challengeCustomFromSubmission = { ...(enrichedSubmission.custom ?? {}) };
  const challengeBaseCustom: UserGameData['custom'] & Record<string, unknown> = {
    ...(previousChallengeGameData?.custom ?? {}),
    ...challengeCustomFromSubmission,
  };

  delete challengeBaseCustom.dailyChallenges;
  challengeBaseCustom.dailyChallengeProgress = challengeProgressUpdate;

  const challengeScoreToPersist = challengeBestScore ?? submissionScore;

  const challengeGameDataUpdate: UserGameData = {
    score: challengeScoreToPersist,
    streak: streakToPersist,
    lastPlayed: serverTimestamp,
    ...(enrichedSubmission.achievements
      ? { achievements: enrichedSubmission.achievements }
      : previousChallengeGameData?.achievements
        ? { achievements: previousChallengeGameData.achievements }
        : {}),
    custom: challengeBaseCustom,
  };

  result.challengeGameDataUpdate = challengeGameDataUpdate;

  const resolvedRevealAt = typeof payloadChallengeMetadata?.revealAt === 'string'
    ? payloadChallengeMetadata.revealAt
    : challengeData?.schedule?.revealAt;

  if (rewardRef && resolvedRevealAt) {
    const existingReward = existingRewardDoc?.exists
      ? (existingRewardDoc.data() as DailyChallengeRewardRecord)
      : undefined;
    const nowIso = new Date(serverTimestamp).toISOString();
    const solveState: DailyChallengeSolveState = challengeProgressUpdate?.solved ? 'solved' : 'failed';

    const nextReward: DailyChallengeRewardRecord = {
      gameId,
      gameTypeId,
      dailyChallengeId: challengeId,
      dailyChallengeDate: resolvedDailyChallengeDate,
      revealAt: resolvedRevealAt,
      createdAt: existingReward?.createdAt ?? nowIso,
      updatedAt: nowIso,
      solveState,
      status: existingReward?.status === 'claimed' ? 'claimed' : 'pending',
      ...(challengeAttemptMetadata ? { attemptMetadata: challengeAttemptMetadata } : {}),
      claimedAt: existingReward?.claimedAt,
    };

    tx.set(rewardRef, nextReward, { merge: true });
    result.pendingRewardRecord = nextReward;
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

    const totalAttemptIncrement = triviaOutcome ? triviaOutcome.metrics.attemptCount : 1;
    const correctAttemptIncrement = triviaOutcome ? triviaOutcome.metrics.correctCount : (isCurrentAttemptCorrect ? 1 : 0);
    const statsCustom = { ...(previousChallengeStats.custom ?? {}) } as Record<string, unknown>;

    if (triviaOutcome) {
      const previousTriviaStats = (statsCustom.trivia as Record<string, unknown> | undefined) ?? {};
      statsCustom.trivia = {
        ...previousTriviaStats,
        lastAttempts: triviaOutcome.metrics.attemptCount,
        lastCorrect: triviaOutcome.metrics.correctCount,
        lastAccuracy: triviaOutcome.metrics.accuracy,
        lastScore: triviaOutcome.metrics.score,
      };
    }

    const nextChallengeStats: (Partial<GameStats> & { totalAttempts?: number; correctAttempts?: number }) = {
      scoreDistribution: distribution,
      totalPlayers: previousChallengeStats.totalPlayers + (firstSubmission ? 1 : 0),
      sessionsPlayed: previousChallengeStats.sessionsPlayed + 1,
      favoriteCounter: previousChallengeStats.favoriteCounter,
      totalAttempts: (previousChallengeStats.totalAttempts ?? 0) + totalAttemptIncrement,
      correctAttempts: (previousChallengeStats.correctAttempts ?? 0) + correctAttemptIncrement,
      updatedAt: Date.now(),
      custom: statsCustom,
    };

    if (typeof previousChallengeStats.averageSolveTimeSec === 'number') {
      nextChallengeStats.averageSolveTimeSec = previousChallengeStats.averageSolveTimeSec;
    }

    result.challengeStatsUpdate = nextChallengeStats;
  }

  return result;
}

