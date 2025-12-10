import * as functions from 'firebase-functions/v2';
import type { Game } from '@top-x/shared/types/game';
import type { TriviaConfig } from '@top-x/shared/types/trivia';
import type {
  UserGameCustomData,
  UserGameDataSubmission,
} from '@top-x/shared/types/user';
import {
  calculateTriviaSpeedBonus,
  TRIVIA_PER_QUESTION_BASE_POINTS,
  TRIVIA_STREAK_BONUS_STEP,
} from '@top-x/shared/trivia/scoring';

const TRIVIA_HASH_VALUE_PATTERN = /^[a-f0-9]{64}$/i;

export interface TriviaAttemptSubmission {
  questionId: string;
  answerHash: string;
  answeredAt?: string;
  durationSeconds?: number;
  timeRemainingSeconds?: number;
  speedBonus?: number;
}

export interface TriviaSubmissionPayload {
  mode?: string;
  attempts: TriviaAttemptSubmission[];
  questionIds: string[];
  attemptCount: number;
  reportedAttemptCount?: number;
  bestStreak?: number;
  currentStreak?: number;
}

export interface TriviaQuestionStatsDelta {
  counts: Record<string, number>;
  total: number;
  correct: number;
}

export interface TriviaQuestionUpdate {
  ref: FirebaseFirestore.DocumentReference;
  data: FirebaseFirestore.DocumentData;
}

type TriviaQuestionSource = 'subcollection' | 'global' | 'config';

interface TriviaQuestionInfo {
  source: TriviaQuestionSource;
  correctHashes: Set<string>;
  ref?: FirebaseFirestore.DocumentReference;
  docData?: FirebaseFirestore.DocumentData;
}

export interface TriviaProcessingMetrics {
  score: number;
  attemptCount: number;
  correctCount: number;
  accuracy: number;
  basePoints?: number;
  streakBonus?: number;
  speedBonus?: number;
  lastSpeedBonus?: number;
  bestStreak?: number;
  currentStreak?: number;
  mode?: string;
  questionIds: string[];
  answerHashes: string[]; // Answer hashes for analytics
}

export interface TriviaProcessingOutcome {
  updatedSubmission: UserGameDataSubmission;
  metrics: TriviaProcessingMetrics;
  questionUpdates: TriviaQuestionUpdate[];
  resolvedStreak: number;
}

export interface TriviaProcessingParams {
  tx: FirebaseFirestore.Transaction;
  gameRef: FirebaseFirestore.DocumentReference;
  gameSnapshot: Game | undefined;
  submittedGameData: UserGameDataSubmission;
  serverTimestamp: number;
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

export function isTriviaConfig(config: unknown): config is TriviaConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const mode = (config as { mode?: unknown }).mode;
  // TriviaConfig.mode is 'classic' | 'speed' per the type definition
  return mode === 'classic' || mode === 'speed';
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

function collectTriviaHashesFromPotentialValue(value: unknown, target: Set<string>): void {
  if (!value) {
    return;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed && TRIVIA_HASH_VALUE_PATTERN.test(trimmed)) {
      target.add(trimmed.toLowerCase());
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectTriviaHashesFromPotentialValue(entry, target));
    return;
  }

  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((entry) => collectTriviaHashesFromPotentialValue(entry, target));
  }
}

function collectTriviaHashesFromQuestionConfig(question: Record<string, unknown> | undefined): Set<string> {
  const hashes = new Set<string>();
  if (!question) {
    return hashes;
  }

  collectTriviaHashesFromPotentialValue((question as Record<string, unknown>).hash, hashes);
  collectTriviaHashesFromPotentialValue((question as Record<string, unknown>).correctHash, hashes);
  collectTriviaHashesFromPotentialValue((question as Record<string, unknown>).correctHashes, hashes);
  collectTriviaHashesFromPotentialValue((question as Record<string, unknown>).acceptedHashes, hashes);

  const hashField = (question as Record<string, unknown>).hashes;
  if (hashField && typeof hashField === 'object') {
    Object.values(hashField as Record<string, unknown>).forEach((entry) => collectTriviaHashesFromPotentialValue(entry, hashes));
  }

  return hashes;
}

