import { httpsCallable } from 'firebase/functions';
import { functions } from '@top-x/shared';
import type { TriviaQuestion } from '@top-x/shared/types/trivia';

export interface FetchTriviaQuestionsRequest {
  gameId: string;
  limit?: number;
  excludeIds?: string[];
  difficulty?: string;
}

export interface FetchTriviaQuestionsResponse {
  questions: TriviaQuestion[];
}

export interface FetchTriviaBatchRequest {
  gameId: string;
  batchSize: number;
  cursor?: string | null;
  excludeIds?: string[];
}

export interface FetchTriviaBatchResponse {
  questions: TriviaQuestion[];
  cursor?: string | null;
  hasMore?: boolean;
}

async function callFunction<TRequest, TResponse>(name: string, payload: TRequest): Promise<TResponse> {
  const callable = httpsCallable<TRequest, TResponse>(functions, name);
  const { data } = await callable(payload);
  return data;
}

export async function fetchTriviaQuestions(request: FetchTriviaQuestionsRequest): Promise<TriviaQuestion[]> {
  try {
    const response = await callFunction<FetchTriviaQuestionsRequest, FetchTriviaQuestionsResponse>('fetchTriviaQuestions', request);
    return response.questions || [];
  } catch (error) {
    console.error('fetchTriviaQuestions failed', error);
    return [];
  }
}

export interface TriviaBatchHandle {
  cursor: string | null;
  hasMore: boolean;
}

export async function fetchTriviaBatch(
  request: FetchTriviaBatchRequest
): Promise<{ questions: TriviaQuestion[]; handle: TriviaBatchHandle }>
{
  try {
    const response = await callFunction<FetchTriviaBatchRequest, FetchTriviaBatchResponse>('fetchTriviaBatch', request);
    return {
      questions: response.questions || [],
      handle: {
        cursor: response.cursor ?? null,
        hasMore: response.hasMore ?? (response.cursor ? true : false),
      },
    };
  } catch (error) {
    console.error('fetchTriviaBatch failed', error);
    return {
      questions: [],
      handle: { cursor: null, hasMore: false },
    };
  }
}
