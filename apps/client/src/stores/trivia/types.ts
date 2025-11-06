import type {
  TriviaConfig,
  TriviaQuestion,
  TriviaPowerUpRule,
  TriviaDifficulty,
  TriviaAnswer,
} from '@top-x/shared/types/trivia';

export interface TriviaQuestionViewModel {
  id: string;
  /** The question text/prompt */
  question: string;
  /** Array of answer options (can be strings or objects with text/imageUrl) */
  options: (string | { text: string; imageUrl?: string })[];
  /** Hash of the correct answer for validation */
  correctHash?: string;
  /** Difficulty level */
  difficulty?: TriviaDifficulty;
  /** Optional media (image) for the question */
  media?: {
    imageUrl?: string;
  };
  /** Optional timer duration in seconds */
  timerSeconds?: number;
  /** Salt used for hashing */
  salt?: string;
  /** Category/group */
  category?: string;
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
