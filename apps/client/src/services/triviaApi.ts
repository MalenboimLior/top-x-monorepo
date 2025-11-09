import { httpsCallable } from 'firebase/functions';
import type { TriviaConfig, TriviaQuestion } from '@top-x/shared/types/trivia';
import { functions } from '@top-x/shared';

export interface TriviaQuestionPayload extends Omit<TriviaQuestion, 'correctAnswer'> {
  timerSeconds?: number;
}

export interface TriviaConfigPayload extends Omit<TriviaConfig, 'questions' | 'correctAnswers'> {
  questionIds?: string[];
  questionCount: number;
}

export interface FetchTriviaQuestionsRequest {
  gameId: string;
  excludeIds?: string[];
  limit?: number;
  includeConfig?: boolean;
}

export interface FetchTriviaQuestionsResponse {
  config?: TriviaConfigPayload;
  questions: TriviaQuestionPayload[];
  totalQuestions: number;
  remainingQuestions: number;
  hasMore: boolean;
}

const getTriviaQuestionsCallable = httpsCallable<
  FetchTriviaQuestionsRequest,
  FetchTriviaQuestionsResponse
>(functions, 'getTriviaQuestions');

export async function fetchTriviaQuestions(
  params: FetchTriviaQuestionsRequest
): Promise<FetchTriviaQuestionsResponse> {
  const { data } = await getTriviaQuestionsCallable(params);
  return data;
}