export function extractTriviaSubmission(custom: UserGameCustomData | undefined): TriviaSubmissionPayload | null {
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

  const parseOptionalNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  };

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

      const durationSeconds = parseOptionalNumber(
        (attemptRecord.durationSeconds as unknown)
        ?? (attemptRecord.timerSeconds as unknown)
        ?? (attemptRecord.duration as unknown),
      );
      if (typeof durationSeconds === 'number' && durationSeconds >= 0) {
        attempt.durationSeconds = durationSeconds;
      }

      const timeRemainingSeconds = parseOptionalNumber(
        (attemptRecord.timeRemainingSeconds as unknown)
        ?? (attemptRecord.remainingSeconds as unknown)
        ?? (attemptRecord.timeRemaining as unknown)
        ?? (attemptRecord.secondsRemaining as unknown),
      );
      if (typeof timeRemainingSeconds === 'number' && timeRemainingSeconds >= 0) {
        attempt.timeRemainingSeconds = timeRemainingSeconds;
      }

      const speedBonus = parseOptionalNumber(attemptRecord.speedBonus);
      if (typeof speedBonus === 'number' && speedBonus >= 0) {
        attempt.speedBonus = speedBonus;
      }

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

export async function processTriviaSubmission({
  tx,
  gameRef,
  gameSnapshot,
  submittedGameData,
  serverTimestamp,
}: TriviaProcessingParams): Promise<TriviaProcessingOutcome | null> {
  const triviaSubmission = extractTriviaSubmission(submittedGameData.custom);
  const triviaConfig = gameSnapshot && isTriviaConfig(gameSnapshot.custom)
    ? (gameSnapshot.custom as TriviaConfig)
    : undefined;

  // Skip if no trivia submission
  if (!triviaSubmission) {
    return null;
  }

  // Process trivia submissions for 'classic' mode (fixed question set)
  // 'speed' mode is handled differently (endless questions)
  const effectiveMode = triviaSubmission.mode ?? triviaConfig?.mode;
  if (effectiveMode !== 'classic' && effectiveMode !== 'fixed') {
    return null;
  }

  if (triviaSubmission.attemptCount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Trivia submissions must include at least one answered question');
  }

  if (triviaSubmission.questionIds.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Trivia submissions must include question identifiers');
  }

  const questionRefs = triviaSubmission.questionIds.map((questionId) => gameRef.collection('questions').doc(questionId));
  const questionDocs = await Promise.all(questionRefs.map((ref) => tx.get(ref)));

  const questionInfoMap = new Map<string, TriviaQuestionInfo>();
  const configQuestionMap = new Map<string, Record<string, unknown>>();
  if (Array.isArray(triviaConfig?.questions)) {
    triviaConfig.questions.forEach((question) => {
      if (question && typeof question === 'object' && typeof question.id === 'string') {
        configQuestionMap.set(question.id, question as unknown as Record<string, unknown>);
      }
    });
  }

  const MAX_TIMER_SECONDS = 300;

  const extractTimerSeconds = (info: TriviaQuestionInfo | undefined): number | undefined => {
    if (!info?.docData) {
      return undefined;
    }
    const data = info.docData as Record<string, unknown>;
    const direct = data.timerSeconds;
    if (typeof direct === 'number' && Number.isFinite(direct) && direct > 0) {
      return direct;
    }
    const timerField = data.timer;
    if (timerField && typeof timerField === 'object') {
      const timerSeconds = (timerField as Record<string, unknown>).seconds;
      if (typeof timerSeconds === 'number' && Number.isFinite(timerSeconds) && timerSeconds > 0) {
        return timerSeconds;
      }
    }
    return undefined;
  };

  for (let index = 0; index < questionDocs.length; index += 1) {
    const docSnapshot = questionDocs[index];
    const questionId = triviaSubmission.questionIds[index];
    if (!docSnapshot.exists) {
      const firestore = gameRef.firestore;
      const globalQuestionRef = firestore.collection('questions').doc(questionId);
      const globalQuestionSnapshot = await tx.get(globalQuestionRef);

      if (globalQuestionSnapshot.exists) {
        const globalData = globalQuestionSnapshot.data();
        const correctHashes = collectCorrectTriviaHashes(globalData);
        if (correctHashes.size === 0) {
          console.warn('submitGameScore: trivia global question missing correct hash metadata', {
            gameId: gameRef.id,
            questionId,
          });
        }
        questionInfoMap.set(questionId, {
          source: 'global',
          correctHashes,
          ref: globalQuestionSnapshot.ref,
          docData: globalData ?? undefined,
        });
        continue;
      }

      const configQuestion = configQuestionMap.get(questionId);
      if (configQuestion) {
        const correctHashes = collectTriviaHashesFromQuestionConfig(configQuestion);
        if (correctHashes.size === 0) {
          console.warn('submitGameScore: trivia config question missing hash metadata', {
            gameId: gameRef.id,
            questionId,
          });
        } else {
          console.debug('submitGameScore: resolved trivia question from config payload', {
            gameId: gameRef.id,
            questionId,
          });
        }
        questionInfoMap.set(questionId, {
          source: 'config',
          correctHashes,
          docData: configQuestion,
        });
        continue;
      }

      throw new functions.https.HttpsError('failed-precondition', `Trivia question ${questionId} does not exist`);
    }

    const docData = docSnapshot.data();
    const correctHashes = collectCorrectTriviaHashes(docData);
    if (correctHashes.size === 0) {
      console.warn('submitGameScore: trivia question missing correct hash metadata', {
        gameId: gameRef.id,
        questionId,
      });
    }
    questionInfoMap.set(questionId, {
      source: 'subcollection',
      correctHashes,
      ref: docSnapshot.ref,
      docData,
    });
  }

  const questionDeltas = new Map<string, TriviaQuestionStatsDelta>();
  let correctCount = 0;
  let totalScore = 0;
  let totalSpeedBonus = 0;
  let totalStreakBonus = 0;
  let totalBasePoints = 0;
  let currentComputedStreak = 0;
  let bestComputedStreak = 0;
  let lastSpeedBonus = 0;

  triviaSubmission.attempts.forEach((attempt, attemptIndex) => {
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

      currentComputedStreak += 1;
      bestComputedStreak = Math.max(bestComputedStreak, currentComputedStreak);

      const basePoints = TRIVIA_PER_QUESTION_BASE_POINTS;
      const streakBonus = Math.max(0, currentComputedStreak - 1) * TRIVIA_STREAK_BONUS_STEP;

      const durationCandidate =
        typeof attempt.durationSeconds === 'number'
          && Number.isFinite(attempt.durationSeconds)
          && attempt.durationSeconds > 0
          ? attempt.durationSeconds
          : extractTimerSeconds(questionInfo);
      const durationSeconds =
        typeof durationCandidate === 'number'
          && Number.isFinite(durationCandidate)
          && durationCandidate > 0
          ? Math.min(durationCandidate, MAX_TIMER_SECONDS)
          : undefined;

      const remainingCandidate =
        typeof attempt.timeRemainingSeconds === 'number' && Number.isFinite(attempt.timeRemainingSeconds)
          ? Math.max(0, attempt.timeRemainingSeconds)
          : undefined;
      const timeRemainingSeconds =
        typeof durationSeconds === 'number'
          ? Math.min(remainingCandidate ?? 0, durationSeconds)
          : remainingCandidate;

      const computedSpeedBonus = calculateTriviaSpeedBonus(timeRemainingSeconds, durationSeconds);
      if (
        typeof attempt.speedBonus === 'number'
        && Math.abs(attempt.speedBonus - computedSpeedBonus) > TRIVIA_STREAK_BONUS_STEP
      ) {
        console.warn('submitGameScore: trivia speed bonus mismatch', {
          gameId: gameRef.id,
          questionId: attempt.questionId,
          attemptIndex,
          reported: attempt.speedBonus,
          computed: computedSpeedBonus,
        });
      }

      lastSpeedBonus = computedSpeedBonus;
      totalSpeedBonus += computedSpeedBonus;
      totalBasePoints += basePoints;
      totalStreakBonus += streakBonus;
      totalScore += basePoints + streakBonus + computedSpeedBonus;
    } else {
      currentComputedStreak = 0;
      lastSpeedBonus = 0;
    }
  });

  const attemptCount = triviaSubmission.attempts.length;
  const accuracy = attemptCount > 0 ? correctCount / attemptCount : 0;

  const bestStreakCandidates = [
    bestComputedStreak,
    typeof triviaSubmission.bestStreak === 'number' ? triviaSubmission.bestStreak : 0,
    typeof triviaSubmission.currentStreak === 'number' ? triviaSubmission.currentStreak : 0,
  ];
  const resolvedBestStreak = Math.max(...bestStreakCandidates);
  const resolvedCurrentStreak = Math.max(
    currentComputedStreak,
    typeof triviaSubmission.currentStreak === 'number' ? triviaSubmission.currentStreak : 0,
  );

  // Extract answer hashes from attempts
  const answerHashes = triviaSubmission.attempts.map((attempt) => attempt.answerHash);

  const metrics: TriviaProcessingMetrics = {
    score: totalScore,
    attemptCount,
    correctCount,
    accuracy,
    basePoints: totalBasePoints,
    streakBonus: totalStreakBonus,
    speedBonus: totalSpeedBonus,
    lastSpeedBonus,
    bestStreak: resolvedBestStreak,
    currentStreak: resolvedCurrentStreak,
    mode: triviaSubmission.mode ?? triviaConfig?.mode ?? 'classic',
    questionIds: triviaSubmission.questionIds,
    answerHashes, // Add answer hashes to metrics
  };

  const questionUpdates: TriviaQuestionUpdate[] = [];

  questionDeltas.forEach((delta, questionId) => {
    const info = questionInfoMap.get(questionId);
    if (!info || info.source !== 'subcollection' || !info.docData || !info.ref) {
      return;
    }

    const docData = info.docData ?? {};
    const existingCounts = { ...(docData.answerCounts ?? {}) } as Record<string, number>;

    Object.entries(delta.counts).forEach(([hash, count]) => {
      existingCounts[hash] = (existingCounts[hash] || 0) + count;
    });

    const statsRecord = { ...(docData.stats ?? {}) } as Record<string, unknown>;
    const previousTotalAttempts = typeof statsRecord.totalAttempts === 'number' ? statsRecord.totalAttempts : 0;
    const previousCorrectAttempts = typeof statsRecord.correctAttempts === 'number' ? statsRecord.correctAttempts : 0;
    statsRecord.totalAttempts = previousTotalAttempts + delta.total;
    statsRecord.correctAttempts = previousCorrectAttempts + delta.correct;

    questionUpdates.push({
      ref: info.ref,
      data: {
        answerCounts: existingCounts,
        stats: statsRecord,
        lastAnsweredAt: new Date(serverTimestamp).toISOString(),
        updatedAt: serverTimestamp,
      },
    });
  });

  const updatedSubmission: UserGameDataSubmission = {
    ...submittedGameData,
    score: metrics.score,
  };

  const customRecord = { ...(updatedSubmission.custom ?? {}) } as UserGameCustomData & Record<string, unknown>;
  const previousTrivia = (customRecord.trivia as Record<string, unknown> | undefined) ?? {};
  const nextTrivia: Record<string, unknown> = {
    ...previousTrivia,
    lastScore: metrics.score,
    lastAttemptCount: metrics.attemptCount,
    lastCorrectCount: metrics.correctCount,
    lastAccuracy: metrics.accuracy,
    lastQuestionIds: metrics.questionIds,
    lastMode: metrics.mode,
    reportedAttemptCount: triviaSubmission.reportedAttemptCount,
    sessionBestStreak: metrics.bestStreak,
    sessionCurrentStreak: metrics.currentStreak,
  };

  if (typeof metrics.speedBonus === 'number') {
    nextTrivia.lastSpeedBonusTotal = metrics.speedBonus;
    nextTrivia.speedBonusTotal = metrics.speedBonus;
  }
  if (typeof metrics.lastSpeedBonus === 'number') {
    nextTrivia.lastSpeedBonus = metrics.lastSpeedBonus;
  }

  Object.keys(nextTrivia).forEach((key) => {
    if (nextTrivia[key] === undefined) {
      delete nextTrivia[key];
    }
  });

  customRecord.trivia = nextTrivia;

  const resolvedStreak = Math.max(
    typeof updatedSubmission.streak === 'number' ? updatedSubmission.streak : 0,
    triviaSubmission.bestStreak ?? 0,
    triviaSubmission.currentStreak ?? 0,
    typeof submittedGameData.streak === 'number' ? submittedGameData.streak : 0,
    metrics.bestStreak ?? 0,
    metrics.currentStreak ?? 0,
  );

  updatedSubmission.streak = resolvedStreak;
  updatedSubmission.custom = customRecord;

  return {
    updatedSubmission,
    metrics,
    questionUpdates,
    resolvedStreak,
  };
}

