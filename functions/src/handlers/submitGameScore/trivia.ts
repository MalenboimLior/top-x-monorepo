import * as functions from 'firebase-functions/v2';
import type { Game } from '@top-x/shared/types/game';
import type { TriviaConfig } from '@top-x/shared/types/trivia';
import type {
  UserGameCustomData,
  UserGameDataSubmission,
} from '@top-x/shared/types/user';

const TRIVIA_HASH_VALUE_PATTERN = /^[a-f0-9]{64}$/i;

export interface TriviaAttemptSubmission {
  questionId: string;
  answerHash: string;
  answeredAt?: string;
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

export interface TriviaProcessingMetrics {
  score: number;
  attemptCount: number;
  correctCount: number;
  accuracy: number;
  bestStreak?: number;
  currentStreak?: number;
  mode?: string;
  questionIds: string[];
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

  if (!triviaSubmission || (triviaSubmission.mode ?? triviaConfig?.mode) !== 'fixed') {
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
        gameId: gameRef.id,
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

  const metrics: TriviaProcessingMetrics = {
    score: correctCount,
    attemptCount,
    correctCount,
    accuracy,
    bestStreak: triviaSubmission.bestStreak,
    currentStreak: triviaSubmission.currentStreak,
    mode: triviaSubmission.mode ?? triviaConfig?.mode ?? 'fixed',
    questionIds: triviaSubmission.questionIds,
  };

  const questionUpdates: TriviaQuestionUpdate[] = [];

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

    questionUpdates.push({
      ref: info.doc.ref,
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
    typeof updatedSubmission.streak === 'number' ? updatedSubmission.streak : 0,
    triviaSubmission.bestStreak ?? 0,
    triviaSubmission.currentStreak ?? 0,
    typeof submittedGameData.streak === 'number' ? submittedGameData.streak : 0,
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

