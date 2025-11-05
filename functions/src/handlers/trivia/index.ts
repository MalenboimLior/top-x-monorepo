import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import axios from 'axios';
import crypto from 'node:crypto';
import {
  TriviaQuestion,
  TriviaFixedBatchRequest,
  TriviaFixedBatchResponse,
  TriviaEndlessBatchRequest,
  TriviaEndlessBatchResponse,
  TriviaFixedQuestionPayload,
  TriviaEndlessQuestionPayload,
  TriviaXaiBackfillRequest,
  TriviaXaiBackfillResponse,
} from '@top-x/shared/types/trivia';

const db = admin.firestore();

const DEFAULT_FIXED_BATCH_SIZE = 20;
const DEFAULT_ENDLESS_BATCH_SIZE = 10;

const DEFAULT_XAI_ENDPOINT = 'https://api.x.ai/v1/generate-trivia';
const XAI_API_KEY = process.env.XAI_API_KEY ?? '';

interface FirestoreTriviaQuestion extends TriviaQuestion {
  randomShard?: number;
}

async function fetchRandomQuestions(
  gameId: string,
  limit: number,
): Promise<FirestoreTriviaQuestion[]> {
  const collectionRef = db.collection('games').doc(gameId).collection('questions');

  const randomTarget = Math.random();
  let query = collectionRef.orderBy('randomShard').startAt(randomTarget).limit(limit);

  let snapshot = await query.get();

  if (snapshot.empty || snapshot.size < limit) {
    snapshot = await collectionRef.orderBy('randomShard').limit(limit).get();
  }

  if (snapshot.empty) {
    throw new functions.https.HttpsError(
      'not-found',
      `No trivia questions available for game ${gameId}`,
    );
  }

  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as FirestoreTriviaQuestion) }));
}

function sanitizeQuestionBase(question: FirestoreTriviaQuestion) {
  const { correctAnswer, salt: _salt, hash: _hash, randomShard: _randomShard, ...rest } = question;

  if (!correctAnswer) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Question ${question.id} is missing a correct answer`,
    );
  }

  if (!Array.isArray(question.options) || question.options.length === 0) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Question ${question.id} is missing options`,
    );
  }

  return { rest, correctAnswer } as const;
}

function toFixedPayload(question: FirestoreTriviaQuestion): TriviaFixedQuestionPayload {
  const { rest, correctAnswer } = sanitizeQuestionBase(question);

  const salt = crypto.randomBytes(16).toString('hex');
  const answerHash = crypto
    .createHash('sha256')
    .update(`${correctAnswer}:${salt}`)
    .digest('hex');

  return {
    ...rest,
    id: question.id,
    salt,
    answerHash,
  };
}

