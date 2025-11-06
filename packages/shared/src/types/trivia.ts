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
  /** The correct answer text (matches one of the answers' text) */
  correctAnswer: string;
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
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
  backgroundOverlayColor?: string;
}

export interface TriviaConfig {
  /** The mode of the trivia, fixed means the questions are fixed and endless means the questions are endless */
  /** we don't need questions-source because questions from fixed mode are from "questions" array and in endless mode are from "pool" - sub collection*/
  /** pool is a subcollection of the game document - for now lets not develop it yet */
  /** we will do only develop fixed game mode with the questions from the  TriviaQuestion[] array and not subcollection*/
  mode: 'fixed'|'endless';
  /** Question bank to draw from */
  questions: TriviaQuestion[];
  /** Preferred language for the trivia experience (BCP 47 tag) */
  language?: string;
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

  /** Whether lives are unlimited - in fixed mode only */
  unlimitedLives?: boolean; // in fixed mode only
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

