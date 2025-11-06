import type { TriviaQuestion, TriviaConfig } from '@top-x/shared/types/trivia';

/**
 * Secret key for HMAC hashing. Should match server-side key.
 * In production, this should be stored securely and not exposed in client code.
 */
const HASH_SECRET = 'top-x-trivia-secret';

/**
 * Hash an answer using HMAC-SHA256
 * Format: HMAC-SHA256(questionId|answerText|salt, secretKey)
 */
export async function hashAnswer(questionId: string, answerText: string, salt?: string): Promise<string> {
  const encoder = new TextEncoder();
  const payload = `${questionId}|${answerText}|${salt ?? ''}`;
  const msgBuffer = encoder.encode(payload);
  const keyBuffer = encoder.encode(HASH_SECRET);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const hashBuffer = await crypto.subtle.sign('HMAC', key, msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate an answer by comparing its hash with the question's correct hash
 */
export async function validateAnswer(
  question: TriviaQuestion,
  answerText: string
): Promise<boolean> {
  if (!question.hash) {
    // If no hash is provided, fall back to direct comparison (less secure)
    return question.correctAnswer === answerText;
  }
  
  const answerHash = await hashAnswer(question.id, answerText, question.salt);
  return question.hash === answerHash;
}

/**
 * Find the index of the correct answer in the answers array
 */
export async function findCorrectAnswerIndex(question: TriviaQuestion): Promise<number | null> {
  if (!question.hash || !question.salt) {
    // Fallback: find by text match
    return question.answers.findIndex((ans) => ans.text === question.correctAnswer);
  }
  
  // Hash each answer and compare with the question's hash
  for (let i = 0; i < question.answers.length; i++) {
    const answerHash = await hashAnswer(question.id, question.answers[i].text, question.salt);
    if (answerHash === question.hash) {
      return i;
    }
  }
  
  return null;
}

/**
 * Fetch questions from TriviaConfig with batching support
 * If questionBatchSize is 0 or undefined, returns all questions
 * Otherwise, returns questions in batches
 */
export function fetchQuestionsFromConfig(
  config: TriviaConfig,
  batchSize?: number,
  excludeIds: string[] = []
): TriviaQuestion[] {
  if (!config.questions || config.questions.length === 0) {
    return [];
  }
  
  // Filter out excluded question IDs
  let availableQuestions = config.questions.filter((q) => !excludeIds.includes(q.id));
  
  // If batchSize is 0 or undefined, return all available questions
  if (!batchSize || batchSize <= 0) {
    return availableQuestions;
  }
  
  // Return only the requested batch size
  return availableQuestions.slice(0, batchSize);
}

/**
 * Get the next batch of questions from config
 */
export function getNextQuestionBatch(
  config: TriviaConfig,
  batchSize: number,
  excludeIds: string[] = []
): { questions: TriviaQuestion[]; hasMore: boolean } {
  if (!config.questions || config.questions.length === 0) {
    return { questions: [], hasMore: false };
  }
  
  const availableQuestions = config.questions.filter((q) => !excludeIds.includes(q.id));
  const batch = availableQuestions.slice(0, batchSize);
  const hasMore = availableQuestions.length > batchSize;
  
  return { questions: batch, hasMore };
}

/**
 * Convert TriviaQuestion to a format suitable for the view model
 * Removes the correctAnswer field for security (client should only see hash)
 */
export function sanitizeQuestionForClient(question: TriviaQuestion): Omit<TriviaQuestion, 'correctAnswer'> {
  const { correctAnswer, ...sanitized } = question;
  return sanitized;
}

/**
 * Shuffle array in place (Fisher-Yates algorithm)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