function toEndlessPayload(question: FirestoreTriviaQuestion): TriviaEndlessQuestionPayload {
  const { rest, correctAnswer } = sanitizeQuestionBase(question);

  const correctIndex = question.options.findIndex((option) => option === correctAnswer);

  if (correctIndex < 0) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Question ${question.id} correct answer does not match any option`,
    );
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const correctIndexHash = crypto
    .createHash('sha256')
    .update(`${correctIndex}:${salt}`)
    .digest('hex');

  return {
    ...rest,
    id: question.id,
    salt,
    correctIndexHash,
  };
}

async function countQuestions(gameId: string): Promise<number> {
  const collectionRef = db.collection('games').doc(gameId).collection('questions');
  try {
    const aggregate = await collectionRef.count().get();
    return aggregate.data().count;
  } catch (error) {
    console.warn('Failed to aggregate trivia question count, falling back to estimate', {
      gameId,
      error,
    });
    const snapshot = await collectionRef.limit(1_000).get();
    return snapshot.size;
  }
}

export const getTriviaFixedBatch = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<TriviaFixedBatchRequest>,
  ): Promise<TriviaFixedBatchResponse> => {
    const { auth, data } = request;

    if (!auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const payload = data ?? ({} as TriviaFixedBatchRequest);
    const { gameId } = payload;

    if (!gameId) {
      throw new functions.https.HttpsError('invalid-argument', 'gameId is required');
    }

    const batchSize = Math.max(1, payload.batchSize ?? DEFAULT_FIXED_BATCH_SIZE);

    const questions = await fetchRandomQuestions(gameId, batchSize);
    const sanitized = questions.map(toFixedPayload);
    const totalAvailable = await countQuestions(gameId);

    return {
      gameId,
      questions: sanitized,
      totalAvailable,
    };
  },
);

export const streamTriviaEndlessBatch = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<TriviaEndlessBatchRequest>,
  ): Promise<TriviaEndlessBatchResponse> => {
    const { auth, data } = request;

    if (!auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const payload = data ?? ({} as TriviaEndlessBatchRequest);
    const { gameId } = payload;

    if (!gameId) {
      throw new functions.https.HttpsError('invalid-argument', 'gameId is required');
    }

    const batchSize = Math.max(1, payload.batchSize ?? DEFAULT_ENDLESS_BATCH_SIZE);

    const questions = await fetchRandomQuestions(gameId, batchSize);
    const sanitized = questions.map(toEndlessPayload);
    const totalAvailable = await countQuestions(gameId);

    return {
      gameId,
      questions: sanitized,
      totalAvailable,
    };
  },
);

async function invokeXaiApi(
  payload: TriviaXaiBackfillRequest,
  requestedCount: number,
): Promise<TriviaQuestion[]> {
  if (!XAI_API_KEY) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'XAI_API_KEY environment variable is not configured',
    );
  }

  const headers = {
    Authorization: `Bearer ${XAI_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const endpoint = payload.endpoint ?? DEFAULT_XAI_ENDPOINT;

  const body: Record<string, unknown> = {
    model: payload.model ?? 'grok-trivia',
    count: requestedCount,
  };

  if (payload.prompt) {
    body.prompt = payload.prompt;
  }

  if (payload.requestBody && typeof payload.requestBody === 'object') {
    Object.assign(body, payload.requestBody);
  }

  const response = await axios.post(endpoint, body, { headers });

  const data = response.data;
  const questions: unknown = data?.questions ?? data?.data?.questions ?? data;

  if (!Array.isArray(questions)) {
    throw new functions.https.HttpsError(
      'internal',
      'xAI response did not include a questions array',
    );
  }

  return questions as TriviaQuestion[];
}

export const requestTriviaXaiBackfill = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<TriviaXaiBackfillRequest>,
  ): Promise<TriviaXaiBackfillResponse> => {
    const { auth, data } = request;

    if (!auth?.token?.admin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
    }

    const payload = data ?? ({} as TriviaXaiBackfillRequest);

    if (!payload.gameId) {
      throw new functions.https.HttpsError('invalid-argument', 'gameId is required');
    }

    if (!payload.threshold || payload.threshold <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'threshold must be greater than 0');
    }

    const desiredPoolSize = Math.max(payload.desiredPoolSize ?? payload.threshold, payload.threshold);

    const totalQuestions = await countQuestions(payload.gameId);

    if (totalQuestions >= payload.threshold) {
      return {
        triggered: false,
        totalQuestions,
        createdQuestionIds: [],
      };
    }

    const toGenerate = Math.max(1, desiredPoolSize - totalQuestions);
    const generated = await invokeXaiApi(payload, toGenerate);

    const collectionRef = db
      .collection('games')
      .doc(payload.gameId)
      .collection('xaiQuestions');

    const batch = db.batch();
    const createdIds: string[] = [];

    let stored = 0;

    for (const question of generated) {
      if (stored >= toGenerate) {
        break;
      }

      if (
        !question ||
        typeof question.text !== 'string' ||
        !Array.isArray(question.options) ||
        typeof question.correctAnswer !== 'string'
      ) {
        console.warn('Skipping invalid xAI question payload', {
          gameId: payload.gameId,
          hasText: typeof (question as TriviaQuestion)?.text === 'string',
        });
        continue;
      }

      const docRef = collectionRef.doc();
      createdIds.push(docRef.id);
      batch.set(docRef, {
        ...question,
        randomShard: Math.random(),
        source: 'xai',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      stored += 1;
    }

    await batch.commit();

    return {
      triggered: true,
      totalQuestions,
      createdQuestionIds: createdIds,
    };
  },
);
