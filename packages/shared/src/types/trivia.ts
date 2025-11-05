export type TriviaDifficulty =
  | 'very_easy'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'very_hard'
  | 'expert'
  | (string & {});

export interface TriviaQuestionMedia {
  /** Optional image associated with the question */
  imageUrl?: string;
  /** Optional audio clip to play with the question */
  audioUrl?: string;
  /** Optional video clip to display for the question */
  videoUrl?: string;
}

export interface TriviaQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  /** Optional categorization for filtering/analytics */
  category?: string;
  /** Difficulty flag used for sequencing or scoring */
  difficulty?: TriviaDifficulty;
  /** Per-question language override (BCP 47 tag). Defaults to config language. */
  language?: string;
  /** Optional asset references displayed alongside the prompt */
  media?: TriviaQuestionMedia;
  /** Custom timer (in seconds) overriding global timers */
  timerSeconds?: number;
  /** Salt applied before hashing answer payloads */
  salt?: string;
  /** Hash of the answer payload used to validate submissions */
  hash?: string;
}

export interface TriviaSanitizedQuestionBase
  extends Omit<TriviaQuestion, 'correctAnswer' | 'hash' | 'salt'> {
  /** Salt generated server-side to produce deterministic hashes */
  salt: string;
}

export interface TriviaFixedQuestionPayload extends TriviaSanitizedQuestionBase {
  /** Hash of the correct answer combined with the salt */
  answerHash: string;
}

export interface TriviaEndlessQuestionPayload extends TriviaSanitizedQuestionBase {
  /** Hash of the correct option index combined with the salt */
  correctIndexHash: string;
}

export interface TriviaGlobalTimerConfig {
  /** Whether a global timer should run for the session */
  enabled: boolean;
  /** Optional duration (seconds) for the global timer */
  durationSeconds?: number;
}

export interface TriviaPowerUpRule {
  /** Machine-readable identifier for the power-up */
  id: string;
  /** Human readable label displayed in clients */
  label: string;
  /** Maximum number of uses allowed in a session */
  maxUses?: number;
  /** Cooldown (seconds) before the power-up can be reused */
  cooldownSeconds?: number;
  /** Optional description or client-side hint */
  description?: string;
}

export interface TriviaThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
  backgroundOverlayColor?: string;
}

export interface TriviaBaseConfig {
  /** Question bank to draw from */
  questions: TriviaQuestion[];
  /** Preferred language for the trivia experience (BCP 47 tag) */
  language?: string;
  /** Optional override when batching questions for presentation */
  questionBatchSize?: number;
  /** Global session timer configuration */
  globalTimer?: TriviaGlobalTimerConfig;
  /** Number of lives/strikes allowed before the run ends */
  lives?: number;
  /** Available power-ups and their constraints */
  powerUps?: TriviaPowerUpRule[];
  /** Visual look & feel for trivia screens */
  theme?: TriviaThemeConfig;
  /** Whether to reveal the correct answers after each question */
  showCorrectAnswers?: boolean;
  /** Threshold (0-1) of correct answers required to "solve" */
  solveThreshold?: number;
}

export interface TriviaFixedConfig extends TriviaBaseConfig {
  mode: 'fixed';
  /** Total questions presented in a fixed session */
  totalQuestions?: number;
}

export interface TriviaEndlessConfig extends TriviaBaseConfig {
  mode: 'endless';
  /** Batch size is required for endless rotation */
  questionBatchSize: number;
  /** Endless mode requires lives to determine failure */
  lives: number;
  /** Whether questions can repeat during an endless session */
  allowRepeats?: boolean;
}

export type TriviaConfig = TriviaFixedConfig | TriviaEndlessConfig;

export interface TriviaFixedBatchRequest {
  gameId: string;
  batchSize?: number;
}

export interface TriviaFixedBatchResponse {
  gameId: string;
  totalAvailable: number;
  questions: TriviaFixedQuestionPayload[];
}

export interface TriviaEndlessBatchRequest {
  gameId: string;
  batchSize?: number;
}

export interface TriviaEndlessBatchResponse {
  gameId: string;
  totalAvailable: number;
  questions: TriviaEndlessQuestionPayload[];
}

export interface TriviaXaiBackfillRequest {
  gameId: string;
  threshold: number;
  desiredPoolSize?: number;
  /** Optional override for the xAI endpoint */
  endpoint?: string;
  /** Optional model identifier to send to xAI */
  model?: string;
  /** Prompt passed to the xAI model */
  prompt?: string;
  /** Additional body parameters forwarded to the xAI API */
  requestBody?: Record<string, unknown>;
}

export interface TriviaXaiBackfillResponse {
  triggered: boolean;
  totalQuestions: number;
  createdQuestionIds: string[];
}
