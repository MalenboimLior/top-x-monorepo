import type {
  TriviaConfig,
  TriviaFixedConfig,
  TriviaEndlessConfig,
  TriviaQuestion,
  TriviaPowerUpRule,
  TriviaDifficulty,
} from '@top-x/shared/types/trivia';

export interface TriviaQuestionViewModel {
  id: string;
  prompt: string;
  question: string;
  options: string[];
  correctHash?: string;
  difficulty?: TriviaDifficulty;
  media?: TriviaQuestion['media'];
  timerSeconds?: number;
  salt?: string;
  group?: string;
}

export interface TriviaAttemptPayload {
  questionId: string;
  answerHash: string;
  answeredAt: string;
}

export interface PowerUpState extends TriviaPowerUpRule {
  availableAt: number;
  uses: number;
  onCooldownUntil?: number;
}

export interface TriviaSharedContext {
  gameId: string;
  config: TriviaConfig | null;
}

export interface TriviaModeController {
  reset(): void;
  ensureQuestions(): Promise<void>;
  nextQuestion(): TriviaQuestionViewModel | null;
  recordAnswer(result: { correct: boolean }): void;
  isComplete(): boolean;
}

export interface FixedModeControllerOptions {
  config: TriviaFixedConfig | null;
  fetchQuestions?: (limit: number, excludeIds: string[]) => Promise<TriviaQuestion[]>;
}

export interface EndlessModeControllerOptions {
  config: TriviaEndlessConfig | null;
  fetchBatch: (batchSize: number, cursor: string | null, excludeIds: string[]) => Promise<{
    questions: TriviaQuestion[];
    cursor: string | null;
    hasMore: boolean;
  }>;
}

export { TriviaConfig, TriviaFixedConfig, TriviaEndlessConfig };
