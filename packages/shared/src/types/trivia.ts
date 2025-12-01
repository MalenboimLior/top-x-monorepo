export type TriviaDifficulty =
  | 'very_easy'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'very_hard'
  | 'expert'
  | (string & {});

  export interface TriviaAnswer {
    text: string;
    imageUrl?: string;
  }

export interface TriviaQuestion {
  id: string;
  /** The question text/prompt */
  text: string;
  /** Optional image URL for the question */
  imageUrl?: string;
  /** Array of possible answers */
  answers: TriviaAnswer[];
  /** The correct answer text (matches one of the answers' text). Optional in published configs */
  correctAnswer?: string;
  /** Optional categorization for filtering/analytics */
  category?: string;
  /** Difficulty flag used for sequencing or scoring */
  difficulty?: TriviaDifficulty;
  /** 
   * Salt applied before hashing answer payloads.
   * Used to prevent rainbow table attacks. Each question should have a unique salt.
   * The hash is computed as: HMAC-SHA256(questionId|answerText|salt, secretKey)
   */
  salt?: string;
  /** 
   * Hash of the correct answer payload used to validate submissions.
   * Computed server-side as: HMAC-SHA256(questionId|correctAnswer|salt, secretKey)
   * Client never sees the correctAnswer directly, only hashes each option and compares.
   */
  hash?: string;
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
  /** Relative spawn probability between 0 and 1 */
  spawnRate?: number;
  /** Maximum number of uses allowed in a session */
  maxUses?: number;
  /** Cooldown (seconds) before the power-up can be reused */
  cooldownSeconds?: number;
  /** Optional description or client-side hint */
  description?: string;
}

export interface TriviaThemeConfig {
  /** Primary accent color */
  primaryColor?: string;
  /** Secondary accent color */
  secondaryColor?: string;
  /** Background color */
  backgroundColor?: string;
}

export interface TriviaConfig {
  /** The mode of the trivia game */
  /** - classic: Unlimited lives, show correct answers after each question */
  /** - speed: Limited lives, configurable lives count */
  mode: 'classic' | 'speed';
  /** Whether the trivia is endless (same as speed mode but with endless questions) */
  isEndless?: boolean;
  /** Question bank to draw from */
  questions: TriviaQuestion[];
  /** Optional map of correct answers retained for admin tooling */
  correctAnswers?: Record<string, string>;
  powerUpsActive?: boolean;
  /** Available power-ups and their constraints */
  powerUps?: TriviaPowerUpRule[];
  /** Visual look & feel for trivia screens */
  theme?: TriviaThemeConfig;
  /** Whether to reveal the correct answers after each question - only for unlimitedLives true (in fixed mode)*/
  showCorrectAnswers?: boolean;

  /** Whether to show the correct answers on the end screen - only for fixed mode with unlimitedLives true */
  showCorrectAnswersOnEnd?: boolean;

  /** Threshold (0-1) of correct answers required to "solve" */
  solveThreshold?: number;

  /** Whether user must login to play */
  mustLogin?: boolean;
  /** Whether user can play more then one time */
  allowRepeats?: boolean;

  /** Whether to show progress indicator (e.g., "Question 3 of 10") */
  showProgress?: boolean;
  /** Whether to randomize question order */
  shuffleQuestions?: boolean;
  /** Whether to randomize answer order within each question */
  shuffleAnswers?: boolean;

  /** Whether lives are unlimited (automatically set based on mode) */
  unlimitedLives?: boolean;
  /** Number of lives/strikes allowed before the run ends */
  lives?: number;
  /** Global session timer configuration */
  globalTimer?: TriviaGlobalTimerConfig;
  /** Optional override when batching questions for presentation */
  questionBatchSize?: number;
  /** endless only: **/
  /** Whether the trivia is hybrid, meaning if the pool is empty get from xAi - if not - don't featch form xAI*/
  isHybrid?: boolean;
  
  
}

