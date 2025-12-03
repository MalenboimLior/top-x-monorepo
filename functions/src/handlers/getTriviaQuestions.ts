import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import type { Game } from '@top-x/shared/types/game';
import type { TriviaConfig, TriviaQuestion } from '@top-x/shared/types/trivia';

const db = admin.firestore();

interface TriviaQuestionFetchRequest {
  gameId?: string;
  excludeIds?: unknown;
  limit?: unknown;
  includeConfig?: unknown;
}

function sanitizeQuestion(question: TriviaQuestion): Omit<TriviaQuestion, 'correctAnswer'> {
  const { correctAnswer: _omitted, ...sanitized } = JSON.parse(JSON.stringify(question)) as TriviaQuestion;
  return sanitized;
}

function normalizeExcludeIds(excludeIds: unknown): string[] {
  if (!Array.isArray(excludeIds)) {
    return [];
  }
  return excludeIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function buildConfigPayload(config: TriviaConfig) {
  const { questions, correctAnswers, ...rest } = config;
  return {
    ...rest,
    questionIds: (questions ?? []).map((q) => q.id),
    questionCount: questions?.length ?? 0,
  };
}

export const getTriviaQuestions = functions.https.onCall(async (request: functions.https.CallableRequest) => {
  const payload = request.data as TriviaQuestionFetchRequest | undefined;

  const gameId = payload?.gameId;
  if (!gameId || typeof gameId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'gameId is required');
  }

  const excludeIds = normalizeExcludeIds(payload?.excludeIds);
  const limit = toPositiveInteger(payload?.limit, 3);
  const includeConfig = Boolean(payload?.includeConfig);

  const gameRef = db.collection('games').doc(gameId);
  const gameSnapshot = await gameRef.get();
  if (!gameSnapshot.exists) {
    throw new functions.https.HttpsError('not-found', `Game ${gameId} does not exist`);
  }

  const gameData = gameSnapshot.data() as Game | undefined;
  const config = gameData?.custom as TriviaConfig | undefined;
  if (!config) {
    throw new functions.https.HttpsError('failed-precondition', 'Trivia config not found for the requested game');
  }

  const questions = Array.isArray(config.questions) ? config.questions : [];
  const excludeSet = new Set(excludeIds);
  const availableQuestions = questions.filter(
    (question) => question && typeof question.id === 'string' && !excludeSet.has(question.id)
  );

  const selectedQuestions = availableQuestions.slice(0, limit).map(sanitizeQuestion);
  const hasMore = availableQuestions.length > selectedQuestions.length;
  const remainingQuestions = Math.max(0, availableQuestions.length - selectedQuestions.length);

  const response: {
    config?: ReturnType<typeof buildConfigPayload>;
    questions: ReturnType<typeof sanitizeQuestion>[];
    totalQuestions: number;
    remainingQuestions: number;
    hasMore: boolean;
  } = {
    questions: selectedQuestions,
    totalQuestions: questions.length,
    remainingQuestions,
    hasMore,
  };

  if (includeConfig) {
    response.config = buildConfigPayload(config);
  }

  return response;
});

